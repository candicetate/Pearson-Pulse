import { KnownBlock } from "@slack/bolt";
import { DbTask } from "../../db/queries/tasks";
import { UserBriefGroup } from "../../domain/brief";

function taskLine(task: DbTask): string {
  const parts = [`*${task.task_number}*`, task.title];
  if (task.client_name) parts.push(`• Client: ${task.client_name}`);
  if (task.related_link) parts.push(`• <${task.related_link}|Related link>`);
  if (task.due_date) parts.push(`• Due ${task.due_date}`);
  return parts.join(" ");
}

function section(title: string, tasks: DbTask[]): KnownBlock[] {
  if (tasks.length === 0) return [];
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${title}*\n${tasks.map(taskLine).join("\n")}` },
    },
  ];
}

export function buildBriefBlocks(groups: UserBriefGroup[], quote: string): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "Morning brief", emoji: true },
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `_${quote}_` }],
    },
  ];

  if (groups.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "Nothing on anyone's plate right now. Enjoy the quiet." },
    });
    return blocks;
  }

  for (const group of groups) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*${group.user.display_name}*` },
    });
    blocks.push(...section("Overdue", group.overdue));
    blocks.push(...section("Due today", group.dueToday));
    blocks.push(...section("Work in progress", group.workInProgress));
    blocks.push(...section("Waiting on approval", group.waitingOnApproval));
    blocks.push(...section("Coming up (next 7 days)", group.comingUp));
    blocks.push(...section("No due date", group.noDueDate));
  }

  return blocks;
}
