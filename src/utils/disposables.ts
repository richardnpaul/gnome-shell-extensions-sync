export interface Disposable {
  dispose(): void;
}

export interface GObjectSignaler {
  connect(signal: string, callback: (...args: any[]) => void): number;
  disconnect(id: number): void;
}

export interface EventEmitterSignaler {
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
}

export class SignalTracker implements Disposable {
  private disposables: Array<() => void> = [];

  trackGObject(object: GObjectSignaler, signal: string, callback: (...args: any[]) => void): number {
    const id = object.connect(signal, callback);
    this.disposables.push(() => {
      try {
        object.disconnect(id);
      } catch {}
    });
    return id;
  }

  trackEventEmitter(emitter: EventEmitterSignaler, event: string | symbol, listener: (...args: any[]) => void): void {
    emitter.on(event, listener);
    this.disposables.push(() => {
      try {
        emitter.off(event, listener);
      } catch {}
    });
  }

  add(disposable: Disposable | (() => void)): void {
    if (typeof disposable === 'function') {
      this.disposables.push(disposable);
    } else {
      this.disposables.push(() => disposable.dispose());
    }
  }

  get count(): number {
    return this.disposables.length;
  }

  dispose(): void {
    while (this.disposables.length > 0) {
      const cleanup = this.disposables.pop()!;
      try {
        cleanup();
      } catch {}
    }
  }

  destroy(): void {
    this.dispose();
  }
}
