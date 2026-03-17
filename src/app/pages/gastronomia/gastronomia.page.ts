
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
import { Subject, takeUntil } from 'rxjs';

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

// Hardcoded gastronomia data
const HARDCODED_GASTRONOMIA: GastroLocal[] = [
  {
    id: '2',
    nombre: 'Entre Brasas Parrilla Oriental',
    tag: 'Parrilla',
    estado: 'Activo',
    resumen: 'Parrilla oriental con cortes premium y ambiente sofisticado',
    detalle: 'Experimenta los mejores cortes de carne preparados a la parrilla oriental con técnicas tradicionales y un ambiente elegante.',
    highlight: ['Cortes premium', 'Ambiente sofisticado', 'Técnicas tradicionales'],
    intensidad: 3,
    coverImageUrl: '/images/banner.png'
  },
  {
    id: '3',
    nombre: 'Fornos Pizzeria',
    tag: 'Horno',
    estado: 'Activo',
    resumen: 'Auténtica pizza italiana con masa artesanal y ingredientes premium',
    detalle: 'Disfruta de pizzas auténticas preparadas en horno de leña con masa fermentada naturalmente y los mejores ingredientes italianos.',
    highlight: ['Pizza artesanal', 'Horno de leña', 'Ingredientes italianos'],
    intensidad: 2,
    coverImageUrl: '/images/banner.png'
  },
  {
    id: '4',
    nombre: 'Fornos Milanesas & Chiquitos',
    tag: 'Horno',
    estado: 'Activo',
    resumen: 'Milanesas clásicas y chiquitos tradicionales con recetas caseras',
    detalle: 'Las mejores milanesas de la casa con recetas familiares, acompañadas de nuestros chiquitos tradicionales.',
    highlight: ['Recetas caseras', 'Tradición familiar', 'Calidad premium'],
    intensidad: 3,
    coverImageUrl: '/images/banner.png'
  },
  {
    id: '5',
    nombre: 'Castagnet Vinoteca',
    tag: 'Bistró',
    estado: 'Activo',
    resumen: 'Selección exclusiva de vinos nacionales e internacionales',
    detalle: 'Una curada colección de vinos con las mejores etiquetas nacionales e internacionales, ideal para conocedores.',
    highlight: ['Vinos premium', 'Selección exclusiva', 'Ambiente elegante'],
    intensidad: 2,
    coverImageUrl: '/images/banner.png'
  },
  {
    id: '6',
    nombre: 'Fish Market Pescados & Mariscos',
    tag: 'Bistró',
    estado: 'Activo',
    resumen: 'Pescados y mariscos frescos del día con preparaciones gourmet',
    detalle: 'Productos del mar seleccionados diariamente, preparados con técnicas gourmet que resaltan su sabor natural.',
    highlight: ['Producto fresco', 'Preparaciones gourmet', 'Selección diaria'],
    intensidad: 2,
    coverImageUrl: '/images/banner.png'
  }
];

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
   * Load hardcoded gastronomia data
   */
  loadLocales(): void {
    this.loading = true;
    this.error = null;

    // Simulate brief loading for better UX
    setTimeout(() => {
      this.locales = HARDCODED_GASTRONOMIA;
      this.loading = false;
    }, 300);
  }

/**
   * Navega a la página de detalle del local
   */
  abrir(local: GastroLocal) {
    // FIXED: Navigate by locale id instead of slug
    this.router.navigate(['/locales/id', local.id]);
  }
}
