import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChildren,
  QueryList,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CSSPlugin } from 'gsap/CSSPlugin';

gsap.registerPlugin(ScrollTrigger, CSSPlugin);

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class HomeComponent implements AfterViewInit, OnInit {

  @ViewChildren('animateOnScroll') animateElements!: QueryList<ElementRef>;
  @ViewChild('heroSection') heroSection!: ElementRef;
  @ViewChild('infoSection') infoSection!: ElementRef;
  @ViewChild('featuresSection') featuresSection!: ElementRef;

  // ===========================================================
  // MODAL (VERSIÓN ANGULAR FUNCIONAL)
  // ===========================================================
  modalAbierto = false;
  modalItem: any = null;

  abrirModal(item: any) {
    this.modalItem = item;
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.modalItem = null;
    document.body.style.overflow = 'auto';
  }

  // ===========================================================
  // CICLO DE VIDA
  // ===========================================================
  constructor(private elementRef: ElementRef) {}

  ngOnInit() {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.initScrollAnimations();
    }, 120);
  }

  // ===========================================================
  // ANIMACIONES GSAP
  // ===========================================================
  private initScrollAnimations() {
    if (typeof window === 'undefined') return;

    ScrollTrigger.refresh();

    // FadeIn + slideUp
    this.animateElements.forEach((element: ElementRef, index: number) => {
      gsap.from(element.nativeElement, {
        opacity: 0,
        y: 40,
        duration: 0.9,
        delay: index * 0.05,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: element.nativeElement,
          start: 'top 85%',
        },
      });
    });

    // HERO
    if (this.heroSection) {
      const heroEl = this.heroSection.nativeElement as HTMLElement;
      const heroContent = heroEl.querySelector('.hero-content');

      if (heroContent) {
        gsap.from(heroContent, {
          opacity: 0,
          x: -80,
          duration: 1.2,
          ease: 'power3.out',
        });
      }

      gsap.to(heroEl, {
        backgroundPositionY: '30%',
        scrollTrigger: {
          trigger: heroEl,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      const floatingItems = heroEl.querySelectorAll('.hero-floating');
      if (floatingItems.length) {
        gsap.to(floatingItems, {
          y: -10,
          opacity: 1,
          duration: 2.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: 0.25,
        });
      }
    }

    // INFO SECTION
    if (this.infoSection) {
      const infoItems = this.infoSection.nativeElement.querySelectorAll('.info-item');

      if (infoItems.length) {
        gsap.from(infoItems, {
          opacity: 0,
          y: 30,
          stagger: 0.15,
          duration: 0.9,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: this.infoSection.nativeElement,
            start: 'top 80%',
          },
        });
      }
    }

    // FEATURES
    if (this.featuresSection) {
      const cards = this.featuresSection.nativeElement.querySelectorAll('.card');

      cards.forEach((card: HTMLElement, index: number) => {
        gsap.from(card, {
          opacity: 0,
          x: index % 2 === 0 ? -55 : 55,
          duration: 0.9,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
          },
        });

        // Hover effect
        card.addEventListener('mouseenter', () => {
          gsap.to(card, {
            y: -6,
            scale: 1.02,
            boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
            duration: 0.25,
            ease: 'power1.out',
          });
        });

        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            y: 0,
            scale: 1,
            boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
            duration: 0.25,
            ease: 'power1.out',
          });
        });
      });
    }

    // TITLES
    const sectionTitles = this.elementRef.nativeElement.querySelectorAll('.section-title');

    if (sectionTitles.length) {
      gsap.from(sectionTitles, {
        opacity: 0,
        y: 30,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionTitles[0],
          start: 'top 90%',
        },
        stagger: 0.1,
      });
    }
  }

  // ===========================================================
  // CONTENIDO DEL PROYECTO
  // ===========================================================
  resumenHero: string = `
    El ex Mercado Municipal de Melo está siendo transformado en un moderno mercado gastronómico,
    cultural y comercial: el nuevo Mercado Don Francisco. Un proyecto público-privado que 
    revitalizará el corazón de la ciudad.
  `;

  infoGeneral = [
    `Inauguración prevista para 2026.`,
    `Generará empleos indirectos mediante servicios y proveedores.`,
    `Inversión total estimada: 21.5 millones de pesos.`,
    `Aporte de la Intendencia: 4.5 millones.`,
    `Desarrollo arquitectónico a cargo de Mercado 1897.`,
    `Convertirá la zona en un moderno punto de encuentro para Melo.`,
  ];

  secciones = [
    {
      titulo: 'Un nuevo mercado gastronómico',
      contenido: `
        Don Francisco combinará propuestas culinarias, comercios, cultura 
        y actividades recreativas en un solo espacio renovado, con estética
        contemporánea y respeto por la historia del edificio original.
      `,
      imagen: '/images/banner.jpg'
    },
    {
      titulo: 'Sala de Eventos ya inaugurada',
      contenido: `
        El proyecto ya cuenta con una Sala de Eventos operativa, pensada para
        actividades culturales, conferencias, lanzamientos, muestras y 
        propuestas educativas abiertas a la comunidad.
      `,
      imagen: '/images/banner.jpg'
    },
    {
      titulo: 'Impacto en el empleo local',
      contenido: `
        Se estima que trabajarán entre 80 y 100 personas de forma directa,
        más una red amplia de proveedores, servicios, logística y oficios
        asociados al funcionamiento diario del mercado.
      `,
      imagen: '/images/banner.jpg'
    },
    {
      titulo: 'Apoyo público-privado',
      contenido: `
        La Intendencia aportó obras clave de demolición y reacondicionamiento,
        mientras que la inversión privada impulsa la arquitectura, el diseño
        interior y la puesta en marcha de la propuesta gastronómica y comercial.
      `,
      imagen: '/images/banner.jpg'
    },
    {
      titulo: 'Un punto de encuentro para Melo',
      contenido: `
        El antiguo Mercado Municipal se convertirá en un polo de encuentro
        cotidiano, con ambiente cálido, propuestas para distintas edades y
        un sello propio que identifique a la ciudad.
      `,
      imagen: '/images/banner.jpg'
    },
    {
      titulo: 'Visión de futuro',
      contenido: `
        Bajo la conducción de Mario Viñas, el proyecto aspira a marcar un antes
        y un después para Melo, integrando tradición, innovación y desarrollo
        económico sostenible en un mismo espacio.
      `,
      imagen: '/images/banner.jpg'
    },
  ];

  articuloCompleto: string = `
Mercado Don Francisco transformará el viejo Mercado Municipal en un moderno punto de encuentro
gastronómico, comercial y cultural. El proyecto, liderado por Mario Viñas y la empresa Mercado 1897,
busca revitalizar el centro de Melo con un espacio multifuncional que integre historia, gastronomía,
emprendimientos y actividades recreativas.

Con una inversión estimada en 21.5 millones de pesos y un aporte clave de la Intendencia en obra
estructural, el mercado apunta a convertirse en un nuevo símbolo de la ciudad, generando empleo,
movimiento y oportunidades para emprendedores locales.
  `;
}
