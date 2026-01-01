import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {

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

    // ⛔ Logueado pero NO admin
    if (!this.auth.isAdmin()) {
      this.router.navigate(['/error'], {
        state: { error: '403' }
      });
      return false;
    }

    // ✅ Admin OK
    return true;
  }
}
