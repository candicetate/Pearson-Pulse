import { View, Block, KnownBlock } from "@slack/bolt";
import { app } from "../app";
import { DbUser } from "../../db/queries/users";
import { DbTask, TaskStatus, updateTaskFields } from "../../db/queries/tasks";
import { setAssignees, getAssigneesForTask } from "../../db/queries/assignments";
import { changeTaskStatus } from "../../domain/completion";
import { STATUS_ORDER, labelForStatus } from "../../domain/taskStatus";

export const TASK_EDIT_CALLBACK_ID = "task_edit_modal";

export async function buildTaskEditModal(task: DbTask, authorizedUsers: DbUser[]): Promise<View> {
  const currentAssignees = await getAssigneesForTask(task.id);
  const currentAssigneeIds = new Set(currentAssignees.map((u) => u.id));

  const blocks: (Block | KnownBlock)[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `Editing *${task.task_number}*` },
    },
    {
      type: "input",
      block_id: "title_block",
      label: { type: "plain_text", text: "Title" },
      element: { type: "plain_text_input", action_id: "title_input", initial_value: task.title },
    },
    {
      type: "input",
      block_id: "description_block",
      optional: true,
      label: { type: "plain_text", text: "Description" },
      element: {
        type: "plain_text_input",
        action_id: "description_input",
        multiline: true,
        initial_value: task.description ?? undefined,
      },
    },
    {
      type: "input",
      block_id: "client_block",
      optional: true,
      label: { type: "plain_text", text: "Client name" },
      element: {
        type: "plain_text_input",
        action_id: "client_input",
        initial_value: task.client_name ?? undefined,
      },
    },
    {
      type: "input",
      block_id: "link_block",
      optional: true,
      label: { type: "plain_text", text: "Related link" },
      element: {
        type: "plain_text_input",
        action_id: "link_input",
        initial_value: task.related_link ?? undefined,
      },
    },
    {
      type: "input",
      block_id: "due_date_block",
      optional: true,
      label: { type: "plain_text", text: "Due date" },
      element: {
        type: "datepicker",
        action_id: "due_date_input",
        initial_date: task.due_date ?? undefined,
      },
    },
    {
      type: "input",
      block_id: "status_block",
      label: { type: "plain_text", text: "Status" },
      element: {
        type: "static_select",
        action_id: "status_input",
        initial_option: {
          text: { type: "plain_text", text: labelForStatus(task.status) },
          value: task.status,
        },
        options: STATUS_ORDER.map((s) => ({
          text: { type: "plain_text", text: labelForStatus(s) },
          value: s,
        })),
      },
    },
  ];

  if (authorizedUsers.length > 0) {
    blocks.push({
      type: "input",
      block_id: "assignees_block",
      optional: true,
      label: { type: "plain_text", text: "Assignees" },
      element: {
        type: "multi_static_select",
        action_id: "assignees_input",
        initial_options: authorizedUsers
          .filter((u) => currentAssigneeIds.has(u.id))
          .map((u) => ({ text: { type: "plain_text", text: u.display_name }, value: String(u.id) })),
        options: authorizedUsers.map((u) => ({
          text: { type: "plain_text", text: u.display_name },
          value: String(u.id),
        })),
      },
    });
  }

  return {
    type: "modal",
    callback_id: TASK_EDIT_CALLBACK_ID,
    private_metadata: JSON.stringify({ taskId: task.id }),
    title: { type: "plain_text", text: "Edit task" },
    submit: { type: "plain_text", text: "Save" },
    close: { type: "plain_text", text: "Cancel" },
    blocks,
  };
}

app.view(TASK_EDIT_CALLBACK_ID, async ({ ack, view, context, client }) => {
  await ack();
  const dbUser = context.dbUser as DbUser;
  const { taskId } = JSON.parse(view.private_metadata) as { taskId: number };
  const values = view.state.values as any;

  const title = values.title_block.title_input.value ?? undefined;
  const description = values.description_block?.description_input.value ?? null;
  const clientName = values.client_block?.client_input.value ?? null;
  const relatedLink = values.link_block?.link_input.value ?? null;
  const dueDate = values.due_date_block?.due_date_input.selected_date ?? null;
  const status = values.status_block.status_input.selected_option?.value as TaskStatus | undefined;
  const assigneeIds =
    values.assignees_block?.assignees_input.selected_options?.map((o: any) => parseInt(o.value, 10)) ?? [];

  await updateTaskFields(taskId, {
    title,
    description,
    clientName,
    relatedLink,
    dueDate,
  });

  await setAssignees(taskId, assigneeIds);

  if (status) {
    await changeTaskStatus(app, taskId, status);
  }

  await client.chat.postMessage({
    channel: dbUser.slack_user_id,
    text: `Saved changes.`,
  });
});
