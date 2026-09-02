import { app } from "../app";
import { TaskStatus } from "../../db/queries/tasks";
import { changeTaskStatus } from "../../domain/completion";
import { labelForStatus } from "../../domain/taskStatus";

app.action("quick_status", async ({ ack, body, respond }) => {
  await ack();

  const action = (body as any).actions?.[0];
  const value: string | undefined = action?.selected_option?.value;
  if (!value) return;

  const [taskIdStr, status] = value.split(":");
  const taskId = parseInt(taskIdStr, 10);

  const task = await changeTaskStatus(app, taskId, status as TaskStatus);

  await respond({
    response_type: "ephemeral",
    replace_original: false,
    text: `${task.task_number} marked ${labelForStatus(task.status)}.`,
  });
});
