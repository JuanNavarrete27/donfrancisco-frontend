import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Router,
  NavigationEnd,
  RouterLink,
  RouterLinkActive
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { UiFeedbackService } from '../../services/ui-feedback.service';
import { AuthService, AuthUser } from '../../services/auth.service'; // ✅ PATH CORRECTO

import { gsap } from 'gsap';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('navLinks') navLinks!: ElementRef;
  @ViewChild('navToggle') navToggle!: ElementRef;
  @ViewChild('logoElement') logoElement!: ElementRef;

  // ✅ Runner (GSAP)
  @ViewChild('runnerGlider') runnerGlider!: ElementRef;

  // ✅ Wrapper del dropdown (para “contains”)
  @ViewChild('localesWrap') localesWrap!: ElementRef;

  isScrolled = false;
  isMenuOpen = false;
  isTouchDevice = false;

  // ✅ Dropdown Locales
  isLocalesOpenDesktop = false;
  isLocalesOpenMobile = false;

  isLogged = false;
  usuario: AuthUser | null = null;

  logoPath = 'images/logo.png';

  navItems = [
    { path: '/inicio', label: 'Inicio' },
    { path: '/locales', label: 'Locales' }, // ⬅️ se mantiene
    { path: '/eventos', label: 'Eventos' },
    { path: '/noticias', label: 'Noticias' },
    { path: '/conferencias', label: 'Salón' },
    { path: '/contacto', label: 'Contacto' }
  ];

  localesItems = [
    { path: '/locales/gastronomia', label: 'Gastronomía' },
    { path: '/locales/tiendas', label: 'Tiendas' },
  ];

  private userSub?: Subscription;

  private runnerTween?: gsap.core.Tween;

  // ✅ Timer para cerrar con “delay” (evita que se desvanezca al intentar clickear)
  private localesCloseTimer: any = null;

  constructor(
    private el: ElementRef,
    private router: Router,
    private ui: UiFeedbackService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;

    this.userSub = this.authService.user$.subscribe((user: AuthUser | null) => {
      this.usuario = user;
      this.isLogged = !!user;
      this.cdr.detectChanges();
    });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeLocalesMenus();
        this.closeMenu();
      });

    this.actualizarBlurPorScroll();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initHeaderRunner();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.runnerTween?.kill();
    if (this.localesCloseTimer) clearTimeout(this.localesCloseTimer);
  }

  // ===========================
  // 🔥 LOGOUT
  // ===========================
  cerrarSesion(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ui.show('Hasta pronto!', 'error', 900);
    this.authService.logout();

    this.isLogged = false;
    this.usuario = null;

    this.closeLocalesMenus();
    this.closeMenu();

    setTimeout(() => {
      this.router.navigate(['/inicio'], { replaceUrl: true });
    }, 250);
  }

  // ===========================
  // MENÚ MOBILE
  // ===========================
  toggleMenu(event?: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (event) event.preventDefault();

    this.isMenuOpen = !this.isMenuOpen;
    document.body.classList.toggle('menu-open', this.isMenuOpen);

    if (!this.isMenuOpen) this.isLocalesOpenMobile = false;
  }

  closeMenu(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isMenuOpen = false;
    document.body.classList.remove('menu-open');
  }

  // ===========================
  // DROPDOWN “LOCALES” — FIX
  // ===========================
  toggleLocalesDesktop(event?: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.cancelLocalesClose();
    this.isLocalesOpenDesktop = !this.isLocalesOpenDesktop;
  }

  openLocalesDesktop(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.isTouchDevice) return;
    this.cancelLocalesClose();
    this.isLocalesOpenDesktop = true;
  }

  // ✅ En vez de cerrar “de una”, cerramos con un mini delay
  // para que puedas mover el mouse al dropdown sin que se vaya.
  closeLocalesDesktop(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.isTouchDevice) return;

    this.cancelLocalesClose();
    this.localesCloseTimer = setTimeout(() => {
      this.isLocalesOpenDesktop = false;
      this.localesCloseTimer = null;
    }, 140);
  }

  // ✅ Para usar en el HTML: (mouseenter)="keepLocalesOpen()"
  keepLocalesOpen(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.cancelLocalesClose();
    this.isLocalesOpenDesktop = true;
  }

  private cancelLocalesClose(): void {
    if (this.localesCloseTimer) {
      clearTimeout(this.localesCloseTimer);
      this.localesCloseTimer = null;
    }
  }

  toggleLocalesMobile(event?: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isLocalesOpenMobile = !this.isLocalesOpenMobile;
  }

  closeLocalesMenus(): void {
    this.cancelLocalesClose();
    this.isLocalesOpenDesktop = false;
    this.isLocalesOpenMobile = false;
  }

  onLocalesNavigate(): void {
    this.closeLocalesMenus();
    if (this.isMenuOpen) this.closeMenu();
  }

  // ===========================
  // CLICK OUTSIDE — FIX
  // (no cierres el dropdown si clickeaste dentro del dropdown)
  // ===========================
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;

    const navContains =
      this.navLinks?.nativeElement?.contains(target) ||
      this.navToggle?.nativeElement?.contains(target) ||
      this.localesWrap?.nativeElement?.contains(target); // ✅ incluye wrapper locales

    if (!navContains) {
      if (this.isMenuOpen) this.closeMenu();
      if (this.isLocalesOpenDesktop) this.isLocalesOpenDesktop = false;
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      this.closeLocalesMenus();
      if (this.isMenuOpen) this.closeMenu();
    }
  }

  // ===========================
  // SCROLL
  // ===========================
  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isScrolled = window.scrollY > 50;
    this.actualizarBlurPorScroll();
  }

  private actualizarBlurPorScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.body.classList.toggle('blur-bg', window.scrollY >= 40);
  }

  // ===========================
  // GSAP — Runner inferior
  // ===========================
  @HostListener('window:resize')
  onResize(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.runnerTween) {
      this.runnerTween.kill();
      this.runnerTween = undefined;
    }
    this.initHeaderRunner();
  }

  private initHeaderRunner(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.runnerGlider?.nativeElement) return;

    const reduce =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) return;

    const glider = this.runnerGlider.nativeElement as HTMLElement;

    gsap.set(glider, { x: -220 });

    const w = window.innerWidth || 1200;

    // ✅ FIX: fuerza GPU + evita “stutter”
    this.runnerTween = gsap.to(glider, {
      x: w + 220,
      duration: 3.8,
      ease: 'none',
      repeat: -1,
      force3D: true
    });
  }

  handleImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/images/logo.png';
  }
}
