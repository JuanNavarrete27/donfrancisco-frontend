import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { apiBaseUrl } from '../config/api.config';

/* ============================================================
   LOCAL DATA MODELS
============================================================ */
export interface LocalCore {
  id: string;
  display_name: string;
  category: 'gastronomia' | 'tiendas';
  short_description: string;
  long_description: string;
  hero_title: string;
  hero_subtitle: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  opening_hours: string;
  website_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  logo_url?: string;
  cover_image_url?: string;
  featured: boolean;
  active: boolean;
}

export interface LocalDetails {
  id: string;
  headline?: string;
  subheadline?: string;
  description?: string;
  highlights?: string[];
  services?: string[];
  gallery?: string[];
  cta_label?: string;
  cta_url?: string;
  map_url?: string;
  promotion_text?: string;
  featured_products?: string[];
  business_tags?: string[];
}

export interface LocalMedia {
  id: string;
  logo_url?: string;
  cover_image_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  website_url?: string;
}

// Form interfaces for local-edit page
export interface DetallesForm {
  headline: string;
  subheadline: string;
  description: string;
  highlights: string;
  services: string;
  featured_products: string;
  business_tags: string;
  cta_label: string;
  cta_url: string;
  map_url: string;
  promotion_text: string;
  address: string;
  phone: string;
  email: string;
  opening_hours: string;
}

export interface MediaForm {
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  website_url: string;
}

export interface LocalComplete extends LocalCore {
  details?: LocalDetails;
  media?: LocalMedia;
}

/* ============================================================
   SERVICE
============================================================ */
@Injectable({
  providedIn: 'root'
})
export class LocalService {
  private readonly apiUrl = apiBaseUrl;

  private localSubject = new BehaviorSubject<LocalComplete | null>(null);
  public readonly local$ = this.localSubject.asObservable();

  constructor(private http: HttpClient) {}

  /* ============================================================
     LOCAL ENDPOINTS
  ============================================================ */

  getMyLocal(): Observable<LocalComplete> {
    const headers = this.getAuthHeaders();

    return this.http.get<any>(`${this.apiUrl}/api/me/local`, { headers }).pipe(
      map(response => response?.data || response),
      tap((local: LocalComplete) => {
        this.localSubject.next(local);
      }),
      catchError(error => throwError(() => this.extractError(error)))
    );
  }

  updateMyLocal(data: Partial<LocalCore>): Observable<LocalCore> {
    const headers = this.getAuthHeaders();

    return this.http.patch<any>(`${this.apiUrl}/api/me/local`, data, { headers }).pipe(
      map(response => response?.data || response),
      tap((updatedLocal: LocalCore) => {
        const current = this.localSubject.value;
        if (current) {
          this.localSubject.next({
            ...current,
            ...updatedLocal
          });
        }
      }),
      catchError(error => throwError(() => this.extractError(error)))
    );
  }

  getMyLocalDetails(): Observable<LocalDetails> {
    const headers = this.getAuthHeaders();

    return this.http.get<any>(`${this.apiUrl}/api/me/local/details`, { headers }).pipe(
      map(response => response?.data || response),
      tap((details: LocalDetails) => {
        const current = this.localSubject.value;
        if (current) {
          this.localSubject.next({
            ...current,
            details
          });
        }
      }),
      catchError(error => throwError(() => this.extractError(error)))
    );
  }

  updateMyLocalDetails(data: Partial<LocalDetails>): Observable<LocalDetails> {
    const headers = this.getAuthHeaders();

    return this.http.patch<any>(`${this.apiUrl}/api/me/local/details`, data, { headers }).pipe(
      map(response => response?.data || response),
      tap((updatedDetails: LocalDetails) => {
        const current = this.localSubject.value;
        if (current) {
          this.localSubject.next({
            ...current,
            details: {
              ...(current.details || ({ id: current.id } as LocalDetails)),
              ...updatedDetails
            }
          });
        }
      }),
      catchError(error => throwError(() => this.extractError(error)))
    );
  }

  updateMyLocalMedia(data: Partial<LocalMedia>): Observable<LocalMedia> {
    const headers = this.getAuthHeaders();

    return this.http.patch<any>(`${this.apiUrl}/api/me/local/media`, data, { headers }).pipe(
      map(response => response?.data || response),
      tap((updatedMedia: LocalMedia) => {
        const current = this.localSubject.value;
        if (current) {
          this.localSubject.next({
            ...current,
            media: {
              ...(current.media || ({ id: current.id } as LocalMedia)),
              ...updatedMedia
            }
          });
        }
      }),
      catchError(error => throwError(() => this.extractError(error)))
    );
  }

  /* ============================================================
     PUBLIC ENDPOINTS
  ============================================================ */

  getPublicLocales(): Observable<LocalCore[]> {
    return this.http.get<any>(`${this.apiUrl}/api/public/locales`).pipe(
      map(response => response?.data || response),
      catchError(error => throwError(() => this.extractError(error)))
    );
  }

  getPublicLocale(slug: string): Observable<LocalComplete> {
    return this.http.get<any>(`${this.apiUrl}/api/public/locales/${slug}`).pipe(
      map(response => response?.data || response),
      catchError(error => throwError(() => this.extractError(error)))
    );
  }

  getPublicLocaleById(id: string): Observable<LocalComplete> {
    return this.http.get<any>(`${this.apiUrl}/api/public/locales/id/${id}`).pipe(
      map(response => response?.data || response),
      catchError(error => throwError(() => this.extractError(error)))
    );
  }

  getPublicLocalesByCategory(category: string): Observable<LocalCore[]> {
    return this.http.get<any>(`${this.apiUrl}/api/public/locales/category/${category}`).pipe(
      map(response => response?.data || response),
      catchError(error => throwError(() => this.extractError(error)))
    );
  }

  /* ============================================================
     HELPERS
  ============================================================ */

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('df_auth_token');
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private extractError(error: any): string {
    if (typeof error === 'string') return error;

    return error?.error?.message ||
           error?.error?.error ||
           error?.message ||
           'No pudimos procesar tu solicitud.';
  }

  clearLocal(): void {
    this.localSubject.next(null);
  }
}