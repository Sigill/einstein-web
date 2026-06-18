import { formatTime } from '../misc/utils';

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

  private updateDisplay(): void {
    this.displayElement.textContent = formatTime(this.elapsedTime);
  }
}
