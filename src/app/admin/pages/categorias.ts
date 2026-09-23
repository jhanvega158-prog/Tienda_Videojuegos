import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminCategoriasService } from '../../core/services/admin/admin-categorias.service';
import { CatalogService } from '../../core/services/catalog.service';
import { Categoria } from '../../models/admin.models';
import { AdminPageState } from '../admin-page-state';
import { AdminConfirm } from '../admin-confirm';
@Component({
  selector: 'app-admin-categorias',
  imports: [ReactiveFormsModule, DatePipe, AdminConfirm],
  templateUrl: './categorias.html',
})
export class AdminCategorias extends AdminPageState {
  private readonly api = inject(AdminCategoriasService);
  private readonly catalog = inject(CatalogService);
  private readonly fb = inject(FormBuilder);
  readonly rows = signal<Categoria[]>([]);
  readonly search = signal('');
  readonly editor = signal(false);
  readonly editing = signal<number | null>(null);
  readonly filtered = computed(() =>
    this.rows().filter((c) => c.nombre.toLowerCase().includes(this.search().toLowerCase())),
  );
  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/)]],
    descripcion: [''],
    activo: [true],
  });
  constructor() {
    super();
    void this.load();
  }
  load() {
    return this.fetch(async () => this.rows.set(await this.api.list()));
  }
  open(row?: Categoria): void {
    this.editing.set(row?.id ?? null);
    this.form.reset();
    if (row) this.form.patchValue({ ...row, descripcion: row.descripcion ?? '' });
    this.editor.set(true);
  }
  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const id = this.editing();
    const work = () =>
      this.mutate(
        async () => {
          await this.api.save({ ...raw, nombre: raw.nombre.trim() }, id ?? undefined);
          this.editor.set(false);
          await this.load();
          await this.catalog.load();
        },
        id ? 'Categoría actualizada correctamente.' : 'Categoría creada correctamente.',
      );
    if (id && this.rows().find((c) => c.id === id)?.activo && !raw.activo)
      this.confirmation.set({
        message: '¿Desactivar esta categoría? Sus juegos dejarán de mostrarse en el escaparate.',
        run: work,
      });
    else await work();
  }
  toggle(row: Categoria): void {
    this.confirmation.set({
      message: `¿${row.activo ? 'Desactivar' : 'Activar'} la categoría «${row.nombre}»? No se borrarán videojuegos ni relaciones.`,
      run: () =>
        this.mutate(async () => {
          await this.api.setActive(row.id, !row.activo);
          await this.load();
          await this.catalog.load();
        }, 'Estado de categoría actualizado correctamente.'),
    });
  }
}
