import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey
  );

  // Diagnostico temporal de lectura; no modifica el catalogo ni la base de datos.
  async verificarConexion(): Promise<void> {
    const resultados = await Promise.all([
      this.consultarTabla('categorias', 'Categorias'),
      this.consultarTabla('videojuegos', 'Videojuegos')
    ]);

    if (resultados.every(Boolean)) {
      console.log('CONEXION SUPABASE CORRECTA');
    } else {
      console.error('CONEXION SUPABASE: fallaron consultas; revisa los errores completos anteriores.');
    }
  }

  private async consultarTabla(
    tabla: 'categorias' | 'videojuegos',
    etiqueta: string
  ): Promise<boolean> {
    try {
      const { data, error, status, statusText } = await this.client.from(tabla).select('*');
      if (error) {
        console.error(`${etiqueta}:`, error, { status, statusText });
        return false;
      }
      console.log(`${etiqueta}:`, data);
      if (data?.length === 0) {
        console.log(`${etiqueta}: consulta correcta, sin registros visibles. La tabla puede estar vacia o RLS puede filtrar las filas.`);
      }
      return true;
    } catch (error) {
      console.error(`${etiqueta}:`, error);
      return false;
    }
  }
}
