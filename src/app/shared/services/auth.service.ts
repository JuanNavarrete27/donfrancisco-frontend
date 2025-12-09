import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, tap, throwError } from 'rxjs';

export interface AuthUser {
  nombre: string;
  apellido: string;
  email: string;
}

interface AuthResponse {
  token?: string;
  user?: Partial<AuthUser> & Record<string, any>;
  data?: Partial<AuthUser> & Record<string, any>;
  message?: string;
}

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'df_auth_token';
  private readonly userKey = 'df_auth_user';
  private readonly apiUrl: string;
  private readonly isBrowser = typeof window !== 'undefined';

  private userSubject: BehaviorSubject<AuthUser | null>;
  public readonly user$: Observable<AuthUser | null>;

  constructor(private http: HttpClient) {
    const globalEnv = (import.meta as any)?.env || {};
    const rawUrl = globalEnv['NG_APP_API_URL'] || 'https://donfrancisco-backend-production.up.railway.app';
    this.apiUrl = String(rawUrl).replace(/\/$/, '');

    this.userSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
    this.user$ = this.userSubject.asObservable();
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(map((response) => this.persistSession(response)));
  }

  register(nombre: string, apellido: string, email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/register`, { nombre, apellido, email, password })
      .pipe(map((response) => this.persistSession(response)));
  }

  getProfile(): Observable<AuthUser> {
    return this.http
      .get<AuthResponse>(`${this.apiUrl}/auth/me`, { headers: this.getAuthHeaders() })
      .pipe(
        map((response) => this.normalizeUser(response.user || response.data || response)),
        tap((user) => {
          this.userSubject.next(user);
          this.saveUser(user);
        })
      );
  }

  changePassword(payload: ChangePasswordPayload): Observable<{ message?: string }> {
    return this.http
      .post<{ message?: string }>(`${this.apiUrl}/auth/change-password`, payload, {
        headers: this.getAuthHeaders()
      })
      .pipe(
        catchError((error) => {
          return throwError(() => this.extractError(error));
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

  get token(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  extractError(error: any): string {
    if (typeof error === 'string') return error;
    if (error instanceof HttpErrorResponse) {
      const message = (error.error && (error.error.message || error.error.error)) || error.message;
      return message || 'No pudimos procesar tu solicitud. Intenta nuevamente.';
    }
    return 'No pudimos procesar tu solicitud. Intenta nuevamente.';
  }

  private persistSession(response: AuthResponse): AuthUser {
    const user = this.normalizeUser(response.user || response.data || response);
    if (this.isBrowser) {
      if (response.token) {
        localStorage.setItem(this.tokenKey, response.token);
      }
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
    } catch (error) {
      return null;
    }
  }

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    if (this.token) {
      headers = headers.set('Authorization', `Bearer ${this.token}`);
    }
    return headers;
  }

  private normalizeUser(raw: any): AuthUser {
    const nombre = raw?.nombre ?? raw?.name ?? '';
    const apellido = raw?.apellido ?? raw?.lastName ?? raw?.apellido ?? '';
    const email = raw?.email ?? raw?.mail ?? '';

    return { nombre, apellido, email };
  }
}
