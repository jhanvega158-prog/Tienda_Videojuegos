import { Parallax } from '../shared/motion.directive';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { safeReturnUrl } from '../core/services/session-access.service';
import { Icon } from '../shared/icon';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [Parallax, ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly submitting = signal(false);
  readonly showPassword = signal(false);
  readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async login(): Promise<void> {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    try {
      const { correo, password } = this.form.getRawValue();
      await this.auth.login(correo, password);
      this.form.controls.password.reset();
      await this.router.navigateByUrl(
        this.auth.isAdmin()
          ? '/admin'
          : safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
      );
    } catch (error) {
      this.auth.report(error);
    } finally {
      this.submitting.set(false);
    }
  }
}
