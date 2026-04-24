export class Timer {
  private startTime: number = 0;
  private elapsedTime: number = 0;
  private timerInterval: number | null = null;
  private displayElement: HTMLElement;

  constructor(displayElement: HTMLElement) {
    this.displayElement = displayElement;
  }

  public start(): void {
    if (this.timerInterval !== null) return;
    this.startTime = performance.now() - this.elapsedTime;
    this.timerInterval = window.setInterval(() => {
      this.elapsedTime = performance.now() - this.startTime;
      this.updateDisplay();
    }, 1000);
  }

  public pause(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public stop(): void {
    this.pause();
  }

  public reset(): void {
    this.stop();
    this.elapsedTime = 0;
    this.updateDisplay();
  }

  public getElapsedTime(): number {
    return this.elapsedTime;
  }

  public static formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map(v => v.toString().padStart(2, '0'))
      .join(':');
  }

  private updateDisplay(): void {
    this.displayElement.textContent = Timer.formatTime(this.elapsedTime);
  }

  public saveBestTime(): boolean {
    const currentBest = localStorage.getItem('einstein-best-time');
    if (!currentBest || this.elapsedTime < parseInt(currentBest, 10)) {
      localStorage.setItem('einstein-best-time', this.elapsedTime.toString());
      return true;
    }
    return false;
  }

  public getBestTime(): number | null {
    const best = localStorage.getItem('einstein-best-time');
    return best ? parseInt(best, 10) : null;
  }
}
