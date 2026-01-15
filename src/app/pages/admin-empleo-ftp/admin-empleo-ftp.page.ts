import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * DON FRANCISCO — Admin / FTP Empleo (REAL DB)
 * ==========================================================
 * Backend real:
 *   Base: /api/admin/empleo
 *   - GET    /applications?query=&prequal=&area=&limit=&offset=
 *   - GET    /applications/:id
 *   - POST   /applications               (ADMIN ONLY)
 *   - PUT    /applications/:id           (ADMIN ONLY)
 *   - DELETE /applications/:id           (ADMIN ONLY)
 *   - GET    /applications/export.csv?query=&prequal=&area=    (VIEW + EXPORT)
 *
 * ✅ Reglas:
 * - Admin: CRUD + export
 * - Otros roles: solo ver + export
 *
 * ✅ FIX MODAL:
 * - Modal siempre arriba del header global
 * - Lock scroll del body cuando modal abierto
 * - Evita stacking context / z-index fantasmas
 */

// ==========================================================
// ✅ API BASE (LOCAL + PROD) — ULTRA ESTABLE
// ==========================================================
function getApiOrigin(): string {
  try {
    const w = typeof window !== 'undefined' ? (window as any) : null;
    const g = typeof globalThis !== 'undefined' ? (globalThis as any) : null;

    const fromWindow = w?.NG_APP_API_URL;
    const fromGlobal = g?.NG_APP_API_URL;
    const fromMeta = (import.meta as any)?.env?.NG_APP_API_URL;

    const raw = String(fromWindow || fromGlobal || fromMeta || '').trim();
    if (!raw) return '';

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw.replace(/\/+$/, '');
    }
    return `http://${raw.replace(/\/+$/, '')}`;
  } catch {
    return '';
  }
}

const API_ORIGIN = getApiOrigin();

const API_BASE = API_ORIGIN
  ? `${API_ORIGIN}/api/admin/empleo`
  : '/api/admin/empleo';

// ==========================================================
// ✅ AUTH — DON FRANCISCO REAL (df_auth_token)
// ==========================================================
function getAuthToken(): string {
  const tokenKeys = [
    // ✅ DON FRANCISCO REAL
    'df_auth_token',

    // comunes
    'token',
    'access_token',
    'jwt',
    'auth_token',

    // variantes posibles
    'df_token',
    'donfrancisco_token',
    'don_francisco_token',
    'df_access_token',
    'df_jwt',

    // variantes v1/v2
    'df_token_v1',
    'donfrancisco_token_v1',
    'donfrancisco_token_v2',
  ];

  for (const k of tokenKeys) {
    const t = localStorage.getItem(k);
    if (t && t.trim().length > 20) return t.trim();
  }

  // fallback dentro de objetos user/session
  const userKeys = [
    'df_auth_user',
    'df_user',
    'donfrancisco_user',
    'user',
    'currentUser',
    'session',
    'me',
  ];

  for (const uk of userKeys) {
    const raw = localStorage.getItem(uk);
    if (!raw) continue;

    try {
      const obj = JSON.parse(raw);
      const maybe =
        obj?.token ||
        obj?.access_token ||
        obj?.accessToken ||
        obj?.jwt ||
        obj?.auth_token ||
        obj?.data?.token ||
        obj?.data?.access_token;

      if (maybe && String(maybe).trim().length > 20) return String(maybe).trim();
    } catch {}
  }

  return '';
}

