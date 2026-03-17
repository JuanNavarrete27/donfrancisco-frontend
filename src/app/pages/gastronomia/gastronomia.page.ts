
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LocalService, LocalCore, LocalComplete } from '../../shared/services/local.service';
import { Subject, takeUntil, forkJoin, of, catchError } from 'rxjs';

type GastroTag = 'Café' | 'Horno' | 'Parrilla' | 'Pastelería' | 'Veggie' | 'Tragos' | 'Bistró';

type GastroLocal = {
  id: string;
  nombre: string;
  tag: GastroTag;
  estado: 'Próximamente' | 'Activo';
  resumen: string;
  detalle: string;
  highlight: string[];
  intensidad: 1 | 2 | 3;
  coverImageUrl?: string;
  headline?: string;
};

@Component({
  selector: 'app-locales-gastronomia',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './gastronomia.page.html',
  styleUrls: ['./gastronomia.page.scss'],
})
export class GastronomiaPage implements OnInit, AfterViewInit, OnDestroy {

  @HostBinding('class.is-loaded') isLoaded = false;
  @HostBinding('class.reduced') reducedMotion = false;

  // Aura suave en hero
  mx = 0;
  my = 0;

  // Filtros
  tags: GastroTag[] = ['Café', 'Horno', 'Parrilla', 'Pastelería', 'Veggie', 'Tragos', 'Bistró'];
  activeTag: GastroTag | 'Todos' = 'Todos';

  // Loading y error states
  loading = false;
  error: string | null = null;

  // Data
  locales: GastroLocal[] = [];

  // Scroll reveal
  @ViewChildren('cardEl') cardEls!: QueryList<ElementRef<HTMLElement>>;
  private io?: IntersectionObserver;
  private cardChangesSub?: { unsubscribe: () => void };
  private destroy$ = new Subject<void>();

  get featured(): GastroLocal | null {
    if (this.locales.length === 0) return null;
    return this.locales.slice().sort((a, b) => b.intensidad - a.intensidad)[0];
  }

  get filtered(): GastroLocal[] {
    if (this.activeTag === 'Todos') return this.locales;
    return this.locales.filter(x => x.tag === this.activeTag);
  }

  constructor(
    private localService: LocalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.reducedMotion =
      typeof window !== 'undefined'
        ? (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
        : false;

    setTimeout(() => (this.isLoaded = true), 80);

    this.loadLocales();
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;

    // Init observer
    if (!this.reducedMotion) {
      this.io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const el = e.target as HTMLElement;
            el.classList.add('is-in');
            this.io?.unobserve(el);
          }
        },
        { root: null, threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
      );
    }

    const observeAll = () => {
      const els = this.cardEls?.toArray() ?? [];
      for (const ref of els) {
        const el = ref.nativeElement;
        if (this.reducedMotion) {
          el.classList.add('is-in');
        } else {
          // si ya entró por scroll, no lo re-observamos
          if (!el.classList.contains('is-in')) this.io?.observe(el);
        }
      }
    };

    observeAll();

    // Re-observar si cambia el listado (por filtros)
    this.cardChangesSub = this.cardEls.changes.subscribe(() => {
      setTimeout(() => observeAll(), 0);
    });
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    this.cardChangesSub?.unsubscribe();
    if (typeof window !== 'undefined') document.body.style.overflow = '';
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('mousemove', ['$event'])
  onMove(e: MouseEvent) {
    if (this.reducedMotion) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    this.mx = (e.clientX - cx) * 0.006;
    this.my = (e.clientY - cy) * 0.006;
  }

  setTag(t: GastroTag | 'Todos') {
    this.activeTag = t;
  }

