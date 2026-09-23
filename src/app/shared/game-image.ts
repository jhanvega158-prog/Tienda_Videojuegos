import { Directive, ElementRef, HostListener, inject } from '@angular/core';
@Directive({ selector: 'img[appGameImage]' })
export class GameImage {
  private readonly image = inject<ElementRef<HTMLImageElement>>(ElementRef);
  @HostListener('error') fallback() {
    const img = this.image.nativeElement;
    if (!img.src.endsWith('/images/game-placeholder.svg')) img.src = '/images/game-placeholder.svg';
  }
}
