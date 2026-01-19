import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval, of, from, EMPTY } from 'rxjs';
import { catchError, switchMap, filter, concatMap, take, defaultIfEmpty } from 'rxjs/operators';
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

  // ✅ sin slash final
  private readonly API = 'https://donfrancisco-backend.fly.dev';

  // ✅ en tu server.js SOLO existen estos
  private readonly CONTACT_BASES = [
    `${this.API}/contacto`,
    `${this.API}/api/contacto`,
  ];

  private readonly COUNTS_URLS = [
    `${this.API}/contacto/counts`,
    `${this.API}/api/contacto/counts`,
  ];

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

  modalOpen = false;
  modalMensaje: ContactMessage | null = null;

  // ✅ permisos
  canRead = false;
  canWrite = false;

  private subs = new Subscription();

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  // ✅ HEADERS CON TOKEN
  private authHeaders(): HttpHeaders {
    const fromService = (this.authService as any)?.token;
    const fromStorage =
      localStorage.getItem('df_auth_token') ||
      localStorage.getItem('token');

    const token = fromService || fromStorage;

    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  // ✅ probar URLS en orden hasta que alguna funcione
  private tryGet<T>(urls: string[], options?: any) {
    return from(urls).pipe(
      concatMap((url) =>
        this.http.get<T>(url, options).pipe(catchError(() => EMPTY))
      ),
      take(1),
      defaultIfEmpty(null as unknown as T)
    );
  }

  // ✅ normalizador (el backend NO siempre devuelve array directo)
  private normalizeMensajes(res: any): ContactMessage[] {
    const raw: any[] =
      Array.isArray(res) ? res :
      Array.isArray(res?.items) ? res.items :
      Array.isArray(res?.rows) ? res.rows :
      Array.isArray(res?.data) ? res.data :
      Array.isArray(res?.data?.items) ? res.data.items :
      Array.isArray(res?.data?.rows) ? res.data.rows :
      [];

    return raw.map((m: any) => ({
      id: Number(m?.id ?? 0),
      nombre: String(m?.nombre ?? m?.name ?? ''),
      email: String(m?.email ?? ''),
      mensaje: String(m?.mensaje ?? m?.message ?? ''),
      leido: m?.leido ?? m?.read ?? 0,
      respondido: m?.respondido ?? m?.answered ?? 0,
      created_at: String(m?.created_at ?? m?.createdAt ?? m?.fecha ?? ''),
    })).filter(x => !!x.id);
  }

  private normalizeCounts(res: any): ContactCounts {
    const c = res?.counts || res?.data || res || {};
    return {
      total: Number(c?.total ?? 0),
      activos: Number(c?.activos ?? 0),
      no_leidos: Number(c?.no_leidos ?? c?.unread ?? 0),
      pendientes_respuesta: Number(c?.pendientes_respuesta ?? c?.pending_reply ?? 0),
    };
  }

  ngOnInit(): void {
    this.subs.add(
      this.authService.user$
        .pipe(filter(user => !!user))
        .subscribe(() => {

          this.canWrite = this.authService.isAdmin();

          const rol =
            (this.authService as any)?.getRol?.() ||
            (this.authService as any)?.userSubject?.value?.rol ||
            null;

          const isFuncionario =
            rol === 'funcionario' ||
            String(rol || '').toLowerCase() === 'funcionario';

          this.canRead = this.canWrite || isFuncionario;

          if (!this.canRead) {
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

  refreshAll(resetOffset = false): void {
    if (resetOffset) this.offset = 0;
    this.fetchCounts().subscribe();
    this.fetchMensajes(true).subscribe();
  }

  fetchCounts() {
    this.loadingCounts = true;

    return this.tryGet<any>(this.COUNTS_URLS, {
      headers: this.authHeaders()
    }).pipe(
      catchError((err) => {
        console.error('[ADMIN CONTACT] counts error', err);
        this.loadingCounts = false;
        this.toast('error', 'No pude cargar métricas');
        return of({ total: 0, activos: 0, no_leidos: 0, pendientes_respuesta: 0 });
      }),
      switchMap((res: any) => {
        this.loadingCounts = false;

        const normalized = this.normalizeCounts(res);

        const now = Number(normalized?.no_leidos ?? 0);
        if (now > this.lastNoLeidos) this.pingBadgePulse();
        this.lastNoLeidos = now;

        this.counts = normalized;
        return of(normalized);
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

    return this.tryGet<any>(this.CONTACT_BASES, {
      params,
      headers: this.authHeaders(),
    }).pipe(
      catchError((err) => {
        console.error('[ADMIN CONTACT] mensajes error', err);
        this.loading = false;
        this.error = 'Error cargando mensajes';
        this.toast('error', 'Error cargando mensajes');
        return of([]);
      }),
      switchMap((res: any) => {
        this.loading = false;

        console.log('[ADMIN CONTACT] RAW RESPONSE:', res);

        const list = this.normalizeMensajes(res);
        this.mensajes = list || [];

        console.log('[ADMIN CONTACT] normalizados:', this.mensajes.length);

        return of(this.mensajes);
      })
    );
  }

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

  openModal(m: ContactMessage): void {
    this.modalMensaje = m;
    this.modalOpen = true;
    this.selectedId = m.id;

    if (this.canWrite && this.isUnread(m)) {
      this.marcarLeido(m);
    }
  }

  closeModal(): void {
    this.modalOpen = false;
    this.modalMensaje = null;
  }

  marcarLeido(m: ContactMessage): void {
    if (!this.canWrite) return;
    if (!m?.id || !this.isUnread(m)) return;

    this.rowBusy[m.id] = true;

    this.http.put(`${this.API}/contacto/${m.id}/leido`, {}, { headers: this.authHeaders() }).subscribe({
      next: () => {
        m.leido = 1;
        this.rowBusy[m.id] = false;
        this.fetchCounts().subscribe();
      },
      error: (err) => {
        console.error('[ADMIN CONTACT] marcarLeido error', err);
        this.rowBusy[m.id] = false;
        this.toast('error', 'No se pudo marcar como leído');
      }
    });
  }

  pedirEliminar(id: number): void {
    if (!this.canWrite) {
      this.toast('warn', 'Solo lectura', 'Tu rol (Funcionario) no puede eliminar mensajes.');
      return;
    }
    this.confirmDeleteId = id;
  }

  cancelarEliminar(): void {
    this.confirmDeleteId = null;
    this.confirmDeleteBusy = false;
  }

  confirmarEliminar(): void {
    if (!this.canWrite) {
      this.toast('warn', 'Solo lectura', 'No tenés permisos para eliminar.');
      this.cancelarEliminar();
      return;
    }

    if (!this.confirmDeleteId) return;

    const id = this.confirmDeleteId;
    this.confirmDeleteBusy = true;

    this.http
      .delete(`${this.API}/contacto/${id}`, { headers: this.authHeaders() })
      .subscribe({
        next: () => {
          this.mensajes = this.mensajes.filter(m => m.id !== id);
          this.confirmDeleteId = null;
          this.confirmDeleteBusy = false;
          this.fetchCounts().subscribe();
        },
        error: (err) => {
          console.error('[ADMIN CONTACT] delete error', err);
          this.confirmDeleteBusy = false;
          this.toast('error', 'No se pudo eliminar el mensaje');
        }
      });
  }

  toast(type: ToastType, title: string, msg?: string, ttlMs = 2600): void {
    const id = `${Date.now()}-${Math.random()}`;
    this.toasts = [{ id, type, title, msg }, ...this.toasts].slice(0, 4);
    setTimeout(() => this.cerrarToast(id), ttlMs);
  }

  cerrarToast(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

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
