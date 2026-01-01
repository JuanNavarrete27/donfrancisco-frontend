// trabaja-con-nosotros.page.ts
// ============================================================
// Don Francisco — Trabajá con nosotros
// Standalone Page (Angular) + Premium Café UI + GSAP
//
// ✅ Incluye:
// - 3 pasos con CTA (descargar PDF / imprimir / traer a administración)
// - Modal PRO con Google Maps Embed (sanitizado)
// - Animaciones GSAP (entrada + modal) con guard SSR + reduced motion
// - Accesibilidad: ESC cierra, overlay cierra, focus al modal
// ============================================================

import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { gsap } from 'gsap';

type ModalState = 'closed' | 'opening' | 'open' | 'closing';

@Component({
  selector: 'app-trabaja-con-nosotros',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './trabaja-con-nosotros.page.html',
  styleUrls: ['./trabaja-con-nosotros.page.scss'],
})
export class TrabajaConNosotrosPage implements AfterViewInit, OnDestroy {
  @HostBinding('class.is-loaded') isLoaded = false;

  @ViewChild('pageRoot', { static: true }) pageRootRef!: ElementRef<HTMLElement>;
  @ViewChild('hero', { static: true }) heroRef!: ElementRef<HTMLElement>;
  @ViewChild('steps', { static: true }) stepsRef!: ElementRef<HTMLElement>;
  @ViewChild('mapModal', { static: true }) mapModalRef!: ElementRef<HTMLElement>;
  @ViewChild('modalOverlay', { static: true }) modalOverlayRef!: ElementRef<HTMLElement>;
  @ViewChild('modalCard', { static: true }) modalCardRef!: ElementRef<HTMLElement>;

  // ✅ PDF está en /public/pdf/form.pdf  -> se sirve como /pdf/form.pdf
  readonly pdfUrl = '/pdf/form.pdf';

  // ✅ Embed que pasaste (sanitizado)
  readonly mapsEmbedUrl: SafeResourceUrl;

  // Link externo opcional (por si el usuario prefiere abrir Maps directamente)
  readonly mapsExternalUrl =
    'https://www.google.com/maps?q=Mercado%20Don%20Francisco%20Shopping%20Center&hl=es&gl=uy';

  private tlIntro?: gsap.core.Timeline;
  private modalTl?: gsap.core.Timeline;

  modalState: ModalState = 'closed';

  private prevBodyOverflow = '';
  private readonly isBrowser: boolean;
  private reducedMotion = false;

  constructor(
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) platformId: object,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    const rawEmbed =
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3369.8075540169248!2d-54.1704699246372!3d-32.370707743032206!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95092b93843aedc3%3A0xafb3aec58151bac4!2sMercado%20Don%20Francisco%20Shopping%20Center!5e0!3m2!1ses!2suy!4v1765913965555!5m2!1ses!2suy';

