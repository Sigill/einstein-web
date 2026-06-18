function localstorageKey(withAssistance: boolean, configKey: string): string {
  const base = withAssistance ? 'einstein-best-time-assisted' : 'einstein-best-time';
  return configKey ? `${base}-${configKey}` : base;
}

export function saveBestTime(elapsedTime: number, withAssistance: boolean, configKey: string): boolean {
  const key = localstorageKey(withAssistance, configKey);
  const currentBest = localStorage.getItem(key);
  if (!currentBest || elapsedTime < parseInt(currentBest, 10)) {
    localStorage.setItem(key, elapsedTime.toString());
    return true;
  }
  return false;
}

export function getBestTime(withAssistance: boolean, configKey: string): number | null {
  const key = localstorageKey(withAssistance, configKey);
  const best = localStorage.getItem(key);
  return best ? parseInt(best, 10) : null;
}
