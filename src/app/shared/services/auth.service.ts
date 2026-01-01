import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  catchError,
  map,
  tap,
  throwError,
  of
} from 'rxjs';

/* ============================================================
   MODELOS
============================================================ */
export interface AuthUser {
  nombre: string;
  apellido: string;
  email: string;
  rol: 'admin' | 'user';
  telefono?: string;
  foto?: string | null;
}

interface AuthResponse {
  token?: string;
  user?: Partial<AuthUser> & Record<string, any>;
  data?: Partial<AuthUser> & Record<string, any>;
  message?: string;
}

/* ============================================================
   SERVICE
============================================================ */
@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly tokenKey = 'df_auth_token';
  private readonly userKey = 'df_auth_user';
  private readonly apiUrl: string;
  private readonly isBrowser = typeof window !== 'undefined';

  private userSubject = new BehaviorSubject<AuthUser | null>(null);
  public readonly user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    const globalEnv = (import.meta as any)?.env || (window as any)?.env || {};

    const rawUrl =
      globalEnv['NG_APP_API_URL'] ||
      'https://donfrancisco-backend.fly.dev/';

    this.apiUrl = String(rawUrl).replace(/\/$/, '');

    /* ==========================
       HIDRATACIÓN INICIAL
    ========================== */
    if (this.isBrowser) {
      const storedUser = this.getStoredUser();
      if (storedUser) {
        this.userSubject.next(storedUser);
      }

      // Si hay token pero no hay usuario, traerlo del backend
      if (this.token && !storedUser) {
        this.getProfile().subscribe({
          error: () => this.logout()
        });
      }
    }
  }

  /* ==========================
      AUTH
  ========================== */

  login(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/usuarios/login`, { email, password })
      .pipe(map((response) => this.persistSession(response)));
  }

  register(
    nombre: string,
    apellido: string,
    email: string,
    password: string,
    telefono: string
  ): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/usuarios/register`, {
        nombre,
        apellido,
        email,
        password,
        telefono
      })
      .pipe(map((response) => this.persistSession(response)));
  }

  getProfile(): Observable<AuthUser> {
    if (!this.token) return of(null as unknown as AuthUser);

    return this.http
      .get<AuthResponse>(`${this.apiUrl}/usuarios/me`, {
        headers: this.getAuthHeaders()
      })
      .pipe(
        map((response) =>
          this.normalizeUser(response.user || response.data || response)
        ),
        tap((user) => {
          this.userSubject.next(user);
          this.saveUser(user);
        })
      );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
    this.userSubject.next(null);
  }

  /* ==========================
     CHANGE PASSWORD 🔒
  ========================== */

  changePassword(
    payload: { actual: string; nueva: string }
  ): Observable<{ mensaje?: string }> {
    return this.http
      .put<{ mensaje?: string }>(
        `${this.apiUrl}/usuarios/cambiar-password`,
        payload,
        { headers: this.getAuthHeaders() }
      )
      .pipe(
        catchError((error) =>
          throwError(() => this.extractError(error))
        )
      );
  }

  /* ==========================
      HELPERS
  ========================== */

  isAuthenticated(): boolean {
    return !!this.token;
  }

  isAdmin(): boolean {
    return this.userSubject.value?.rol === 'admin';
  }

  getRol(): 'admin' | 'user' | null {
    return this.userSubject.value?.rol ?? null;
  }

  /* ==========================
      TOKEN / HEADERS
  ========================== */

  get token(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.tokenKey);
  }

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    if (this.token) {
      headers = headers.set('Authorization', `Bearer ${this.token}`);
    }
    return headers;
  }

  /* ==========================
      INTERNALS
  ========================== */

  private persistSession(response: AuthResponse): AuthUser {
    const user = this.normalizeUser(response.user || response.data || response);

    if (this.isBrowser && response.token) {
      localStorage.setItem(this.tokenKey, response.token);
      this.saveUser(user);
    }

    this.userSubject.next(user);
    return user;
  }

  private saveUser(user: AuthUser): void {
    if (!this.isBrowser) return;
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private getStoredUser(): AuthUser | null {
    if (!this.isBrowser) return null;
    const stored = localStorage.getItem(this.userKey);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as AuthUser;
    } catch {
      return null;
    }
  }

  private normalizeUser(raw: any): AuthUser {
    return {
      nombre: raw?.nombre ?? '',
      apellido: raw?.apellido ?? '',
      email: raw?.email ?? '',
      rol: raw?.rol === 'admin' ? 'admin' : 'user',
      telefono: raw?.telefono ?? '',
      foto: raw?.foto ?? null
    };
  }

  extractError(error: unknown): string {
    if (typeof error === 'string') return error;

    if (error instanceof HttpErrorResponse) {
      return (
        error.error?.message ||
        error.error?.error ||
        error.message ||
        'No pudimos procesar tu solicitud.'
      );
    }

    return 'No pudimos procesar tu solicitud.';
  }
}
