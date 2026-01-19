import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from './shared/services/auth.service';
import { AdminGuard } from './shared/guards/admin.guard';

// ============================================================
// ✅ GUARDS INLINE (SIN ARCHIVOS NUEVOS)
// ============================================================

// Solo Admin (para módulos que realmente editan)
const adminOnlyGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigateByUrl('/perfil');
    return false;
  }

  if (!auth.isAdmin()) {
    router.navigateByUrl('/inicio');
    return false;
  }

  return true;
};

// Admin o Funcionario (para módulos READ / STAFF)
const adminOrFuncionarioGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigateByUrl('/perfil');
    return false;
  }

  // ✅ admin entra siempre
  if (auth.isAdmin()) return true;

  // ✅ funcionario también entra (solo lectura en esos módulos)
  const rol =
    (auth as any)?.getRol?.() ||
    (auth as any)?.userSubject?.value?.rol ||
    null;

  const isFuncionario =
    rol === 'funcionario' ||
    String(rol || '').toLowerCase() === 'funcionario';

  if (isFuncionario) return true;

  router.navigateByUrl('/inicio');
  return false;
};

export const routes: Routes = [

  /* ============================================================
     REDIRECT BASE
     ============================================================ */
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full'
  },

  /* ============================================================
     SECCIONES PÚBLICAS
     ============================================================ */
  {
    path: 'inicio',
    loadComponent: () =>
      import('./pages/home/home').then(m => m.HomeComponent),
    title: 'Inicio - Don Francisco'
  },
  {
    path: 'locales',
    loadComponent: () =>
      import('./pages/locations/locations').then(m => m.Locations),
    title: 'Nuestros Locales - Don Francisco'
  },
  {
    path: 'locales/gastronomia',
    loadComponent: () =>
      import('./pages/gastronomia/gastronomia.page').then(m => m.GastronomiaPage),
    title: 'Gastronomía - Don Francisco'
  },
  {
    path: 'locales/tiendas',
    loadComponent: () =>
      import('./pages/tiendas/tiendas.page').then(m => m.TiendasPage),
    title: 'Tiendas - Don Francisco'
  },
  {
    path: 'eventos',
    loadComponent: () =>
      import('./pages/events/events').then(m => m.EventsComponent),
    title: 'Eventos - Don Francisco'
  },
  {
    path: 'noticias',
    loadComponent: () =>
      import('./pages/novedades/novedades').then(m => m.NovedadesComponent),
    title: 'Noticias - Don Francisco'
  },
  {
    path: 'contacto',
    loadComponent: () =>
      import('./pages/contact/contact').then(m => m.ContactComponent),
    title: 'Contacto - Don Francisco'
  },

  {
    path: 'trabajo',
    loadComponent: () =>
      import('./pages/trabaja-con-nosotros/trabaja-con-nosotros.page')
        .then(m => m.TrabajaConNosotrosPage),
    title: 'Trabajá con nosotros - Don Francisco'
  },

  /* ============================================================
     SALÓN DE CONFERENCIAS (NUEVO)
     ============================================================ */
  {
    path: 'conferencias',
    loadComponent: () =>
      import('./pages/conferencias/conferencias.page')
        .then(m => m.ConferenciasPage),
    title: 'Salón de Conferencias - Don Francisco'
  },

  /* ============================================================
     PERFIL / AUTH
     ============================================================ */
  {
    path: 'perfil/me',
    loadComponent: () =>
      import('./pages/perfil-me/perfil-me.component')
        .then(m => m.PerfilMeComponent),
    title: 'Mi Perfil - Don Francisco'
  },
  {
    path: 'perfil',
    loadComponent: () =>
      import('./pages/perfil/perfil.component')
        .then(m => m.PerfilComponent),
    title: 'Iniciar Sesión - Don Francisco'
  },

  /* ============================================================
     ADMIN + STAFF (✅ ADMIN + FUNCIONARIO)
     ============================================================ */
  {
    path: 'admin/contacto',
    loadComponent: () =>
      import('./pages/admin-contact/admin-contact.page')
        .then(m => m.AdminContactPage),
    title: 'Buzón de Contacto - Admin/Staff',
    canActivate: [adminOrFuncionarioGuard]
  },

  {
    path: 'admin/salon',
    loadComponent: () =>
      import('./pages/admin-salon/admin-salon.page')
        .then(m => m.AdminSalonPage),
    title: 'Administración Salón - Admin/Staff',
    canActivate: [adminOrFuncionarioGuard]
  },

  {
    path: 'admin/empleo/ftp',
    loadComponent: () =>
      import('./pages/admin-empleo-ftp/admin-empleo-ftp.page')
        .then(m => m.AdminEmpleoFtpPage),
    title: 'FTP Empleo - Admin/Staff',
    canActivate: [adminOrFuncionarioGuard]
  },

  /* ============================================================
     ADMIN PURO (✅ SOLO ADMIN)
     ============================================================ */
  {
    path: 'admin/editar-noticias',
    loadComponent: () =>
      import('./pages/editar-noticias/editar-noticias.component')
        .then(m => m.EditarNoticiasComponent),
    title: 'Administración Noticias - Admin',
    canActivate: [adminOnlyGuard] // ✅ ahora sí: Admin puro
  },

  /* ============================================================
     ERROR PAGE
     ============================================================ */
  {
    path: 'error',
    loadComponent: () =>
      import('./pages/error/error.page')
        .then(m => m.ErrorPageComponent),
    title: 'Error - Don Francisco'
  },

  /* ============================================================
     FALLBACK → 404
     ============================================================ */
  {
    path: '**',
    loadComponent: () =>
      import('./pages/error/error.page')
        .then(m => m.ErrorPageComponent)
  }
];
