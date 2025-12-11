import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header';
import { FooterComponent } from './shared/components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <!-- Encabezado -->
    <app-header></app-header>
    
    <!-- Contenido principal -->
    <main class="main-content">
      <router-outlet></router-outlet>
    </main>
    
    <!-- Pie de página -->
    <app-footer></app-footer>
  `,
  styles: `
    .main-content {
      margin-top: 130px; /* Match the new header height */
      min-height: calc(100vh - 130px); /* Full height minus header */
      padding: 2rem 0;
    }
    
    @media (max-width: 768px) {
      .main-content {
        margin-top: 100px; /* Slightly smaller on mobile */
        min-height: calc(100vh - 100px);
      }
    }
    
    /* Estilos del contenedor principal */
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    
    /* Contenido principal */
    .main-content {
      flex: 1;
      padding-top: 5rem; /* Para compensar el header fijo */
      background-color: var(--color-primary);
    }
    
    /* Estilos responsivos */
    @media (max-width: 768px) {
      .main-content {
        padding-top: 4.5rem;
      }
    }
  `
})
export class App {
  // Obtener el año actual para el copyright
  currentYear = new Date().getFullYear();
}
