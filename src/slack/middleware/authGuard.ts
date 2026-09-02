import { Middleware, AnyMiddlewareArgs } from "@slack/bolt";
import { config } from "../../config";
import { ensureUser } from "../../db/queries/users";

/**
 * Applied globally via app.use(authGuard). Two checks, in order:
 *  1. The event's workspace must match SLACK_TEAM_ID (an env var, not a
 *     Slack-editable setting, this is intentionally not something team
 *     members can change from inside Slack).
 *  2. The calling user must exist and be marked is_authorized in the
 *     database. New users get an (unauthorized) row created automatically
 *     the first time they're seen, so the administrator has something to
 *     flip on in the Supabase table editor.
 *
 * On failure, this acknowledges the interaction (if it needs acking) with a
 * short ephemeral-style explanation and does NOT call next(), so no
 * downstream command/action/view handler ever runs for a blocked caller.
 */
export const authGuard: Middleware<AnyMiddlewareArgs> = async (args) => {
  const { body, next } = args as AnyMiddlewareArgs & { body: any; next: () => Promise<void> };
  const ack = (args as any).ack as ((response?: unknown) => Promise<void>) | undefined;
  const respond = (args as any).respond as ((response: unknown) => Promise<void>) | undefined;
  const context = (args as any).context as Record<string, unknown>;

  const teamId: string | undefined = body.team_id ?? body.team?.id;
  const userId: string | undefined = body.user_id ?? body.user?.id;
  const userName: string | undefined =
    body.user_name ?? body.user?.username ?? body.user?.name ?? "unknown";

  const deny = async (message: string) => {
    if (ack) await ack();
    if (respond) {
      await respond({ response_type: "ephemeral", text: message });
    }
  };

  if (!teamId || teamId !== config.slackTeamId) {
    await deny("This assistant isn't available in this workspace.");
    return;
  }

  if (!userId) {
    await deny("Couldn't identify who's calling this, please try again.");
    return;
  }

  const dbUser = await ensureUser(userId, userName);
  if (!dbUser.is_authorized) {
    await deny("You're not on the approved user list for this assistant yet. Ask your administrator to authorize your account.");
    return;
  }

  context.dbUser = dbUser;
  await next();
};
