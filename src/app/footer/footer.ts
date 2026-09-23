import { Parallax } from '../shared/motion.directive';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../shared/icon';
@Component({
  selector: 'app-footer',
  imports: [Parallax, RouterLink, Icon],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  readonly topic = signal('');
  readonly help: Record<string, string> = {
    Contacto:
      'JJC Gaming es un proyecto académico de ITSQMET creado por Carlos Gualsaqui, Jhan Vega y Jorge. Puedes conocer al equipo en la página Nosotros. Todavía no hay un canal público de contacto habilitado.',
    'Preguntas frecuentes':
      'Para crear tu cuenta, utiliza Registrarse y confirma el enlace recibido por correo. Puedes explorar el catálogo sin iniciar sesión. Los pagos actuales son simulaciones académicas; PayPhone aún no está disponible.',
    Soporte:
      'Si no puedes iniciar sesión, revisa que hayas confirmado tu correo y que la contraseña sea correcta. No compartas tu contraseña ni datos de tarjeta. El canal de soporte directo todavía está en preparación.',
    Privacidad:
      'El registro utiliza tu nombre, apellido, correo y teléfono para crear el perfil. Supabase administra la autenticación. El carrito y los favoritos de esta versión se conservan en este navegador. Esta pantalla informa sobre el prototipo; la política legal definitiva está pendiente.',
    Términos:
      'Esta versión de JJC Gaming es un proyecto académico. Las compras y pagos locales son demostraciones y no entregan licencias comerciales de videojuegos. Las imágenes y marcas pertenecen a sus respectivos titulares. Los términos comerciales definitivos están pendientes.',
  };
}
