import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

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

  videoInteractivo = false;
  overlayClosing = false;

  // ✅ URL REAL DEL BACKEND
  private readonly API_URL = 'https://donfrancisco-backend.fly.dev/noticias';

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarNoticias();
  }

  /* ==========================================================
     DATA
  ========================================================== */

  cargarNoticias(): void {
    this.http.get<Novedad[]>(this.API_URL).subscribe({
      next: (data) => {
        this.novedades = this.mapearNoticias(data);
        this.animarEntrada = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error cargando noticias:', err);
        this.animarEntrada = true; // evita página “muerta”
        this.cdr.detectChanges();
      }
    });
  }

  private mapearNoticias(data: Novedad[]): Novedad[] {
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    return data.map(n => {
      // ✅ parse robusto (DATE o DATETIME)
      const d = new Date(n.fecha);

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
  }

  /* ==========================================================
     MODAL
  ========================================================== */

  abrirModal(novedad: Novedad): void {
    this.novedadActiva = novedad;
    this.modalAbierto = true;
    this.videoInteractivo = false;

    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  activarVideo(): void {
    this.videoInteractivo = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    this.overlayClosing = true;

    const modal = document.querySelector('.modal-content') as HTMLElement;
    modal?.classList.add('closing');

    setTimeout(() => {
      this.modalAbierto = false;
      this.novedadActiva = null;
      this.videoInteractivo = false;
      this.overlayClosing = false;

      document.body.style.overflow = 'auto';
      this.cdr.detectChanges();
    }, 250);
  }
}
