# Slack Task Bot

A private Slack assistant for a small internal team: manual task management,
a daily brief with a team-adjustable send time, and milestone celebrations.
No AI or language model calls anywhere in this app, and no Google Drive
integration, per the revised brief.

## What's in here

- Slack Bolt (TypeScript) for the bot itself
- Postgres on Supabase for storage
- An interval-based scheduler (checks every 60 seconds, not a fixed cron
  entry) that posts the brief when the clock matches the team's configured
  time
- Static, hand-written quote and celebration message lists in `src/content/`

## 1. Create the Slack app

Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
"from scratch" in your workspace.

**OAuth & Permissions > Bot Token Scopes**, add:
- `commands` (slash commands)
- `chat:write` (post messages, including DMs to users)

**Slash Commands**, create each of these, all pointing at the same Request
URL: `https://your-deploy-url/slack/events`

| Command | Short description |
|---|---|
| `/task-new` | Create a new task |
| `/task-bulk` | Create multiple tasks from a list |
| `/task-edit` | Edit, reassign, or change the status of a task |
| `/task-list` | View active tasks (all, mine, or someone's) |
| `/brief-time` | Set the morning brief's send time (admin only) |
| `/brief-channel` | Set which channel receives the brief (admin only) |

**Interactivity & Shortcuts**: turn this on, and set the Request URL to the
same `https://your-deploy-url/slack/events`. This is what makes the modals
and the quick status buttons on `/task-list` work.

Install the app to your workspace, then copy the **Bot User OAuth Token**
(`xoxb-...`) and the **Signing Secret** from Basic Information.

## 2. Set up the database

Create a Supabase project if you don't already have one, then grab the
Postgres connection string from Project Settings > Database > Connection
string. Do not paste that string anywhere public, including chat tools, it's
a credential.

```
cp .env.example .env
# fill in SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, DATABASE_URL, SLACK_TEAM_ID
npm install
npm run migrate
```

`npm run migrate` runs `src/db/migrations/001_init.sql` once against a fresh
database. It is not written to be safely re-run, if you need schema changes
later, add a new `002_*.sql` file rather than editing or re-running `001`.

## 3. Authorize your team

There's no Slack command for granting access, on purpose: only the
administrator should be able to expand who can use the bot, and a command
that can self-authorize (or authorize others) is a bigger attack surface
than it's worth for a four-person tool. Instead:

1. Have each team member run any command once (it'll fail with "not
   authorized", that's expected, it also creates their row).
2. In the Supabase table editor, open the `users` table and set
   `is_authorized = true` for each approved person. Set `is_admin = true`
   for whoever should be able to run `/brief-time` and `/brief-channel`
   (per the brief, that's Candice).

## 4. Point the brief at a channel and time

In the channel you want the daily brief posted to, run:

```
/brief-channel
/brief-time 8:30am
```

Both are admin-only. `/brief-time` also accepts a timezone as a second
argument, e.g. `/brief-time 8:30am America/Chicago`, if you don't set one it
keeps whatever timezone is already configured (default `America/New_York`).

## 5. Deploy

This is a plain Node HTTP service, works as-is on Railway, Render, or
Fly.io.

```
npm run build
npm start
```

Set `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `DATABASE_URL`, and
`SLACK_TEAM_ID` as environment variables/secrets on whichever host you pick,
never commit `.env`. Point the host's assigned URL back at your Slack app's
Slash Command and Interactivity Request URLs (step 1).

## Command reference

- `/task-new` — opens a modal: title, description, client, link, due date,
  initial status (Proposed or Open), assignees.
- `/task-bulk` — opens a modal with one textarea, one task title per line,
  creates all of them as unassigned, status Open.
- `/task-edit TASK-001` — opens a modal pre-filled with that task's current
  values. This is the single place to rename, redescribe, reassign, change
  the due date, or move it through Proposed → Open → Work in progress →
  Waiting on approval → Completed.
- `/task-list`, `/task-list mine`, `/task-list @someone` — an ephemeral list
  of active (non-completed) tasks, each with a quick-action menu (⋮) to mark
  it work in progress, waiting on approval, or completed without opening the
  edit modal.
- `/brief-time 8:30am [timezone]` — admin only.
- `/brief-channel` — admin only, run inside the target channel.

## Design notes and deliberate simplifications

- **Billing reminders were dropped from this build**, per your last answer.
  The schema has no field for them. If you want them back later, the
  natural place is a `billing_reminder_date` column on `tasks` plus a
  section in the brief formatter, both straightforward additions.
- **Workspace lock lives in an environment variable** (`SLACK_TEAM_ID`), not
  in the `settings` table, so it can't be changed from inside Slack at all,
  only by whoever controls the deploy.
- **User authorization is managed directly in Supabase**, not via a Slack
  command, see step 3 above for why.
- **The brief skips team members with nothing to show** that day, rather
  than listing everyone with empty sections. Easy to change in
  `src/domain/brief.ts` if you'd rather always see every name.
- **`bot_state` and `settings` are single-row tables**, reasonable for one
  team on one workspace, would need to become keyed tables if this ever
  supported multiple workspaces.
- I wrote this without being able to run `npm install` or the TypeScript
  compiler myself (no network access in the environment I built this in),
  so run `npm run build` right after install to catch anything that needs a
  small fix, some of Slack Bolt's view-state types are notoriously loose
  and I made a couple of deliberate `as any` casts around them rather than
  fighting the type checker on a well-known pain point.

## What's not built yet

Straight from the brief's "after MVP" list: no acceptance-criteria items
were skipped, but if you want to extend this further, natural next steps
are a `/task-admin` command for self-service authorization (weigh that
against the security tradeoff above first), and richer due-date logic in
the brief (e.g. a "this week" bucket instead of a flat 7-day window).
