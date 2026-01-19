// src/app/pages/admin-salon/admin-salon.page.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HttpClient,
  HttpClientModule,
  HttpErrorResponse,
  HttpHeaders
} from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval, of } from 'rxjs';
import { catchError, switchMap, filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../shared/services/auth.service';

type SolicitudEstado = 'all' | 'pending' | 'approved' | 'rejected';

type SalonSolicitud = {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  horas_json?: any;
  estado: Exclude<SolicitudEstado, 'all'>;

  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  mensaje?: string | null;

  created_at: string;
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
  selector: 'app-admin-salon',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule, FormsModule],
  templateUrl: './admin-salon.page.html',
  styleUrls: ['./admin-salon.page.scss'],
})
export class AdminSalonPage implements OnInit, OnDestroy {

  // ✅ Mantenemos tu API para NO romper
  private readonly API = 'https://donfrancisco-backend.fly.dev';

  loading = false;
  error = '';

  estado: SolicitudEstado = 'pending';
  solicitudes: SalonSolicitud[] = [];
  pendingCount = 0;

  query = '';
  pageSize = 25;
  offset = 0;

  rowBusy: Record<number, boolean> = {};
  selectedId: number | null = null;

  confirmActionId: number | null = null;
  confirmActionType: 'approve' | 'reject' | null = null;
  confirmActionBusy = false;

  toasts: Toast[] = [];

  headerShine = false;
  badgePulse = false;

  modalOpen = false;
  modalSolicitud: SalonSolicitud | null = null;

  private subs = new Subscription();
  private lastPending = 0;

  // ✅ NUEVO: permisos
  canWrite = false; // solo admin
  canRead = false;  // admin o funcionario

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

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

