import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChildren,
  QueryList
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CSSPlugin } from 'gsap/CSSPlugin';

gsap.registerPlugin(ScrollTrigger, CSSPlugin);

interface Horario {
  hora: string;
  disponible: boolean;
}

@Component({
  selector: 'app-conference-hall',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conference-hall.html',
  styleUrls: ['./conference-hall.scss']
})
export class ConferenceHallComponent implements OnInit, AfterViewInit {
  
  @ViewChildren('anim') animElements!: QueryList<ElementRef>;

  // Fecha seleccionada
  fechaSeleccionada: string = new Date().toISOString().split('T')[0];

  // Horarios del día (puede venir del backend)
  horarios: Horario[] = [
    { hora: '09:00', disponible: true },
    { hora: '10:00', disponible: true },
    { hora: '11:00', disponible: false },
    { hora: '12:00', disponible: true },
    { hora: '13:00', disponible: true },
    { hora: '14:00', disponible: true },
    { hora: '15:00', disponible: false },
    { hora: '16:00', disponible: true },
    { hora: '17:00', disponible: true },
    { hora: '18:00', disponible: true }
  ];

  constructor() {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    setTimeout(() => this.initAnimations(), 120);
  }

  // ============================================================
  // GSAP – ENTRADAS DE ELEMENTOS
  // ============================================================
  private initAnimations() {
    this.animElements.forEach((el: ElementRef, index: number) => {
      gsap.from(el.nativeElement, {
        opacity: 0,
        y: 40,
        duration: 0.9,
        delay: index * 0.08,
        ease: 'power3.out'
      });
    });
  }

  // ============================================================
  // CAMBIAR DÍA
  // ============================================================
  cambiarFecha(event: any) {
    this.fechaSeleccionada = event.target.value;
    // 🔥 Aquí luego llamás al backend:
    // this.api.getHorarios(this.fechaSeleccionada).subscribe(...)
  }

  // ============================================================
  // RESERVAR
  // ============================================================
  reservar(hora: Horario) {
    if (!hora.disponible) return;

    console.log('Reserva solicitada:', {
      fecha: this.fechaSeleccionada,
      hora: hora.hora
    });

    // Aquí llamás al backend:
    // this.api.reservarSala({ fecha, hora }).subscribe(...)
  }
}
