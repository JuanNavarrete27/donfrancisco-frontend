import {
  Component,
  OnInit,
  OnDestroy,
  HostBinding
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, finalize, catchError, of } from 'rxjs';
import { LocalService, LocalComplete, LocalDetails, LocalMedia } from '../../shared/services/local.service';
import { ParticleEffectDirective } from '../../shared/directives/particle-effect.directive';
import { GsapEntranceDirective } from '../../shared/directives/gsap-entrance.directive';

@Component({
  selector: 'app-locale-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ParticleEffectDirective, GsapEntranceDirective],
  templateUrl: './locale-detail.page.html',
  styleUrls: ['./locale-detail.page.scss'],
})
export class LocaleDetailPage implements OnInit, OnDestroy {

  @HostBinding('class.is-loaded') isLoaded = false;
  @HostBinding('class.reduced') reducedMotion = false;

  // Data
  locale: LocalComplete | null = null;
  slug = '';

  // States
  loading = true;
  error: string | null = null;
  notFound = false;

  // View state for scroll reveal
  sectionsVisible: Record<string, boolean> = {};

  private destroy$ = new Subject<void>();
  private io?: IntersectionObserver;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private localService: LocalService
  ) {}

  ngOnInit(): void {
    this.reducedMotion =
      typeof window !== 'undefined'
        ? (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
        : false;

    // Get slug from route params
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const slug = params.get('slug');
        const id = params.get('id');

        if (slug) {
          // Legacy slug-based route - keep for backwards compatibility
          this.loadLocale(slug);
        } else if (id) {
          // NEW: ID-based route for public locale detail
          this.loadLocaleById(id);
        } else {
          this.handleNotFound();
        }
      });

    // Slight delay for entrance animation
    setTimeout(() => (this.isLoaded = true), 80);
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;

    // Setup intersection observer for scroll reveal
    if (!this.reducedMotion) {
      this.io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const section = entry.target as HTMLElement;
              const key = section.dataset['section'] || '';
              this.sectionsVisible[key] = true;
              section.classList.add('is-visible');
              this.io?.unobserve(section);
            }
          }
        },
        { root: null, threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
      );

      // Observe all sections
      setTimeout(() => {
        const sections = document.querySelectorAll('[data-section]');
        sections.forEach(section => this.io?.observe(section));
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.io?.disconnect();
  }

  loadLocale(slug: string): void {
    this.loading = true;
    this.error = null;
    this.notFound = false;

    this.localService
      .getPublicLocale(slug)
      .pipe(
        catchError(err => {
          if (err?.status === 404 || err?.message?.includes('404')) {
            this.handleNotFound();
          } else {
            this.error = 'No pudimos cargar la información del local. Intentá de nuevo más tarde.';
          }
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(locale => {
        if (locale) {
          this.locale = locale;
          // Re-observe sections after content loads
          setTimeout(() => {
            const sections = document.querySelectorAll('[data-section]');
            sections.forEach(section => {
              section.classList.remove('is-visible');
              this.io?.observe(section);
            });
          }, 50);
        }
      });
  }

  loadLocaleById(id: string): void {
    this.loading = true;
    this.error = null;
    this.notFound = false;

    this.localService
      .getPublicLocaleById(id)
      .pipe(
        catchError(err => {
          if (err?.status === 404 || err?.message?.includes('404')) {
            this.handleNotFound();
          } else {
            this.error = 'No pudimos cargar la información del local. Intentá de nuevo más tarde.';
          }
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(locale => {
        if (locale) {
          this.locale = locale;
          // Re-observe sections after content loads
          setTimeout(() => {
            const sections = document.querySelectorAll('[data-section]');
            sections.forEach(section => {
              section.classList.remove('is-visible');
              this.io?.observe(section);
            });
          }, 50);
        }
      });
  }

  private handleNotFound(): void {
    this.notFound = true;
    this.loading = false;
    this.locale = null;
  }

  // Navigation helpers
  goBack(): void {
    const category = this.locale?.category;
    if (category === 'gastronomia') {
      this.router.navigate(['/locales/gastronomia']);
    } else if (category === 'tiendas') {
      this.router.navigate(['/locales/tiendas']);
    } else {
      this.router.navigate(['/locales']);
    }
  }

  goToLocales(): void {
    this.router.navigate(['/locales']);
  }

  // Contact action helpers
  callPhone(phone: string): void {
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${phone.replace(/\s/g, '')}`;
    }
  }

  openWhatsApp(whatsapp: string): void {
    if (typeof window !== 'undefined') {
      const cleanNumber = whatsapp.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank');
    }
  }

  sendEmail(email: string): void {
    if (typeof window !== 'undefined') {
      window.location.href = `mailto:${email}`;
    }
  }

  openMap(mapUrl: string): void {
    if (typeof window !== 'undefined') {
      window.open(mapUrl, '_blank');
    }
  }

  openExternal(url: string): void {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  }

  // Robust resolved data helpers
  get resolvedOpeningHours(): string {
    const value = this.locale?.opening_hours || '';
    return typeof value === 'string' ? value.trim() : '';
  }

  get resolvedInstagramUrl(): string {
    const value =
      this.locale?.instagram_url ??
      (this.locale as any)?.media?.instagram_url ??
      '';
    return typeof value === 'string' ? value.trim() : '';
  }

  get resolvedFacebookUrl(): string {
    const value =
      this.locale?.facebook_url ??
      (this.locale as any)?.media?.facebook_url ??
      '';
    return typeof value === 'string' ? value.trim() : '';
  }

  get resolvedTiktokUrl(): string {
    const value =
      this.locale?.tiktok_url ??
      (this.locale as any)?.media?.tiktok_url ??
      '';
    return typeof value === 'string' ? value.trim() : '';
  }

  get resolvedWebsiteUrl(): string {
    const value =
      this.locale?.website_url ??
      (this.locale as any)?.media?.website_url ??
      '';
    return typeof value === 'string' ? value.trim() : '';
  }

  // Computed properties for template
  get hasContactInfo(): boolean {
    if (!this.locale) return false;

    return !!(
      this.locale.phone ||
      this.locale.whatsapp ||
      this.locale.email ||
      this.locale.address ||
      this.locale.opening_hours
    );
  }

  get hasSocialLinks(): boolean {
    if (!this.locale) return false;

    return !!(
      this.resolvedInstagramUrl ||
      this.resolvedFacebookUrl ||
      this.resolvedTiktokUrl ||
      this.resolvedWebsiteUrl
    );
  }

  get hasDetails(): boolean {
    if (!this.locale?.details) return false;
    const d = this.locale.details;
    return !!(
      d.headline ||
      d.subheadline ||
      d.description ||
      (d.highlights?.length) ||
      (d.services?.length) ||
      d.promotion_text
    );
  }

  get categoryLabel(): string {
    const cat = this.locale?.category;
    if (cat === 'gastronomia') return 'Gastronomía';
    if (cat === 'tiendas') return 'Tiendas';
    return 'Local';
  }

  get backLink(): string[] {
    const cat = this.locale?.category;
    if (cat === 'gastronomia') return ['/locales/gastronomia'];
    if (cat === 'tiendas') return ['/locales/tiendas'];
    return ['/locales'];
  }
}