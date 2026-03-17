import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LocalService, LocalComplete, DetallesForm, MediaForm } from '../../shared/services/local.service';

@Component({
  selector: 'app-local-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './local-edit.page.html',
  styleUrls: ['./local-edit.page.scss']
})
export class LocalEditPage implements OnInit, OnDestroy {

  // Data from backend
  local: LocalComplete | null = null;

  // Form models
  detallesForm: DetallesForm = {} as DetallesForm;
  mediaForm: MediaForm = {} as MediaForm;

  // UI state
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // Active section
  activeSection: 'detalles' | 'multimedia' | 'resumen' = 'detalles';

  private destroy$ = new Subject<void>();

  constructor(
    private localService: LocalService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLocalData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ============================================================
     DATA LOADING
  ============================================================ */

  loadLocalData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.localService.getMyLocal()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (local) => {
          this.local = local;

          // If details are not included, load them separately
          if (!local.details) {
            this.loadLocalDetails();
          } else {
            this.initializeForms();
            this.loading = false;
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          this.errorMessage = error;
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private loadLocalDetails(): void {
    this.localService.getMyLocalDetails()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details) => {
          if (this.local) {
            this.local.details = details;
            this.initializeForms();
            this.loading = false;
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          this.errorMessage = error;
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private initializeForms(): void {
    if (!this.local) return;

    // Initialize detalles form with real backend data
    this.detallesForm = {
      headline: this.local.details?.headline || '',
      subheadline: this.local.details?.subheadline || '',
      description: this.local.details?.description || '',
      highlights: this.convertArrayToString(this.local.details?.highlights),
      services: this.convertArrayToString(this.local.details?.services),
      cta_label: this.local.details?.cta_label || '',
      cta_url: this.local.details?.cta_url || '',
      map_url: this.local.details?.map_url || '',
      promotion_text: this.local.details?.promotion_text || '',
      featured_products: this.convertArrayToString(this.local.details?.featured_products),
      business_tags: this.convertArrayToString(this.local.details?.business_tags),
      address: this.local.address || '',
      phone: this.local.phone || '',
      email: this.local.email || '',
      opening_hours: this.local?.opening_hours || ''
    };

    // Initialize media form with ROOT-LEVEL first, nested fallback second
    this.mediaForm = {
      instagram_url: this.resolvedInstagramUrl,
      facebook_url: this.resolvedFacebookUrl,
      tiktok_url: this.resolvedTiktokUrl,
      website_url: this.resolvedWebsiteUrl
    };
  }

  /* ============================================================
     SECTION MANAGEMENT
  ============================================================ */

  setActiveSection(section: typeof this.activeSection): void {
    this.activeSection = section;
    this.clearMessages();
  }

  /* ============================================================
     FORM OPERATIONS
  ============================================================ */

  saveDetalles(): void {
    if (!this.detallesForm.headline?.trim()) {
      this.errorMessage = 'El título es obligatorio.';
      return;
    }

    this.saving = true;
    this.clearMessages();

    // Split payload: details fields go to details endpoint, core fields go to core endpoint
    const detailsPayload = {
      headline: this.detallesForm.headline,
      subheadline: this.detallesForm.subheadline,
      description: this.detallesForm.description,
      highlights: this.enforceMaxHighlights(this.convertStringToArray(this.detallesForm.highlights)),
      services: this.convertStringToArray(this.detallesForm.services),
      featured_products: this.convertStringToArray(this.detallesForm.featured_products),
      business_tags: this.convertStringToArray(this.detallesForm.business_tags),
      cta_label: this.detallesForm.cta_label,
      cta_url: this.detallesForm.cta_url,
      map_url: this.detallesForm.map_url,
      promotion_text: this.detallesForm.promotion_text
    };

    const corePayload = {
      address: this.detallesForm.address,
      phone: this.detallesForm.phone,
      email: this.detallesForm.email,
      opening_hours: this.detallesForm.opening_hours
    };

    // Save details first
    this.localService.updateMyLocalDetails(detailsPayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Then save core fields (including opening_hours)
          this.localService.updateMyLocal(corePayload)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.showSuccess('Detalles actualizados correctamente');
                this.reloadCanonicalData();
                this.saving = false;
                this.cdr.detectChanges();
              },
              error: (error) => {
                this.errorMessage = 'Error guardando información de contacto: ' + error;
                this.saving = false;
                this.cdr.detectChanges();
              }
            });
        },
        error: (error) => {
          this.errorMessage = error;
          this.saving = false;
          this.cdr.detectChanges();
        }
      });
  }

