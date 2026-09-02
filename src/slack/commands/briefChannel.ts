import { app } from "../app";
import { DbUser } from "../../db/queries/users";
import { setBriefChannel } from "../../db/queries/settings";

// Run this command in whichever channel should receive the morning brief
// and milestone celebrations. Admin-only, since this is a channel-wide
// integration setting rather than a personal preference.
app.command("/brief-channel", async ({ command, ack, respond, context }) => {
  await ack();
  const dbUser = context.dbUser as DbUser;

  if (!dbUser.is_admin) {
    await respond({ response_type: "ephemeral", text: "Only an administrator can set the brief channel." });
    return;
  }

  await setBriefChannel(command.channel_id, dbUser.id);
  await respond({
    response_type: "in_channel",
    text: "This channel is now set to receive the morning brief and milestone celebrations.",
  });
});
