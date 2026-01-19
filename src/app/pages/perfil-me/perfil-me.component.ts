import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, AuthUser } from '../../shared/services/auth.service';

@Component({
  selector: 'app-perfil-me',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './perfil-me.component.html',
  styleUrls: ['./perfil-me.component.scss']
})
export class PerfilMeComponent implements OnInit, OnDestroy {

  user: AuthUser | null = null;

  // ✅ label de rol (admin / marketing / funcionario / usuario)
  roleLabel = '';

  loadingProfile = false;
  loadingPassword = false;

  errorMessage = '';
  successMessage = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  /** MODAL */
  showPasswordModal = false;
  modalAnimating = false;

  private sparkInterval: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  /* ==========================================================
     INIT / DESTROY
  ========================================================== */
  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/perfil']);
      return;
    }

    this.startConstellationEffect();

    // ✅ MOSTRAR ROL AL INSTANTE con lo que ya existe (localStorage/AuthService)
    this.computeRoleLabel();

    // ✅ luego sincronizamos contra backend
    this.loadProfile();
  }

  ngOnDestroy(): void {
    if (this.sparkInterval) clearInterval(this.sparkInterval);
    this.unlockScroll();
  }

  /* ==========================================================
     PERFIL
  ========================================================== */
  loadProfile(): void {
    this.loadingProfile = true;

    this.authService.getProfile().subscribe({
      next: (user) => {
        this.user = user;

        // ✅ MUY IMPORTANTE:
        // no confiamos ciegamente en "user.rol" si backend devuelve raro.
        // Priorizamos rol real del storage/token si existe.
        this.computeRoleLabel(user);

        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = this.authService.extractError(error);
        this.cdr.detectChanges();
      },
      complete: () => {
        this.loadingProfile = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================================
  // ✅ FIX REAL: rol robusto (LOCALSTORAGE + AUTH + JWT + BACKEND)
  // ==========================================================
  private computeRoleLabel(profileUser?: any): void {
    const role =
      this.safeLower(profileUser?.rol) ||
      this.safeLower(profileUser?.role) ||
      this.safeLower(this.authService.getRol?.()) ||
      this.safeLower(this.getRolFromStoredUser()) ||
      this.safeLower(this.getRolFromJwtToken()) ||
      '';

    if (role === 'admin' || role === 'administrador') this.roleLabel = 'Administrador';
    else if (role === 'marketing' || role === 'mkt') this.roleLabel = 'Marketing';
    else if (role === 'funcionario' || role === 'empleado') this.roleLabel = 'Funcionario';
    else this.roleLabel = 'Usuario';
  }

  private safeLower(v: any): string {
    return String(v ?? '').toLowerCase().trim();
  }

  private getRolFromStoredUser(): string {
    try {
      const raw = localStorage.getItem('df_auth_user');
      if (!raw) return '';
      const obj = JSON.parse(raw);
      return obj?.rol || obj?.role || obj?.perfil || '';
    } catch {
      return '';
    }
  }

  // ✅ Lee el rol desde el payload del JWT (FUENTE MÁS CONFIABLE)
  private getRolFromJwtToken(): string {
    try {
      const token = localStorage.getItem('df_auth_token');
      if (!token) return '';
      const payload = token.split('.')[1];
      if (!payload) return '';

      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const data = JSON.parse(json);
      return data?.rol || data?.role || data?.perfil || '';
    } catch {
      return '';
    }
  }

  /* ==========================================================
     MODAL PASSWORD
  ========================================================== */
  openPasswordModal(): void {
    this.showPasswordModal = true;
    this.modalAnimating = true;
    this.lockScroll();

    this.cdr.detectChanges();

    setTimeout(() => {
      this.modalAnimating = false;
      this.cdr.detectChanges();
    }, 300);
  }

  closePasswordModal(): void {
    this.modalAnimating = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.showPasswordModal = false;
      this.modalAnimating = false;
      this.resetPasswordForm();
      this.unlockScroll();
      this.cdr.detectChanges();
    }, 250);
  }

  private resetPasswordForm(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.loadingPassword = false;
  }

  /* ==========================================================
     CAMBIO DE CONTRASEÑA
  ========================================================== */
  onChangePassword(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Todos los campos son obligatorios.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas nuevas no coinciden.';
      return;
    }

    this.loadingPassword = true;
    this.cdr.detectChanges();

    this.authService.changePassword({
      actual: this.currentPassword,
      nueva: this.newPassword
    }).subscribe({
      next: (response) => {
        this.successMessage =
          response?.mensaje || 'Contraseña actualizada con éxito.';

        this.cdr.detectChanges();

        setTimeout(() => this.closePasswordModal(), 900);
      },
      error: (error) => {
        this.errorMessage = this.authService.extractError(error);
        this.loadingPassword = false;
        this.cdr.detectChanges();
      }
    });
  }

  /* ==========================================================
     LOGOUT
  ========================================================== */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/perfil']);
  }

  /* ==========================================================
     SCROLL LOCK
  ========================================================== */
  private lockScroll(): void {
    document.body.classList.add('no-scroll');
  }

  private unlockScroll(): void {
    document.body.classList.remove('no-scroll');
  }

  /* ==========================================================
     EFECTO CONSTELACIONES
  ========================================================== */
  private startConstellationEffect(): void {
    if (typeof document === 'undefined') return;

    const container = document.querySelector('.perfil-background');
    if (!container) return;

    this.sparkInterval = setInterval(() => {
      const spark = document.createElement('div');
      spark.classList.add('spark');

      const size = Math.random() * 3 + 2;
      spark.style.width = `${size}px`;
      spark.style.height = `${size}px`;

      spark.style.left = Math.random() * 100 + '%';
      spark.style.top = Math.random() * 100 + '%';

      spark.style.animationDuration = `${2.5 + Math.random()}s`;

      container.appendChild(spark);

      setTimeout(() => spark.remove(), 3000);
    }, 320);
  }
}
