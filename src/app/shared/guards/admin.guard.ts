import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminOrMarketingGuard implements CanActivate {

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {

    // ❌ No logueado
    if (!this.auth.isAuthenticated()) {
      this.router.navigateByUrl('/inicio');
      return false;
    }

    // ✅ Admin o Marketing
    const rol = this.auth.getRol?.() ?? null;
    const r = String(rol || '').toLowerCase().trim();

    if (r === 'admin' || r === 'marketing') return true;

    // ⛔ Logueado pero NO tiene rol permitido
    this.router.navigate(['/error'], {
      state: { error: '403' }
    });
    return false;
  }
}
