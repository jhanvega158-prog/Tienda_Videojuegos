import { Component, computed, input } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
export interface ChartDatum {
  label: string;
  value: number;
}
@Component({
  selector: 'app-admin-chart',
  imports: [CurrencyPipe, DecimalPipe],
  template: `<section class="panel chart-panel">
    <h2>{{ title() }}</h2>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    } @else if (!data().length) {
      <div class="chart-empty">Sin datos registrados para este gráfico.</div>
    } @else {
      <div class="bar-chart" role="img" [attr.aria-label]="description()">
        @for (row of data(); track $index) {
          <div class="chart-row">
            <div class="chart-label">
              <span>{{ row.label }}</span
              ><b>{{ money() ? (row.value | currency: 'USD') : (row.value | number: '1.0-2') }}</b>
            </div>
            <div class="chart-track">
              <div
                class="chart-bar"
                [style.width.%]="maximum() ? (row.value / maximum()) * 100 : 0"
              ></div>
            </div>
          </div>
        }
      </div>
      <details class="chart-data">
        <summary>Ver datos del gráfico</summary>
        <table>
          <tbody>
            @for (row of data(); track $index) {
              <tr>
                <td>{{ row.label }}</td>
                <td>{{ row.value }}</td>
              </tr>
            }
          </tbody>
        </table>
      </details>
    }
  </section>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .chart-panel {
        height: 100%;
      }
      h2 {
        font-size: 22px;
      }
      .chart-empty {
        min-height: 160px;
        display: grid;
        place-items: center;
        color: var(--muted);
        font-size: 14px;
        text-align: center;
      }
      .bar-chart {
        display: grid;
        gap: 18px;
        margin: 28px 0;
      }
      .chart-label {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        font-size: 13px;
        margin-bottom: 7px;
      }
      .chart-label span {
        overflow-wrap: anywhere;
      }
      .chart-label b {
        white-space: nowrap;
      }
      .chart-track {
        height: 10px;
        background: #ffffff08;
        border-radius: 5px;
        overflow: hidden;
      }
      .chart-bar {
        height: 100%;
        background: linear-gradient(90deg, #2563eb, #38bdf8);
        border-radius: 5px;
      }
      .chart-data {
        font-size: 12px;
        color: var(--muted);
      }
      summary {
        cursor: pointer;
      }
    `,
  ],
})
export class AdminChart {
  readonly title = input.required<string>();
  readonly data = input<ChartDatum[]>([]);
  readonly error = input<string | null>(null);
  readonly money = input(false);
  readonly maximum = computed(() => Math.max(0, ...this.data().map((d) => d.value)));
  readonly description = computed(
    () =>
      this.title() +
      ': ' +
      this.data()
        .map((d) => `${d.label}: ${d.value}`)
        .join(', '),
  );
}
