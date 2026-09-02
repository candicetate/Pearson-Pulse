import { pool } from "../client";
import { DbUser } from "./users";

/** Replaces a task's full assignee list with the given set of user ids (used by both initial assignment and reassignment). */
export async function setAssignees(taskId: number, userIds: number[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM task_assignments WHERE task_id = $1", [taskId]);
    for (const userId of userIds) {
      await client.query(
        "INSERT INTO task_assignments (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [taskId, userId]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getAssigneesForTask(taskId: number): Promise<DbUser[]> {
  const result = await pool.query<DbUser>(
    `SELECT u.* FROM users u
     JOIN task_assignments a ON a.user_id = u.id
     WHERE a.task_id = $1
     ORDER BY u.display_name`,
    [taskId]
  );
  return result.rows;
}

/** Assignee lists for many tasks at once, keyed by task id. Used to build the morning brief without an N+1 query pattern. */
export async function getAssigneesForTasks(taskIds: number[]): Promise<Map<number, DbUser[]>> {
  const map = new Map<number, DbUser[]>();
  if (taskIds.length === 0) return map;

  const result = await pool.query<DbUser & { task_id: number }>(
    `SELECT u.*, a.task_id FROM users u
     JOIN task_assignments a ON a.user_id = u.id
     WHERE a.task_id = ANY($1::int[])
     ORDER BY u.display_name`,
    [taskIds]
  );

  for (const row of result.rows) {
    const list = map.get(row.task_id) ?? [];
    list.push(row);
    map.set(row.task_id, list);
  }
  return map;
}
