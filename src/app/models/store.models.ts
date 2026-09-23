export interface Game {
  id: number;
  titulo: string;
  descripcion: string;
  precio: number;
  imagen: string;
  categoria: string;
  plataforma: string;
  stock: number;
  calificacion?: number;
  desarrollador?: string;
  editor?: string;
  trailer_url?: string;
  destacado?: boolean;
}
export interface CartItem {
  game: Game;
  cantidad: number;
}
export type PaymentMethod = 'PAYPAL' | 'tarjeta' | 'transferencia' | 'simulado';
export type PaymentStatus = 'PENDIENTE' | 'PROCESANDO' | 'PAGADO' | 'RECHAZADO';
export interface Customer {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
}
export interface Purchase {
  paypalOrderId?: string | null;
  id: string;
  fecha: string;
  usuarioId: string;
  productos: CartItem[];
  subtotal: number;
  iva: number;
  total: number;
  metodoPago: PaymentMethod;
  estadoPago: PaymentStatus;
  cliente: Customer;
}
