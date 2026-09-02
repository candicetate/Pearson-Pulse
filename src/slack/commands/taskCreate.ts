import { app } from "../app";
import { listAuthorizedUsers } from "../../db/queries/users";
import { buildTaskCreateModal } from "../views/taskCreateModal";

app.command("/task-new", async ({ ack, body, client }) => {
  await ack();
  const authorizedUsers = await listAuthorizedUsers();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: buildTaskCreateModal(authorizedUsers),
  });
});
