import { describe, it, expect, vi } from 'vitest';
import { SignalTracker } from '@esync/utils/disposables';

describe('SignalTracker', () => {
  it('tracks and disconnects GObject signals', () => {
    const tracker = new SignalTracker();
    expect(tracker.count).toBe(0);
    const mockObject = {
      connect: vi.fn().mockReturnValue(42),
      disconnect: vi.fn(),
    };
    const callback = vi.fn();

    const id = tracker.trackGObject(mockObject, 'changed', callback);
    expect(id).toBe(42);
    expect(tracker.count).toBe(1);
    expect(mockObject.connect).toHaveBeenCalledWith('changed', callback);

    tracker.dispose();
    expect(tracker.count).toBe(0);
    expect(mockObject.disconnect).toHaveBeenCalledWith(42);
  });

  it('catches error if GObject disconnect throws during disposal', () => {
    const tracker = new SignalTracker();
    const mockObject = {
      connect: vi.fn().mockReturnValue(1),
      disconnect: vi.fn().mockImplementation(() => {
        throw new Error('disconnect failed');
      }),
    };
    const cleanupSpy = vi.fn();

    tracker.add(cleanupSpy);
    tracker.trackGObject(mockObject, 'destroy', vi.fn());

    expect(() => tracker.dispose()).not.toThrow();
    expect(cleanupSpy).toHaveBeenCalled();
  });

  it('tracks and unsubscribes EventEmitter listeners', () => {
    const tracker = new SignalTracker();
    const mockEmitter = {
      on: vi.fn().mockReturnThis(),
      off: vi.fn().mockReturnThis(),
    };
    const listener = vi.fn();

    tracker.trackEventEmitter(mockEmitter, 'data-sync', listener);
    expect(mockEmitter.on).toHaveBeenCalledWith('data-sync', listener);

    tracker.dispose();
    expect(mockEmitter.off).toHaveBeenCalledWith('data-sync', listener);
  });

  it('catches error if EventEmitter off throws during disposal', () => {
    const tracker = new SignalTracker();
    const mockEmitter = {
      on: vi.fn().mockReturnThis(),
      off: vi.fn().mockImplementation(() => {
        throw new Error('off failed');
      }),
    };
    const cleanupSpy = vi.fn();

    tracker.add(cleanupSpy);
    tracker.trackEventEmitter(mockEmitter, 'test-event', vi.fn());

    expect(() => tracker.dispose()).not.toThrow();
    expect(cleanupSpy).toHaveBeenCalled();
  });

  it('adds and invokes function disposables', () => {
    const tracker = new SignalTracker();
    const cleanup = vi.fn();

    tracker.add(cleanup);
    tracker.dispose();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('adds and invokes Disposable objects with dispose() method', () => {
    const tracker = new SignalTracker();
    const disposableObj = {
      dispose: vi.fn(),
    };

    tracker.add(disposableObj);
    tracker.dispose();

    expect(disposableObj.dispose).toHaveBeenCalledTimes(1);
  });

  it('catches error thrown by custom disposable and continues disposing others', () => {
    const tracker = new SignalTracker();
    const throwingFn = vi.fn().mockImplementation(() => {
      throw new Error('cleanup error');
    });
    const normalFn = vi.fn();

    tracker.add(normalFn);
    tracker.add(throwingFn);

    expect(() => tracker.dispose()).not.toThrow();
    expect(throwingFn).toHaveBeenCalled();
    expect(normalFn).toHaveBeenCalled();
  });

  it('destroy alias calls dispose', () => {
    const tracker = new SignalTracker();
    const cleanup = vi.fn();

    tracker.add(cleanup);
    tracker.destroy();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('handles dispose when no items are tracked', () => {
    const tracker = new SignalTracker();
    expect(() => tracker.dispose()).not.toThrow();
  });
});
