import { app } from "./slack/app";
import { config } from "./config";
import { authGuard } from "./slack/middleware/authGuard";
import { startBriefScheduler } from "./scheduler/briefScheduler";

app.use(authGuard);

// Each of these files registers its own command/action/view handler on
// `app` as a side effect of being imported. Order doesn't affect the auth
// middleware, that always runs first for every listener regardless of
// import order.
import "./slack/commands/taskCreate";
import "./slack/commands/taskBulkCreate";
import "./slack/commands/taskEdit";
import "./slack/commands/taskList";
import "./slack/commands/briefTime";
import "./slack/commands/briefChannel";
import "./slack/views/taskCreateModal";
import "./slack/views/taskBulkCreateModal";
import "./slack/views/taskEditModal";
import "./slack/actions/taskStatusActions";

async function main() {
  await app.start(config.port);
  console.log(`Slack task bot running on port ${config.port}`);
  startBriefScheduler(app);
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
