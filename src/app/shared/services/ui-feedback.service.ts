import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UiFeedbackType = 'success' | 'error';

@Injectable({
  providedIn: 'root'
})
export class UiFeedbackService {

  private visibleSubject = new BehaviorSubject<boolean>(false);
  private messageSubject = new BehaviorSubject<string>('');
  private typeSubject = new BehaviorSubject<UiFeedbackType>('success');

  visible$ = this.visibleSubject.asObservable();
  message$ = this.messageSubject.asObservable();
  type$ = this.typeSubject.asObservable();

  private hideTimer: any;

  show(
    message: string,
    type: UiFeedbackType = 'success',
    duration = 800   // ⏱ duración visible
  ): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);

    this.messageSubject.next(message);
    this.typeSubject.next(type);
    this.visibleSubject.next(true);

    this.hideTimer = setTimeout(() => {
      this.hide();
    }, duration);
  }

  hide(): void {
    this.visibleSubject.next(false);
  }
}
