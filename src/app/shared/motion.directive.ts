import { ParallaxEngine } from './parallax-engine';
import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  NgZone,
  Renderer2,
  RendererStyleFlags2,
} from '@angular/core';

@Directive({ selector: '[appParallax]' })
export class Parallax {
  readonly parallaxSpeed = input(0.12);
  readonly parallaxRange = input(48);
  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly motion = inject(ParallaxEngine);
  private readonly destroy = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const stop = this.motion.register(this.element, () => ({
        speed: this.parallaxSpeed(),
        range: this.parallaxRange(),
      }));
      this.destroy.onDestroy(stop);
    });
  }
}

@Directive({ selector: '[appReveal]' })
export class Reveal {
  readonly revealDelay = input(0);
  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly zone = inject(NgZone);
  private readonly destroy = inject(DestroyRef);

  constructor() {
    afterNextRender(() =>
      this.zone.runOutsideAngular(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (media.matches || !('IntersectionObserver' in window)) return;
        this.renderer.addClass(this.element, 'motion-reveal');
        this.renderer.setStyle(
          this.element,
          '--reveal-delay',
          `${Math.min(180, Math.max(0, this.revealDelay()))}ms`,
          RendererStyleFlags2.DashCase,
        );
        const show = () => {
          this.renderer.addClass(this.element, 'is-revealed');
          observer.disconnect();
        };
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) show();
          },
          { threshold: 0.08 },
        );
        observer.observe(this.element);
        // Keyboard users can focus a link before its observer notification arrives.
        const stopFocus = this.renderer.listen(this.element, 'focusin', show);
        const onPreference = () => {
          if (media.matches) show();
        };
        media.addEventListener('change', onPreference);
        this.destroy.onDestroy(() => {
          observer.disconnect();
          stopFocus();
          media.removeEventListener('change', onPreference);
        });
      }),
    );
  }
}

@Directive({ selector: '[appScrollSurface]' })
export class ScrollSurface {
  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly zone = inject(NgZone);
  private readonly destroy = inject(DestroyRef);

  constructor() {
    afterNextRender(() =>
      this.zone.runOutsideAngular(() => {
        let previous: boolean | undefined;
        const update = () => {
          const scrolled = window.scrollY > 24;
          if (scrolled === previous) return;
          previous = scrolled;
          if (scrolled) this.renderer.addClass(this.element, 'is-scrolled');
          else this.renderer.removeClass(this.element, 'is-scrolled');
        };
        update();
        this.destroy.onDestroy(this.renderer.listen('window', 'scroll', update, { passive: true }));
      }),
    );
  }
}
