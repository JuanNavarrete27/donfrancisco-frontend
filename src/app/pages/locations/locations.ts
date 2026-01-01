import {
  Component,
  HostBinding,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

type LocalesCategoria = 'gastronomia' | 'tiendas';

@Component({
  selector: 'app-locations',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './locations.html',
  styleUrls: ['./locations.scss'],
})
export class Locations implements OnInit, OnDestroy {

  @HostBinding('class.is-loaded') isLoaded = false;
  @HostBinding('class.reduced') reducedMotion = false;

  // Parallax + Auto FX
  mouseX = 0;
  mouseY = 0;
  autoX = 0;
  autoY = 0;

  // Modal fullscreen (Plano)
  modalOpen = false;

  private rafId: number | null = null;
  private isBrowser = typeof window !== 'undefined';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.reducedMotion = this.isBrowser
      ? window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
      : false;

    setTimeout(() => (this.isLoaded = true), 80);

    // FX autónomos (suaves) incluso sin mouse
    if (this.isBrowser && !this.reducedMotion) {
      this.startAutoFx();
    }
  }

  ngOnDestroy(): void {
    if (this.rafId != null && this.isBrowser) {
      cancelAnimationFrame(this.rafId);
    }
  }

  // Parallax suave desktop
  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    if (!this.isBrowser || this.reducedMotion) return;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    // micro-movimiento premium
    this.mouseX = (e.clientX - cx) * 0.012;
    this.mouseY = (e.clientY - cy) * 0.012;
  }

  // Navegar a categoría
  irA(cat: LocalesCategoria) {
    this.router.navigate(['/locales', cat]);
  }

  // Abrir modal fullscreen
  abrirModal() {
    this.modalOpen = true;
    // lock scroll
    if (this.isBrowser) document.body.style.overflow = 'hidden';
  }

  // Cerrar modal fullscreen
  cerrarModal() {
    this.modalOpen = false;
    if (this.isBrowser) document.body.style.overflow = '';
  }

  // Evita que click en la imagen cierre el modal
  evitarCerrar(e: MouseEvent) {
    e.stopPropagation();
  }

  // =========================
  // Auto FX loop
  // =========================
  private startAutoFx() {
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = now - t0;

      // Ondas muy lentas para “vida” en la pantalla
      this.autoX = Math.sin(t / 1400) * 10 + Math.sin(t / 3100) * 6;
      this.autoY = Math.cos(t / 1600) * 8 + Math.cos(t / 2900) * 5;

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }
}
