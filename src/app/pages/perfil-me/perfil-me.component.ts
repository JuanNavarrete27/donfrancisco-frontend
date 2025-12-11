import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../shared/services/auth.service';

@Component({
  selector: 'app-perfil-me',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil-me.component.html',
  styleUrls: ['./perfil-me.component.scss']
})
export class PerfilMeComponent implements OnInit, OnDestroy {

  user: AuthUser | null = null;

  loadingProfile = false;
  loadingPassword = false;

  errorMessage = '';
  successMessage = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  // ✅ MODAL
  showPasswordModal = false;
  modalAnimating = false;

  private sparkInterval: any;

  constructor(
    private authService: AuthService,
    private router: Router
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
    this.loadProfile();
  }

  ngOnDestroy(): void {
    if (this.sparkInterval) clearInterval(this.sparkInterval);
  }

  /* ==========================================================
     PERFIL
  ========================================================== */
  loadProfile(): void {
    this.loadingProfile = true;

    this.authService.getProfile().subscribe({
      next: (user) => {
        this.user = user;
      },
      error: (error) => {
        this.errorMessage = this.authService.extractError(error);
      },
      complete: () => {
        this.loadingProfile = false;
      }
    });
  }

  /* ==========================================================
     MODAL PASSWORD
  ========================================================== */
  openPasswordModal(): void {
    this.showPasswordModal = true;
    this.modalAnimating = true;

    // animación de entrada
    setTimeout(() => {
      this.modalAnimating = false;
    }, 300);
  }

  closePasswordModal(): void {
    this.modalAnimating = true;

    // animación de salida
    setTimeout(() => {
      this.showPasswordModal = false;
      this.modalAnimating = false;
      this.resetPasswordForm();
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

    this.authService.changePassword({
      actual: this.currentPassword,
      nueva: this.newPassword
    }).subscribe({
      next: (response) => {
        this.successMessage =
          response?.mensaje || 'Contraseña actualizada con éxito.';

        // cerrar modal automáticamente
        setTimeout(() => this.closePasswordModal(), 900);
      },
      error: (error) => {
        this.errorMessage = this.authService.extractError(error);
        this.loadingPassword = false;
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
     EFECTO CONSTELACIONES – MEJORADO
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
