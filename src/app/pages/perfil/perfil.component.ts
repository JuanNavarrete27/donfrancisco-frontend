import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

type FeedbackType = 'success' | 'error' | null;

type Country = {
  code: string;
  flag: string;
  dial: string;
  placeholder: string;
};

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit, OnDestroy {

  usuario = '';
  password = '';
  confirmPassword = '';

  nombre = '';
  apellido = '';
  telefono = '';

  loading = false;
  isRegisterMode = false;
  errorMessage = '';

  private readonly usernameRegex = /^[a-zA-Z0-9._-]{3,20}$/;

  countries: Country[] = [
    { code: 'UY', flag: '🇺🇾', dial: '+598', placeholder: '91234567' },
    { code: 'AR', flag: '🇦🇷', dial: '+54',  placeholder: '11 2345 6789' },
    { code: 'BR', flag: '🇧🇷', dial: '+55',  placeholder: '11 91234-5678' },
    { code: 'CL', flag: '🇨🇱', dial: '+56',  placeholder: '9 1234 5678' }
  ];

  selectedCountry: Country = this.countries[0];
  countryMenuOpen = false;

  showFeedback = false;
  feedbackType: FeedbackType = null;
  feedbackMessage = '';

  private sparkInterval: any;
  private feedbackTimer: any;

  private readonly UI_DELAY_MS = 800;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.startConstellationEffect();
  }

  ngOnDestroy(): void {
    if (this.sparkInterval) clearInterval(this.sparkInterval);
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
  }

  toggleMode(isRegister: boolean): void {
    this.isRegisterMode = isRegister;
    this.errorMessage = '';
    this.countryMenuOpen = false;
  }

  toggleCountryMenu(): void {
    this.countryMenuOpen = !this.countryMenuOpen;
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.countryMenuOpen = false;
  }

  onSubmit(): void {
    if (this.showFeedback) return;

    this.errorMessage = '';

    if (!this.usuario || !this.password) {
      this.errorMessage = 'Completá usuario y contraseña.';
      return;
    }

    if (!this.usernameRegex.test(this.usuario)) {
      this.errorMessage = 'Usuario inválido (3-20 caracteres, letras/números y . _ -)';
      return;
    }

    if (this.isRegisterMode) {
      if (!this.nombre || !this.apellido || !this.telefono) {
        this.errorMessage = 'Completá todos los campos.';
        return;
      }

      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'Las contraseñas no coinciden.';
        return;
      }
    }

    this.loading = true;

    const telefonoFinal = this.isRegisterMode
      ? `${this.selectedCountry.dial} ${this.telefono.trim()}`
      : '';

    const request$ = this.isRegisterMode
      ? this.authService.register(
          this.nombre,
          this.apellido,
          this.usuario,
          this.password,
          telefonoFinal
        )
      : this.authService.login(this.usuario, this.password);

    request$.subscribe({
      next: () => {
        this.showPremiumFeedback(
          'success',
          this.isRegisterMode ? 'Registro exitoso' : 'Inicio de sesión exitoso'
        );
        this.cdr.detectChanges();

        if (this.feedbackTimer) clearTimeout(this.feedbackTimer);

        if (this.isRegisterMode) {
          // REGISTRO
          this.authService.logout();

          this.feedbackTimer = setTimeout(() => {
            this.hideFeedback();
            this.loading = false;
            this.isRegisterMode = false;
            this.resetRegisterForm();
            this.cdr.detectChanges();
          }, this.UI_DELAY_MS);

        } else {
          // LOGIN — 🔥 HIDRATAR PERFIL ANTES DE NAVEGAR
          this.feedbackTimer = setTimeout(() => {
            this.authService.getProfile().subscribe({
              next: () => {
                this.hideFeedback();
                this.router.navigate(['/perfil/me'], { replaceUrl: true });
              },
              error: () => {
                this.authService.logout();
                this.errorMessage = 'No pudimos cargar tu perfil.';
                this.loading = false;
                this.hideFeedback();
                this.cdr.detectChanges();
              }
            });
          }, this.UI_DELAY_MS);
        }
      },
      error: (error) => {
        this.errorMessage = this.authService.extractError(error);
        this.loading = false;
        this.hideFeedback();
        this.cdr.detectChanges();
      }
    });
  }

  private resetRegisterForm(): void {
    this.confirmPassword = '';
    this.nombre = '';
    this.apellido = '';
    this.telefono = '';
    this.selectedCountry = this.countries[0];
    this.countryMenuOpen = false;
  }

  private showPremiumFeedback(type: FeedbackType, message: string): void {
    this.feedbackType = type;
    this.feedbackMessage = message;
    this.showFeedback = true;
  }

  private hideFeedback(): void {
    this.showFeedback = false;
    this.feedbackType = null;
    this.feedbackMessage = '';
  }

  private startConstellationEffect(): void {
    const container = document.querySelector('.perfil-background');
    if (!container) return;

    this.sparkInterval = setInterval(() => {
      const spark = document.createElement('div');
      spark.classList.add('spark');

      const size = Math.random() * 4 + 2;
      spark.style.width = `${size}px`;
      spark.style.height = `${size}px`;
      spark.style.left = Math.random() * 100 + '%';
      spark.style.top = Math.random() * 100 + '%';

      container.appendChild(spark);
      setTimeout(() => spark.remove(), 3000);
    }, 250);
  }
}
