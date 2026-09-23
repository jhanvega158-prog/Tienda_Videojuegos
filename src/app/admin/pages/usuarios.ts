import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminUsuariosService } from '../../core/services/admin/admin-usuarios.service';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioAdmin } from '../../models/admin.models';
import { AdminPageState } from '../admin-page-state';
import { AdminConfirm } from '../admin-confirm';
@Component({
  selector: 'app-admin-usuarios',
  imports: [DatePipe, AdminConfirm],
  templateUrl: './usuarios.html',
})
export class AdminUsuarios extends AdminPageState {
  private readonly api = inject(AdminUsuariosService);
  readonly auth = inject(AuthService);
  readonly rows = signal<UsuarioAdmin[]>([]);
  readonly coverage = signal('');
  readonly search = signal('');
  readonly role = signal('todos');
  readonly state = signal('todos');
  readonly filtered = computed(() =>
    this.rows().filter(
      (u) =>
        `${u.nombre} ${u.apellido} ${u.correo}`
          .toLowerCase()
          .includes(this.search().toLowerCase()) &&
        (this.role() === 'todos' || u.id_rol === Number(this.role())) &&
        (this.state() === 'todos' || u.activo === (this.state() === 'activo')),
    ),
  );
  constructor() {
    super();
    void this.load();
  }
  load() {
    return this.fetch(async () => {
      const rows = await this.api.list();
      this.rows.set(rows);
      this.coverage.set(await this.api.coverage(rows));
    });
  }
  toggle(row: UsuarioAdmin): void {
    this.confirmation.set({
      message: `¿${row.activo ? 'Desactivar' : 'Activar'} a ${row.nombre} ${row.apellido} (${row.correo})?`,
      run: () =>
        this.mutate(
          async () => {
            await this.api.setActive(row.id, !row.activo);
            await this.load();
          },
          row.activo ? 'Usuario desactivado correctamente.' : 'Usuario activado correctamente.',
        ),
    });
  }
}
