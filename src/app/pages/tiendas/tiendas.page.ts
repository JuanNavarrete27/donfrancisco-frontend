
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
import { RouterModule } from '@angular/router';

type TiendaTipo = 'Boutique' | 'Regionales' | 'Regalos' | 'Servicios' | 'Diseño' | 'Tech';

type PuntoVenta = {
  id: string;
  nombre: string;
  tipo: TiendaTipo;
  estado: 'Próximamente' | 'En preparación';
  resumen: string;
  detalle: string;
  perks: string[];
  glow: 1 | 2 | 3;
};

@Component({
  selector: 'app-locales-tiendas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tiendas.page.html',
  styleUrls: ['./tiendas.page.scss'],
})
export class TiendasPage implements OnInit, AfterViewInit, OnDestroy {

  @HostBinding('class.is-loaded') isLoaded = false;
  @HostBinding('class.reduced') reducedMotion = false;

  // Spotlight holo
  sx = 50; // %
  sy = 35; // %

  // Search + filter
  query = '';
  tipos: TiendaTipo[] = ['Boutique', 'Regionales', 'Regalos', 'Servicios', 'Diseño', 'Tech'];
  active: TiendaTipo | 'Todos' = 'Todos';

  // Modal
  modalOpen = false;
  selected: PuntoVenta | null = null;

  // Scroll reveal
  @ViewChildren('cardEl') cardEls!: QueryList<ElementRef<HTMLElement>>;
  private io?: IntersectionObserver;
  private cardChangesSub?: { unsubscribe: () => void };

  // Data (6)
  puntos: PuntoVenta[] = [
    {
      id: 't1',
      nombre: 'Boutique',
      tipo: 'Boutique',
      estado: 'En preparación',
      resumen: '...',
      detalle: '...',
      perks: ['...'],
      glow: 3
    },
    {
      id: 't2',
      nombre: 'Regionales',
      tipo: 'Regionales',
      estado: 'Próximamente',
      resumen: '...',
      detalle: '...',
      perks: ['...', '...', '...'],
      glow: 2
    },
    {
      id: 't3',
      nombre: 'Regalos',
      tipo: 'Regalos',
      estado: 'En preparación',
      resumen: '...',
      detalle: '...',
      perks: ['...', '...'],
      glow: 2
    },
    {
      id: 't4',
      nombre: 'Servicios',
      tipo: 'Servicios',
      estado: 'En preparación',
      resumen: '...',
      detalle: '...',
      perks: ['...'],
      glow: 1
    },
    {
      id: 't5',
      nombre: 'Estudio',
      tipo: 'Diseño',
      estado: 'Próximamente',
      resumen: '...',
      detalle: '...',
      perks: ['...'],
      glow: 2
    },
    {
      id: 't6',
      nombre: 'Tech & Accesorios',
      tipo: 'Tech',
      estado: 'Próximamente',
      resumen: '...',
      detalle: '...',
      perks: ['...'],
      glow: 1
    },
  ];

  ngOnInit(): void {
    this.reducedMotion =
      typeof window !== 'undefined'
        ? (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
        : false;

    setTimeout(() => (this.isLoaded = true), 80);
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

    const observeAll = () => {
      const els = this.cardEls?.toArray() ?? [];
      for (const ref of els) {
        const el = ref.nativeElement;
        if (this.reducedMotion) el.classList.add('is-in');
        else if (!el.classList.contains('is-in')) this.io?.observe(el);
      }
    };

    observeAll();

    // ✅ evitar leak: guardo la subscripción y la corto en ngOnDestroy
    this.cardChangesSub = this.cardEls.changes.subscribe(() => {
      setTimeout(() => observeAll(), 0);
    });
  }

  ngOnDestroy(): void {
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

  get filtered(): PuntoVenta[] {
    const q = this.query.trim().toLowerCase();
    return this.puntos.filter(p => {
      const okTipo = this.active === 'Todos' ? true : p.tipo === this.active;
      const okQ = !q
        ? true
        : (p.nombre + ' ' + p.tipo + ' ' + p.resumen).toLowerCase().includes(q);
      return okTipo && okQ;
    });
  }

  abrir(p: PuntoVenta) {
    this.selected = p;
    this.modalOpen = true;
    if (typeof window !== 'undefined') document.body.style.overflow = 'hidden';
  }

  cerrar() {
    this.modalOpen = false;
    this.selected = null;
    if (typeof window !== 'undefined') document.body.style.overflow = '';
  }

  stop(e: MouseEvent) { e.stopPropagation(); }
}