function authHeaders(): HttpHeaders {
  const token = getAuthToken();
  let headers = new HttpHeaders();
  if (token) headers = headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

function authHeadersJson(): HttpHeaders {
  const token = getAuthToken();
  let headers = new HttpHeaders().set('Content-Type', 'application/json');
  if (token) headers = headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

// ==========================================================
// Types
// ==========================================================
type PreQual = 'A' | 'B' | 'C' | 'D';

type WorkArea =
  | 'limpieza'
  | 'gastronomia'
  | 'atencion_publico'
  | 'mantenimiento'
  | 'administracion';

interface ApplicantRow {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  phone: string;
  email: string;
  areas: WorkArea[];
  prequal: PreQual;
  createdAt: string;
  updatedAt: string;
}

const WORK_AREAS: { id: WorkArea; label: string; badge: string }[] = [
  { id: 'limpieza', label: 'Limpieza', badge: 'LIM' },
  { id: 'gastronomia', label: 'Gastronomía', badge: 'GAST' },
  { id: 'atencion_publico', label: 'Atención al público', badge: 'ATN' },
  { id: 'mantenimiento', label: 'Mantenimiento', badge: 'MANT' },
  { id: 'administracion', label: 'Administración', badge: 'ADM' },
];

const PREQUALS: PreQual[] = ['A', 'B', 'C', 'D'];

function normalizeText(v: string): string {
  return (v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function toIsoDateString(input: any): string {
  if (!input) return new Date().toISOString();
  if (input instanceof Date) return input.toISOString();

  const s = String(input).trim();
  if (s.includes('T') && s.includes('Z')) return s;

  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(s)) {
    const asIso = s.replace(' ', 'T') + 'Z';
    const d = new Date(asIso);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();

  return new Date().toISOString();
}

// ==========================================================
// ✅ ROLE DETECTION
// ==========================================================
function normalizeRoleName(raw: string): string {
  const r = (raw || '').toLowerCase().trim();

  if (r === 'administrador' || r === 'administrator') return 'admin';
  if (r === 'superadmin') return 'admin';
  if (r === 'owner') return 'admin';
  if (r === 'root') return 'admin';

  if (r.includes('admin')) return 'admin';

  return r || 'staff';
}

function detectRole(): string {
  const userKeys = [
    'df_auth_user',
    'df_user',
    'donfrancisco_user',
    'user',
    'currentUser',
    'auth_user',
    'usuario',
    'profile',
    'me',
    'session',
  ];

  for (const k of userKeys) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;

    try {
      const obj = JSON.parse(raw);
      const role =
        obj?.role ||
        obj?.rol ||
        obj?.perfil ||
        obj?.user?.role ||
        obj?.user?.rol ||
        obj?.user?.perfil ||
        obj?.data?.role ||
        obj?.data?.rol ||
        obj?.profile?.role ||
        obj?.profile?.rol ||
        obj?.account?.role ||
        obj?.account?.rol ||
        obj?.tipo ||
        obj?.userType;

      if (role) return normalizeRoleName(String(role));
    } catch {
      return normalizeRoleName(raw);
    }
  }

  return 'staff';
}

function detectAdminOverride(): boolean {
  try {
    const raw = localStorage.getItem('df_auth_user');
    if (raw) {
      const u = JSON.parse(raw);
      const r = String(u?.rol || u?.role || '').toLowerCase().trim();
      if (r === 'admin') return true;
    }
  } catch {}

  const keys = Object.keys(localStorage);
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;

    const low = raw.toLowerCase();
    if (low.includes('"isadmin":true')) return true;
    if (low.includes('"is_admin":true')) return true;
    if (low.includes('"admin":true')) return true;
    if (low.includes('"role":"admin"')) return true;
    if (low.includes('"rol":"admin"')) return true;
    if (low.includes('"perfil":"admin"')) return true;
    if (low.includes('"roleid":1')) return true;
    if (low.includes('"rolid":1')) return true;
  }

  return false;
}

// ==========================================================
// ✅ Helpers EXTRA (mapeo backend robusto)
// ==========================================================
function coerceAreas(v: any): WorkArea[] {
  try {
    if (!v) return [];
    if (Array.isArray(v)) return v as WorkArea[];

    if (typeof v === 'string') {
      const s = v.trim();
      if (s.startsWith('[') && s.endsWith(']')) {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? (parsed as WorkArea[]) : [];
      }
      if (s.includes(',')) {
        return s
          .split(',')
          .map(x => x.trim())
          .filter(Boolean) as WorkArea[];
      }
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * ✅ Esta versión imprime TODO lo que el backend devuelve (incluye sqlMessage)
 */
function logHttpError(tag: string, err: any) {
  console.error(tag, {
    status: err?.status,
    statusText: err?.statusText,
    message: err?.message,
    url: err?.url,
    backendError: err?.error,
    backendMessage: err?.error?.message,
    sqlMessage: err?.error?.sqlMessage,
    stack: err?.error?.stack,
  });
}

// ==========================================================
// COMPONENT
// ==========================================================
@Component({
  selector: 'app-admin-empleo-ftp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-empleo-ftp.page.html',
  styleUrls: ['./admin-empleo-ftp.page.scss'],
})
export class AdminEmpleoFtpPage {
  private http = inject(HttpClient);

  readonly role = signal<string>(detectAdminOverride() ? 'admin' : detectRole());

  readonly isAdmin = computed(() => {
    const r = normalizeRoleName(this.role() || '');
    if (r === 'admin') return true;
    return detectAdminOverride();
  });

  // ✅ Nueva señal: “solo lectura” (para UI)
  readonly isReadOnly = computed(() => !this.isAdmin());

  readonly roleDebug = computed(() => {
    return `role="${this.role()}" | isAdmin=${this.isAdmin() ? 'YES' : 'NO'}`;
  });

  readonly loading = signal<boolean>(false);
  readonly errorMsg = signal<string>('');
  readonly toastMsg = signal<string>('');

  readonly query = signal<string>('');
  readonly filterPrequal = signal<PreQual | 'ALL'>('ALL');
  readonly filterArea = signal<WorkArea | 'ALL'>('ALL');

  readonly pageSize = signal<number>(10);
  readonly page = signal<number>(1);

  readonly selectedId = signal<number | null>(null);

  readonly modalOpen = signal<boolean>(false);
  readonly modalMode = signal<'create' | 'edit'>('create');

  readonly deleteOpen = signal<boolean>(false);
  readonly deleteId = signal<number | null>(null);

  readonly items = signal<ApplicantRow[]>([]);

  readonly form: FormGroup;

  readonly WORK_AREAS = WORK_AREAS;
  readonly PREQUALS = PREQUALS;

  private prevBodyOverflow: string | null = null;
  private prevBodyPaddingRight: string | null = null;
  private prevHeaderZIndex: string | null = null;

  readonly filtered = computed(() => {
    const q = normalizeText(this.query());
    const pre = this.filterPrequal();
    const area = this.filterArea();

    let out = this.items();

    if (q) {
      out = out.filter(r => {
        const hay = [
          String(r.id),
          r.firstName,
          r.lastName,
          r.email,
          r.phone,
          r.prequal,
          r.areas.join(' '),
        ]
          .map(normalizeText)
          .join(' ');
        return hay.includes(q);
      });
    }

    if (pre !== 'ALL') out = out.filter(r => r.prequal === pre);
    if (area !== 'ALL') out = out.filter(r => r.areas.includes(area));

    out = [...out].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return out;
  });

  readonly total = computed(() => this.filtered().length);

  readonly pagesCount = computed(() => {
    const t = this.total();
    const s = this.pageSize();
    return Math.max(1, Math.ceil(t / s));
  });

  readonly paged = computed(() => {
    const p = this.page();
    const s = this.pageSize();
    const start = (p - 1) * s;
    const end = start + s;
    return this.filtered().slice(start, end);
  });

  readonly stats = computed(() => {
    const all = this.items();
    const total = all.length;

    const byPre: Record<PreQual, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const it of all) byPre[it.prequal]++;

    return { total, A: byPre.A, B: byPre.B, C: byPre.C, D: byPre.D };
  });

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
      age: [18, [Validators.required, Validators.min(14), Validators.max(99)]],
      phone: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      areas: this.fb.group({
        limpieza: [false],
        gastronomia: [false],
        atencion_publico: [false],
        mantenimiento: [false],
        administracion: [false],
      }),
      prequal: ['B', [Validators.required]],
    });

    effect(() => {
      const pages = this.pagesCount();
      const p = this.page();
      if (p > pages) this.page.set(pages);
      if (p < 1) this.page.set(1);
    });

    effect(() => {
      const t = getAuthToken();
      console.log(
        '[FTP EMPLEO]',
        this.roleDebug(),
        '| API_BASE=',
        API_BASE,
        '| token=',
        t ? `${t.slice(0, 12)}...` : 'NO_TOKEN'
      );
    });

    effect(() => {
      const isAnyModalOpen = this.modalOpen() || this.deleteOpen();
      this.applyGlobalModalFix(isAnyModalOpen);
    });

    this.loadItems();
  }

  // ==========================================================
  // ✅ MODAL FIX
  // ==========================================================
  private applyGlobalModalFix(open: boolean): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const body = document.body;

    if (open) {
      if (this.prevBodyOverflow === null) this.prevBodyOverflow = body.style.overflow;
      if (this.prevBodyPaddingRight === null) this.prevBodyPaddingRight = body.style.paddingRight;

      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`;

      setTimeout(() => {
        const modalBack = document.querySelector('.modalBack') as HTMLElement | null;
        if (modalBack) modalBack.style.zIndex = '99999';
      }, 0);

      setTimeout(() => {
        const headerCandidate =
          (document.querySelector('header') as HTMLElement | null) ||
          (document.querySelector('.header') as HTMLElement | null) ||
          (document.querySelector('.topbar') as HTMLElement | null) ||
          (document.querySelector('.app-header') as HTMLElement | null);

        if (headerCandidate) {
          if (this.prevHeaderZIndex === null) this.prevHeaderZIndex = headerCandidate.style.zIndex;
          headerCandidate.style.zIndex = '1';
        }
      }, 0);

      return;
    }

    if (this.prevBodyOverflow !== null) body.style.overflow = this.prevBodyOverflow;
    if (this.prevBodyPaddingRight !== null) body.style.paddingRight = this.prevBodyPaddingRight;

    this.prevBodyOverflow = null;
    this.prevBodyPaddingRight = null;

    const headerCandidate =
      (document.querySelector('header') as HTMLElement | null) ||
      (document.querySelector('.header') as HTMLElement | null) ||
      (document.querySelector('.topbar') as HTMLElement | null) ||
      (document.querySelector('.app-header') as HTMLElement | null);

    if (headerCandidate) headerCandidate.style.zIndex = this.prevHeaderZIndex ?? '';
    this.prevHeaderZIndex = null;
  }

  // ==========================================================
  // ✅ BACKEND REAL — CON FALLBACK AUTOMÁTICO SI 500
  // ==========================================================
  private mapResponseToItems(res: any): ApplicantRow[] {
    const rawItems: any[] = Array.isArray(res)
      ? res
      : (res?.items || res?.rows || res?.data || res?.applications || []);

    return rawItems.map((r: any) => ({
      id: Number(r.id || 0),
      firstName: String(r.firstName || r.nombre || ''),
      lastName: String(r.lastName || r.apellido || ''),
      age: Number(r.age || r.edad || 0),
      phone: String(r.phone || r.telefono || ''),
      email: String(r.email || ''),
      areas: coerceAreas(r.areas || r.area || r.areasTrabajo),
      prequal: String(r.prequal || r.precalificacion || 'B') as PreQual,
      createdAt: toIsoDateString(r.createdAt || r.created_at),
      updatedAt: toIsoDateString(r.updatedAt || r.updated_at),
    }));
  }

  private async fetchApplications(limit?: number): Promise<any> {
    let params = new HttpParams();
    if (typeof limit === 'number') {
      params = params.set('limit', String(limit)).set('offset', '0');
    }

    return await firstValueFrom(
      this.http.get(`${API_BASE}/applications`, {
        params: typeof limit === 'number' ? params : undefined,
        headers: authHeaders(),
      })
    );
  }

  async loadItems(): Promise<void> {
    try {
      this.loading.set(true);
      this.errorMsg.set('');

      const token = getAuthToken();
      if (!token) {
        this.setError('⚠️ No hay token de sesión (df_auth_token). Iniciá sesión de nuevo.');
        return;
      }

      // ✅ intento 1: limit 200
      try {
        const res200 = await this.fetchApplications(200);
        this.items.set(this.mapResponseToItems(res200));
        return;
      } catch (e1: any) {
        if (e1?.status !== 500) throw e1;

        console.warn('[FTP EMPLEO] Backend 500 con limit=200. Probando limit=50...');
        logHttpError('[FTP EMPLEO] loadItems attempt(limit=200) error', e1);
      }

      // ✅ intento 2: limit 50
      try {
        const res50 = await this.fetchApplications(50);
        this.items.set(this.mapResponseToItems(res50));
        this.setToast('⚠️ Cargado con limit=50 (fallback por error backend)');
        return;
      } catch (e2: any) {
        if (e2?.status !== 500) throw e2;

        console.warn('[FTP EMPLEO] Backend 500 con limit=50. Probando sin params...');
        logHttpError('[FTP EMPLEO] loadItems attempt(limit=50) error', e2);
      }

      // ✅ intento 3: sin params
      const resNoParams = await this.fetchApplications(undefined);
      this.items.set(this.mapResponseToItems(resNoParams));
      this.setToast('⚠️ Cargado sin params (fallback por error backend)');
    } catch (e: any) {
      logHttpError('[FTP EMPLEO] loadItems FINAL error FULL', e);

      if (e?.status === 401) {
        this.setError('⛔ 401 Unauthorized: el backend no aceptó el token. Re-logueate.');
        return;
      }

      if (e?.status === 403) {
        this.setError('⛔ 403: No tenés permisos para acceder a este módulo.');
        return;
      }

      if (e?.status === 500) {
        const backendMsg =
          e?.error?.sqlMessage ||
          e?.error?.message ||
          e?.error?.error ||
          'Error interno del servidor (500)';

        this.setError(`⛔ 500 Backend: ${backendMsg}`);
        return;
      }

      this.setError('No se pudieron cargar las aplicaciones desde la DB.');
    } finally {
      this.loading.set(false);
    }
  }

  private async createItem(payload: Omit<ApplicantRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    await firstValueFrom(
      this.http.post(`${API_BASE}/applications`, payload, { headers: authHeadersJson() })
    );
  }

  private async updateItem(id: number, payload: Omit<ApplicantRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    await firstValueFrom(
      this.http.put(`${API_BASE}/applications/${id}`, payload, { headers: authHeadersJson() })
    );
  }

  private async deleteItem(id: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${API_BASE}/applications/${id}`, { headers: authHeaders() })
    );
  }

  // ==========================================================
  // UI Actions
  // ==========================================================
  setToast(msg: string): void {
    this.toastMsg.set(msg);
    setTimeout(() => {
      if (this.toastMsg() === msg) this.toastMsg.set('');
    }, 2200);
  }

  setError(msg: string): void {
    this.errorMsg.set(msg);
    setTimeout(() => {
      if (this.errorMsg() === msg) this.errorMsg.set('');
    }, 3500);
  }

  changePage(next: number): void {
    const max = this.pagesCount();
    const clamped = Math.max(1, Math.min(max, next));
    this.page.set(clamped);
  }

  clearFilters(): void {
    this.query.set('');
    this.filterPrequal.set('ALL');
    this.filterArea.set('ALL');
    this.page.set(1);
  }

  // ==========================================================
  // Modal Create/Edit (Admin)
  // ==========================================================
  openCreate(): void {
    if (!this.isAdmin()) {
      this.setError('⛔ Solo Admin puede crear registros.');
      return;
    }

    this.modalMode.set('create');
    this.selectedId.set(null);

    this.form.reset({
      firstName: '',
      lastName: '',
      age: 18,
      phone: '',
      email: '',
      areas: {
        limpieza: false,
        gastronomia: false,
        atencion_publico: false,
        mantenimiento: false,
        administracion: false,
      },
      prequal: 'B',
    });

    this.modalOpen.set(true);
  }

  openEdit(row: ApplicantRow): void {
    if (!this.isAdmin()) {
      this.setError('⛔ Solo Admin puede editar registros.');
      return;
    }

    this.modalMode.set('edit');
    this.selectedId.set(row.id);

    const areasState = {
      limpieza: row.areas.includes('limpieza'),
      gastronomia: row.areas.includes('gastronomia'),
      atencion_publico: row.areas.includes('atencion_publico'),
      mantenimiento: row.areas.includes('mantenimiento'),
      administracion: row.areas.includes('administracion'),
    };

    this.form.reset({
      firstName: row.firstName,
      lastName: row.lastName,
      age: row.age,
      phone: row.phone,
      email: row.email,
      areas: areasState,
      prequal: row.prequal,
    });

    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  private selectedAreasFromForm(): WorkArea[] {
    const g = this.form.get('areas')?.value ?? {};
    const out: WorkArea[] = [];
    for (const area of WORK_AREAS) {
      if (g[area.id]) out.push(area.id);
    }
    return out;
  }

  async saveModal(): Promise<void> {
    if (!this.isAdmin()) {
      this.setError('⛔ Acción no permitida. Solo Admin.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.setError('Revisá los campos. Hay datos inválidos.');
      return;
    }

    const areas = this.selectedAreasFromForm();
    if (!areas.length) {
      this.setError('Seleccioná al menos un área de trabajo.');
      return;
    }

    const payload = {
      firstName: String(this.form.value.firstName || '').trim(),
      lastName: String(this.form.value.lastName || '').trim(),
      age: Number(this.form.value.age || 0),
      phone: String(this.form.value.phone || '').trim(),
      email: String(this.form.value.email || '').trim(),
      areas,
      prequal: this.form.value.prequal as PreQual,
    };

    if (!payload.firstName || !payload.lastName) {
      this.setError('Nombre y apellido son obligatorios.');
      return;
    }

    try {
      this.loading.set(true);

      const mode = this.modalMode();

      if (mode === 'create') {
        await this.createItem(payload);
        this.setToast('✅ Aplicación registrada (DB)');
        this.closeModal();
        await this.loadItems();
        return;
      }

      const id = this.selectedId();
      if (id === null || id === undefined) {
        this.setError('No se pudo identificar el registro a editar.');
        return;
      }

      await this.updateItem(id, payload);
      this.setToast('✅ Registro actualizado (DB)');
      this.closeModal();
      await this.loadItems();
    } catch (e: any) {
      logHttpError('[FTP EMPLEO] saveModal error FULL', e);

      if (e?.status === 403) {
        this.setError('⛔ 403: Solo Admin puede guardar cambios.');
        return;
      }

      this.setError('No se pudo guardar en la DB.');
    } finally {
      this.loading.set(false);
    }
  }

  // ==========================================================
  // Delete (Admin)
  // ==========================================================
  askDelete(row: ApplicantRow): void {
    if (!this.isAdmin()) {
      this.setError('⛔ Solo Admin puede eliminar registros.');
      return;
    }
    this.deleteId.set(row.id);
    this.deleteOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteOpen.set(false);
    this.deleteId.set(null);
  }

  async confirmDelete(): Promise<void> {
    if (!this.isAdmin()) {
      this.setError('⛔ Acción no permitida. Solo Admin.');
      return;
    }

    const id = this.deleteId();
    if (id === null || id === undefined) return;

    try {
      this.loading.set(true);
      await this.deleteItem(id);
      this.setToast('🗑️ Registro eliminado (DB)');
      this.deleteOpen.set(false);
      this.deleteId.set(null);
      await this.loadItems();
    } catch (e: any) {
      logHttpError('[FTP EMPLEO] delete error FULL', e);

      if (e?.status === 403) {
        this.setError('⛔ 403: Solo Admin puede eliminar.');
        return;
      }

      this.setError('No se pudo eliminar en la DB.');
    } finally {
      this.loading.set(false);
    }
  }

  // ==========================================================
  // Export CSV (REAL) — visible para TODOS los roles de vista
  // ==========================================================
  async exportCsv(): Promise<void> {
    try {
      if (this.loading()) return;

      const token = getAuthToken();
      if (!token) {
        this.setError('⚠️ No hay token de sesión (df_auth_token). Iniciá sesión de nuevo.');
        return;
      }

      const q = this.query();
      const pre = this.filterPrequal();
      const area = this.filterArea();

      let params = new HttpParams();
      if (q) params = params.set('query', q);
      if (pre !== 'ALL') params = params.set('prequal', pre);
      if (area !== 'ALL') params = params.set('area', area);

      const blob = await firstValueFrom(
        this.http.get(`${API_BASE}/applications/export.csv`, {
          params,
          responseType: 'blob',
          headers: authHeaders(),
        })
      );

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `don-francisco_empleo_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);

      this.setToast('📤 Exportación CSV (DB) generada');
    } catch (e: any) {
      logHttpError('[FTP EMPLEO] exportCsv error FULL', e);

      if (e?.status === 403) {
        this.setError('⛔ 403: No tenés permisos para exportar.');
        return;
      }

      this.setError('No se pudo exportar CSV desde el backend.');
    }
  }

  // ==========================================================
  // Helpers UI
  // ==========================================================
  areaLabel(area: WorkArea): string {
    return WORK_AREAS.find(a => a.id === area)?.label ?? area;
  }

  areaBadge(area: WorkArea): string {
    return WORK_AREAS.find(a => a.id === area)?.badge ?? area.toUpperCase();
  }

  selectedAreasPreview(): string {
    const areas = this.selectedAreasFromForm();
    if (!areas.length) return 'Ninguna';
    return areas.map(a => this.areaBadge(a)).join(' • ');
  }

  roleLabel(): string {
    const r = normalizeRoleName(this.role());
    if (r === 'admin') return 'Admin';
    if (r === 'funcionario') return 'Funcionario';
    if (r === 'staff') return 'Staff';
    if (r === 'user') return 'Usuario';
    return r || 'Sin rol';
  }
}
