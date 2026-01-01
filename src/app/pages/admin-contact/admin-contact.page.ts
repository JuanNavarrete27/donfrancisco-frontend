import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval, of } from 'rxjs';
import { catchError, switchMap, filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../shared/services/auth.service';

type ContactMessage = {
  id: number;
  nombre: string;
  email: string;
  mensaje: string;
  leido: number | boolean;
  respondido?: number | boolean;
  created_at: string;
};

type ContactCounts = {
  total: number;
  activos: number;
  no_leidos: number;
  pendientes_respuesta: number;
};

type ToastType = 'ok' | 'warn' | 'error';

type Toast = {
  id: string;
  type: ToastType;
  title: string;
  msg?: string;
  ttlMs?: number;
};

@Component({
  selector: 'app-admin-contact',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule, FormsModule],
  templateUrl: './admin-contact.page.html',
  styleUrls: ['./admin-contact.page.scss'],
})
export class AdminContactPage implements OnInit, OnDestroy {

  // 🔗 BACKEND REAL
  private readonly API = 'https://donfrancisco-backend.fly.dev/';

  loading = false;
  loadingCounts = false;
  error = '';

  mensajes: ContactMessage[] = [];
  counts: ContactCounts = { total: 0, activos: 0, no_leidos: 0, pendientes_respuesta: 0 };

  unreadOnly = false;
  query = '';
  pageSize = 30;
  offset = 0;

  rowBusy: Record<number, boolean> = {};
  selectedId: number | null = null;

  confirmDeleteId: number | null = null;
  confirmDeleteBusy = false;

  toasts: Toast[] = [];

  headerShine = false;
  badgePulse = false;
  private lastNoLeidos = 0;

  // ==========================================================
  // MODAL 👇
  // ==========================================================
  modalOpen = false;
  modalMensaje: ContactMessage | null = null;

