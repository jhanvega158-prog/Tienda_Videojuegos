import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { AuthService } from '../auth.service';

export function dbError(context: string, error: unknown): Error {
  console.error(context, error);
  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  return new Error(
    [context, e.code, e.message ?? String(error), e.details, e.hint].filter(Boolean).join(' · '),
  );
}
@Injectable({ providedIn: 'root' })
export class AdminApi {
  readonly client = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  async authorize(): Promise<void> {
    await this.auth.refresh();
    if (!this.auth.isAdmin()) throw new Error('Se requiere una sesión ADMIN activa.');
  }
  async query<T>(
    context: string,
    request: () => PromiseLike<{ data: unknown; error: unknown }>,
  ): Promise<T> {
    await this.authorize();
    const result = await request();
    if (result.error) throw dbError(context, result.error);
    return result.data as T;
  }
  async all<T>(table: string, columns = '*', filter?: (query: any) => any): Promise<T[]> {
    await this.authorize();
    const rows: T[] = [];
    const batch = 500;
    for (let start = 0; ; start += batch) {
      let query = this.client.from(table).select(columns).order('id');
      if (filter) query = filter(query);
      const result = await query.range(start, start + batch - 1);
      if (result.error) throw dbError(`public.${table} SELECT`, result.error);
      rows.push(...(result.data as T[]));
      if (result.data.length < batch) return rows;
    }
  }
  async save<T>(table: string, values: object, id?: number): Promise<T> {
    return this.query<T>(`public.${table} ${id ? 'UPDATE' : 'INSERT'}`, () =>
      id
        ? this.client.from(table).update(values).eq('id', id).select().single()
        : this.client.from(table).insert(values).select().single(),
    );
  }
}
