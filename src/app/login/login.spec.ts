import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { Login } from './login';
import { AuthService } from '../core/services/auth.service';
describe('Login destinations', () => {
  for (const admin of [false, true])
    it(
      admin ? 'keeps ADMIN dashboard redirect' : 'returns CLIENTE to the requested game',
      async () => {
        const router = { navigateByUrl: vi.fn() };
        TestBed.configureTestingModule({
          providers: [
            { provide: Router, useValue: router },
            {
              provide: ActivatedRoute,
              useValue: {
                snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/juego/2' }) },
              },
            },
            {
              provide: AuthService,
              useValue: { login: vi.fn(), isAdmin: () => admin, report: vi.fn() },
            },
          ],
        });
        const page = TestBed.runInInjectionContext(() => new Login());
        page.form.setValue({ correo: 'test@example.com', password: 'temporary' });
        await page.login();
        expect(router.navigateByUrl).toHaveBeenCalledWith(admin ? '/admin' : '/juego/2');
      },
    );
});
