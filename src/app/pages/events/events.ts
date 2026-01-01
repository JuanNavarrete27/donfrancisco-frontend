
import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/* ============================================================
   INTERFACE EVENTO (CLAVE PARA EVITAR never[])
============================================================ */
interface Evento {
  titulo: string;
  fecha: Date;
  descripcion: string;
  imagen?: string;
  videoUrl?: string;
  safeVideoUrl?: SafeResourceUrl | null;
}

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
  eventoActivo: Evento | null = null;
  cerrandoModal = false;

  constructor(private sanitizer: DomSanitizer) {}

  /* ============================================================
     EVENTOS
  ============================================================ */

  //
  eventosProximos: Evento[] = [];

  eventosPasados: Evento[] = [
    {
      titulo: 'Saxo Oral',
      fecha: new Date(2025, 11, 15),
      descripcion: 'Volvé al Mercado - Segunda edición',
      imagen: '/images/saxooral.jpg',
      videoUrl: 'https://www.instagram.com/p/DRhtvdvjueB/embed/',
      safeVideoUrl: null
    },
    {
      titulo: 'Paulina Viroga',
      fecha: new Date(2025, 9, 22),
      descripcion: 'Volvé al Mercado',
      imagen: '/images/paulinaviroga.jpg',
      videoUrl: 'https://www.instagram.com/p/DO9iCIqDYjr/embed/',
      safeVideoUrl: null
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

  abrirModal(evento: Evento) {
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
