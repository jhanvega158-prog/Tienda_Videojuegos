import { Injectable, inject } from '@angular/core';
import { AdminApi } from './admin-api.service';
import { PagoAdmin, AuditoriaPago } from '../../../models/admin.models';
// Lista explícita: nunca se recuperan datos sensibles de tarjeta ni payloads del proveedor.
const PAYMENT_COLUMNS =
  'id,id_orden,referencia,proveedor,metodo_pago,monto,estado,fecha_creacion,fecha_confirmacion,payphone_transaction_id,client_transaction_id,codigo_autorizacion,paypal_order_id,paypal_capture_id,ordenes(id,numero_orden,usuarios(nombre,apellido))';
@Injectable({ providedIn: 'root' })
export class AdminPagosService {
  private readonly api = inject(AdminApi);
  list(orderId?: number) {
    return this.api.all<PagoAdmin>('pagos', PAYMENT_COLUMNS, (q) =>
      orderId === undefined ? q : q.eq('id_orden', orderId),
    );
  }
  audit(id: number) {
    return this.api.all<AuditoriaPago>(
      'auditoria_pagos',
      'id,id_pago,estado_anterior,estado_nuevo,descripcion,fecha',
      (q) => q.eq('id_pago', id),
    );
  }
}