  private subs = new Subscription();

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  /* ==========================================================
     INIT
  ========================================================== */
  ngOnInit(): void {
    this.subs.add(
      this.authService.user$
        .pipe(filter(user => !!user))
        .subscribe(() => {
          if (!this.authService.isAdmin()) {
            this.router.navigateByUrl('/inicio');
            return;
          }

          this.pingHeaderShine();
          this.refreshAll(true);

          this.subs.add(
            interval(12000)
              .pipe(switchMap(() => this.fetchCounts()))
              .subscribe()
          );

          this.subs.add(
            interval(20000)
              .pipe(
                switchMap(() => {
                  if (this.confirmDeleteId || this.modalOpen) return of(null);
                  return this.fetchMensajes(false);
                })
              )
              .subscribe()
          );
        })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /* ==========================================================
     FETCH
  ========================================================== */
  refreshAll(resetOffset = false): void {
    if (resetOffset) this.offset = 0;
    this.fetchCounts().subscribe();
    this.fetchMensajes(true).subscribe();
  }

  fetchCounts() {
    this.loadingCounts = true;

    return this.http.get<ContactCounts>(`${this.API}/contacto/counts`).pipe(
      catchError(() => {
        this.toast('error', 'No pude cargar métricas');
        return of({ total: 0, activos: 0, no_leidos: 0, pendientes_respuesta: 0 });
      }),
      switchMap(res => {
        this.loadingCounts = false;

        const now = Number(res?.no_leidos ?? 0);
        if (now > this.lastNoLeidos) this.pingBadgePulse();
        this.lastNoLeidos = now;

        this.counts = res;
        return of(res);
      })
    );
  }

  fetchMensajes(withSpinner: boolean) {
    if (withSpinner) this.loading = true;
    this.error = '';

    const params: any = {
      limit: this.pageSize,
      offset: this.offset,
      ...(this.unreadOnly ? { unread: 1 } : {})
    };

    return this.http.get<ContactMessage[]>(`${this.API}/contacto`, { params }).pipe(
      catchError(() => {
        this.loading = false;
        this.error = 'Error cargando mensajes';
        this.toast('error', 'Error cargando mensajes');
        return of([]);
      }),
      switchMap(rows => {
        this.loading = false;
        this.mensajes = rows || [];
        return of(rows);
      })
    );
  }

  /* ==========================================================
     UI
  ========================================================== */
  toggleUnreadOnly(): void {
    this.unreadOnly = !this.unreadOnly;
    this.refreshAll(true);
  }

  nextPage(): void {
    this.offset += this.pageSize;
    this.fetchMensajes(true).subscribe();
  }

  prevPage(): void {
    this.offset = Math.max(0, this.offset - this.pageSize);
    this.fetchMensajes(true).subscribe();
  }

  get mensajesFiltrados(): ContactMessage[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.mensajes;
    return this.mensajes.filter(m =>
      (m.nombre ?? '').toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q) ||
      (m.mensaje ?? '').toLowerCase().includes(q)
    );
  }

  isUnread(m: ContactMessage): boolean {
    return !(Number(m.leido) === 1 || m.leido === true);
  }

  setSelected(id: number): void {
    this.selectedId = this.selectedId === id ? null : id;
  }

  getRowClass(id: number): string {
    const busy = this.rowBusy[id] ? ['row--busy'] : [];
    const selected = this.selectedId === id ? ['row--selected'] : [];
    return [...busy, ...selected].join(' ');
  }

  // ==========================================================
  // MODAL ACTIONS 👇
  // ==========================================================
  openModal(m: ContactMessage): void {
    this.modalMensaje = m;
    this.modalOpen = true;
    this.selectedId = m.id;

    // Opcional: marcar como leído al abrir
    if (this.isUnread(m)) {
      this.marcarLeido(m);
    }
  }

  closeModal(): void {
    this.modalOpen = false;
    this.modalMensaje = null;
  }

  marcarLeido(m: ContactMessage): void {
    if (!m?.id || !this.isUnread(m)) return;

    this.rowBusy[m.id] = true;

    this.http.put(`${this.API}/contacto/${m.id}/leido`, {}).subscribe({
      next: () => {
        m.leido = 1;
        this.rowBusy[m.id] = false;
        this.fetchCounts().subscribe();
      },
      error: () => {
        this.rowBusy[m.id] = false;
        this.toast('error', 'No se pudo marcar como leído');
      }
    });
  }

  pedirEliminar(id: number): void {
    this.confirmDeleteId = id;
  }

  cancelarEliminar(): void {
    this.confirmDeleteId = null;
    this.confirmDeleteBusy = false;
  }

  confirmarEliminar(): void {
    if (!this.confirmDeleteId) return;

    const id = this.confirmDeleteId;
    this.confirmDeleteBusy = true;

    this.http.delete(`${this.API}/contacto/${id}`).subscribe(() => {
      this.mensajes = this.mensajes.filter(m => m.id !== id);
      this.confirmDeleteId = null;
      this.confirmDeleteBusy = false;
      this.fetchCounts().subscribe();
    });
  }

  /* ==========================================================
     TOASTS
  ========================================================== */
  toast(type: ToastType, title: string, msg?: string, ttlMs = 2600): void {
    const id = `${Date.now()}-${Math.random()}`;
    this.toasts = [{ id, type, title, msg }, ...this.toasts].slice(0, 4);
    setTimeout(() => this.cerrarToast(id), ttlMs);
  }

  cerrarToast(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  /* ==========================================================
     UTILS
  ========================================================== */
  private pingBadgePulse(): void {
    this.badgePulse = true;
    setTimeout(() => (this.badgePulse = false), 650);
  }

  private pingHeaderShine(): void {
    this.headerShine = true;
    setTimeout(() => (this.headerShine = false), 900);
  }

  fmtDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString('es-UY');
    } catch {
      return iso;
    }
  }
}
