import { safeReturnUrl } from './session-access.service';
describe('Login return URL', () => {
  it('preserves allowed internal destinations and queries', () => {
    expect(safeReturnUrl('/juego/5')).toBe('/juego/5');
    expect(safeReturnUrl('/catalogo?categoria=RPG')).toBe('/catalogo?categoria=RPG');
  });
  it('rejects external URLs, admin, login and malformed paths', () => {
    for (const url of [
      'https://example.com',
      '//example.com',
      '/\\example.com',
      '/admin',
      '/login',
      '/juego/%2Fexample.com',
      '/juego/5\n',
      null,
    ])
      expect(safeReturnUrl(url)).toBe('/');
  });
});
