import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

type ErrorType = '403' | '404';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './error.page.html',
  styleUrls: ['./error.page.scss'],
})
export class ErrorPageComponent implements OnInit {

  errorType: ErrorType = '404';

  title = '';
  message = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { error?: ErrorType };

    this.errorType = state?.error === '403' ? '403' : '404';

    if (this.errorType === '403') {
      this.title = 'Acceso restringido';
      this.message = 'Esta sección es solo para administradores.';
    } else {
      this.title = 'Esta página no existe';
      this.message = 'La página que intentás visitar no está disponible.';
    }
  }

  volverInicio(): void {
    this.router.navigateByUrl('/inicio');
  }
}
