export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fecha_creacion: string;
}
export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  id_categoria: number;
  plataforma: string | null;
  desarrollador: string | null;
  editor: string | null;
  fecha_lanzamiento: string | null;
  imagen_url: string | null;
  trailer_url: string | null;
  activo: boolean;
  destacado: boolean;
  fecha_creacion: string;
  categorias?: Categoria;
}
export type ProductoInput = Omit<Producto, 'id' | 'fecha_creacion' | 'categorias'>;
export interface UsuarioAdmin {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  id_rol: number;
  activo: boolean;
  fecha_registro: string;
  roles?: { id: number; nombre: string };
}
export interface DashboardResumen {
  ventas_totales: number;
  total_ordenes: number;
  total_usuarios: number;
  total_videojuegos: number;
  pagos_pendientes: number;
  juegos_vendidos: number;
}
export interface RpcResult<T> {
  data: T | null;
  error: string | null;
}
export interface OrdenAdmin {
  id: number;
  id_usuario: number;
  numero_orden: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  estado: string;
  usuarios?: Pick<UsuarioAdmin, 'id' | 'nombre' | 'apellido' | 'correo' | 'telefono'>;
}
export interface OrdenDetalle {
  id: number;
  id_orden: number;
  id_videojuego: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  videojuegos?: { id: number; nombre: string; imagen_url: string | null };
}
export interface PagoAdmin {
  id: number;
  id_orden: number;
  referencia: string | null;
  proveedor: string | null;
  metodo_pago: string | null;
  monto: number;
  estado: string;
  fecha_creacion: string;
  fecha_confirmacion: string | null;
  payphone_transaction_id: string | null;
  client_transaction_id: string | null;
  codigo_autorizacion: string | null;
  paypal_order_id?: string | null;
  paypal_capture_id?: string | null;
  ordenes?: Pick<OrdenAdmin, 'id' | 'numero_orden'> & {
    usuarios?: { nombre: string; apellido: string };
  };
}
export interface AuditoriaPago {
  id: number;
  id_pago: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  descripcion: string | null;
  fecha: string;
}
