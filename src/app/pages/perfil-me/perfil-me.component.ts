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

  private sparkInterval: any;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/perfil']);
      return;
    }

    this.startConstellationEffect();
    this.loadProfile();
  }

  ngOnDestroy(): void {
    clearInterval(this.sparkInterval);
  }

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

  onChangePassword(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas nuevas no coinciden.';
      return;
    }

    this.loadingPassword = true;
    this.authService
      .changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword })
      .subscribe({
        next: (response) => {
          this.successMessage = response?.message || 'Contraseña actualizada con éxito.';
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
        },
        error: (error) => {
          this.errorMessage = this.authService.extractError(error);
          this.loadingPassword = false;
        },
        complete: () => {
          this.loadingPassword = false;
        }
      });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/perfil']);
  }

  /* ==========================================================
     EFECTO CONSTELACIONES - Premium Café
  ========================================================== */
  private startConstellationEffect() {
    if (typeof document === 'undefined') return;

    const container = document.querySelector('.perfil-background');
    if (!container) return;

    this.sparkInterval = setInterval(() => {
      const spark = document.createElement('div');
      spark.classList.add('spark');

      const size = Math.random() * 4 + 2;
      spark.style.width = size + 'px';
      spark.style.height = size + 'px';

      spark.style.left = Math.random() * 100 + '%';
      spark.style.top = Math.random() * 100 + '%';

      container.appendChild(spark);

      setTimeout(() => {
        spark.remove();
      }, 3000);
    }, 250);
  }
}
