import { DbTask, listActiveTasks } from "../db/queries/tasks";
import { getAssigneesForTasks } from "../db/queries/assignments";
import { DbUser, listAuthorizedUsers } from "../db/queries/users";
import { getCurrentDateInZone } from "../utils/time";

export interface UserBriefGroup {
  user: DbUser;
  workInProgress: DbTask[];
  waitingOnApproval: DbTask[];
  dueToday: DbTask[];
  overdue: DbTask[];
  comingUp: DbTask[];
  noDueDate: DbTask[];
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Groups every active (non-completed) task by assignee and by bucket
 * (work in progress, waiting on approval, due today, overdue, coming up in
 * the next 7 days, no due date). A task with multiple assignees appears
 * under each one, as the brief requires. Users with nothing to show are
 * left out of the result entirely, so the brief doesn't list everyone with
 * an empty section every single day.
 */
export async function buildBriefGroups(timezone: string): Promise<UserBriefGroup[]> {
  const tasks = await listActiveTasks();
  const assigneesByTask = await getAssigneesForTasks(tasks.map((t) => t.id));
  const authorizedUsers = await listAuthorizedUsers();

  const today = getCurrentDateInZone(timezone);
  const comingUpCutoff = addDays(today, 7);

  const groups = new Map<number, UserBriefGroup>();
  for (const user of authorizedUsers) {
    groups.set(user.id, {
      user,
      workInProgress: [],
      waitingOnApproval: [],
      dueToday: [],
      overdue: [],
      comingUp: [],
      noDueDate: [],
    });
  }

  for (const task of tasks) {
    const assignees = assigneesByTask.get(task.id) ?? [];
    for (const assignee of assignees) {
      const group = groups.get(assignee.id);
      if (!group) continue; // assignee was since deauthorized, skip quietly

      if (task.status === "in_progress") group.workInProgress.push(task);
      if (task.status === "waiting_on_approval") group.waitingOnApproval.push(task);

      if (task.due_date) {
        if (task.due_date === today) group.dueToday.push(task);
        else if (task.due_date < today) group.overdue.push(task);
        else if (task.due_date <= comingUpCutoff) group.comingUp.push(task);
      } else {
        group.noDueDate.push(task);
      }
    }
  }

  return Array.from(groups.values()).filter(
    (g) =>
      g.workInProgress.length ||
      g.waitingOnApproval.length ||
      g.dueToday.length ||
      g.overdue.length ||
      g.comingUp.length ||
      g.noDueDate.length
  );
}
