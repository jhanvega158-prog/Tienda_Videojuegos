import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Game } from '../../models/store.models';
import { Categoria, Producto } from '../../models/admin.models';
import { dbError } from './admin/admin-api.service';
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly client = inject(SupabaseService).client;
  private readonly records = signal<Producto[]>([]);
  readonly categories = signal<Categoria[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  private sequence = 0;
  readonly collection = computed<Game[]>(() =>
    this.records().map((p) => ({
      id: p.id,
      titulo: p.nombre,
      descripcion: p.descripcion ?? '',
      precio: Number(p.precio),
      stock: p.stock,
      imagen: p.imagen_url ?? '',
      categoria: p.categorias?.nombre ?? 'Sin categoría',
      plataforma: p.plataforma ?? '',
      desarrollador: p.desarrollador ?? '',
      editor: p.editor ?? '',
      trailer_url: p.trailer_url ?? '',
      destacado: p.destacado,
    })),
  );
  get games(): Game[] {
    return this.collection();
  }
  constructor() {
    void this.load();
  }
  async load(): Promise<void> {
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.error.set('');
    try {
      const [categories, products] = await Promise.all([
        this.client.from('categorias').select('*').eq('activo', true).order('nombre'),
        this.client
          .from('videojuegos')
          .select('*,categorias!inner(id,nombre,activo)')
          .eq('activo', true)
          .eq('categorias.activo', true)
          .order('id'),
      ]);
      if (categories.error) throw dbError('public.categorias SELECT', categories.error);
      if (products.error) throw dbError('public.videojuegos SELECT', products.error);
      if (sequence !== this.sequence) return;
      this.categories.set(categories.data as Categoria[]);
      this.records.set(products.data as Producto[]);
    } catch (error) {
      if (sequence === this.sequence) {
        this.records.set([]);
        this.error.set(error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }
  find(id: number): Game | undefined {
    return this.games.find((g) => g.id === id);
  }
}
