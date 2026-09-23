import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { adminGuard, authGuard } from '../guards/auth.guard';

// No network, passwords or real session tokens are used in these regression tests.
describe('Supabase authentication and authorization', () => {
  let service: AuthService;
  let callback: (event: string) => void;
  let session: any;
  let profile: any;
  let client: any;
  let query: any;
  const router = {
    navigateByUrl: vi.fn(),
    parseUrl: (url: string) => url,
    createUrlTree: (commands: string[], options: any) =>
      commands[0] + '?returnUrl=' + encodeURIComponent(options.queryParams.returnUrl),
  };
  beforeEach(async () => {
    session = null;
    profile = { id: 10, auth_id: 'auth-client', nombre: 'Prueba', id_rol: 2, activo: true };
    query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: profile, error: null })),
    };
    client = {
      from: vi.fn(() => query),
      auth: {
        onAuthStateChange: vi.fn((fn) => {
          callback = fn;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        getSession: vi.fn(async () => ({ data: { session }, error: null })),
        getUser: vi.fn(async () => ({ data: { user: { id: 'auth-client' } }, error: null })),
        signInWithPassword: vi.fn(async () => {
          session = { user: { id: 'auth-client' } };
          return { error: null };
        }),
        signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
        signOut: vi.fn(async () => {
          session = null;
          callback('SIGNED_OUT');
          return { error: null };
        }),
      },
    };
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: { client } },
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(AuthService);
    await service.ready;
  });
  it('logs in with a verified user and the profile matched by auth_id', async () => {
    await service.login('cliente@example.com', 'test-password');
    expect(client.auth.getUser).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith('auth_id', 'auth-client');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.isAdmin()).toBe(false);
  });
  it('sends only customer metadata and handles email confirmation', async () => {
    const result = await service.register({
      nombre: 'Ana',
      apellido: 'Prueba',
      telefono: '',
      correo: 'ana@example.com',
      password: 'test-password',
    });
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'test-password',
      options: { data: { nombre: 'Ana', apellido: 'Prueba', telefono: '' } },
    });
    expect(result.confirmationRequired).toBe(true);
    expect(client.from).not.toHaveBeenCalled();
  });
  it('handles registration with an immediate session', async () => {
    client.auth.signUp.mockImplementation(async () => {
      session = { user: { id: 'auth-client' } };
      return { data: { session }, error: null };
    });
    const result = await service.register({
      nombre: 'Ana',
      apellido: 'Prueba',
      telefono: '',
      correo: 'ana@example.com',
      password: 'test-password',
    });
    expect(result.confirmationRequired).toBe(false);
    expect(service.role()).toBe(2);
  });
  it('signs out disabled accounts', async () => {
    profile.activo = false;
    await expect(service.login('cliente@example.com', 'test-password')).rejects.toThrow(
      'Tu cuenta se encuentra desactivada.',
    );
    expect(client.auth.signOut).toHaveBeenCalled();
    expect(service.isAuthenticated()).toBe(false);
  });
  it('fails closed when RLS hides a profile', async () => {
    profile = null;
    await expect(service.login('cliente@example.com', 'test-password')).rejects.toThrow(
      'No se encontró tu perfil',
    );
    expect(service.isAuthenticated()).toBe(false);
  });
  it('restores a stored Supabase session and clears it on logout', async () => {
    session = { user: { id: 'auth-client' } };
    await service.refresh();
    expect(service.isAuthenticated()).toBe(true);
    await service.logout();
    expect(service.session()).toBeNull();
    expect(service.profile()).toBeNull();
    expect(service.role()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
  it('redirects anonymous requests to login', async () => {
    expect(
      await TestBed.runInInjectionContext(() => (authGuard as any)({}, { url: '/checkout' })),
    ).toBe('/login?returnUrl=%2Fcheckout');
    expect(await TestBed.runInInjectionContext(() => (adminGuard as any)())).toBe('/login');
  });
  it('blocks CLIENTE and permits only ADMIN with a current database profile', async () => {
    await service.login('cliente@example.com', 'test-password');
    expect(await TestBed.runInInjectionContext(() => (adminGuard as any)())).toBe('/');
    profile = { ...profile, id_rol: 1 };
    expect(await TestBed.runInInjectionContext(() => (adminGuard as any)())).toBe(true);
    profile = { ...profile, id_rol: 2 };
    expect(await TestBed.runInInjectionContext(() => (adminGuard as any)())).toBe('/');
  });
  it('does not trust a session when Auth rejects the user', async () => {
    client.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid token'),
    });
    await expect(service.login('cliente@example.com', 'test-password')).rejects.toThrow(
      'Invalid token',
    );
    expect(service.isAuthenticated()).toBe(false);
  });
});
