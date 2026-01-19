
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

type GastroTag = 'Café' | 'Horno' | 'Parrilla' | 'Pastelería' | 'Veggie' | 'Tragos' | 'Bistró';

type GastroLocal = {
  id: string;
  nombre: string;
  tag: GastroTag;
  estado: 'Próximamente' | 'En preparación';
  resumen: string;
  detalle: string;
  highlight: string[];
  intensidad: 1 | 2 | 3;
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

  // Modal
  modalOpen = false;
  selected: GastroLocal | null = null;

  // Scroll reveal
  @ViewChildren('cardEl') cardEls!: QueryList<ElementRef<HTMLElement>>;
  private io?: IntersectionObserver;
  private cardChangesSub?: { unsubscribe: () => void };

  // Data (8)
  locales: GastroLocal[] = [
    {
      id: 'g1',
      nombre: 'Café',
      tag: 'Café',
      estado: 'En preparación',
      resumen: '...',
      detalle: '...',
      highlight: ['...'],
      intensidad: 3
    },
    {
      id: 'g2',
      nombre: 'Horno de Barro',
      tag: 'Horno',
      estado: 'Próximamente',
      resumen: '...',
      detalle: '...',
      highlight: ['...'],
      intensidad: 3
    },
    {
      id: 'g3',
      nombre: 'Parrilla',
      tag: 'Parrilla',
      estado: 'Próximamente',
      resumen: '...',
      detalle: '...',
      highlight: ['Cocción a la vista'],
      intensidad: 2
    },
    {
      id: 'g4',
      nombre: 'Dulce',
      tag: 'Pastelería',
      estado: 'En preparación',
      resumen: '...',
      detalle: '...',
      highlight: ['Pastelería artesanal', '...'],
      intensidad: 2
    },

    // ✅ CORREGIDOS: los "..." NO pueden ir en tag porque GastroTag es union
    // Elegí tags válidos para que compile.
    {
      id: 'g5',
      nombre: 'Veggie',
      tag: 'Veggie',
      estado: 'En preparación',
      resumen: '...',
      detalle: '...',
      highlight: ['...'],
      intensidad: 1
    },
    {
      id: 'g6',
      nombre: 'Bistró',
      tag: 'Bistró',
      estado: 'Próximamente',
      resumen: '...',
      detalle: '...',
      highlight: ['...'],
      intensidad: 1
    },
    {
      id: 'g7',
      nombre: 'Barra',
      tag: 'Tragos',
      estado: 'Próximamente',
      resumen: '...',
      detalle: '...',
      highlight: ['...'],
      intensidad: 2
    }
  ];

  get featured(): GastroLocal {
    return this.locales.slice().sort((a, b) => b.intensidad - a.intensidad)[0];
  }

  get filtered(): GastroLocal[] {
    if (this.activeTag === 'Todos') return this.locales;
    return this.locales.filter(x => x.tag === this.activeTag);
  }

  ngOnInit(): void {
    this.reducedMotion =
      typeof window !== 'undefined'
        ? (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
        : false;

    setTimeout(() => (this.isLoaded = true), 80);
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

  abrir(local: GastroLocal) {
    this.selected = local;
    this.modalOpen = true;
    if (typeof window !== 'undefined') document.body.style.overflow = 'hidden';
  }

  cerrar() {
    this.modalOpen = false;
    this.selected = null;
    if (typeof window !== 'undefined') document.body.style.overflow = '';
  }

  stop(e: MouseEvent) {
    e.stopPropagation();
  }
}
