import { pool } from "../client";

export type TaskStatus =
  | "proposed"
  | "open"
  | "in_progress"
  | "waiting_on_approval"
  | "completed";

export interface DbTask {
  id: number;
  task_number: string;
  title: string;
  description: string | null;
  client_name: string | null;
  related_link: string | null;
  status: TaskStatus;
  due_date: string | null; // YYYY-MM-DD
  created_by: number;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface NewTaskInput {
  title: string;
  description?: string | null;
  clientName?: string | null;
  relatedLink?: string | null;
  status?: TaskStatus;
  dueDate?: string | null;
  createdBy: number;
}

export async function createTask(input: NewTaskInput): Promise<DbTask> {
  const result = await pool.query<DbTask>(
    `INSERT INTO tasks (title, description, client_name, related_link, status, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.title,
      input.description ?? null,
      input.clientName ?? null,
      input.relatedLink ?? null,
      input.status ?? "open",
      input.dueDate ?? null,
      input.createdBy,
    ]
  );
  return result.rows[0];
}

/** Creates several tasks at once from a plain list of titles, all unassigned and status 'open'. */
export async function bulkCreateTasks(titles: string[], createdBy: number): Promise<DbTask[]> {
  const created: DbTask[] = [];
  // Sequential rather than Promise.all so task numbers come out in the same
  // order the user typed the titles, which matters for readability.
  for (const title of titles) {
    const task = await createTask({ title, createdBy, status: "open" });
    created.push(task);
  }
  return created;
}

export async function getTaskByNumber(taskNumber: string): Promise<DbTask | null> {
  const result = await pool.query<DbTask>(
    "SELECT * FROM tasks WHERE task_number = $1",
    [taskNumber.toUpperCase()]
  );
  return result.rows[0] ?? null;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string | null;
  clientName?: string | null;
  relatedLink?: string | null;
  dueDate?: string | null;
}

export async function updateTaskFields(taskId: number, fields: TaskUpdateInput): Promise<DbTask> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const map: Record<string, unknown> = {
    title: fields.title,
    description: fields.description,
    client_name: fields.clientName,
    related_link: fields.relatedLink,
    due_date: fields.dueDate,
  };

  for (const [column, value] of Object.entries(map)) {
    if (value !== undefined) {
      sets.push(`${column} = $${i}`);
      values.push(value);
      i++;
    }
  }

  if (sets.length === 0) {
    const existing = await pool.query<DbTask>("SELECT * FROM tasks WHERE id = $1", [taskId]);
    return existing.rows[0];
  }

  values.push(taskId);
  const result = await pool.query<DbTask>(
    `UPDATE tasks SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}

/**
 * Sets a task's status. Returns whether this call was the transition that
 * FIRST completed the task (false if it was already completed), which is
 * what the milestone-celebration logic keys off of to avoid double-counting.
 */
export async function setTaskStatus(
  taskId: number,
  status: TaskStatus
): Promise<{ task: DbTask; freshlyCompleted: boolean }> {
  const current = await pool.query<DbTask>("SELECT * FROM tasks WHERE id = $1", [taskId]);
  const before = current.rows[0];
  const wasCompleted = before.status === "completed";

  const result = await pool.query<DbTask>(
    `UPDATE tasks
     SET status = $2, completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END
     WHERE id = $1
     RETURNING *`,
    [taskId, status]
  );

  const freshlyCompleted = status === "completed" && !wasCompleted;
  return { task: result.rows[0], freshlyCompleted };
}

export async function listActiveTasks(): Promise<DbTask[]> {
  const result = await pool.query<DbTask>(
    `SELECT * FROM tasks WHERE status != 'completed' ORDER BY due_date NULLS LAST, created_at`
  );
  return result.rows;
}

/** All non-completed tasks assigned to the given user id. */
export async function listActiveTasksForUser(userId: number): Promise<DbTask[]> {
  const result = await pool.query<DbTask>(
    `SELECT t.* FROM tasks t
     JOIN task_assignments a ON a.task_id = t.id
     WHERE a.user_id = $1 AND t.status != 'completed'
     ORDER BY t.due_date NULLS LAST, t.created_at`,
    [userId]
  );
  return result.rows;
}
