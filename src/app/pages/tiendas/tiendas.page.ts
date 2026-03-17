
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, forkJoin, of, catchError } from 'rxjs';
import { LocalService, LocalCore, LocalComplete } from '../../shared/services/local.service';

type TiendaTipo = 'Boutique' | 'Regionales' | 'Regalos' | 'Servicios' | 'Diseño' | 'Tech';

interface Tienda {
  id: string;
  nombre: string;
  tipo: TiendaTipo;
  estado: 'Próximamente' | 'Activo';
  resumen: string;
  detalle: string;
  perks: string[];
  glow: 1 | 2 | 3;
  cover_image_url?: string;
}

@Component({
  selector: 'app-locales-tiendas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tiendas.page.html',
  styleUrls: ['./tiendas.page.scss'],
})
export class TiendasPage implements OnInit, AfterViewInit, OnDestroy {
  private localService = inject(LocalService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  @HostBinding('class.is-loaded') isLoaded = false;
  @HostBinding('class.reduced') reducedMotion = false;

  // Loading & error states
  loading = false;
  error: string | null = null;

  // Spotlight holo
  sx = 50; // %
  sy = 35; // %

  // Search + filter
  query = '';
  tipos: TiendaTipo[] = ['Boutique', 'Regionales', 'Regalos', 'Servicios', 'Diseño', 'Tech'];
  active: TiendaTipo | 'Todos' = 'Todos';

  // Modal (keeping for backwards compatibility if needed)
  modalOpen = false;
  selected: Tienda | null = null;

  // Data from API
  puntos: Tienda[] = [];

  // Scroll reveal
  @ViewChildren('cardEl') cardEls!: QueryList<ElementRef<HTMLElement>>;
  private io?: IntersectionObserver;
  private cardChangesSub?: { unsubscribe: () => void };

  ngOnInit(): void {
    this.reducedMotion =
      typeof window !== 'undefined'
        ? (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
        : false;

    this.loadTiendas();

    setTimeout(() => (this.isLoaded = true), 80);
  }

  private loadTiendas(): void {
    this.loading = true;
    this.error = null;

    this.localService.getPublicLocalesByCategory('tiendas')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (locales) => {
          // Load complete data for each locale to get details
          this.loadCompleteTiendasWithDetails(locales);
        },
        error: (err) => {
          this.error = typeof err === 'string' ? err : 'Error al cargar las tiendas';
          this.loading = false;
        }
      });
  }

  /**
   * Load complete tienda data with details for each locale
   */
  private loadCompleteTiendasWithDetails(locales: LocalCore[]): void {
    if (locales.length === 0) {
      this.puntos = [];
      this.loading = false;
      return;
    }

    // FIXED: Filter to only include tiendas slots 7-11
    const fixedTiendaLocales = locales.filter(local => {
      const localeId = parseInt(local.id);
      return localeId >= 7 && localeId <= 11;
    });

    if (fixedTiendaLocales.length === 0) {
      this.puntos = [];
      this.loading = false;
      return;
    }

    // Fetch details for each locale
    const localeObservables = fixedTiendaLocales.map(local => 
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
          this.puntos = this.mapAndFilterLocales(completeLocales);
          this.loading = false;
          // Re-observe cards after data loads
          setTimeout(() => this.observeCards(), 0);
        },
        error: (err) => {
          this.error = 'Error al cargar detalles de las tiendas';
          this.loading = false;
        }
      });
  }

  private mapAndFilterLocales(locales: (LocalComplete | any)[]): Tienda[] {
    return locales
      .map((local, index) => this.mapLocalToTienda(local, index));
  }

  private mapLocalToTienda(local: LocalComplete | any, index: number): Tienda {
    // Map category to tipo for UI display
    const tipoMap: Record<string, TiendaTipo> = {
      'vinoteca': 'Boutique',
      'pescados': 'Regionales',
      'autoservice': 'Servicios',
      'carnes': 'Regalos',
      'producto': 'Diseño'
    };

    // Use backend category or infer from name
    const tipo = tipoMap[local.category] || this.inferTipoFromName(local.display_name);
    
    // Use real backend data
    const glow: 1 | 2 | 3 = local.featured ? 3 : 2;

    // Extract perks from description or use saved highlights
    const perks = local.details?.highlights?.length 
      ? local.details.highlights 
      : this.extractPerks(local.short_description);

    // Fixed asset image mapping for tiendas (slots 7-11)
    const localeId = parseInt(local.id);
    const fixedAssetImage = this.getTiendaAssetImage(localeId);

    // FIXED: Use fixed slot mapping for correct business names
    const fixedDisplayName = this.getTiendaDisplayName(localeId);

    // Priorizar saved headline over short_description
    const displayHeadline = local.details?.headline || local.short_description || 'Descubre esta tienda única en Don Francisco.';

    return {
      id: local.id,
      nombre: fixedDisplayName, // FIXED: Use fixed business name instead of backend display_name
      tipo: tipo,
      estado: local.active ? 'Activo' : 'Próximamente', // FIXED: Remove "En preparación"
      resumen: displayHeadline, // Usar headline guardado
      detalle: local.long_description || local.short_description || 'Próximamente más información.',
      perks: perks, // Usar highlights guardados
      glow: glow,
      cover_image_url: fixedAssetImage
    };
  }

  /**
   * Get fixed business display name for tiendas slots 7-11
   */
  private getTiendaDisplayName(localeId: number): string {
    const nameMap = {
      7: 'Castagnet Vinoteca',
      8: 'Etiqueta Negra Carnicería',
      9: 'Fish Market Pescadería',
      10: 'La Familia Autoserivce',
      11: 'Producto de Cerro Largo'
    };
    return nameMap[localeId as keyof typeof nameMap] || 'Local Desconocido';
  }

