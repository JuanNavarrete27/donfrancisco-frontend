
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

interface GastroLocal {
  id: number;
  slug: string;
  display_name: string;
  image: string;
}

const GASTRO_LOCALES: GastroLocal[] = [
  {
    id: 2,
    slug: 'entre-brasas-parrilla',
    display_name: 'Entre Brasas Parrilla Oriental',
    image: 'assets/entrebrasasparrilla.png'
  },
  {
    id: 3,
    slug: 'fornos-pizzeria',
    display_name: 'Fornos Pizzeria',
    image: 'assets/fornospizzeria.png'
  },
  {
    id: 4,
    slug: 'fornos-milanesas-chiquitos',
    display_name: 'Fornos Milanesas & Chiquitos',
    image: 'assets/fornosmilanesas.png'
  },
  {
    id: 8,
    slug: 'sakai-sushi',
    display_name: 'Sakai Sushi',
    image: 'assets/sakaisushi.png'
  },
  {
    id: 7,
    slug: 'san-carlos-coffee-cake',
    display_name: 'San Carlos Coffee & Cake',
    image: 'assets/sancarloscoffee.png'
  },
  {
    id: 9,
    slug: 'cremino-gelatto-fatto-con-amore',
    display_name: 'Cremino Gelatto',
    image: 'assets/creminogelatto.png'
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


  // Data
  locales: GastroLocal[] = GASTRO_LOCALES;

  // Scroll reveal
  @ViewChildren('cardEl') cardEls!: QueryList<ElementRef<HTMLElement>>;
  private io?: IntersectionObserver;
  private cardChangesSub?: { unsubscribe: () => void };
  private destroy$ = new Subject<void>();


  constructor(
    private router: Router
  ) {}

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


/**
   * Navega a la página de detalle del local
   */
  abrir(local: GastroLocal) {
    this.router.navigate(['/locales', local.slug]);
  }
}