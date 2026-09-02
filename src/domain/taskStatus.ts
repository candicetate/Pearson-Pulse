import { TaskStatus } from "../db/queries/tasks";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  proposed: "Proposed",
  open: "Open",
  in_progress: "Work in progress",
  waiting_on_approval: "Waiting on approval",
  completed: "Completed",
};

export const STATUS_ORDER: TaskStatus[] = [
  "proposed",
  "open",
  "in_progress",
  "waiting_on_approval",
  "completed",
];

export function labelForStatus(status: TaskStatus): string {
  return STATUS_LABELS[status];
}
