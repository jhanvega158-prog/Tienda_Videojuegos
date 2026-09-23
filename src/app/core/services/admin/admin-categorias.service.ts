import { Injectable, inject } from '@angular/core';
import { AdminApi } from './admin-api.service';
import { Categoria } from '../../../models/admin.models';
@Injectable({ providedIn: 'root' })
export class AdminCategoriasService {
  private readonly api = inject(AdminApi);
  list() {
    return this.api.all<Categoria>('categorias');
  }
  save(value: Pick<Categoria, 'nombre' | 'descripcion' | 'activo'>, id?: number) {
    return this.api.save<Categoria>('categorias', value, id);
  }
  setActive(id: number, activo: boolean) {
    return this.api.save<Categoria>('categorias', { activo }, id);
  }
}
