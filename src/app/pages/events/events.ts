import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, DatePipe],
  providers: [DatePipe],
  templateUrl: './events.html',
  styleUrls: ['./events.scss']
})
export class EventsComponent {

  animarEntrada = false;

  modalAbierto = false;
  eventoActivo: any = null;
  cerrandoModal = false;

  constructor(private sanitizer: DomSanitizer) {}

  /* ============================================================
     EVENTOS
  ============================================================ */

  eventosProximos = [
    {
      titulo: 'Inauguración del Mercado',
      fecha: new Date(2026, 2, 28),
      descripcion: 'Apertura oficial.',
      imagen: '/images/banner.jpg',
      videoUrl: 'https://www.instagram.com/p/DR4u9Vnjats/embed/',
      safeVideoUrl: null as SafeResourceUrl | null
    },
    {
      titulo: 'EJEMPLO',
      fecha: new Date(2026, 1, 28),
      descripcion: 'EJEMPLO.',
      imagen: '/images/banner.jpg',
      videoUrl: 'https://www.instagram.com/p/DR4u9Vnjats/embed/',
      safeVideoUrl: null as SafeResourceUrl | null
    }
  ];

  eventosPasados = [
    {
      titulo: 'Saxo Oral',
      fecha: new Date(2025, 11, 15),
      descripcion: 'Volvé al Mercado - Segunda edición',
      imagen: '/images/saxooral.jpg',
      videoUrl: 'https://www.instagram.com/p/DRhtvdvjueB/embed/',
      safeVideoUrl: null as SafeResourceUrl | null
    },
    {
      titulo: 'Paulina Viroga',
      fecha: new Date(2025, 9, 22),
      descripcion: 'Volvé al Mercado',
      imagen: '/images/paulinaviroga.jpg',
      videoUrl: 'https://www.instagram.com/p/DO9iCIqDYjr/embed/',
      safeVideoUrl: null as SafeResourceUrl | null
    }
  ];

  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit() {
    // ✅ Sanitizar videos (igual a Novedades)
    [...this.eventosProximos, ...this.eventosPasados].forEach(evento => {
      if (evento.videoUrl) {
        evento.safeVideoUrl =
          this.sanitizer.bypassSecurityTrustResourceUrl(evento.videoUrl);
      }
    });

    setTimeout(() => {
      this.animarEntrada = true;
    }, 30);
  }

  /* ============================================================
     MODAL
  ============================================================ */

  abrirModal(evento: any) {
    this.eventoActivo = evento;
    this.modalAbierto = true;
    this.cerrandoModal = false;

    document.body.style.overflow = 'hidden';
  }

  cerrarModal() {
    this.cerrandoModal = true;

    setTimeout(() => {
      this.modalAbierto = false;
      this.eventoActivo = null;
      this.cerrandoModal = false;

      document.body.style.overflow = 'auto';
    }, 250);
  }
}
