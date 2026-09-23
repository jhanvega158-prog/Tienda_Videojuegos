import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../core/services/auth.service';
import { CatalogService } from '../core/services/catalog.service';
// Component tests stay offline; real Auth behavior has its own regression suite.
export function storefrontTestProviders() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  return [
    provideRouter([]),
    {
      provide: AuthService,
      useValue: {
        isAuthenticated: signal(false),
        isAdmin: signal(false),
        user: signal(null),
        profile: signal(null),
        error: signal(''),
        loading: signal(false),
        refresh: vi.fn(),
        report: vi.fn(),
      },
    },
    {
      provide: CatalogService,
      useValue: {
        games: [],
        categories: signal([]),
        collection: signal([]),
        loading: signal(false),
        error: signal(''),
        load: vi.fn(),
        find: vi.fn(),
      },
    },
  ];
}
