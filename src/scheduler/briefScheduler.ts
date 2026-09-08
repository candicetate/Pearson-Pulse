import { App } from "@slack/bolt";
import { config } from "../config";
import { getSettings } from "../db/queries/settings";
import { claimBriefForDate, getBotState, releaseBriefClaim } from "../db/queries/botState";
import { getCurrentDateInZone, getCurrentTimeInZone } from "../utils/time";
import { buildBriefGroups } from "../domain/brief";
import { buildBriefBlocks } from "../slack/messages/briefFormatter";
import { pickQuote } from "../content/quotes";

/**
 * Polls every config.schedulerIntervalMs (default 60s) and compares the
 * current time, in the team's configured timezone, against settings.brief_time.
 * This is intentionally an interval check rather than a fixed cron entry, so
 * changing the time via /brief-time takes effect on the very next check with
 * no redeploy.
 */
export function startBriefScheduler(app: App): void {
  let tickInProgress = false;

  const tick = async () => {
    if (tickInProgress) return;
    tickInProgress = true;
    try {
      await checkAndSendBrief(app);
    } catch (err) {
      console.error("Brief scheduler tick failed:", err);
    } finally {
      tickInProgress = false;
    }
  };

  void tick();
  setInterval(() => void tick(), config.schedulerIntervalMs);

  console.log(`Brief scheduler started, checking every ${config.schedulerIntervalMs / 1000}s.`);
}

export function isBriefDue(
  currentHHMM: string,
  configuredHHMM: string,
  today: string,
  lastSentDate: string | null
): boolean {
  return currentHHMM >= configuredHHMM && lastSentDate !== today;
}

async function checkAndSendBrief(app: App): Promise<void> {
  const settings = await getSettings();
  if (!settings.brief_channel_id) return; // not configured yet, nothing to do

  const nowHHMM = getCurrentTimeInZone(settings.brief_timezone);
  const configuredHHMM = settings.brief_time.slice(0, 5); // "HH:MM:SS" -> "HH:MM"
  const today = getCurrentDateInZone(settings.brief_timezone);
  const state = await getBotState();
  if (!isBriefDue(nowHHMM, configuredHHMM, today, state.last_brief_sent_date)) return;
  if (!(await claimBriefForDate(today))) return;

  try {
    const groups = await buildBriefGroups(settings.brief_timezone);
    const { quote } = pickQuote();
    const blocks = buildBriefBlocks(groups, quote);

    await app.client.chat.postMessage({
      channel: settings.brief_channel_id,
      text: "Morning brief",
      blocks,
    });
  } catch (err) {
    await releaseBriefClaim(today);
    throw err;
  }
}
