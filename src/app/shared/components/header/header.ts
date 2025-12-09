import { Component, ElementRef, HostListener, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class HeaderComponent {

  @ViewChild('navLinks') navLinks!: ElementRef;
  @ViewChild('navToggle') navToggle!: ElementRef;
  @ViewChild('logoElement') logoElement!: ElementRef;

  isScrolled = false;
  isMenuOpen = false;
  isTouchDevice = false;

  // Ruta del logo
  logoPath = 'images/logo.png';

  // Ítems del menú
  navItems = [
    { path: '/inicio', label: 'Inicio' },
    { path: '/locales', label: 'Locales' },
    { path: '/gastronomia', label: 'Gastronomía' },
    { path: '/eventos', label: 'Eventos' },
    { path: '/noticias', label: 'Noticias' },
    { path: '/contacto', label: 'Contacto' }
  ];

  constructor(
    private el: ElementRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    const isBrowser = isPlatformBrowser(this.platformId);

    if (isBrowser) {
      // Detectar pantalla táctil
      this.isTouchDevice =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0;

      // Cerrar menú al navegar
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => this.closeMenu());

      this.actualizarBlurPorScroll();
    }
  }

  // ===========================
  // MENÚ HAMBURGUESA
  // ===========================
  toggleMenu(event?: Event) {
    const isBrowser = isPlatformBrowser(this.platformId);
    if (!isBrowser) return;

    if (event) event.preventDefault();

    this.isMenuOpen = !this.isMenuOpen;

    if (this.isMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
  }

  closeMenu() {
    const isBrowser = isPlatformBrowser(this.platformId);
    if (!isBrowser) return;

    this.isMenuOpen = false;
    document.body.classList.remove('menu-open');
  }

  // Cerrar tocando afuera
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const isBrowser = isPlatformBrowser(this.platformId);
    if (!isBrowser || !this.isMenuOpen) return;

    const clickedInside =
      this.navLinks?.nativeElement.contains(event.target) ||
      this.navToggle?.nativeElement.contains(event.target);

    if (!clickedInside) this.closeMenu();
  }

  // ===========================
  // SCROLL
  // ===========================
  @HostListener('window:scroll')
  onWindowScroll() {
    const isBrowser = isPlatformBrowser(this.platformId);
    if (!isBrowser) return;

    this.isScrolled = window.scrollY > 50;
    this.actualizarBlurPorScroll();
  }

  private actualizarBlurPorScroll() {
    const isBrowser = isPlatformBrowser(this.platformId);
    if (!isBrowser) return;

    const threshold = 40;

    if (window.scrollY >= threshold) {
      document.body.classList.add('blur-bg');
    } else {
      document.body.classList.remove('blur-bg');
    }
  }

  // ===========================
  // LOGO FALLBACK
  // ===========================
  handleImageError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/logo.png';
  }
}
