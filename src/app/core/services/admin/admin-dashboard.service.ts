import { Injectable, inject } from '@angular/core';
import { AdminApi } from './admin-api.service';
import { DashboardResumen, RpcResult } from '../../../models/admin.models';
export interface MesVenta {
  anio: number;
  mes: number | string;
  total: number;
}
export interface JuegoVendido {
  videojuego: string;
  cantidad: number;
  total_vendido: number;
}
export interface CantidadPorGrupo {
  metodo?: string;
  estado?: string;
  cantidad: number;
}
@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly api = inject(AdminApi);
  private async rpc<T>(name: string): Promise<RpcResult<T>> {
    try {
      return {
        data: await this.api.query<T>(`RPC ${name}`, () => this.api.client.rpc(name)),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }
  private async active(table: string): Promise<RpcResult<number>> {
    try {
      await this.api.authorize();
      const r = await this.api.client
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('activo', true);
      if (r.error) throw r.error;
      if (r.count === null) throw new Error('Supabase no devolvió el conteo solicitado.');
      return { data: r.count, error: null };
    } catch (e) {
      return { data: null, error: `public.${table} SELECT COUNT activos: ${(e as Error).message}` };
    }
  }
  async load() {
    const [resumen, meses, juegos, metodos, estados, usuariosActivos, juegosActivos] =
      await Promise.all([
        this.rpc<DashboardResumen[]>('dashboard_resumen'),
        this.rpc<MesVenta[]>('ventas_por_mes'),
        this.rpc<JuegoVendido[]>('videojuegos_mas_vendidos'),
        this.rpc<CantidadPorGrupo[]>('metodos_pago_dashboard'),
        this.rpc<CantidadPorGrupo[]>('estados_ordenes_dashboard'),
        this.active('usuarios'),
        this.active('videojuegos'),
      ]);
    if (resumen.data?.[0]) {
      const count = await this.api.client
        .from('usuarios')
        .select('id', { count: 'exact', head: true });
      if (count.error || count.count !== Number(resumen.data[0].total_usuarios)) {
        usuariosActivos.data = null;
        usuariosActivos.error =
          'El permiso de lectura no permite verificar todos los usuarios. Revisa la política ADMIN de public.usuarios.';
      }
    }
    return { resumen, meses, juegos, metodos, estados, usuariosActivos, juegosActivos };
  }
}
