import { type Equipment } from "./model";
const cents = (weight: number) => Math.round(weight * 100);
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
// Reduce the integer-cent grid by the plate GCD so standard equipment needs
// tens of states instead of thousands. This also handles non-greedy inventories.
function reachable(perSide: number, available: number[]) {
  const coins = [...new Set(available.map(cents))]
    .filter((p) => p > 0)
    .sort((a, b) => b - a);
  const step = coins.reduce(gcd, 0) || 1;
  const limit = Math.max(0, Math.floor((perSide * 100) / step + 1e-6));
  const counts = new Int32Array(limit + 1).fill(-1),
    previous = new Int32Array(limit + 1);
  counts[0] = 0;
  for (let n = 1; n <= limit; n++)
    for (const coin of coins) {
      const scaled = coin / step;
      if (
        scaled <= n &&
        counts[n - scaled] >= 0 &&
        (counts[n] === -1 || counts[n - scaled] + 1 < counts[n])
      ) {
        counts[n] = counts[n - scaled] + 1;
        previous[n] = scaled;
      }
    }
  return { counts, previous, step };
}
export function plateLoad(weight: number, bar: number, available: number[]) {
  if (weight < bar)
    return { plates: [] as number[], actual: bar, exact: false };
  const { counts, previous, step } = reachable((weight - bar) / 2, available);
  let n = counts.length - 1;
  while (n > 0 && counts[n] === -1) n--;
  const actual = Math.round((bar + (n * step) / 50) * 100) / 100,
    plates: number[] = [];
  for (let cursor = n; cursor > 0; cursor -= previous[cursor])
    plates.push((previous[cursor] * step) / 100);
  return {
    plates: plates.sort((a, b) => b - a),
    actual,
    exact: Math.abs(actual - weight) < 0.001,
  };
}
export function nearestLoad(
  weight: number,
  equipment: Equipment,
  increment: number,
) {
  const bar = equipment.bars[equipment.barIndex].weight;
  const upper = Math.min(
    10000,
    Math.max(weight, bar) + 2 * Math.max(...equipment.plates) + increment,
  );
  const { counts, step } = reachable((upper - bar) / 2, equipment.plates);
  let best = bar,
    bestDistance = Infinity,
    fallback = bar,
    fallbackDistance = Infinity;
  for (let n = 0; n < counts.length; n++)
    if (counts[n] >= 0) {
      const total = Math.round((bar + (n * step) / 50) * 100) / 100,
        distance = Math.abs(total - weight);
      // Prefer the heavier candidate for exact ties, matching normal rounding.
      if (distance <= fallbackDistance + 1e-8) {
        fallback = total;
        fallbackDistance = distance;
      }
      if (
        Math.abs(total / increment - Math.round(total / increment)) < 1e-6 &&
        distance <= bestDistance + 1e-8
      ) {
        best = total;
        bestDistance = distance;
      }
    }
  // Odd specialty bars may have no load aligned with the requested increment.
  // Actual, balanced equipment takes precedence over an impossible increment.
  return Number.isFinite(bestDistance) ? best : fallback;
}
