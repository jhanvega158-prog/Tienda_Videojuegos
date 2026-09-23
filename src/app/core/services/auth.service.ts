import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface Profile {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  id_rol: number;
  activo: boolean;
  fecha_registro: string;
  auth_id: string;
}
export interface Registration {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly client = inject(SupabaseService).client;
  private readonly router = inject(Router);
  private readonly sessionState = signal<Session | null>(null);
  private readonly userState = signal<User | null>(null);
  private readonly profileState = signal<Profile | null>(null);
  readonly session = this.sessionState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly profile = this.profileState.asReadonly();
  readonly role = computed(() => this.profile()?.id_rol ?? null);
  readonly isAuthenticated = computed(() => !!this.session() && !!this.user() && this.profile()?.activo === true);
  readonly loggedIn = this.isAuthenticated;
  readonly isAdmin = computed(() => this.isAuthenticated() && this.role() === 1);
  readonly error = signal('');
  readonly loading = signal(true);
  private revision = 0;
  private pending: Promise<void> | null = null;
  readonly ready: Promise<void>;

  constructor() {
    // Keep the callback synchronous: Auth holds a lock while delivering events.
    const { data } = this.client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        this.clear();
        return;
      }
      setTimeout(() => { void this.refresh().catch(error => this.report(error)); }, 0);
    });
    inject(DestroyRef).onDestroy(() => data.subscription.unsubscribe());
    this.ready = this.refresh().catch(error => this.report(error));
  }

  private clear(): void {
    this.revision++;
    this.sessionState.set(null);
    this.userState.set(null);
    this.profileState.set(null);
  }

  report(error: unknown): void {
    console.error('Autenticacion:', error);
    const message = error && typeof error === 'object' && 'message' in error
      ? String(error.message) : 'No se pudo completar la autenticación.';
    this.error.set(message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.'
      : message === 'Email not confirmed' ? 'Confirma tu correo antes de iniciar sesión.' : message);
  }

  // Revalidate against Auth and the database; never authorize with the old jjc-user cache.
  refresh(): Promise<void> {
    if (this.pending) return this.pending;
    this.loading.set(true);
    this.pending = this.restore().finally(() => {
      this.pending = null;
      this.loading.set(false);
    });
    return this.pending;
  }

  private async restore(): Promise<void> {
    const revision = this.revision;
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;
      if (revision !== this.revision) return;
      if (!data.session) { this.clear(); return; }
      const verified = await this.client.auth.getUser();
      if (verified.error) throw verified.error;
      const result = await this.client.from('usuarios').select('*')
        .eq('auth_id', verified.data.user.id).maybeSingle();
      if (result.error) {
        console.error('public.usuarios SELECT por auth_id:', result.error);
        throw result.error;
      }
      if (revision !== this.revision) return;
      if (!result.data) throw new Error('No se encontró tu perfil en public.usuarios. Revisa el trigger y la política SELECT por auth_id.');
      const profile = result.data as Profile;
      if (profile.activo !== true) {
        this.clear();
        const signedOut = await this.client.auth.signOut();
        if (signedOut.error) console.error('Cerrar sesión de cuenta desactivada:', signedOut.error);
        throw new Error('Tu cuenta se encuentra desactivada.');
      }
      if (profile.id_rol !== 1 && profile.id_rol !== 2) throw new Error('El perfil tiene un rol no reconocido.');
      this.sessionState.set(data.session);
      this.userState.set(verified.data.user);
      this.profileState.set(profile);
      this.error.set('');
    } catch (error) {
      if (revision === this.revision) this.clear();
      throw error;
    }
  }

  async register(input: Registration): Promise<{ confirmationRequired: boolean }> {
    await this.ready;
    this.error.set('');
    const { data, error } = await this.client.auth.signUp({
      email: input.correo.trim(), password: input.password,
      options: { data: { nombre: input.nombre.trim(), apellido: input.apellido.trim(), telefono: input.telefono.trim() } }
    });
    if (error) throw error;
    if (data.session) await this.refresh();
    return { confirmationRequired: !data.session };
  }

  async login(email: string, password: string): Promise<void> {
    await this.ready;
    this.error.set('');
    const { error } = await this.client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    await this.refresh();
    if (!this.isAuthenticated()) throw new Error('No se pudo validar la sesión y el perfil.');
  }

  async logout(): Promise<void> {
    this.error.set('');
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
    this.clear();
    await this.router.navigateByUrl('/');
  }

  async getSession(): Promise<Session | null> { await this.refresh(); return this.session(); }
  async getCurrentUser(): Promise<User | null> { await this.refresh(); return this.user(); }
  async getProfile(): Promise<Profile | null> { await this.refresh(); return this.profile(); }
}
