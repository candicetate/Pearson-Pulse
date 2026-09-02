import { View, Block, KnownBlock } from "@slack/bolt";
import { app } from "../app";
import { DbUser } from "../../db/queries/users";
import { createTask, TaskStatus } from "../../db/queries/tasks";
import { setAssignees } from "../../db/queries/assignments";

export const TASK_CREATE_CALLBACK_ID = "task_create_modal";

export function buildTaskCreateModal(authorizedUsers: DbUser[]): View {
  const blocks: (Block | KnownBlock)[] = [
    {
      type: "input",
      block_id: "title_block",
      label: { type: "plain_text", text: "Title" },
      element: { type: "plain_text_input", action_id: "title_input" },
    },
    {
      type: "input",
      block_id: "description_block",
      optional: true,
      label: { type: "plain_text", text: "Description" },
      element: { type: "plain_text_input", action_id: "description_input", multiline: true },
    },
    {
      type: "input",
      block_id: "client_block",
      optional: true,
      label: { type: "plain_text", text: "Client name" },
      element: { type: "plain_text_input", action_id: "client_input" },
    },
    {
      type: "input",
      block_id: "link_block",
      optional: true,
      label: { type: "plain_text", text: "Related link" },
      element: { type: "plain_text_input", action_id: "link_input" },
    },
    {
      type: "input",
      block_id: "due_date_block",
      optional: true,
      label: { type: "plain_text", text: "Due date" },
      element: { type: "datepicker", action_id: "due_date_input" },
    },
    {
      type: "input",
      block_id: "status_block",
      label: { type: "plain_text", text: "Status" },
      element: {
        type: "static_select",
        action_id: "status_input",
        initial_option: { text: { type: "plain_text", text: "Open" }, value: "open" },
        options: [
          { text: { type: "plain_text", text: "Proposed" }, value: "proposed" },
          { text: { type: "plain_text", text: "Open" }, value: "open" },
        ],
      },
    },
  ];

  // multi_static_select requires at least one option, so only add the
  // assignees field once there's someone authorized to assign to.
  if (authorizedUsers.length > 0) {
    blocks.push({
      type: "input",
      block_id: "assignees_block",
      optional: true,
      label: { type: "plain_text", text: "Assignees" },
      element: {
        type: "multi_static_select",
        action_id: "assignees_input",
        options: authorizedUsers.map((u) => ({
          text: { type: "plain_text", text: u.display_name },
          value: String(u.id),
        })),
      },
    });
  }

  return {
    type: "modal",
    callback_id: TASK_CREATE_CALLBACK_ID,
    title: { type: "plain_text", text: "New task" },
    submit: { type: "plain_text", text: "Create" },
    close: { type: "plain_text", text: "Cancel" },
    blocks,
  };
}

app.view(TASK_CREATE_CALLBACK_ID, async ({ ack, view, context, client }) => {
  await ack();
  const dbUser = context.dbUser as DbUser;
  // Bolt types view.state.values as a union across every possible block
  // element, which makes indexing by our own block/action ids awkward.
  // Casting to any here is deliberate, not an oversight.
  const values = view.state.values as any;

  const title = values.title_block.title_input.value ?? "";
  const description = values.description_block?.description_input.value || null;
  const clientName = values.client_block?.client_input.value || null;
  const relatedLink = values.link_block?.link_input.value || null;
  const dueDate = values.due_date_block?.due_date_input.selected_date || null;
  const status = (values.status_block.status_input.selected_option?.value as TaskStatus) || "open";
  const assigneeIds =
    values.assignees_block?.assignees_input.selected_options?.map((o: any) => parseInt(o.value, 10)) ?? [];

  const task = await createTask({
    title,
    description,
    clientName,
    relatedLink,
    dueDate,
    status,
    createdBy: dbUser.id,
  });

  if (assigneeIds.length > 0) {
    await setAssignees(task.id, assigneeIds);
  }

  await client.chat.postMessage({
    channel: dbUser.slack_user_id,
    text: `Created *${task.task_number}*: ${task.title}`,
  });
});
