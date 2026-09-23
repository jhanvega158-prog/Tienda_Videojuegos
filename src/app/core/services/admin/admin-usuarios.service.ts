import { Injectable, inject } from '@angular/core';
import { AdminApi } from './admin-api.service';
import { AuthService } from '../auth.service';
import { DashboardResumen, UsuarioAdmin } from '../../../models/admin.models';
@Injectable({ providedIn: 'root' })
export class AdminUsuariosService {
  private readonly api = inject(AdminApi);
  private readonly auth = inject(AuthService);
  list() {
    return this.api.all<UsuarioAdmin>(
      'usuarios',
      'id,nombre,apellido,correo,telefono,id_rol,activo,fecha_registro,roles(id,nombre)',
    );
  }
  async coverage(rows: UsuarioAdmin[]): Promise<string> {
    const summary = await this.api.query<DashboardResumen[]>('RPC dashboard_resumen', () =>
      this.api.client.rpc('dashboard_resumen'),
    );
    const incomplete = summary[0] && Number(summary[0].total_usuarios) !== rows.length;
    const missingRoles = rows.some((u) => !u.roles);
    return [
      incomplete
        ? 'La consulta devuelve solo parte de los usuarios registrados. Revisa el permiso ADMIN de lectura de usuarios.'
        : '',
      missingRoles
        ? 'No se puede leer el nombre de los roles. Revisa el permiso ADMIN de lectura de roles.'
        : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
  async setActive(id: number, activo: boolean) {
    await this.api.authorize();
    if (id === this.auth.profile()?.id)
      throw new Error('No puedes cambiar el estado de tu propia cuenta desde este panel.');
    return this.api.save<UsuarioAdmin>('usuarios', { activo }, id);
  }
}
