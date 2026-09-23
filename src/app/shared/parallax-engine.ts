import { inject, Injectable, NgZone } from '@angular/core';

interface Surface {
  options: () => { speed: number; range: number };
  visible: boolean;
}

/** All surfaces share one observer, one passive scroll listener and one frame. */
@Injectable({ providedIn: 'root' })
export class ParallaxEngine {
  private readonly zone = inject(NgZone);
  private readonly surfaces = new Map<HTMLElement, Surface>();
  private observer?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private preference?: MediaQueryList;
  private compact?: MediaQueryList;
  private frame = 0;

  register(element: HTMLElement, options: Surface['options']): () => void {
    return this.zone.runOutsideAngular(() => {
      if (!this.surfaces.size) this.start();
      this.surfaces.set(element, { options, visible: false });
      this.observer?.observe(element);
      this.resizeObserver?.observe(element);
      return () => {
        this.observer?.unobserve(element);
        this.resizeObserver?.unobserve(element);
        this.surfaces.delete(element);
        element.style.removeProperty('--parallax-y');
        element.classList.remove('parallax-active');
        if (!this.surfaces.size) this.stop();
      };
    });
  }

  private start(): void {
    if (typeof window.matchMedia !== 'function' || !('IntersectionObserver' in window)) return;
    this.preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.compact = window.matchMedia('(max-width: 767px), (pointer: coarse)');
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          const surface = this.surfaces.get(element);
          if (surface) surface.visible = entry.isIntersecting;
          element.classList.toggle(
            'parallax-active',
            entry.isIntersecting && !this.preference?.matches,
          );
        }
        this.schedule();
      },
      { rootMargin: '80px' },
    );
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(this.schedule);
      this.resizeObserver.observe(document.documentElement);
    }
    window.addEventListener('scroll', this.schedule, { passive: true });
    window.addEventListener('resize', this.schedule, { passive: true });
    this.preference.addEventListener('change', this.configure);
    this.compact.addEventListener('change', this.configure);
  }

  private readonly configure = (): void => {
    window.cancelAnimationFrame(this.frame);
    this.frame = 0;
    for (const [element, surface] of this.surfaces) {
      element.style.setProperty('--parallax-y', '0px');
      element.classList.toggle('parallax-active', surface.visible && !this.preference?.matches);
    }
    this.schedule();
  };

  private readonly schedule = (): void => {
    if (!this.frame && !this.preference?.matches) {
      this.frame = window.requestAnimationFrame(this.paint);
    }
  };

  private readonly paint = (): void => {
    this.frame = 0;
    const factor = this.compact?.matches ? 0.4 : 1;
    // Read every rectangle before writing styles to avoid repeated layout work.
    const updates: [HTMLElement, number][] = [];
    for (const [element, surface] of this.surfaces) {
      if (!surface.visible) continue;
      const rect = element.getBoundingClientRect();
      const { speed, range } = surface.options();
      // Image layers have 14% overscan; never expose their edges on small cards.
      const limit = Math.min(Math.abs(range), rect.height * 0.06) * factor;
      const distance = (window.innerHeight - rect.height) / 2 - rect.top;
      updates.push([element, Math.max(-limit, Math.min(limit, distance * speed * factor))]);
    }
    for (const [element, offset] of updates) {
      element.style.setProperty('--parallax-y', `${offset.toFixed(2)}px`);
    }
  };

  private stop(): void {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    window.cancelAnimationFrame(this.frame);
    this.frame = 0;
    window.removeEventListener('scroll', this.schedule);
    window.removeEventListener('resize', this.schedule);
    this.preference?.removeEventListener('change', this.configure);
    this.compact?.removeEventListener('change', this.configure);
  }
}
