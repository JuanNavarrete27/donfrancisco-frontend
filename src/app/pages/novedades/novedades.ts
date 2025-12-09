import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface Novedad {
  id: number;
  titulo: string;
  descripcion: string;
  imagen?: string;
  videoUrl?: string;
  safeVideoUrl?: SafeResourceUrl;
  fecha: string;
  autor: string;
}

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './novedades.html',
  styleUrls: ['./novedades.scss'],
})
export class NovedadesComponent implements OnInit {

  novedades: Novedad[] = [];

  animarEntrada = false;

  modalAbierto = false;
  novedadActiva: Novedad | null = null;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    const data: Novedad[] = [
      {
        id: 1,
        titulo: 'Inauguración del Horno de Barro',
        descripcion: `
          Esta semana finalizamos la construcción del nuevo horno de barro artesanal,
          que será parte fundamental de la experiencia gastronómica del Mercado Don Francisco.
        `,
        imagen: '/images/horno.png',
        fecha: '2025-02-10', // ← se convertirá en “10 de febrero de 2025”
        autor: 'Creativo 360',
        videoUrl: 'https://www.instagram.com/p/DR4u9Vnjats/embed/'
      }
    ];

    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    this.novedades = data.map(n => {

      // 🟢 PARSEAR FECHA COMO LOCAL — evita el bug del día menos
      const partes = n.fecha.split('-'); // ["2025", "02", "10"]
      const d = new Date(
        Number(partes[0]),
        Number(partes[1]) - 1,
        Number(partes[2])
      );

      // ⭐ FORMATO FINAL: "10 de febrero de 2025"
      const fechaFormateada =
        `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;

      return {
        ...n,
        fecha: fechaFormateada,
        safeVideoUrl: n.videoUrl
          ? this.sanitizer.bypassSecurityTrustResourceUrl(n.videoUrl)
          : undefined
      };
    });

    setTimeout(() => {
      this.animarEntrada = true;
      this.cdr.detectChanges();
    }, 20);
  }

  abrirModal(novedad: Novedad) {
    this.novedadActiva = novedad;
    this.modalAbierto = true;

    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  overlayClosing = false;

  cerrarModal() {
    this.overlayClosing = true;

    const modal = document.querySelector('.modal-content') as HTMLElement;
    if (modal) modal.classList.add('closing');

    setTimeout(() => {
      this.modalAbierto = false;
      this.novedadActiva = null;
      this.overlayClosing = false;

      try { document.body.style.overflow = 'auto'; } catch {}

      this.cdr.detectChanges();
    }, 250);
  }

}