  ngOnInit(): void {
    this.subs.add(
      this.authService.user$
        .pipe(filter(u => !!u))
        .subscribe((u) => {
          // ✅ FIX: ahora puede entrar admin o funcionario
          this.canWrite = this.authService.isAdmin();
          this.canRead = this.authService.isAdmin() || this.authService.isFuncionario();

          if (!this.canRead) {
            this.router.navigateByUrl('/inicio');
            return;
          }

          this.pingHeaderShine();
          this.refresh(true);

          this.subs.add(
            interval(15000)
              .pipe(
                switchMap(() => {
                  if (this.modalOpen || this.confirmActionId) return of(null);
                  return this.fetchSolicitudes(false);
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

  refresh(resetOffset = false): void {
    if (resetOffset) this.offset = 0;
    this.fetchSolicitudes(true).subscribe();
  }

  fetchSolicitudes(withSpinner: boolean) {
    if (withSpinner) this.loading = true;
    this.error = '';

    const params: any = {
      limit: this.pageSize,
      offset: this.offset,
    };

    if (this.estado !== 'all') {
      params.estado = this.estado;
    }

    return this.http.get<any>(
      `${this.API}/admin/salon/solicitudes`,
      { params, headers: this.authHeaders() }
    ).pipe(
      catchError((e: HttpErrorResponse) => {
        this.loading = false;
        this.error = 'Error cargando solicitudes';
        this.toast('error', 'Error cargando solicitudes', this.fmtHttpError(e));
        return of({ ok: false, items: [] });
      }),
      switchMap((res: any) => {
        this.loading = false;

        const items: SalonSolicitud[] = Array.isArray(res?.items) ? res.items : [];
        this.solicitudes = items;

        if (this.estado === 'pending') {
          this.pendingCount = items.length;
          const now = items.length;
          if (now > this.lastPending) this.pingBadgePulse();
          this.lastPending = now;
        } else if (this.estado === 'all') {
          this.pendingCount = items.filter(x => x.estado === 'pending').length;
        }

        return of(res);
      })
    );
  }

  setEstado(e: SolicitudEstado): void {
    if (this.estado === e) return;
    this.estado = e;
    this.query = '';
    this.selectedId = null;
    this.closeModal();
    this.cancelarAccion();
    this.refresh(true);
  }

  nextPage(): void {
    this.offset += this.pageSize;
    this.fetchSolicitudes(true).subscribe();
  }

  prevPage(): void {
    this.offset = Math.max(0, this.offset - this.pageSize);
    this.fetchSolicitudes(true).subscribe();
  }

  get solicitudesFiltradas(): SalonSolicitud[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.solicitudes;

    return this.solicitudes.filter(s => {
      const haystack = [
        s.nombre,
        s.apellido,
        s.email,
        s.telefono,
        s.fecha,
        s.hora_inicio,
        s.hora_fin,
        s.estado,
        s.mensaje ?? ''
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }

  setSelected(id: number): void {
    this.selectedId = this.selectedId === id ? null : id;
  }

  getRowClass(id: number, estado: Exclude<SolicitudEstado, 'all'>): string {
    const busy = this.rowBusy[id] ? ['row--busy'] : [];
    const selected = this.selectedId === id ? ['row--selected'] : [];
    const st = [`row--${estado}`];
    return [...st, ...busy, ...selected].join(' ');
  }

  openModal(s: SalonSolicitud): void {
    this.modalSolicitud = s;
    this.modalOpen = true;
    this.selectedId = s.id;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.modalSolicitud = null;
  }

  // ✅ FIX: funcionario puede ver pero NO aprobar/rechazar
  pedirAprobar(id: number): void {
    if (!this.canWrite) {
      this.toast('warn', 'Solo lectura', 'Tu rol (Funcionario) no puede aprobar solicitudes.');
      return;
    }
    this.confirmActionId = id;
    this.confirmActionType = 'approve';
  }

  pedirRechazar(id: number): void {
    if (!this.canWrite) {
      this.toast('warn', 'Solo lectura', 'Tu rol (Funcionario) no puede rechazar solicitudes.');
      return;
    }
    this.confirmActionId = id;
    this.confirmActionType = 'reject';
  }

  cancelarAccion(): void {
    this.confirmActionId = null;
    this.confirmActionType = null;
    this.confirmActionBusy = false;
  }

  confirmarAccion(): void {
    if (!this.confirmActionId || !this.confirmActionType) return;

    // ✅ FIX: doble seguridad
    if (!this.canWrite) {
      this.toast('warn', 'Solo lectura', 'No tenés permisos para ejecutar esta acción.');
      this.cancelarAccion();
      return;
    }

    const id = this.confirmActionId;
    const type = this.confirmActionType;

    this.confirmActionBusy = true;
    this.rowBusy[id] = true;

    const endpoint =
      type === 'approve'
        ? `${this.API}/admin/salon/solicitudes/${id}/aprobar`
        : `${this.API}/admin/salon/solicitudes/${id}/rechazar`;

    this.http.post<any>(
      endpoint,
      {},
      { headers: this.authHeaders() }
    ).subscribe({
      next: () => {
        this.confirmActionBusy = false;
        this.rowBusy[id] = false;

        if (type === 'approve') {
          this.toast('ok', 'Solicitud aprobada', 'Se movió a Aprobadas.');
          this.estado = 'approved';
        } else {
          this.toast('ok', 'Solicitud rechazada', 'Se movió a Rechazadas.');
          this.estado = 'rejected';
        }

        if (this.modalSolicitud?.id === id) this.closeModal();

        this.cancelarAccion();
        this.offset = 0;
        this.query = '';
        this.refresh(true);
      },
      error: (e: HttpErrorResponse) => {
        this.confirmActionBusy = false;
        this.rowBusy[id] = false;

        if (e?.status === 409) {
          const horas = (e.error?.horas_conflictivas || []).join(', ');
          this.toast(
            'warn',
            'Conflicto al aprobar',
            horas ? `Horas ya reservadas: ${horas}` : 'Ya existe una reserva aprobada.'
          );
        } else if (e?.status === 401 || e?.status === 403) {
          this.toast('error', 'No autorizado', 'Revisá tu sesión y permisos.');
          this.router.navigateByUrl('/inicio');
        } else {
          this.toast('error', 'No pude completar la acción', this.fmtHttpError(e));
        }

        this.selectedId = id;
        setTimeout(() => (this.selectedId = null), 550);

        this.cancelarAccion();
      },
    });
  }

  // =========================
  // FIX HORAS (igual tuyo)
  // =========================
  horasDeSolicitud(s: SalonSolicitud | null): string[] {
    if (!s) return [];

    const inicio = this.hhmm(s.hora_inicio);
    const fin = this.hhmm(s.hora_fin);

    const raw = (s as any).horas_json;

    if (Array.isArray(raw)) {
      const arr = raw.map((x: any) => this.hhmm(x)).filter(Boolean);
      const ok = this.esBloqueDeHora(arr);
      if (ok) return this.uniq(arr);
      return this.buildHorasFromRange(inicio, fin);
    }

    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const arr = parsed.map((x: any) => this.hhmm(x)).filter(Boolean);
          const ok = this.esBloqueDeHora(arr);
          if (ok) return this.uniq(arr);
          return this.buildHorasFromRange(inicio, fin);
        }
      } catch {}
    }

    return this.buildHorasFromRange(inicio, fin);
  }

  private hhmm(t: any): string {
    const str = String(t ?? '').trim();
    if (!str) return '';
    const parts = str.split(':');
    const hh = Number(parts[0]);
    const mm = Number(parts[1] ?? 0);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return '';
    const HH = String(hh).padStart(2, '0');
    const MM = String(mm).padStart(2, '0');
    return `${HH}:${MM}`;
  }

  private esBloqueDeHora(horas: string[]): boolean {
    if (!Array.isArray(horas) || horas.length === 0) return false;
    return horas.every(h => h.split(':')[1] === '00');
  }

  private uniq(arr: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of arr) {
      const v = this.hhmm(x);
      if (!v) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    return out;
  }

  private buildHorasFromRange(inicio: string, fin: string): string[] {
    const toMin = (t: string) => {
      const [hh, mm] = String(t || '').split(':').map(Number);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
      return hh * 60 + mm;
    };
    const fromMin = (m: number) => {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      return `${hh}:${mm}`;
    };

    const s = toMin(this.hhmm(inicio));
    const e = toMin(this.hhmm(fin));
    if (s == null || e == null || e <= s) return [];

    const horas: string[] = [];
    for (let m = s; m < e; m += 60) horas.push(fromMin(m));
    return horas;
  }

  fmtDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString('es-UY');
    } catch {
      return iso;
    }
  }

  fmtFecha(yyyyMmDd: string): string {
    try {
      const d = new Date(`${yyyyMmDd}T00:00:00`);
      return d.toLocaleDateString('es-UY', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    } catch {
      return yyyyMmDd;
    }
  }

  private fmtHttpError(e: HttpErrorResponse): string {
    const msg =
      (typeof e?.error === 'string' && e.error) ||
      e?.error?.error ||
      e?.message ||
      'Error';
    return String(msg);
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
}
