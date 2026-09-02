import { pool } from "../client";

export interface DbUser {
  id: number;
  slack_user_id: string;
  display_name: string;
  is_authorized: boolean;
  is_admin: boolean;
  created_at: Date;
}

export async function getUserBySlackId(slackUserId: string): Promise<DbUser | null> {
  const result = await pool.query<DbUser>(
    "SELECT * FROM users WHERE slack_user_id = $1",
    [slackUserId]
  );
  return result.rows[0] ?? null;
}

/**
 * Ensures a row exists for this Slack user, creating an unauthorized one if
 * this is their first time being seen. Authorization is granted separately
 * by the administrator, this never auto-authorizes anyone.
 */
export async function ensureUser(slackUserId: string, displayName: string): Promise<DbUser> {
  const existing = await getUserBySlackId(slackUserId);
  if (existing) {
    // Keep the display name fresh in case someone changed it in Slack.
    if (existing.display_name !== displayName) {
      const result = await pool.query<DbUser>(
        "UPDATE users SET display_name = $2 WHERE slack_user_id = $1 RETURNING *",
        [slackUserId, displayName]
      );
      return result.rows[0];
    }
    return existing;
  }

  const result = await pool.query<DbUser>(
    `INSERT INTO users (slack_user_id, display_name, is_authorized, is_admin)
     VALUES ($1, $2, FALSE, FALSE)
     RETURNING *`,
    [slackUserId, displayName]
  );
  return result.rows[0];
}

export async function listAuthorizedUsers(): Promise<DbUser[]> {
  const result = await pool.query<DbUser>(
    "SELECT * FROM users WHERE is_authorized = TRUE ORDER BY display_name"
  );
  return result.rows;
}

export async function getUsersBySlackIds(slackUserIds: string[]): Promise<DbUser[]> {
  if (slackUserIds.length === 0) return [];
  const result = await pool.query<DbUser>(
    "SELECT * FROM users WHERE slack_user_id = ANY($1::text[])",
    [slackUserIds]
  );
  return result.rows;
}
