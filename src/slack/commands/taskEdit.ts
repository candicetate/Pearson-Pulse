import { app } from "../app";
import { getTaskByNumber } from "../../db/queries/tasks";
import { listAuthorizedUsers } from "../../db/queries/users";
import { buildTaskEditModal } from "../views/taskEditModal";

// Usage: /task-edit TASK-001
// This is the single central command for editing any field, reassigning,
// and changing status (work in progress / waiting on approval / completed).
app.command("/task-edit", async ({ ack, body, command, client, respond }) => {
  await ack();

  const taskNumber = command.text.trim();
  if (!taskNumber) {
    await respond({ response_type: "ephemeral", text: "Usage: `/task-edit TASK-001`" });
    return;
  }

  const task = await getTaskByNumber(taskNumber);
  if (!task) {
    await respond({ response_type: "ephemeral", text: `Couldn't find a task numbered "${taskNumber}".` });
    return;
  }

  const authorizedUsers = await listAuthorizedUsers();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: await buildTaskEditModal(task, authorizedUsers),
  });
});
