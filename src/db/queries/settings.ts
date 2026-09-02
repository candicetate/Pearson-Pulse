import { pool } from "../client";

export interface DbSettings {
  id: number;
  brief_channel_id: string | null;
  brief_time: string; // HH:MM:SS
  brief_timezone: string;
  updated_by: number | null;
  updated_at: Date;
}

export async function getSettings(): Promise<DbSettings> {
  const result = await pool.query<DbSettings>("SELECT * FROM settings WHERE id = 1");
  return result.rows[0];
}

export async function setBriefTime(time: string, timezone: string | null, updatedBy: number): Promise<DbSettings> {
  const result = await pool.query<DbSettings>(
    `UPDATE settings
     SET brief_time = $1,
         brief_timezone = COALESCE($2, brief_timezone),
         updated_by = $3,
         updated_at = now()
     WHERE id = 1
     RETURNING *`,
    [time, timezone, updatedBy]
  );
  return result.rows[0];
}

export async function setBriefChannel(channelId: string, updatedBy: number): Promise<DbSettings> {
  const result = await pool.query<DbSettings>(
    `UPDATE settings
     SET brief_channel_id = $1, updated_by = $2, updated_at = now()
     WHERE id = 1
     RETURNING *`,
    [channelId, updatedBy]
  );
  return result.rows[0];
}
