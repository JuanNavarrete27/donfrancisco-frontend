import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header';
import { FooterComponent } from './shared/components/footer/footer.component';
import { UiFeedbackService } from './shared/services/ui-feedback.service';
import { AsyncPipe, NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    AsyncPipe,
    NgIf
  ],
  template: `
    <!-- Encabezado -->
    <app-header></app-header>

    <!-- Contenido principal -->
    <main class="main-content">
      <router-outlet></router-outlet>
    </main>

    <!-- Pie de página -->
    <app-footer></app-footer>

    <!-- 🔥 OVERLAY GLOBAL -->
    <div class="premium-feedback" *ngIf="visible$ | async">
      <div
        class="feedback-card"
        [class.success]="(type$ | async) === 'success'"
        [class.error]="(type$ | async) === 'error'"
      >
        <div class="icon">
          {{ (type$ | async) === 'error' ? '✕' : '✔' }}
        </div>

        <p class="message">
          {{ message$ | async }}
        </p>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .main-content {
      flex: 1;
      margin-top: 175px;
      min-height: calc(100vh - 130px);
      padding: 2rem 0;
      background-color: var(--color-primary);
    }

    @media (max-width: 768px) {
      .main-content {
        margin-top: 100px;
        min-height: calc(100vh - 100px);
        padding-top: 4.5rem;
      }
    }
  `
})
export class App {

  // streams del overlay global
  visible$!: any;
  message$!: any;
  type$!: any;

  constructor(private ui: UiFeedbackService) {
    this.visible$ = this.ui.visible$;
    this.message$ = this.ui.message$;
    this.type$ = this.ui.type$;
  }
}
