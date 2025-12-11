import { Component, HostBinding, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-locations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './locations.html',
  styleUrls: ['./locations.scss'],
})
export class Locations implements OnInit {

  @HostBinding('class.is-loaded') isLoaded = false;

  // Parallax
  mouseX = 0;
  mouseY = 0;

  // Modal fullscreen
  modalOpen = false;

  ngOnInit(): void {
    setTimeout(() => (this.isLoaded = true), 80);
  }

  // Parallax suave desktop
  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    this.mouseX = (e.clientX - window.innerWidth / 2) * 0.01;
    this.mouseY = (e.clientY - window.innerHeight / 2) * 0.01;
  }

  // Abrir modal fullscreen
  abrirModal() {
    this.modalOpen = true;
  }

  // Cerrar modal fullscreen
  cerrarModal() {
    this.modalOpen = false;
  }
}
