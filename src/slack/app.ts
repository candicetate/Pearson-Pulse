import { App } from "@slack/bolt";
import { config } from "../config";

// Bolt's default receiver exposes a single HTTP endpoint (POST /slack/events)
// that handles slash commands, block actions, and view submissions alike.
// In your Slack app config, point both the Slash Command "Request URL" and
// the Interactivity "Request URL" at https://your-deploy-url/slack/events.
export const app = new App({
  token: config.slackBotToken,
  signingSecret: config.slackSigningSecret,
});
