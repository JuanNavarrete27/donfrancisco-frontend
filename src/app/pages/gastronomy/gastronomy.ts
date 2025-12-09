import { Component, OnInit, Renderer2, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gastronomy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gastronomy.html',
  styleUrls: ['./gastronomy.scss']
})
export class GastronomyComponent implements OnInit {

  constructor(private renderer: Renderer2, private el: ElementRef) {}

  ngOnInit() {
    // Agregamos la clase una vez que el componente está renderizado
    setTimeout(() => {
      this.renderer.addClass(this.el.nativeElement, 'is-loaded');
    }, 50);
  }
}
