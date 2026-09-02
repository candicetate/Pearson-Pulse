import { app } from "../app";
import { buildTaskBulkCreateModal } from "../views/taskBulkCreateModal";

app.command("/task-bulk", async ({ ack, body, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: buildTaskBulkCreateModal(),
  });
});
