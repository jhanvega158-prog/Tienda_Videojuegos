import { Parallax } from '../shared/motion.directive';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Icon } from '../shared/icon';
import { AuthService } from '../core/services/auth.service';

export function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  return control.get('password')?.value === control.get('confirmPassword')?.value
    ? null
    : { passwordsMismatch: true };
}
@Component({
  selector: 'app-registro',
  imports: [Parallax, ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './registro.html',
  styleUrl: '../login/login.css',
})
export class Registro {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly submitting = signal(false);
  readonly message = signal('');
  readonly showPassword = signal(false);
  readonly form = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.pattern(/\S/)]],
      apellido: ['', [Validators.required, Validators.pattern(/\S/)]],
      correo: ['', [Validators.required, Validators.email]],
      telefono: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  async register(): Promise<void> {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.message.set('');
    try {
      const result = await this.auth.register(this.form.getRawValue());
      this.form.reset();
      this.message.set(
        result.confirmationRequired
          ? 'Solicitud de registro recibida. Revisa tu correo y confirma tu cuenta antes de iniciar sesión.'
          : 'Registro completado. Tu sesión ya está iniciada.',
      );
    } catch (error) {
      this.auth.report(error);
    } finally {
      this.submitting.set(false);
    }
  }
}
