import { View } from "@slack/bolt";
import { app } from "../app";
import { DbUser } from "../../db/queries/users";
import { bulkCreateTasks } from "../../db/queries/tasks";

export const TASK_BULK_CALLBACK_ID = "task_bulk_create_modal";

export function buildTaskBulkCreateModal(): View {
  return {
    type: "modal",
    callback_id: TASK_BULK_CALLBACK_ID,
    title: { type: "plain_text", text: "New tasks (bulk)" },
    submit: { type: "plain_text", text: "Create all" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      {
        type: "input",
        block_id: "titles_block",
        label: { type: "plain_text", text: "One task title per line" },
        element: { type: "plain_text_input", action_id: "titles_input", multiline: true },
      },
    ],
  };
}

app.view(TASK_BULK_CALLBACK_ID, async ({ ack, view, context, client }) => {
  await ack();
  const dbUser = context.dbUser as DbUser;
  const values = view.state.values as any;
  const raw = values.titles_block.titles_input.value ?? "";
  const titles = raw
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean);

  if (titles.length === 0) return;

  const tasks = await bulkCreateTasks(titles, dbUser.id);
  const list = tasks.map((t) => `*${t.task_number}* ${t.title}`).join("\n");

  await client.chat.postMessage({
    channel: dbUser.slack_user_id,
    text: `Created ${tasks.length} tasks:\n${list}`,
  });
});
