import { app } from "../app";
import { DbUser } from "../../db/queries/users";
import { setBriefTime } from "../../db/queries/settings";
import { parseTimeInput, isValidTimezone } from "../../utils/time";

// Usage: /brief-time 8:30am
//        /brief-time 8:30am America/Chicago   (also updates the timezone)
app.command("/brief-time", async ({ command, ack, respond, context }) => {
  await ack();
  const dbUser = context.dbUser as DbUser;

  if (!dbUser.is_admin) {
    await respond({ response_type: "ephemeral", text: "Only an administrator can change the brief time." });
    return;
  }

  const args = command.text.trim().split(/\s+/).filter(Boolean);
  if (args.length === 0) {
    await respond({
      response_type: "ephemeral",
      text: "Usage: `/brief-time 8:30am` or `/brief-time 8:30am America/Chicago`",
    });
    return;
  }

  const time = parseTimeInput(args[0]);
  if (!time) {
    await respond({
      response_type: "ephemeral",
      text: `Couldn't parse "${args[0]}" as a time. Try something like \`8:30am\` or \`14:00\`.`,
    });
    return;
  }

  let timezone: string | null = null;
  if (args[1]) {
    if (!isValidTimezone(args[1])) {
      await respond({
        response_type: "ephemeral",
        text: `"${args[1]}" doesn't look like a valid timezone (expects something like \`America/Chicago\`).`,
      });
      return;
    }
    timezone = args[1];
  }

  const settings = await setBriefTime(time, timezone, dbUser.id);
  await respond({
    response_type: "in_channel",
    text: `Morning brief time updated to *${settings.brief_time.slice(0, 5)}* (${settings.brief_timezone}).`,
  });
});
