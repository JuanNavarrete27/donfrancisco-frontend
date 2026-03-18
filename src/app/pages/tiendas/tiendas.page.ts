
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

interface TiendaLocal {
  id: number;
  slug: string;
  display_name: string;
  image: string;
}

const TIENDAS_LOCALES: TiendaLocal[] = [
  {
    id: 7,
    slug: 'san-carlos-coffee-cake',
    display_name: 'San Carlos Coffee & Cake',
    image: 'assets/sancarloscoffee.png'
  },
  {
    id: 8,
    slug: 'sakai-sushi',
    display_name: 'Sakai Sushi',
    image: 'assets/sakaisushi.png'
  },
  {
    id: 9,
    slug: 'cremino-gelatto-fatto-con-amore',
    display_name: 'Cremino Gelatto',
    image: 'assets/creminogelatto.png'
  },
  {
    id: 10,
    slug: 'la-familia-autoservice',
    display_name: 'La Familia Autoservice',
    image: 'assets/lafamiliaautoservice.png'
  },
  {
    id: 11,
    slug: 'etiqueta-negra-carnes-seleccion-gourmet',
    display_name: 'Etiqueta Negra Carnes',
    image: 'assets/etiquetanegracarniceria.png'
  },
  {
    id: 12,
    slug: 'producto-de-cerro-largo',
    display_name: 'Producto de Cerro Largo',
    image: 'assets/productodecerrolargo.png'
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

  // Spotlight holo
  sx = 50; // %
  sy = 35; // %

  // Data from API
  puntos: TiendaLocal[] = TIENDAS_LOCALES;

  // Scroll reveal
  @ViewChildren('cardEl') cardEls!: QueryList<ElementRef<HTMLElement>>;
  private io?: IntersectionObserver;
  private cardChangesSub?: { unsubscribe: () => void };

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



  // Navigate to detail page instead of opening modal
  abrir(tienda: TiendaLocal) {
    this.router.navigate(['/locales', tienda.slug]);
  }

}
