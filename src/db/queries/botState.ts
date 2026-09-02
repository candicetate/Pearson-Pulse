import { pool } from "../client";

export interface DbBotState {
  id: number;
  completed_count: number;
  last_celebrated_count: number;
  last_brief_sent_date: string | null; // YYYY-MM-DD
  updated_at: Date;
}

export async function getBotState(): Promise<DbBotState> {
  const result = await pool.query<DbBotState>("SELECT * FROM bot_state WHERE id = 1");
  return result.rows[0];
}

/**
 * Atomically bumps completed_count by one and reports back whether this
 * crossed a multiple-of-five milestone that hasn't been celebrated yet.
 * Locking the row for the duration of the transaction keeps two
 * simultaneous completions from both claiming the same milestone.
 */
export async function incrementCompletedCount(): Promise<{ state: DbBotState; shouldCelebrate: boolean }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query<DbBotState>(
      "SELECT * FROM bot_state WHERE id = 1 FOR UPDATE"
    );
    const current = locked.rows[0];
    const newCount = current.completed_count + 1;
    const shouldCelebrate = newCount % 5 === 0 && newCount > current.last_celebrated_count;

    const updated = await client.query<DbBotState>(
      `UPDATE bot_state
       SET completed_count = $1,
           last_celebrated_count = CASE WHEN $2 THEN $1 ELSE last_celebrated_count END,
           updated_at = now()
       WHERE id = 1
       RETURNING *`,
      [newCount, shouldCelebrate]
    );

    await client.query("COMMIT");
    return { state: updated.rows[0], shouldCelebrate };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function markBriefSent(dateStr: string): Promise<void> {
  await pool.query(
    "UPDATE bot_state SET last_brief_sent_date = $1, updated_at = now() WHERE id = 1",
    [dateStr]
  );
}
