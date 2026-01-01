import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss']
})
export class ContactComponent {

  nombre = '';
  email = '';
  mensaje = '';

  enviado = false;
  loading = false;
  error = '';

  constructor(private http: HttpClient) {}

  onSubmit() {
    if (!this.nombre || !this.email || !this.mensaje) {
      this.error = 'Por favor completá todos los campos.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.http.post(
      'https://donfrancisco-backend.fly.dev/contacto',
      {
        nombre: this.nombre,
        email: this.email,
        mensaje: this.mensaje
      }
    ).subscribe({
      next: () => {
        this.enviado = true;
        this.loading = false;

        // limpiar form
        this.nombre = '';
        this.email = '';
        this.mensaje = '';

        // ocultar mensaje de éxito después de un rato
        setTimeout(() => {
          this.enviado = false;
        }, 3000);
      },
      error: () => {
        this.loading = false;
        this.error = 'Error al enviar el mensaje. Intentá nuevamente.';
      }
    });
  }
}
