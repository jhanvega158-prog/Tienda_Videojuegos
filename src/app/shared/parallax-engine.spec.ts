import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ParallaxEngine } from './parallax-engine';

describe('ParallaxEngine', () => {
  let intersect: (entries: Partial<IntersectionObserverEntry>[]) => void;
  let preferenceChanged: () => void;
  let reduced: boolean;
  let compact: boolean;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  let disconnect: ReturnType<typeof vi.fn>;
  let stops: (() => void)[];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    reduced = false;
    compact = false;
    frames = new Map();
    nextFrame = 0;
    stops = [];
    disconnect = vi.fn();
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return query.includes('reduced-motion') ? reduced : compact;
      },
      addEventListener: (_: string, callback: () => void) => {
        if (query.includes('reduced-motion')) preferenceChanged = callback;
      },
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof intersect) {
          intersect = callback;
        }
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = disconnect;
      },
    );
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  });

  afterEach(() => {
    stops.forEach((stop) => stop());
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function surface(top = 0) {
    const element = document.createElement('div');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      top,
      height: 200,
      width: 400,
      left: 0,
      right: 400,
      bottom: top + 200,
      x: 0,
      y: top,
      toJSON: () => ({}),
    });
    const stop = TestBed.inject(ParallaxEngine).register(element, () => ({
      speed: 0.12,
      range: 48,
    }));
    stops.push(stop);
    intersect([{ target: element, isIntersecting: true }]);
    return { element, stop };
  }

  function flush() {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(0));
  }

  it('coalesces scroll events across surfaces and reverses direction with scrolling', () => {
    const first = surface(-1000).element;
    const second = surface(2000).element;
    for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(1);
    flush();
    expect(first.style.getPropertyValue('--parallax-y')).toBe('12.00px');
    expect(second.style.getPropertyValue('--parallax-y')).toBe('-12.00px');
  });

  it('softens movement on touch devices and ignores invisible surfaces', () => {
    compact = true;
    const element = surface(-1000).element;
    flush();
    expect(element.style.getPropertyValue('--parallax-y')).toBe('4.80px');
    intersect([{ target: element, isIntersecting: false }]);
    vi.mocked(element.getBoundingClientRect).mockClear();
    window.dispatchEvent(new Event('scroll'));
    flush();
    expect(element.getBoundingClientRect).not.toHaveBeenCalled();
  });

  it('resets immediately when reduced motion is enabled and resumes when disabled', () => {
    const element = surface(-1000).element;
    flush();
    reduced = true;
    preferenceChanged();
    expect(element.style.getPropertyValue('--parallax-y')).toBe('0px');
    expect(element.classList.contains('parallax-active')).toBe(false);
    window.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(0);
    reduced = false;
    preferenceChanged();
    flush();
    expect(element.style.getPropertyValue('--parallax-y')).toBe('12.00px');
  });

  it('cancels pending animation and removes global listeners after the final surface leaves', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { element, stop } = surface();
    stop();
    stops = [];
    expect(frames.size).toBe(0);
    expect(disconnect).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(element.style.getPropertyValue('--parallax-y')).toBe('');
    window.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(0);
  });
});
