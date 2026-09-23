import { GameImage } from '../../shared/game-image';
import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminProductosService } from '../../core/services/admin/admin-productos.service';
import { AdminCategoriasService } from '../../core/services/admin/admin-categorias.service';
import { CatalogService } from '../../core/services/catalog.service';
import { Categoria, Producto, ProductoInput } from '../../models/admin.models';
import { AdminPageState } from '../admin-page-state';
import { AdminConfirm } from '../admin-confirm';
@Component({
  selector: 'app-admin-productos',
  imports: [ReactiveFormsModule, CurrencyPipe, AdminConfirm, GameImage],
  templateUrl: './productos.html',
})
export class AdminProductos extends AdminPageState {
  private readonly api = inject(AdminProductosService);
  private readonly categoryApi = inject(AdminCategoriasService);
  private readonly catalog = inject(CatalogService);
  private readonly fb = inject(FormBuilder);
  readonly rows = signal<Producto[]>([]);
  readonly categories = signal<Categoria[]>([]);
  readonly search = signal('');
  readonly state = signal('todos');
  readonly editor = signal(false);
  readonly editing = signal<number | null>(null);
  readonly filtered = computed(() =>
    this.rows().filter(
      (p) =>
        p.nombre.toLowerCase().includes(this.search().toLowerCase()) &&
        (this.state() === 'todos' || p.activo === (this.state() === 'activo')),
    ),
  );
  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/)]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    id_categoria: [0, [Validators.required, Validators.min(1)]],
    plataforma: [''],
    desarrollador: [''],
    editor: [''],
    fecha_lanzamiento: [''],
    imagen_url: [
      '',
      Validators.pattern(
        /^(?:https?:\/\/\S+|\/images\/[a-zA-Z0-9_\/-]+\.(?:jpg|jpeg|png|webp|svg))$/,
      ),
    ],
    trailer_url: ['', Validators.pattern(/^https?:\/\/\S+$/)],
    activo: [true],
    destacado: [false],
  });
  constructor() {
    super();
    void this.load();
  }
  load() {
    return this.fetch(async () => {
      const [rows, categories] = await Promise.all([this.api.list(), this.categoryApi.list()]);
      this.rows.set(rows);
      this.categories.set(categories);
    });
  }
  open(row?: Producto): void {
    this.error.set('');
    this.success.set('');
    this.editing.set(row?.id ?? null);
    this.form.reset();
    if (row)
      this.form.patchValue({
        ...row,
        descripcion: row.descripcion ?? '',
        plataforma: row.plataforma ?? '',
        desarrollador: row.desarrollador ?? '',
        editor: row.editor ?? '',
        fecha_lanzamiento: row.fecha_lanzamiento ?? '',
        imagen_url: row.imagen_url ?? '',
        trailer_url: row.trailer_url ?? '',
      });
    this.editor.set(true);
  }
  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const value: ProductoInput = {
      ...raw,
      nombre: raw.nombre.trim(),
      precio: Number(raw.precio),
      stock: Number(raw.stock),
      id_categoria: Number(raw.id_categoria),
      fecha_lanzamiento: raw.fecha_lanzamiento || null,
      imagen_url: raw.imagen_url || null,
      trailer_url: raw.trailer_url || null,
    };
    const id = this.editing();
    const work = () =>
      this.mutate(
        async () => {
          await this.api.save(value, id ?? undefined);
          this.editor.set(false);
          await this.load();
          await this.catalog.load();
        },
        id ? 'Videojuego actualizado correctamente.' : 'Videojuego creado correctamente.',
      );
    if (id && this.rows().find((p) => p.id === id)?.activo && !value.activo) {
      this.confirmation.set({
        message: '¿Desactivar este videojuego? Dejará de aparecer en el catálogo público.',
        run: work,
      });
    } else await work();
  }
  toggle(row: Producto): void {
    this.confirmation.set({
      message: `¿${row.activo ? 'Desactivar' : 'Activar'} «${row.nombre}»? Se conservarán sus relaciones e historial.`,
      run: () =>
        this.mutate(async () => {
          await this.api.setActive(row.id, !row.activo);
          await this.load();
          await this.catalog.load();
        }, 'Estado del videojuego actualizado correctamente.'),
    });
  }
}