/**
   * Get fixed asset image for tiendas slots 7-11
   */
  private getTiendaAssetImage(localeId: number): string {
    if (localeId >= 7 && localeId <= 11) {
      const assetMap = {
        7: 'castagnetvinoteca',
        8: 'etiquetanegracarniceria',
        9: 'fishmarketpescaderia',
        10: 'lafamiliaautoservice',
        11: 'productodecerrolargo'
      };
      return `/assets/${assetMap[localeId as keyof typeof assetMap]}.png`;
    }
    // Fallback to first tienda asset if outside fixed slots
    return '/assets/castagnetvinoteca.png';
  }

  private inferTipoFromName(displayName: string): TiendaTipo {
    const name = displayName.toLowerCase();
    
    if (name.includes('vino') || name.includes('vinoteca')) return 'Boutique';
    if (name.includes('pescado') || name.includes('marisco')) return 'Regionales';
    if (name.includes('auto') || name.includes('service')) return 'Servicios';
    if (name.includes('carne') || name.includes('carnicería')) return 'Regalos';
    if (name.includes('regalo') || name.includes('gift')) return 'Regalos';
    if (name.includes('diseño') || name.includes('design')) return 'Diseño';
    if (name.includes('tech') || name.includes('tecnología')) return 'Tech';
    
    return 'Boutique'; // default
  }

  private extractPerks(description: string): string[] {
    if (!description) return ['Próximamente'];
    
    // Extract perks from description
    const parts = description.split(',').map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length >= 2 && parts.length <= 4) {
      return parts.slice(0, 3);
    }
    
    // Default perks based on keywords
    if (description.toLowerCase().includes('calidad')) return ['Premium', 'Seleccionado', 'Garantizado'];
    if (description.toLowerCase().includes('artesanal')) return ['Artesanal', 'Tradicional', 'Auténtico'];
    if (description.toLowerCase().includes('importado')) return ['Importado', 'Exclusivo', 'Original'];
    
    return ['Destacado', 'Calidad', 'Variedad'];
  }

  private generatePerks(local: LocalCore): string[] {
    const perks: string[] = [];
    
    if (local.featured) perks.push('Destacado');
    if (local.address) perks.push('Con ubicación');
    if (local.phone || local.whatsapp) perks.push('Contacto directo');
    
    // Add category-specific perks
    const normalizedName = local.display_name.toLowerCase();
    if (normalizedName.includes('vinoteca')) perks.push('Vinos premium');
    if (normalizedName.includes('pescado') || normalizedName.includes('fish')) perks.push('Frescura garantizada');
    if (normalizedName.includes('carne') || normalizedName.includes('etiqueta')) perks.push('Cortes selectos');
    if (normalizedName.includes('autoservice')) perks.push('Servicio completo');
    if (normalizedName.includes('producto')) perks.push('Productos regionales');

    return perks.length > 0 ? perks : ['Nuevo local'];
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;

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
        { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
      );
    }

    this.observeCards();

    // Re-observe when cards change
    this.cardChangesSub = this.cardEls.changes.subscribe(() => {
      setTimeout(() => this.observeCards(), 0);
    });
  }

  private observeCards(): void {
    const els = this.cardEls?.toArray() ?? [];
    for (const ref of els) {
      const el = ref.nativeElement;
      if (this.reducedMotion) el.classList.add('is-in');
      else if (!el.classList.contains('is-in')) this.io?.observe(el);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.io?.disconnect();
    this.cardChangesSub?.unsubscribe();
    if (typeof window !== 'undefined') document.body.style.overflow = '';
  }

  @HostListener('mousemove', ['$event'])
  onMove(e: MouseEvent) {
    if (this.reducedMotion) return;
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    this.sx = Math.max(0, Math.min(100, (e.clientX / w) * 100));
    this.sy = Math.max(0, Math.min(100, (e.clientY / h) * 100));
  }

  setTipo(t: TiendaTipo | 'Todos') { this.active = t; }
  setQuery(v: string) { this.query = v; }

  get filtered(): Tienda[] {
    const q = this.query.trim().toLowerCase();
    return this.puntos.filter(p => {
      const okTipo = this.active === 'Todos' ? true : p.tipo === this.active;
      const okQ = !q
        ? true
        : (p.nombre + ' ' + p.tipo + ' ' + p.resumen).toLowerCase().includes(q);
      return okTipo && okQ;
    });
  }

  /**
   * Get fixed slug mapping for tiendas slots 7-11
   */
  private getTiendaSlug(localeId: number): string {
    const slugMap = {
      7: 'castagnetvinoteca',
      8: 'etiquetanegracarniceria',
      9: 'fishmarketpescaderia',
      10: 'lafamiliaautoservice',
      11: 'productodecerrolargo'
    };
    return slugMap[localeId as keyof typeof slugMap] || 'unknown';
  }

  // Navigate to detail page instead of opening modal
  abrir(tienda: Tienda) {
    // FIXED: Navigate by locale id instead of slug
    this.router.navigate(['/locales/id', tienda.id]);
  }

  // Keep modal methods for backwards compatibility if needed
  abrirModal(p: Tienda) {
    this.selected = p;
    this.modalOpen = true;
    if (typeof window !== 'undefined') document.body.style.overflow = 'hidden';
  }

  cerrar() {
    this.modalOpen = false;
    this.selected = null;
    if (typeof window !== 'undefined') document.body.style.overflow = '';
  }

  retry() {
    this.loadTiendas();
  }

  stop(e: MouseEvent) { e.stopPropagation(); }
}
