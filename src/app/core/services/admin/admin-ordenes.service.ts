import { Injectable, inject } from '@angular/core';
import { AdminApi } from './admin-api.service';
import { OrdenAdmin, OrdenDetalle } from '../../../models/admin.models';
@Injectable({ providedIn: 'root' })
export class AdminOrdenesService {
  private readonly api = inject(AdminApi);
  list(from?: string, to?: string) {
    return this.api.all<OrdenAdmin>(
      'ordenes',
      'id,id_usuario,numero_orden,fecha,subtotal,iva,total,estado,usuarios(id,nombre,apellido,correo,telefono)',
      (q) => {
        if (from) q = q.gte('fecha', `${from}T00:00:00`);
        if (to) {
          const end = new Date(`${to}T00:00:00Z`);
          end.setUTCDate(end.getUTCDate() + 1);
          q = q.lt('fecha', end.toISOString().slice(0, 10) + 'T00:00:00');
        }
        return q;
      },
    );
  }
  detail(id: number) {
    return this.api.all<OrdenDetalle>(
      'orden_detalle',
      'id,id_orden,id_videojuego,cantidad,precio_unitario,subtotal,videojuegos(id,nombre,imagen_url)',
      (q) => q.eq('id_orden', id),
    );
  }
}
