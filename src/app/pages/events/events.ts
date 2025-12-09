import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, DatePipe],
  providers: [DatePipe], // Add DatePipe to providers to resolve the warning
  templateUrl: './events.html',
  styleUrls: ['./events.scss']
})
export class EventsComponent {

  animarEntrada = false;
  modalAbierto = false;
  eventoActivo: any = null;
  overlayClosing = false;

  constructor(private cdr: ChangeDetectorRef) {}

  eventosProximos = [
    {
      titulo: 'Inauguración del Mercado',
      fecha: new Date(2026, 2, 28), // 28 marzo 2026
      descripcion: 'Apertura oficial.',
      imagen: '/images/banner.jpg'
    },
    {
      titulo: 'EJEMPLO',
      fecha: new Date(2026, 1, 28), // 28 febrero 2026
      descripcion: 'EJEMPLO.',
      imagen: '/images/banner.jpg'
    },
     {
      titulo: '2EJEMPLO',
      fecha: new Date(2026, 2, 28), // 28 febrero 2026
      descripcion: 'EJEMPLO2.',
      imagen: '/images/banner.jpg'
    }
  ];

  eventosPasados = [
    {
      titulo: 'Saxo Oral',
      fecha: new Date(2025, 11, 15), // 15 diciembre 2025
      descripcion: 'Volvé al Mercado - Segunda edición',
      imagen: '/images/saxooral.jpg'
    },
    {
      titulo: 'Paulina Viroga',
      fecha: new Date(2025, 9, 22), // 22 octubre 2025
      descripcion: 'Volvé al Mercado',
      imagen: '/images/paulinaviroga.jpg'
    }
  ];

  ngOnInit() {
    setTimeout(() => {
      this.animarEntrada = true;
      this.cdr.detectChanges();
    }, 20);
  }

  abrirModal(evento: any) {
    this.eventoActivo = evento;
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  cerrarModal() {
    this.overlayClosing = true;
    const modal = document.querySelector('.modal-content') as HTMLElement;
    if (modal) modal.classList.add('closing');

    setTimeout(() => {
      this.modalAbierto = false;
      this.eventoActivo = null;
      this.overlayClosing = false;
      try { document.body.style.overflow = 'auto'; } catch {}
      this.cdr.detectChanges();
    }, 250);
  }
}
