import { Injectable, inject } from '@angular/core';
import { AdminApi } from './admin-api.service';
import { AdminOrdenesService } from './admin-ordenes.service';
import { OrdenDetalle } from '../../../models/admin.models';
@Injectable({ providedIn: 'root' })
export class AdminReportesService {
  private readonly api = inject(AdminApi);
  private readonly orders = inject(AdminOrdenesService);
  async load(from: string, to: string) {
    if (!from || !to || from > to) throw new Error('Selecciona un rango de fechas válido.');
    const ordenes = await this.orders.list(from, to);
    const pagadas = ordenes.filter((o) => o.estado === 'PAGADA');
    let unidades = 0;
    for (let i = 0; i < pagadas.length; i += 200) {
      const items = await this.api.all<OrdenDetalle>('orden_detalle', 'id,id_orden,cantidad', (q) =>
        q.in(
          'id_orden',
          pagadas.slice(i, i + 200).map((o) => o.id),
        ),
      );
      unidades += items.reduce((sum, item) => sum + Number(item.cantidad), 0);
    }
    return { ordenes, ventas: pagadas.reduce((sum, o) => sum + Number(o.total), 0), unidades };
  }
}
