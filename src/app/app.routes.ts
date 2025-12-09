import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'inicio', 
    pathMatch: 'full' 
  },
  { 
    path: 'inicio', 
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    title: 'Inicio - Don Francisco'
  },
  { 
    path: 'locales', 
    loadComponent: () => import('./pages/locations/locations').then(m => m.Locations),
    title: 'Nuestros Locales - Don Francisco'
  },
  { 
    path: 'gastronomia', 
    loadComponent: () => import('./pages/gastronomy/gastronomy').then(m => m.GastronomyComponent),
    title: 'Gastronomía - Don Francisco'
  },
  { 
    path: 'eventos', 
    loadComponent: () => import('./pages/events/events').then(m => m.EventsComponent),
    title: 'Eventos - Don Francisco'
  },

  /* ============================================================
     ✅ NUEVA SECCIÓN: NOVEDADES
     ============================================================ */
  { 
    path: 'noticias', 
    loadComponent: () => import('./pages/novedades/novedades').then(m => m.NovedadesComponent),
    title: 'Noticias - Don Francisco'
  },

  { 
    path: 'perfil', 
    loadComponent: () => import('./pages/perfil/perfil.component').then(m => m.PerfilComponent),
    title: 'Iniciar Sesión - Don Francisco'
  },
  { 
    path: 'contacto', 
    loadComponent: () => import('./pages/contact/contact').then(m => m.ContactComponent),
    title: 'Contacto - Don Francisco'
  },
  {
    path: 'salon', 
    loadComponent: () => import('./pages/conference-hall/conference-hall').then(m => m.ConferenceHallComponent),
    title: 'Salón de conferencias - Don Francisco'
  },  
    { 
    path: '**', 
    redirectTo: 'inicio' 
  }
];