  saveMultimedia(): void {
    this.saving = true;
    this.clearMessages();

    // Save social links only
    const mediaPayload = {
      instagram_url: this.resolvedInstagramUrl,
      facebook_url: this.resolvedFacebookUrl,
      tiktok_url: this.resolvedTiktokUrl,
      website_url: this.resolvedWebsiteUrl
    };

    this.localService.updateMyLocalMedia(mediaPayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Multimedia actualizada correctamente');
          this.reloadCanonicalData();
          this.saving = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error;
          this.saving = false;
          this.cdr.detectChanges();
        }
      });
  }

  /* ============================================================
     CANONICAL RELOAD
  ============================================================ */

  private reloadCanonicalData(): void {
    // First reload core local data
    this.localService.getMyLocal()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (local) => {
          this.local = local;

          // Then ensure we have fresh details data
          if (!local.details) {
            this.localService.getMyLocalDetails()
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (details) => {
                  if (this.local) {
                    this.local.details = details;
                    this.initializeForms();
                    this.cdr.detectChanges();
                  }
                },
                error: (error) => {
                  console.error('Error reloading details after canonical reload:', error);
                  // Still initialize forms with whatever we have
                  if (this.local) {
                    this.initializeForms();
                    this.cdr.detectChanges();
                  }
                }
              });
          } else {
            // Details already included, initialize forms immediately
            this.initializeForms();
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error reloading canonical data:', error);
        }
      });
  }

  /* ============================================================
     RESOLVED DATA HELPERS
  ============================================================ */

  get resolvedOpeningHours(): string {
    const value = this.local?.opening_hours || '';
    return typeof value === 'string' ? value.trim() : '';
  }

  get resolvedInstagramUrl(): string {
    const value =
      this.local?.instagram_url ??
      this.local?.media?.instagram_url ??
      '';
    return typeof value === 'string' ? value.trim() : '';
  }

  get resolvedFacebookUrl(): string {
    const value =
      this.local?.facebook_url ??
      this.local?.media?.facebook_url ??
      '';
    return typeof value === 'string' ? value.trim() : '';
  }

  get resolvedTiktokUrl(): string {
    const value =
      this.local?.tiktok_url ??
      this.local?.media?.tiktok_url ??
      '';
    return typeof value === 'string' ? value.trim() : '';
  }

  get resolvedWebsiteUrl(): string {
    const value =
      this.local?.website_url ??
      this.local?.media?.website_url ??
      '';
    return typeof value === 'string' ? value.trim() : '';
  }


  /* ============================================================
     HELPERS
  ============================================================ */

  private convertArrayToString(arr: string[] | undefined): string {
    if (!arr || !Array.isArray(arr)) return '';
    return arr.filter(item => item && item.trim()).join(', ');
  }

  private convertStringToArray(str: string | undefined): string[] {
    if (!str || typeof str !== 'string') return [];
    return str.split(',').map(item => item.trim()).filter(item => item);
  }

  private enforceMaxHighlights(arr: string[]): string[] {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 3);
  }

  validateHighlights(): void {
    const highlights = this.convertStringToArray(this.detallesForm.highlights);
    if (highlights.length > 3) {
      this.detallesForm.highlights = highlights.slice(0, 3).join(', ');
    }
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  // Check if multimedia section has any meaningful content (social links + gallery)
  get hasMultimediaContent(): boolean {
    const hasSocialLinks = !!(
      this.resolvedInstagramUrl ||
      this.resolvedFacebookUrl ||
      this.resolvedTiktokUrl ||
      this.resolvedWebsiteUrl
    );

    return hasSocialLinks;
  }

  // Get multimedia status for Resumen display
  get multimediaStatus(): string {
    return this.hasMultimediaContent ? 'Activo' : 'No configurado';
  }


  goBack(): void {
    this.router.navigate(['/perfil/me']);
  }
}