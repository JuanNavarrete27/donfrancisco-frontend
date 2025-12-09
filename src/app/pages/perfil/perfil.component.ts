import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit, OnDestroy {

  email: string = '';
  password: string = '';

  private sparkInterval: any;

  ngOnInit() {
    this.startConstellationEffect();
  }

  ngOnDestroy() {
    clearInterval(this.sparkInterval);
  }

  onSubmit() {
    console.log('Login attempt with:', { email: this.email, password: '***' });
    // implementar login real luego
  }

  /* ==========================================================
     EFECTO CONSTELACIONES - Premium Café
  ========================================================== */
  private startConstellationEffect() {
    const container = document.querySelector('.perfil-background');
    if (!container) return;

    this.sparkInterval = setInterval(() => {
      const spark = document.createElement('div');
      spark.classList.add('spark');

      const size = Math.random() * 4 + 2;
      spark.style.width = size + 'px';
      spark.style.height = size + 'px';

      spark.style.left = Math.random() * 100 + '%';
      spark.style.top = Math.random() * 100 + '%';

      container.appendChild(spark);

      setTimeout(() => {
        spark.remove();
      }, 3000);
    }, 250);
  }
}
