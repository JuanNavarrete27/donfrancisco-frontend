import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { AuthService } from '../../shared/services/auth.service';

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
export class EditarNoticiasComponent implements OnInit, OnDestroy {

  novedades: Novedad[] = [];
  novedadActiva: Novedad | null = null;

  modoCreacion = false;

  loading = false;
  successMessage = '';
  errorMessage = '';

  // ✅ permisos por rol (admin + marketing)
  canEdit = false;
  roleLabel = 'Sin rol';

  private subs = new Subscription();

  private readonly API_URL =
    'https://donfrancisco-backend.fly.dev/noticias';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private auth: AuthService
  ) {}

  /* ==========================================================
     AUTH HEADERS 🔑
  ========================================================== */
  private getAuthOptions() {
    const token =
      localStorage.getItem('df_auth_token') ||
      localStorage.getItem('token');

    const headers = token
      ? new HttpHeaders().set('Authorization', `Bearer ${token}`)
      : new HttpHeaders();

    return { headers };
  }

  /* ==========================================================
     PERMISSIONS ✅ REAL (AuthService)
  ========================================================== */
  private applyRolePermissions(): void {
    const rol = this.auth.getRol(); // admin | user | funcionario | marketing | null
    this.roleLabel = rol ?? 'Sin rol';

    // ✅ admin o marketing pueden editar noticias
    this.canEdit = this.auth.isAdmin() || (this.auth as any).isMarketing?.();

    // Si no tiene permisos, marcamos error (pero NO rompemos la UI)
    if (!this.canEdit) {
      this.errorMessage = '⛔ No tenés permisos para editar noticias (solo Admin o Marketing).';
    } else {
      this.errorMessage = '';
    }

    this.cdr.detectChanges();
  }

  /* ==========================================================
     INIT
  ========================================================== */
  ngOnInit(): void {
    // ✅ 1) aplicar permisos con lo que haya ya hidratado (localStorage)
    this.applyRolePermissions();

    // ✅ 2) escuchar cambios por si el user llega async después del login / /me
    this.subs.add(
      this.auth.user$.subscribe(() => {
        const before = this.canEdit;
        this.applyRolePermissions();

        // si antes no podía y ahora sí, recién ahí cargamos
        if (!before && this.canEdit && this.novedades.length === 0) {
          this.cargarNoticias();
        }
      })
    );

    // ✅ 3) cargar si ya tiene permisos desde el arranque
    if (!this.canEdit) return;
    this.cargarNoticias();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /* ==========================================================
     GET
  ========================================================== */
  cargarNoticias(): void {
    this.http.get<Novedad[]>(this.API_URL).subscribe({
      next: (data) => {
        this.novedades = data || [];
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
    if (!this.canEdit) {
      this.errorMessage = '⛔ No tenés permisos para crear noticias.';
      this.cdr.detectChanges();
      return;
    }

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
    if (!this.canEdit) {
      this.errorMessage = '⛔ No tenés permisos para crear noticias.';
      this.cdr.detectChanges();
      return;
    }

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
    if (!this.canEdit) {
      this.errorMessage = '⛔ No tenés permisos para editar noticias.';
      this.cdr.detectChanges();
      return;
    }

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
    if (!this.canEdit) {
      this.errorMessage = '⛔ No tenés permisos para editar noticias.';
      this.cdr.detectChanges();
      return;
    }

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
    if (!this.canEdit) {
      this.errorMessage = '⛔ No tenés permisos para borrar noticias.';
      this.cdr.detectChanges();
      return;
    }

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
