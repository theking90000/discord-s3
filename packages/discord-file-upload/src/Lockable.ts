type waitAcc = () => void;

export default class Lockable {
  private isLocked = false;
  private wait: waitAcc[] = [];
  private chunkSize: number | undefined;

  protected useLock(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isLocked) {
        resolve();
      } else {
        this.wait.push(() => resolve());
      }
    });
  }

  protected lock() {
    this.isLocked = true;
  }

  protected unLock() {
    if (this.isLocked) {
      let fn = this.wait.shift();
      this.isLocked = false;
      if (fn) fn();
      this.unLock();
    }
  }
}
