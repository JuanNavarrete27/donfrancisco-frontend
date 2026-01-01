// conferencias.page.ts
// =====================================================
// ConferenciasPage — Agenda (tipo Bentasca) en MODAL
//
// ✅ FIXES (sin romper nada):
// - Usa keys reales: df_auth_user / df_auth_token
// - POST REAL a Render: https://donfrancisco-backend.onrender.com/salon/solicitudes
// - Payload alineado a AdminSalon/backend: fecha, hora_inicio, hora_fin, horas_json, nombre, apellido, telefono, email, mensaje
// - Mantiene compat con tu HTML: horaSeleccionada + horariosDisponibles
// - ✅ HORAS: selección consecutiva DE A 1 HORA (NO media hora)
//   - hora_inicio / hora_fin siempre "HH:00" (corta segundos)
//   - horas_json se arma desde el rango (inicio inclusive, fin exclusive)
//   - No permite saltos ni seleccionar horas ocupadas en el bloque
//
// NOTA:
// - Si el endpoint POST /salon/solicitudes falla, cae a MOCK.
// - Disponibilidad: si existe GET /salon/reservas?fecha=YYYY-MM-DD lo intento.
// =====================================================

import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription, firstValueFrom } from 'rxjs';

import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';

import {
  HttpClient,
  HttpClientModule,
  HttpHeaders,
} from '@angular/common/http';

type Country = {
  code: string;
  name: string;
  flagImage: string;
};

type SolicitudEstado = 'pending' | 'approved' | 'rejected';

type SalonSolicitud = {
  id: string;
  createdAt: string; // ISO
  fecha: string; // YYYY-MM-DD
  horas: string[]; // ['19:00','20:00',...]
  horaInicio: string; // '19:00'
  horaFin: string; // '22:00' (fin = última+1)
  estado: SolicitudEstado;

  usuarioId?: string | number | null;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  email?: string;
  mensaje?: string;
};

@Component({
  selector: 'app-conferencias',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './conferencias.page.html',
  styleUrls: ['./conferencias.page.scss'],
})
export class ConferenciasPage implements OnInit, AfterViewInit, OnDestroy {
  // =====================================================
  // VIDEO BG
  // =====================================================
  @ViewChild('bgVideo') bgVideo?: ElementRef<HTMLVideoElement>;
  private readonly targetVideoSeconds = 10;

  // =====================================================
  // AUTH
  // =====================================================
  usuarioLogueado = false;
  usuario: any = null;

  // =====================================================
  // FORM INVITADO
  // =====================================================
  reservaForm!: FormGroup;

  paises: Country[] = [
    { code: '+598', name: 'Uruguay', flagImage: 'assets/flags/uruguay.png' },
    { code: '+54', name: 'Argentina', flagImage: 'assets/flags/argentina.png' },
    { code: '+55', name: 'Brasil', flagImage: 'assets/flags/brasil.png' },
    { code: '+56', name: 'Chile', flagImage: 'assets/flags/chile.png' },
  ];

  // =====================================================
  // CALENDARIO
  // =====================================================
  hoy = new Date();
  mesActual = new Date();
  calendario: (Date | null)[] = [];
  diaSeleccionado: Date | null = null;

  // =====================================================
  // COMPAT HTML
  // =====================================================
  horaSeleccionada: string | null = null;

  // =====================================================
  // BLOQUE DE HORAS (consecutivas, 1h)
  // =====================================================
  horaInicio: string | null = null;
  horasSeleccionadas: string[] = [];

  get tieneBloqueSeleccionado(): boolean {
    return (this.horasSeleccionadas || []).length > 0;
  }

  get cantidadHorasSeleccionadas(): number {
    return (this.horasSeleccionadas || []).length;
  }

  get horaFinCalculada(): string {
    if (!this.horasSeleccionadas.length) return '';
    const last = this.horasSeleccionadas[this.horasSeleccionadas.length - 1];
    return this.sumarUnaHora(last);
  }

