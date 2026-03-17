
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
import { Subject, takeUntil } from 'rxjs';

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

// Hardcoded tiendas data
const HARDCODED_TIENDAS: Tienda[] = [
  {
    id: '7',
    nombre: 'San Carlos Coffee & Cake',
    tipo: 'Boutique',
    estado: 'Activo',
    resumen: 'Café especial y pasteles artesanales en un ambiente acogedor',
    detalle: 'Disfruta de nuestros cafés de especialidad seleccionados de las mejores plantaciones, acompañados de pasteles hechos en casa.',
    perks: ['Café especial', 'Pasteles artesanales', 'Ambiente acogedor'],
    glow: 3,
    cover_image_url: '/images/banner.png'
  },
  {
    id: '8',
    nombre: 'Mister Grill Hamburguesas Gourmet',
    tipo: 'Boutique',
    estado: 'Activo',
    resumen: 'Hamburguesas gourmet con ingredientes premium y técnicas únicas',
    detalle: 'Experimenta hamburguesas únicas preparadas con ingredientes seleccionados y técnicas de cocina que elevan el sabor.',
    perks: ['Ingredientes premium', 'Técnicas únicas', 'Sabor gourmet'],
    glow: 2,
    cover_image_url: '/images/banner.png'
  },
  {
    id: '9',
    nombre: 'Cremino Gelatto Fatto con Amore',
    tipo: 'Boutique',
    estado: 'Activo',
    resumen: 'Helados artesanales italianos con recetas tradicionales',
    detalle: 'Auténtico gelatto italiano preparado con amor usando recetas tradicionales y los mejores ingredientes naturales.',
    perks: ['Helado artesanal', 'Recetas italianas', 'Ingredientes naturales'],
    glow: 3,
    cover_image_url: '/images/banner.png'
  },
  {
    id: '10',
    nombre: 'La Familia Autoservice',
    tipo: 'Servicios',
    estado: 'Activo',
    resumen: 'Servicio completo de productos de primera necesidad',
    detalle: 'Todo lo que necesitas para tu hogar en un solo lugar, con la calidad y atención que caracteriza a La Familia.',
    perks: ['Servicio completo', 'Calidad garantizada', 'Atención personal'],
    glow: 2,
    cover_image_url: '/images/banner.png'
  },
  {
    id: '11',
    nombre: 'Etiqueta Negra Carnes Selección Gourmet',
    tipo: 'Regalos',
    estado: 'Activo',
    resumen: 'Carnes premium seleccionadas para los más exigentes',
    detalle: 'Los mejores cortes de carne seleccionados por expertos, garantizando calidad y sabor inigualables en cada pieza.',
    perks: ['Carnes premium', 'Selección experta', 'Calidad garantizada'],
    glow: 3,
    cover_image_url: '/images/banner.png'
  }
];

@Component({
  selector: 'app-locales-tiendas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tiendas.page.html',
  styleUrls: ['./tiendas.page.scss'],
})
export class TiendasPage implements OnInit, AfterViewInit, OnDestroy {
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

    // Simulate brief loading for better UX
    setTimeout(() => {
      this.puntos = HARDCODED_TIENDAS;
      this.loading = false;
      // Re-observe cards after data loads
      setTimeout(() => this.observeCards(), 0);
    }, 300);
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
