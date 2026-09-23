import { Component, input } from '@angular/core';

const paths: Record<string, string> = {
  game: 'M6 8h12c2 0 3 2 3 4l1 5c.4 3-2 4-4 2l-3-3H9l-3 3c-2 2-4.4 1-4-2l1-5c0-2 1-4 3-4Z M7 10v5 M4.5 12.5h5 M16 11h.01 M19 14h.01',
  cart: 'M2 3h3l3 12h11l3-9H6 M9 20h.01 M18 20h.01',
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  user: 'M20 21v-2a7 7 0 0 0-14 0v2 M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'M6 6l12 12 M6 18 18 6',
  shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Z M8 12l3 3 5-6',
  card: 'M3 4h18v16H3V4Z M3 9h18 M7 15h4',
  library: 'M3 3h4v18H3V3Z M10 3h4v18h-4V3Z M17 4l4-1 3 17-4 1-3-17Z',
  support: 'M4 14v-3a8 8 0 0 1 16 0v3 M4 12H2v7h4v-7H4 M20 12h2v7h-4v-7h2 M20 19c0 3-4 3-8 3',
  bag: 'M4 7h16l1 14H3L4 7Z M8 7V5a4 4 0 0 1 8 0v2',
  grid: 'M3 3h7v7H3V3Z M14 3h7v7h-7V3Z M3 14h7v7H3v-7Z M14 14h7v7h-7v-7Z',
  logout: 'M9 4H3v16h6 M9 12h13 M17 7l5 5-5 5',
  check: 'M5 12l4 4L19 6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  bolt: 'm13 2-9 12h7l-1 8 10-13h-7l1-7Z',
  trophy:
    'M8 3h8v7a4 4 0 0 1-8 0V3Z M8 5H3v3a4 4 0 0 0 5 4 M16 5h5v3a4 4 0 0 1-5 4 M12 14v7 M7 21h10',
  flag: 'M5 22V3 M5 3c5-4 9 4 15 0v11c-6 4-10-4-15 0',
  compass: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M16 8l-3 5-5 3 3-5 5-3Z',
  chess: 'M5 21h14 M7 17h10l-1-7h-3l4-5-5-3-5 6v3h3l-3 6Z',
  skull: 'M5 15a9 9 0 1 1 14 0v6H5v-6Z M8 10h.01 M16 10h.01 M9 17v4 M15 17v4',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2',
};
@Component({
  selector: 'app-icon',
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="path" /></svg>',
  styles: [
    ':host{display:inline-flex;flex:none;width:1.3em;height:1.3em;vertical-align:middle}svg{width:100%;height:100%;overflow:visible}',
  ],
})
export class Icon {
  readonly name = input('game');
  get path(): string {
    return paths[this.name()] ?? paths['game'];
  }
}