  meses = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
  ];

  // Orden importa para consecutividad (1h)
  // Si mañana querés 09:00 - 13:00, acá ponés: ['09:00','10:00','11:00','12:00','13:00',...]
  horarios: string[] = ['19:00', '20:00', '21:00', '22:00', '23:00'];

  // =====================================================
  // DISPONIBILIDAD (solo aprobadas bloquean)
  // =====================================================
  horariosOcupados: string[] = [];

  // =====================================================
  // MODAL / UI
  // =====================================================
  modalAgendaOpen = false;
  modalVisible = false;
  modalAnimating = false;

  step: 'calendar' | 'hours' | 'form' | 'success' = 'calendar';

  procesando = false;
  exito = false;
  error = '';

  private exitoTimer: any;

  // =====================================================
  // MOCK
  // =====================================================
  private reservasAprobadasMock: Record<string, string[]> = {};
  private solicitudesMock: Record<string, SalonSolicitud[]> = {};

  // =====================================================
  // Router scroll top
  // =====================================================
  private routerSub?: Subscription;

  // Anti-bug backdrop
  private bloqueandoBackdrop = false;

  // =====================================================
  // API REAL (Render)
  // =====================================================
  private readonly API_BASE = 'https://donfrancisco-backend.fly.dev/';

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => window.scrollTo(0, 0));

    this.generarCalendario();
    this.initializeForm();
  }

  // =====================================================
  // LIFECYCLE
  // =====================================================
  ngOnInit(): void {
    window.scrollTo(0, 0);

    const storedUser = localStorage.getItem('df_auth_user');
    const token = localStorage.getItem('df_auth_token');

    if (storedUser || token) {
      this.usuarioLogueado = true;
      try {
        this.usuario = storedUser ? JSON.parse(storedUser) : null;
      } catch {
        this.usuario = null;
      }
    }
  }

  ngAfterViewInit(): void {
    const video = this.bgVideo?.nativeElement;
    if (!video) return;

    const trySetRate = () => {
      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) return;

      let rate = duration / this.targetVideoSeconds;
      rate = Math.max(0.15, Math.min(rate, 1));

      video.playbackRate = rate;
      video.play().catch(() => {});
    };

    if (video.readyState >= 1) trySetRate();
    else video.addEventListener('loadedmetadata', trySetRate, { once: true });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (this.exitoTimer) clearTimeout(this.exitoTimer);
  }

  // =====================================================
  // FORM INVITADO
  // =====================================================
  initializeForm(): void {
    this.reservaForm = this.fb.group({
      nombre: [
        '',
        [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)],
      ],
      apellido: [
        '',
        [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)],
      ],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{7,15}$/)]],
      email: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
        ],
      ],
      mensaje: [''],
      prefijo: ['+598'],
    });
  }

  getCurrentPais(): Country {
    const prefijo = this.reservaForm?.get('prefijo')?.value || '+598';
    return this.paises.find((p) => p.code === prefijo) || this.paises[0];
  }

  // =====================================================
  // MODAL OPEN/CLOSE
  // =====================================================
  abrirAgenda(): void {
    this.bloqueandoBackdrop = true;

    this.modalAgendaOpen = true;
    this.modalVisible = false;
    this.modalAnimating = false;

    this.step = 'calendar';
    this.error = '';
    this.exito = false;
    this.procesando = false;

    this.resetBloqueHoras();

    requestAnimationFrame(() => {
      this.modalVisible = true;
      setTimeout(() => (this.bloqueandoBackdrop = false), 220);
    });
  }

  cerrarAgenda(): void {
    if (this.bloqueandoBackdrop) return;

    this.modalAnimating = true;
    this.modalVisible = false;

    setTimeout(() => {
      this.modalAgendaOpen = false;
      this.modalAnimating = false;

      this.diaSeleccionado = null;
      this.horariosOcupados = [];
      this.step = 'calendar';
      this.error = '';
      this.exito = false;
      this.procesando = false;

      this.resetBloqueHoras();
    }, 420);
  }

  // =====================================================
  // CALENDARIO
  // =====================================================
  generarCalendario(): void {
    this.calendario = [];

    const year = this.mesActual.getFullYear();
    const month = this.mesActual.getMonth();

    const primerDia = new Date(year, month, 1).getDay();
    const diasEnMes = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < primerDia; i++) this.calendario.push(null);
    for (let i = 1; i <= diasEnMes; i++) {
      this.calendario.push(new Date(year, month, i));
    }
  }

  mesAnterior(): void {
    this.mesActual = new Date(
      this.mesActual.getFullYear(),
      this.mesActual.getMonth() - 1
    );
    this.generarCalendario();
    this.limpiarSeleccion(true);
  }

  mesSiguiente(): void {
    this.mesActual = new Date(
      this.mesActual.getFullYear(),
      this.mesActual.getMonth() + 1
    );
    this.generarCalendario();
    this.limpiarSeleccion(true);
  }

  esMesActual(): boolean {
    return (
      this.mesActual.getMonth() === this.hoy.getMonth() &&
      this.mesActual.getFullYear() === this.hoy.getFullYear()
    );
  }

  esFuturoLejano(): boolean {
    const limite = new Date();
    limite.setMonth(limite.getMonth() + 2);
    return this.mesActual > limite;
  }

  esPasado(d: Date): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return d < hoy;
  }

  esHoy(d: Date): boolean {
    return d.toDateString() === new Date().toDateString();
  }

  esFuturo(d: Date): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return d >= hoy;
  }

  esDiaSeleccionado(d: Date): boolean {
    return this.diaSeleccionado?.toDateString() === d.toDateString();
  }

  seleccionarDia(dia: Date): void {
    if (!this.esFuturo(dia)) return;

    if (this.diaSeleccionado && this.diaSeleccionado.getTime() === dia.getTime()) {
      this.step = 'hours';
      return;
    }

    this.diaSeleccionado = dia;
    this.error = '';
    this.exito = false;

    this.resetBloqueHoras();

    const fechaStr = this.toFechaStr(dia);

    // 1) fallback local
    this.horariosOcupados = this.reservasAprobadasMock[fechaStr]
      ? [...this.reservasAprobadasMock[fechaStr]]
      : [];

    // 2) intento API real
    this.cargarOcupadosDesdeAPI(fechaStr);

    this.step = 'hours';
  }

  // =====================================================
  // HORARIOS
  // =====================================================
  get horariosDisponibles(): { hora: string; disponible: boolean }[] {
    return (this.horarios || []).map((hora) => ({
      hora,
      disponible: !this.horariosOcupados.includes(hora),
    }));
  }

  isHoraSeleccionada(hora: string): boolean {
    return (this.horasSeleccionadas || []).includes(hora);
  }

  // ✅ Selección consecutiva (1h) + NO permite pasar por ocupadas
  seleccionarHora(hora: string): void {
    if (!this.diaSeleccionado) return;

    const h = this.hhmm(hora);
    if (!h) return;
    if (this.horariosOcupados.includes(h)) return;

    // 1) sin bloque => inicia
    if (!this.horaInicio || this.horasSeleccionadas.length === 0) {
      this.horaInicio = h;
      this.horasSeleccionadas = [h];
      this.horaSeleccionada = this.horaInicio; // compat HTML
      return;
    }

    const idxClicked = this.getHoraIndex(h);
    if (idxClicked === -1) return;

    // 2) si clic en una hora ya dentro => recorta
    const idxInBlock = this.horasSeleccionadas.indexOf(h);
    if (idxInBlock !== -1) {
      this.horasSeleccionadas = this.horasSeleccionadas.slice(0, idxInBlock + 1);
      this.horaInicio = this.horasSeleccionadas[0] || null;
      this.horaSeleccionada = this.horaInicio;
      return;
    }

    const start = this.horasSeleccionadas[0];
    const last = this.horasSeleccionadas[this.horasSeleccionadas.length - 1];

    const idxStart = this.getHoraIndex(start);
    const idxLast = this.getHoraIndex(last);

    // 3) permitir elegir ANTES del inicio => reinicia
    if (idxClicked < idxStart) {
      this.horaInicio = h;
      this.horasSeleccionadas = [h];
      this.horaSeleccionada = this.horaInicio;
      return;
    }

    // 4) si es consecutiva (extiende) pero chequea que no haya ocupadas en el medio
    if (idxClicked === idxLast + 1) {
      // el siguiente ya sabemos que NO está ocupado porque lo validamos arriba
      this.horasSeleccionadas = [...this.horasSeleccionadas, h];
      this.horaSeleccionada = this.horaInicio; // compat HTML
      return;
    }

    // 5) si no es consecutiva => reinicia (evita saltos tipo 19 -> 21)
    this.horaInicio = h;
    this.horasSeleccionadas = [h];
    this.horaSeleccionada = this.horaInicio;
  }

  volverACalendario(): void {
    this.step = 'calendar';
    this.error = '';
    this.resetBloqueHoras();
  }

  confirmarHora(): void {
    if (!this.diaSeleccionado) return;
    if (!this.horasSeleccionadas.length) return;

    this.error = '';

    if (this.usuarioLogueado) {
      this.enviarSolicitudReserva('logged');
      return;
    }

    this.step = 'form';
  }

  volverAHorarios(): void {
    this.step = 'hours';
    this.error = '';
  }

  // =====================================================
  // SOLICITUDES (PENDIENTES)
  // =====================================================
  confirmarReserva(): void {
    if (!this.diaSeleccionado) return;
    if (!this.horasSeleccionadas.length) return;
    if (!this.reservaForm.valid) return;

    this.enviarSolicitudReserva('guest');
  }

  private enviarSolicitudReserva(modo: 'guest' | 'logged'): void {
    if (!this.diaSeleccionado) return;
    if (!this.horasSeleccionadas.length) return;

    this.procesando = true;
    this.error = '';
    this.exito = false;

    const fechaStr = this.toFechaStr(this.diaSeleccionado);

    // ✅ aseguramos HH:MM (y que sea de a 1h)
    const horas = this.horasSeleccionadas.map(h => this.hhmm(h)).filter(Boolean);

    const horaInicio = horas[0];
    const horaFin = this.sumarUnaHora(horas[horas.length - 1]); // fin exclusive
    const horasRango = this.buildHorasFromRange(horaInicio, horaFin); // ✅ 60min

    const invitado = modo === 'guest' ? this.reservaForm.value : null;

    const payload: Omit<SalonSolicitud, 'id' | 'createdAt' | 'estado'> = {
      fecha: fechaStr,
      horas: horasRango,
      horaInicio,
      horaFin,
      usuarioId: this.usuarioLogueado
        ? (this.usuario?.id ?? this.usuario?._id ?? null)
        : null,
      nombre:
        modo === 'guest'
          ? invitado?.nombre
          : (this.usuario?.nombre ?? this.usuario?.name ?? ''),
      apellido:
        modo === 'guest'
          ? invitado?.apellido
          : (this.usuario?.apellido ?? this.usuario?.lastName ?? ''),
      telefono:
        modo === 'guest'
          ? `${invitado?.prefijo ?? '+598'} ${invitado?.telefono ?? ''}`.trim()
          : (this.usuario?.telefono ?? this.usuario?.phone ?? ''),
      email: modo === 'guest' ? invitado?.email : (this.usuario?.email ?? ''),
      mensaje: modo === 'guest' ? (invitado?.mensaje ?? '') : '',
    };

    this.postSolicitudToAPI(payload)
      .then((ok) => {
        if (ok) {
          this.procesando = false;
          this.exito = true;
          this.step = 'success';
          this.resetBloqueHoras();
          this.iniciarTimerExito();
          return;
        }

        // MOCK fallback
        this.crearSolicitudMock(payload);
        this.procesando = false;
        this.exito = true;
        this.step = 'success';
        this.resetBloqueHoras();
        this.iniciarTimerExito();
      })
      .catch(() => {
        try {
          this.crearSolicitudMock(payload);
          this.procesando = false;
          this.exito = true;
          this.step = 'success';
          this.resetBloqueHoras();
          this.iniciarTimerExito();
        } catch {
          this.procesando = false;
          this.error = 'Error al enviar la solicitud. Probá nuevamente.';
        }
      });
  }

  // =====================================================
  // API REAL: POST solicitud (alineado con salon.js)
  // =====================================================
  private async postSolicitudToAPI(
    payload: Omit<SalonSolicitud, 'id' | 'createdAt' | 'estado'>
  ): Promise<boolean> {
    const url = `${this.API_BASE}/salon/solicitudes`;

    const token = localStorage.getItem('df_auth_token');
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);

    // ✅ salon.js espera: { fecha, hora_inicio, hora_fin, nombre, apellido, telefono, email, mensaje }
    // Igual mandamos horas_json como extra (no molesta aunque no lo uses en salon.js)
    const horasRango = this.buildHorasFromRange(
      this.hhmm(payload.horaInicio || ''),
      this.hhmm(payload.horaFin || '')
    );

    const body: any = {
      fecha: payload.fecha,
      hora_inicio: this.hhmm(payload.horaInicio || ''),
      hora_fin: this.hhmm(payload.horaFin || ''),

      nombre: payload.nombre || '',
      apellido: payload.apellido || '',
      telefono: payload.telefono || '',
      email: payload.email || '',
      mensaje: payload.mensaje || '',
    };

    // extra (si mañana lo querés guardar tal cual)
    body.horas_json = JSON.stringify(horasRango);

    try {
      await firstValueFrom(this.http.post(url, body, { headers }));
      return true;
    } catch {
      return false;
    }
  }

  // =====================================================
  // MOCK
  // =====================================================
  private crearSolicitudMock(
    payload: Omit<SalonSolicitud, 'id' | 'createdAt' | 'estado'>
  ): void {
    const id = this.uid();
    const createdAt = new Date().toISOString();

    const solicitud: SalonSolicitud = {
      id,
      createdAt,
      estado: 'pending',
      ...payload,
    };

    const fecha = payload.fecha;
    this.solicitudesMock[fecha] = this.solicitudesMock[fecha] || [];
    this.solicitudesMock[fecha].push(solicitud);
  }

  // =====================================================
  // UTILIDADES
  // =====================================================
  formatDate(d: Date | null): string {
    if (!d) return '';
    return d.toLocaleDateString('es-UY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  trackByDate(index: number, item: Date | null): string {
    return item ? item.toISOString() : `empty-${index}`;
  }

  trackByHora(index: number, item: { hora: string; disponible: boolean }): string {
    return item.hora + '-' + index;
  }

  private toFechaStr(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  limpiarSeleccion(hard: boolean): void {
    if (hard) {
      this.diaSeleccionado = null;
      this.horariosOcupados = [];
      this.step = 'calendar';
      this.error = '';
      this.exito = false;
      this.procesando = false;
      this.resetBloqueHoras();
      return;
    }

    this.resetBloqueHoras();
  }

  private iniciarTimerExito(): void {
    if (this.exitoTimer) clearTimeout(this.exitoTimer);
    this.exitoTimer = setTimeout(() => {
      this.exito = false;
    }, 5000);
  }

  agendarOtra(): void {
    if (this.exitoTimer) clearTimeout(this.exitoTimer);

    this.exito = false;
    this.error = '';
    this.procesando = false;

    this.resetBloqueHoras();
    this.horariosOcupados = [];
    this.step = 'calendar';
    this.diaSeleccionado = null;
  }

  // =====================================================
  // Helpers internos
  // =====================================================
  private resetBloqueHoras(): void {
    this.horaInicio = null;
    this.horasSeleccionadas = [];
    this.horaSeleccionada = null;
  }

  private getHoraIndex(h: string | null): number {
    if (!h) return -1;
    return (this.horarios || []).indexOf(this.hhmm(h));
  }

  // "09:00:00" => "09:00", "9:0" => "09:00"
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

  private sumarUnaHora(hora: string): string {
    const [hhStr, mmStr] = this.hhmm(hora).split(':');
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr ?? '0', 10);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return '';

    const next = hh + 1;
    const hhOut = String(next).padStart(2, '0');
    const mmOut = String(mm).padStart(2, '0');
    return `${hhOut}:${mmOut}`;
  }

  private buildHorasFromRange(inicio: string, fin: string): string[] {
    const toMin = (t: string) => {
      const [hh, mm] = this.hhmm(t).split(':').map(Number);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
      return hh * 60 + mm;
    };
    const fromMin = (m: number) => {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      return `${hh}:${mm}`;
    };

    const s = toMin(inicio);
    const e = toMin(fin);
    if (s == null || e == null || e <= s) return [];

    const horas: string[] = [];
    for (let m = s; m < e; m += 60) horas.push(fromMin(m)); // ✅ 60 min fijo
    return horas;
  }

  private uid(): string {
    return `sol_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }

  // =====================================================
  // API real: cargar ocupados aprobados por fecha
  // =====================================================
  private cargarOcupadosDesdeAPI(fecha: string): void {
    const url = `${this.API_BASE}/salon/reservas?fecha=${encodeURIComponent(fecha)}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        const horas =
          (Array.isArray(res?.horas) && res.horas) ||
          (Array.isArray(res) && res) ||
          [];
        this.horariosOcupados = horas
          .map((h: any) => this.hhmm(h))
          .filter(Boolean);
      },
      error: () => {
        // si falla, no rompas nada: te quedás con mock/empty
      },
    });
  }
}
