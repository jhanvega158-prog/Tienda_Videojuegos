import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';
@Component({
  selector: 'app-admin-confirm',
  template: `<dialog
    #dialog
    class="admin-confirm"
    aria-labelledby="confirm-title"
    (cancel)="$event.preventDefault(); !busy() && cancelled.emit()"
  >
    <h2 id="confirm-title">Confirmar acción</h2>
    <p>{{ message() }}</p>
    <div class="form-actions">
      <button class="ghost" (click)="cancelled.emit()" [disabled]="busy()">Volver</button
      ><button (click)="accepted.emit()" [disabled]="busy()" data-testid="confirm-action">
        {{ busy() ? 'Guardando…' : 'Confirmar' }}
      </button>
    </div>
  </dialog>`,
  styles: [
    `
      .admin-confirm {
        color: white;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 30px;
        width: min(500px, calc(100% - 32px));
      }
      .admin-confirm::backdrop {
        background: #000b;
        backdrop-filter: blur(4px);
      }
      h2 {
        font-size: 26px;
      }
      .form-actions {
        display: flex;
        justify-content: end;
        gap: 12px;
      }
    `,
  ],
})
export class AdminConfirm {
  readonly message = input.required<string>();
  readonly busy = input(false);
  readonly accepted = output<void>();
  readonly cancelled = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }
}
