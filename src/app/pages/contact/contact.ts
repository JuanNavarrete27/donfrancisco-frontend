import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss']
})
export class ContactComponent {

  nombre: string = '';
  email: string = '';
  mensaje: string = '';
  enviado = false;

  onSubmit() {
    if (!this.nombre || !this.email || !this.mensaje) {
      alert('Por favor completa todos los campos.');
      return;
    }

    this.enviado = true;

    // Simulación de envío real
    setTimeout(() => {
      alert('Mensaje enviado correctamente.');
      this.nombre = '';
      this.email = '';
      this.mensaje = '';
      this.enviado = false;
    }, 1000);
  }
}
