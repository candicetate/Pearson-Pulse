// Static, hand-written quotes. Cycled/randomized at send time, never
// generated live. Add, remove, or edit freely, this is just a plain array.
export const QUOTES: string[] = [
  "Small steps, repeated daily, beat big plans that never start.",
  "Done is a decision, not an accident.",
  "The inbox will always refill. Progress on what matters won't wait for it to empty.",
  "You don't need more hours, you need one clear next step.",
  "Momentum is built one finished task at a time.",
  "Good work today beats perfect work someday.",
  "Clear the small stuff so the big stuff has room to breathe.",
  "Every task closed is one less thing living rent-free in your head.",
  "Progress rarely feels dramatic while it's happening.",
  "Today's list doesn't need to be impressive, just true.",
  "The best time to start was earlier. The next best time is now.",
  "Focus is choosing what to ignore for the next hour.",
  "Consistency quietly outperforms intensity.",
  "You've handled harder days than this one.",
  "One task, fully finished, beats five tasks half-started.",
];

/** Deterministic-ish pick that avoids repeating the same quote as yesterday when a lastIndex is supplied. */
export function pickQuote(excludeIndex?: number): { quote: string; index: number } {
  let index = Math.floor(Math.random() * QUOTES.length);
  if (QUOTES.length > 1 && index === excludeIndex) {
    index = (index + 1) % QUOTES.length;
  }
  return { quote: QUOTES[index], index };
}
