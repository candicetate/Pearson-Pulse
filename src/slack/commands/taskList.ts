import { KnownBlock } from "@slack/bolt";
import { app } from "../app";
import { DbUser, getUserBySlackId } from "../../db/queries/users";
import { DbTask, listActiveTasks, listActiveTasksForUser } from "../../db/queries/tasks";
import { getAssigneesForTasks } from "../../db/queries/assignments";
import { labelForStatus } from "../../domain/taskStatus";

const MENTION_PATTERN = /^<@([A-Z0-9]+)(\|[^>]*)?>$/;

function taskLineWithActions(task: DbTask, assigneeNames: string): KnownBlock {
  const detailParts = [`*${task.task_number}* ${task.title}`, `_${labelForStatus(task.status)}_`];
  if (task.due_date) detailParts.push(`due ${task.due_date}`);
  if (task.client_name) detailParts.push(`client: ${task.client_name}`);
  if (assigneeNames) detailParts.push(`assigned: ${assigneeNames}`);

  return {
    type: "section",
    text: { type: "mrkdwn", text: detailParts.join(" • ") },
    accessory: {
      type: "overflow",
      action_id: "quick_status",
      options: [
        { text: { type: "plain_text", text: "Mark work in progress" }, value: `${task.id}:in_progress` },
        { text: { type: "plain_text", text: "Mark waiting on approval" }, value: `${task.id}:waiting_on_approval` },
        { text: { type: "plain_text", text: "Mark completed" }, value: `${task.id}:completed` },
      ],
    },
  };
}

app.command("/task-list", async ({ ack, command, respond, context }) => {
  await ack();
  const dbUser = context.dbUser as DbUser;
  const arg = command.text.trim();

  let tasks: DbTask[];
  let heading: string;

  if (arg === "" || arg.toLowerCase() === "all") {
    tasks = await listActiveTasks();
    heading = "All active tasks";
  } else if (arg.toLowerCase() === "mine") {
    tasks = await listActiveTasksForUser(dbUser.id);
    heading = "Your active tasks";
  } else {
    const mentionMatch = arg.match(MENTION_PATTERN);
    const slackId = mentionMatch ? mentionMatch[1] : null;
    if (!slackId) {
      await respond({
        response_type: "ephemeral",
        text: "Usage: `/task-list`, `/task-list mine`, or `/task-list @someone`",
      });
      return;
    }
    const targetUser = await getUserBySlackId(slackId);
    if (!targetUser) {
      await respond({ response_type: "ephemeral", text: "That person hasn't interacted with the bot yet." });
      return;
    }
    tasks = await listActiveTasksForUser(targetUser.id);
    heading = `${targetUser.display_name}'s active tasks`;
  }

  if (tasks.length === 0) {
    await respond({ response_type: "ephemeral", text: `${heading}: nothing active right now.` });
    return;
  }

  const assigneesByTask = await getAssigneesForTasks(tasks.map((t) => t.id));
  const blocks: KnownBlock[] = [
    { type: "header", text: { type: "plain_text", text: heading } },
  ];
  for (const task of tasks) {
    const names = (assigneesByTask.get(task.id) ?? []).map((u) => u.display_name).join(", ");
    blocks.push(taskLineWithActions(task, names));
  }

  await respond({ response_type: "ephemeral", blocks, text: heading });
});