    this.mapsEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawEmbed);

    if (this.isBrowser) {
      this.reducedMotion =
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    // Estado inicial para animaciones sin flashes
    this.setInitialStates();

    // Intro GSAP
    this.playIntro();

    // Modal inicialmente oculto (pero montado, para poder animar)
    this.hideModalImmediate();
  }

  ngOnDestroy(): void {
    this.tlIntro?.kill();
    this.modalTl?.kill();
    this.unlockBodyScroll();
  }

  // ============================================================
  // PDF (opcional)
  // ============================================================
  // Si querés usar un <button (click)="downloadPdf()"> en vez de <a download>
  // No requiere librerías. Genera una descarga "forzada".
  downloadPdf(): void {
    if (!this.isBrowser) return;

    const a = this.document.createElement('a');
    a.href = this.pdfUrl;        // /pdf/form.pdf
    a.download = 'form.pdf';     // nombre sugerido
    a.rel = 'noopener';
    this.document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ============================================================
  // UI Actions
  // ============================================================

  abrirMapa(): void {
    if (!this.isBrowser) return;
    if (this.modalState === 'opening' || this.modalState === 'open') return;

    this.modalState = 'opening';
    this.lockBodyScroll();

    const modalEl = this.mapModalRef?.nativeElement;
    const overlayEl = this.modalOverlayRef?.nativeElement;
    const cardEl = this.modalCardRef?.nativeElement;

    if (!modalEl || !overlayEl || !cardEl) {
      // Fallback seguro
      this.modalState = 'open';
      return;
    }

    // Asegurar visible antes de animar
    gsap.set(modalEl, { pointerEvents: 'auto' });
    gsap.set(overlayEl, { autoAlpha: 0 });
    gsap.set(cardEl, { autoAlpha: 0, y: 18, scale: 0.98 });

    this.modalTl?.kill();
    this.modalTl = gsap.timeline({
      defaults: { ease: 'power3.out', duration: this.reducedMotion ? 0 : 0.35 },
      onComplete: () => {
        this.modalState = 'open';
        // Focus al card para accesibilidad
        cardEl.focus?.();
      },
    });

    this.modalTl
      .to(overlayEl, { autoAlpha: 1 }, 0)
      .to(cardEl, { autoAlpha: 1, y: 0, scale: 1 }, 0.03);
  }

  cerrarMapa(): void {
    if (!this.isBrowser) return;
    if (this.modalState === 'closing' || this.modalState === 'closed') return;

    this.modalState = 'closing';

    const modalEl = this.mapModalRef?.nativeElement;
    const overlayEl = this.modalOverlayRef?.nativeElement;
    const cardEl = this.modalCardRef?.nativeElement;

    if (!modalEl || !overlayEl || !cardEl) {
      this.modalState = 'closed';
      this.unlockBodyScroll();
      return;
    }

    this.modalTl?.kill();
    this.modalTl = gsap.timeline({
      defaults: { ease: 'power2.inOut', duration: this.reducedMotion ? 0 : 0.22 },
      onComplete: () => {
        this.modalState = 'closed';
        this.hideModalImmediate();
        this.unlockBodyScroll();
      },
    });

    this.modalTl
      .to(cardEl, { autoAlpha: 0, y: 10, scale: 0.99 }, 0)
      .to(overlayEl, { autoAlpha: 0 }, 0.02)
      .set(modalEl, { pointerEvents: 'none' });
  }

  // Click overlay
  onOverlayClick(): void {
    this.cerrarMapa();
  }

  // ============================================================
  // Keyboard
  // ============================================================

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && (this.modalState === 'open' || this.modalState === 'opening')) {
      ev.preventDefault();
      this.cerrarMapa();
    }
  }

  // ============================================================
  // Animations
  // ============================================================

  private setInitialStates(): void {
    const heroEl = this.heroRef?.nativeElement;
    const stepsEl = this.stepsRef?.nativeElement;

    if (!heroEl || !stepsEl) return;

    // Intro: dejamos todo listo para entrar suave
    gsap.set(heroEl.querySelectorAll('[data-anim="hero"]'), { autoAlpha: 0, y: 14 });
    gsap.set(stepsEl.querySelectorAll('.step-card'), { autoAlpha: 0, y: 16 });
    gsap.set(stepsEl.querySelectorAll('.step-card .step-card__shine'), { autoAlpha: 0 });
  }

  private playIntro(): void {
    const heroEl = this.heroRef?.nativeElement;
    const stepsEl = this.stepsRef?.nativeElement;
    if (!heroEl || !stepsEl) return;

    if (this.reducedMotion) {
      // Sin animación: mostrar todo
      gsap.set(heroEl.querySelectorAll('[data-anim="hero"]'), {
        clearProps: 'all',
        autoAlpha: 1,
        y: 0,
      });
      gsap.set(stepsEl.querySelectorAll('.step-card'), {
        clearProps: 'all',
        autoAlpha: 1,
        y: 0,
      });
      this.isLoaded = true;
      return;
    }

    const heroBits = heroEl.querySelectorAll('[data-anim="hero"]');
    const cards = stepsEl.querySelectorAll('.step-card');
    const shines = stepsEl.querySelectorAll('.step-card .step-card__shine');

    this.tlIntro?.kill();

    this.tlIntro = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        this.isLoaded = true;
      },
    });

    this.tlIntro
      .to(heroBits, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07 }, 0)
      .to(cards, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0.25)
      .to(shines, { autoAlpha: 1, duration: 0.35, stagger: 0.08 }, 0.55);
  }

  private hideModalImmediate(): void {
    const modalEl = this.mapModalRef?.nativeElement;
    const overlayEl = this.modalOverlayRef?.nativeElement;
    const cardEl = this.modalCardRef?.nativeElement;

    if (!modalEl || !overlayEl || !cardEl) return;

    gsap.set(modalEl, { pointerEvents: 'none' });
    gsap.set(overlayEl, { autoAlpha: 0 });
    gsap.set(cardEl, { autoAlpha: 0, y: 18, scale: 0.98 });
  }

  // ============================================================
  // Scroll lock
  // ============================================================

  private lockBodyScroll(): void {
    if (!this.isBrowser) return;
    const body = this.document.body;
    this.prevBodyOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    if (!this.isBrowser) return;
    const body = this.document.body;
    body.style.overflow = this.prevBodyOverflow || '';
    this.prevBodyOverflow = '';
  }
}
