import { App } from "@slack/bolt";
import { DbTask, TaskStatus, setTaskStatus } from "../db/queries/tasks";
import { incrementCompletedCount } from "../db/queries/botState";
import { getSettings } from "../db/queries/settings";
import { buildCelebrationMessage } from "../content/celebrations";

/**
 * Central place every status change should go through. Handles the
 * completed-task counter and the every-fifth-completion celebration so that
 * both the /task-edit modal and the quick-action buttons in /task-list stay
 * in sync instead of duplicating this logic.
 */
export async function changeTaskStatus(
  app: App,
  taskId: number,
  status: TaskStatus
): Promise<DbTask> {
  const { task, freshlyCompleted } = await setTaskStatus(taskId, status);

  if (freshlyCompleted) {
    const { shouldCelebrate, state } = await incrementCompletedCount();
    if (shouldCelebrate) {
      const settings = await getSettings();
      if (settings.brief_channel_id) {
        await app.client.chat.postMessage({
          channel: settings.brief_channel_id,
          text: buildCelebrationMessage(state.completed_count),
        });
      }
      // If no brief channel is configured yet, the celebration is skipped
      // rather than guessed at, since there's no safe default channel to post
      // client-facing chatter into.
    }
  }

  return task;
}
