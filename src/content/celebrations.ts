// Static, hand-written celebration lines, picked randomly whenever the team
// crosses another multiple of five completed tasks. Use {count} as a
// placeholder for the running total, it gets substituted at send time.
export const CELEBRATIONS: string[] = [
  "{count} tasks down. At this rate the to-do list is going to file a complaint.",
  "That's {count} completed. Somewhere, a spreadsheet is smiling.",
  "{count} tasks closed out. Go take a lap, you earned it.",
  "Milestone unlocked: {count} tasks completed. No confetti budget, but the sentiment's there.",
  "{count} down. The backlog is officially on notice.",
  "That's {count} completed tasks. Efficiency level: mildly terrifying.",
  "{count} tasks finished. Someone give this team a gold star, or at least a coffee.",
  "Just crossed {count} completed tasks. The list is shrinking, not growing, which is rare and good.",
  "{count} tasks wrapped up. Not bad for a team that also has actual client work to do.",
  "That's {count} completions. Whoever is doing the most closing lately, we see you.",
];

export function buildCelebrationMessage(count: number): string {
  const template = CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)];
  return template.replace("{count}", String(count));
}