  /**
   * Carga los locales desde la API y los mapea al formato GastroLocal
   */
  loadLocales(): void {
    this.loading = true;
    this.error = null;

    this.localService.getPublicLocalesByCategory('gastronomia')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (locales) => {
          // Load complete data for each locale to get details
          this.loadCompleteLocalesWithDetails(locales);
        },
        error: (err) => {
          this.error = typeof err === 'string' ? err : 'Error al cargar los locales';
          this.loading = false;
          console.error('Error loading gastronomia locales:', err);
        }
      });
  }

  /**
   * Load complete locale data with details for each locale
   */
  private loadCompleteLocalesWithDetails(locales: LocalCore[]): void {
    if (locales.length === 0) {
      this.locales = [];
      this.loading = false;
      return;
    }

    // FIXED: Filter to only include gastronomia slots 1-6
    const fixedGastroLocales = locales.filter(local => {
      const localeId = parseInt(local.id);
      return localeId >= 1 && localeId <= 6;
    });

    if (fixedGastroLocales.length === 0) {
      this.locales = [];
      this.loading = false;
      return;
    }

    // Fetch details for each locale
    const localeObservables = fixedGastroLocales.map(local => 
      this.localService.getPublicLocaleById(local.id).pipe(
        catchError(() => {
          // If details fail, fallback to basic LocalCore data
          return of({
            ...local,
            details: null,
            media: null
          });
        })
      )
    );

    forkJoin(localeObservables)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (completeLocales) => {
          this.locales = completeLocales.map(local => this.mapToGastroLocal(local));
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar detalles de los locales';
          this.loading = false;
          console.error('Error loading locale details:', err);
        }
      });
  }

  /**
   * Mapea un LocalComplete del API al formato GastroLocal usado por el template
   */
  private mapToGastroLocal(local: LocalComplete | any): GastroLocal {
    // Use real backend data instead of hardcoded mapping
    const displayName = local.display_name || 'Local Desconocido';
    
    // Determine tag based on real business name
    const tag = this.inferTag(displayName);
    
    // Use real backend image URLs
    const coverImageUrl = local.cover_image_url || local.logo_url || '/assets/default-gastro.png';
    
    // Determine intensity based on featured status
    const intensidad: 1 | 2 | 3 = local.featured ? 3 : 2;
    
    // Use real backend descriptions
    const displayHeadline = local.details?.headline || local.short_description || 'Descubre este lugar único en Don Francisco.';
    
    // Use real backend highlights or extract from description
    const highlights = local.details?.highlights?.length 
      ? local.details.highlights 
      : this.extractHighlights(local.short_description);

    return {
      id: local.id,
      nombre: displayName, // Use real backend display_name
      tag: tag,
      estado: local.active ? 'Activo' : 'Próximamente',
      resumen: displayHeadline,
      detalle: local.long_description || local.short_description || 'Próximamente más información.',
      highlight: highlights,
      intensidad: intensidad,
      coverImageUrl: coverImageUrl, // Use real backend URLs
      headline: local.details?.headline
    };
  }

  /**
   * Infer tag based on display name
   */
  private inferTag(displayName: string): GastroTag {
    const name = displayName.toLowerCase();
    
    if (name.includes('coffee') || name.includes('café') || name.includes('cake')) return 'Café';
    if (name.includes('pizza') || name.includes('fornos') || name.includes('horno')) return 'Horno';
    if (name.includes('parrilla') || name.includes('grill') || name.includes('brasas')) return 'Parrilla';
    if (name.includes('sushi') || name.includes('ramen') || name.includes('sakai')) return 'Bistró';
    if (name.includes('gelato') || name.includes('helado') || name.includes('cremino') || name.includes('pastelería')) return 'Pastelería';
    if (name.includes('hamburguesa') || name.includes('burger')) return 'Veggie';
    if (name.includes('milanesa') || name.includes('tragos') || name.includes('bar')) return 'Tragos';
    
    return 'Bistró'; // default
  }

  private extractHighlights(description: string): string[] {
    if (!description) return ['Próximamente'];
    
    // Si la descripción tiene comas, usar las partes como highlights
    const parts = description.split(',').map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length >= 2 && parts.length <= 4) {
      return parts.slice(0, 3);
    }
    
    return ['Especialidad única', 'Ambiente premium'];
  }

/**
   * Navega a la página de detalle del local
   */
  abrir(local: GastroLocal) {
    // FIXED: Navigate by locale id instead of slug
    this.router.navigate(['/locales/id', local.id]);
  }
}
