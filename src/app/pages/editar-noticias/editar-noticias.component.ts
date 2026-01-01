import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Novedad {
  id?: number;
  titulo: string;
  descripcion: string;
  imagen?: string | null;
  videoUrl?: string | null;
  fecha: string;   // YYYY-MM-DD
  autor: string;
}

@Component({
  selector: 'app-editar-noticias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-noticias.component.html',
  styleUrls: ['./editar-noticias.component.scss'],
})
export class EditarNoticiasComponent implements OnInit {

  novedades: Novedad[] = [];
  novedadActiva: Novedad | null = null;

  modoCreacion = false;

  loading = false;
  successMessage = '';
  errorMessage = '';

  private readonly API_URL =
    'https://donfrancisco-backend.fly.dev/noticias';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  /* ==========================================================
     AUTH HEADERS 🔑
  ========================================================== */

  private getAuthOptions() {
    const token = localStorage.getItem('df_auth_token');
    const headers = token
      ? new HttpHeaders().set('Authorization', `Bearer ${token}`)
      : new HttpHeaders();

    return { headers };
  }

  /* ==========================================================
     INIT
  ========================================================== */

  ngOnInit(): void {
    this.cargarNoticias();
  }

  /* ==========================================================
     GET
  ========================================================== */

  cargarNoticias(): void {
    this.http.get<Novedad[]>(this.API_URL).subscribe({
      next: (data) => {
        this.novedades = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Error cargando noticias';
        this.cdr.detectChanges();
      }
    });
  }

  /* ==========================================================
     CREAR
  ========================================================== */

  crearNueva(): void {
    const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    this.modoCreacion = true;
    this.novedadActiva = {
      titulo: '',
      descripcion: '',
      imagen: null,
      videoUrl: null,
      fecha: hoy,
      autor: 'Don Francisco'
    };

    this.successMessage = '';
    this.errorMessage = '';
  }

  guardarNueva(): void {
    if (!this.novedadActiva) return;

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http
      .post(this.API_URL, this.novedadActiva, this.getAuthOptions())
      .subscribe({
        next: () => {
          this.successMessage = 'Noticia creada correctamente';
          this.loading = false;
          this.modoCreacion = false;
          this.novedadActiva = null;
          this.cargarNoticias();
        },
        error: (err) => {
          console.error('POST /noticias error:', err);
          this.errorMessage =
            err?.error?.error ||
            err?.error?.message ||
            'Error al crear noticia';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /* ==========================================================
     EDITAR
  ========================================================== */

  seleccionarNovedad(n: Novedad): void {
    this.modoCreacion = false;

    // 🔒 Copia segura
    this.novedadActiva = {
      ...n,
      imagen: n.imagen || null,
      videoUrl: n.videoUrl || null,
      fecha: n.fecha.slice(0, 10)
    };

    this.successMessage = '';
    this.errorMessage = '';
  }

  guardarCambios(): void {
    if (!this.novedadActiva?.id) return;

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http
      .put(
        `${this.API_URL}/${this.novedadActiva.id}`,
        this.novedadActiva,
        this.getAuthOptions()
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Noticia actualizada correctamente';
          this.loading = false;
          this.novedadActiva = null;
          this.cargarNoticias();
        },
        error: (err) => {
          console.error('PUT /noticias error:', err);
          this.errorMessage =
            err?.error?.error ||
            err?.error?.message ||
            'Error al actualizar noticia';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /* ==========================================================
     BORRAR
  ========================================================== */

  borrarNovedad(n: Novedad): void {
    if (!n.id) return;

    const ok = confirm(`¿Eliminar la noticia "${n.titulo}"?`);
    if (!ok) return;

    this.http
      .delete(`${this.API_URL}/${n.id}`, this.getAuthOptions())
      .subscribe({
        next: () => {
          this.successMessage = 'Noticia eliminada';
          this.cargarNoticias();
        },
        error: (err) => {
          console.error('DELETE /noticias error:', err);
          this.errorMessage =
            err?.error?.error ||
            err?.error?.message ||
            'Error al eliminar noticia';
          this.cdr.detectChanges();
        }
      });
  }

  /* ==========================================================
     CANCELAR
  ========================================================== */

  cancelar(): void {
    this.novedadActiva = null;
    this.modoCreacion = false;
  }
}
