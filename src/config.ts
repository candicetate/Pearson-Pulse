import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  slackBotToken: required("SLACK_BOT_TOKEN"),
  slackSigningSecret: required("SLACK_SIGNING_SECRET"),
  slackTeamId: required("SLACK_TEAM_ID"),
  databaseUrl: required("DATABASE_URL"),
  port: Number(process.env.PORT ?? 3000),
  // How often the scheduler checks the clock against the configured brief
  // time. 60 seconds keeps the brief accurate to the minute without hammering
  // the database.
  schedulerIntervalMs: 60_000,
};
