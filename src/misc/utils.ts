export function shuffleArray<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

export function iota(n: number): Array<number> {
  const values: Array<number> = [];
  for (let i = 0; i < n; i++) {
    values.push(i);
  }
  return values;
}
