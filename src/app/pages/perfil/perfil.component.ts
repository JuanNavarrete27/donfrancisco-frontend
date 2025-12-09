import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit, OnDestroy {
  email = '';
  password = '';
  nombre = '';
  apellido = '';
  confirmPassword = '';

  loading = false;
  isRegisterMode = false;
  errorMessage = '';
  successMessage = '';

  private sparkInterval: any;

  constructor(public authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.startConstellationEffect();
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/perfil/me']);
    }
  }

  ngOnDestroy() {
    clearInterval(this.sparkInterval);
  }

  toggleMode(isRegister: boolean) {
    this.isRegisterMode = isRegister;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isRegisterMode && this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;

    const request$ = this.isRegisterMode
      ? this.authService.register(this.nombre, this.apellido, this.email, this.password)
      : this.authService.login(this.email, this.password);

    request$.subscribe({
      next: () => {
        this.successMessage = this.isRegisterMode
          ? 'Cuenta creada. Te llevamos a tu perfil'
          : 'Ingreso exitoso. Te llevamos a tu perfil';
        setTimeout(() => this.router.navigate(['/perfil/me']), 450);
      },
      error: (error) => {
        this.errorMessage = this.authService.extractError(error);
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
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
