import { generatePuzzle } from '../engine/PuzzleGenerator';
import { Rule, UnderRule } from '../engine/Rules';

// Run this script with: `npx tsx src/dev/rules-stats.ts [iterations]`
// Example: `npx tsx src/dev/rules-stats.ts 10`

/**
 * Helper to count horizontal and vertical hints in the ruleset.
 */
function countHints(rules: Rule[]) {
  let horizontal = 0;
  let vertical = 0;
  for (const rule of rules) {
    if (rule instanceof UnderRule) {
      vertical++;
    } else {
      horizontal++;
    }
  }
  return { horizontal, vertical };
}

/**
 * Compute several percentiles at once using linear interpolation.
 * percentiles should be numbers in [0, 1], e.g. 0.25 for p25.
 */
function computePercentiles(values: number[], percentiles: number[]): number[] {
  const n = values.length;
  if (n === 0) return percentiles.map(() => NaN);
  if (n === 1) return percentiles.map(() => values[0]);

  const sorted = [...values].sort((a, b) => a - b);
  return percentiles.map(p => {
    if (p <= 0) return sorted[0];
    if (p >= 1) return sorted[n - 1];
    const rank = p * (n - 1);
    const lo = Math.floor(rank);
    const hi = Math.ceil(rank);
    if (lo === hi) return sorted[lo];
    const t = rank - lo;
    return sorted[lo] + t * (sorted[hi] - sorted[lo]);
  });
}

function runStatistics() {
  const sizes = [
    { numTypes: 4, numValues: 4 },
    { numTypes: 5, numValues: 5 },
    { numTypes: 5, numValues: 6 },
    { numTypes: 6, numValues: 5 },
    { numTypes: 6, numValues: 6 },
    { numTypes: 7, numValues: 7 },
  ];

  const iterationsArg = process.argv[2];
  const iterations = iterationsArg ? parseInt(iterationsArg, 10) : 100;

  console.log(`Running statistics for ${iterations} puzzles per size...`);
  console.log('----------------------------------------------------------------');

  for (const size of sizes) {
    const horizCounts: number[] = [];
    const vertCounts: number[] = [];
    const totalCounts: number[] = [];

    for (let i = 0; i < iterations; i++) {
      try {
        const { rules } = generatePuzzle(size.numTypes, size.numValues);
        const hints = countHints(rules);
        horizCounts.push(hints.horizontal);
        vertCounts.push(hints.vertical);
        totalCounts.push(rules.length);
      } catch (e) {
        console.error(`Error generating puzzle for ${size.numTypes}x${size.numValues}:`, e);
      }
    }

    const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);
    const mean = (arr: number[]) => (arr.length ? sum(arr) / arr.length : 0);
    const stddev = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const m = mean(arr);
      const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
      return Math.sqrt(Math.max(0, variance));
    };

    const horizAvg = mean(horizCounts);
    const vertAvg = mean(vertCounts);
    const totalAvg = mean(totalCounts);

    const horizStd = stddev(horizCounts);
    const vertStd = stddev(vertCounts);
    const totalStd = stddev(totalCounts);

    const horizMin = horizCounts.length ? Math.min(...horizCounts) : NaN;
    const horizMax = horizCounts.length ? Math.max(...horizCounts) : NaN;
    const vertMin = vertCounts.length ? Math.min(...vertCounts) : NaN;
    const vertMax = vertCounts.length ? Math.max(...vertCounts) : NaN;
    const totalMin = totalCounts.length ? Math.min(...totalCounts) : NaN;
    const totalMax = totalCounts.length ? Math.max(...totalCounts) : NaN;

    const [h_p10, h_p25, h_p75, h_p90] = computePercentiles(horizCounts, [0.1, 0.25, 0.75, 0.9]);
    const [v_p10, v_p25, v_p75, v_p90] = computePercentiles(vertCounts, [0.1, 0.25, 0.75, 0.9]);
    const [t_p10, t_p25, t_p75, t_p90] = computePercentiles(totalCounts, [0.1, 0.25, 0.75, 0.9]);

    const fmt = (n: number) => (Number.isNaN(n) ? 'n/a' : n.toFixed(1));
    const intFmt = (n: number) => (Number.isNaN(n) ? 'n/a' : Math.round(n).toString());

    // column widths for subfields
    const avgW = 16;
    const minmaxW = 12;
    const p25W = 12;
    const p10W = 12;
    const sep = ' | ';
    const sizeLabel = `${size.numTypes}x${size.numValues}`.padEnd(8);

    const totalGroupW = avgW + minmaxW + p25W + p10W + sep.length * 3;

    // For reliable alignment across terminals, print each category as its own block.
    const labels = () => 'Avg'.padEnd(avgW) + sep + 'Min-Max'.padEnd(minmaxW) + sep + 'p25-75'.padEnd(p25W) + sep + 'p10-90'.padEnd(p10W);

    const valuesLine = (avg: number, std: number, min: number, max: number, p25: number, p75: number, p10: number, p90: number) =>
      `${fmt(avg)} (±${fmt(std)})`.padEnd(avgW) + sep + `${intFmt(min)}-${intFmt(max)}`.padEnd(minmaxW) + sep + `${fmt(p25)}-${fmt(p75)}`.padEnd(p25W) + sep + `${fmt(p10)}-${fmt(p90)}`.padEnd(p10W);

    // Horizontal block
    console.log(sizeLabel + ' | ' + 'Horizontal');
    console.log(' '.repeat(sizeLabel.length) + ' | ' + labels());
    console.log(' '.repeat(sizeLabel.length) + ' | ' + valuesLine(horizAvg, horizStd, horizMin, horizMax, h_p25, h_p75, h_p10, h_p90));

    // Vertical block
    console.log(sizeLabel + ' | ' + 'Vertical');
    console.log(' '.repeat(sizeLabel.length) + ' | ' + labels());
    console.log(' '.repeat(sizeLabel.length) + ' | ' + valuesLine(vertAvg, vertStd, vertMin, vertMax, v_p25, v_p75, v_p10, v_p90));

    // Total block
    console.log(sizeLabel + ' | ' + 'Total');
    console.log(' '.repeat(sizeLabel.length) + ' | ' + labels());
    console.log(' '.repeat(sizeLabel.length) + ' | ' + valuesLine(totalAvg, totalStd, totalMin, totalMax, t_p25, t_p75, t_p10, t_p90));

    console.log('-'.repeat(80));
  }
}

try {
  runStatistics();
} catch (error) {
  console.error('Error running statistics:', error);
}
