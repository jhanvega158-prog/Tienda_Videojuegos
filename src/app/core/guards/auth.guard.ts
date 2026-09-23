import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const login = () =>
    router.createUrlTree(['/login'], { queryParams: { returnUrl: state?.url ?? '/' } });
  try {
    await auth.refresh();
  } catch (error) {
    auth.report(error);
    return login();
  }
  return auth.isAuthenticated() ? true : login();
};
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    await auth.refresh();
  } catch (error) {
    auth.report(error);
    return router.parseUrl('/login');
  }
  if (!auth.isAuthenticated()) return router.parseUrl('/login');
  return auth.isAdmin() ? true : router.parseUrl('/');
};
