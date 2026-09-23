import { Injectable, inject } from '@angular/core';
import { AdminApi } from './admin-api.service';
import { Producto, ProductoInput } from '../../../models/admin.models';
@Injectable({ providedIn: 'root' })
export class AdminProductosService {
  private readonly api = inject(AdminApi);
  list() {
    return this.api.all<Producto>('videojuegos', '*,categorias(id,nombre)');
  }
  save(value: ProductoInput, id?: number) {
    return this.api.save<Producto>('videojuegos', value, id);
  }
  setActive(id: number, activo: boolean) {
    return this.api.save<Producto>('videojuegos', { activo }, id);
  }
  // Conserva referencias e historial: la interfaz usa desactivación, nunca DELETE físico.
}
