import { Component, Inject, PLATFORM_ID, ElementRef, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements AfterViewInit {

  currentYear = new Date().getFullYear();
  isBrowser = false;

  constructor(@Inject(PLATFORM_ID) private platformId: any) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return; // ⛔ evita errores SSR

    this.startSparkEffect();
  }

  /* ============================================================
      EFECTO CHISPAS PREMIUM (JS)
  ============================================================ */
  startSparkEffect() {
    const container = document.querySelector('.footer-sparks');
    if (!container) return;

    const count = 14;

    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      spark.classList.add('spark');

      spark.style.left = `${Math.random() * 100}%`;
      spark.style.top = `${Math.random() * 100}%`;
      spark.style.width = `${3 + Math.random() * 3}px`;
      spark.style.height = spark.style.width;

      container.appendChild(spark);

      // Animación segura para SSR:
      const animate = () => {
        spark.style.transform = `translateY(${Math.random() * 30 - 15}px) scale(${0.5 + Math.random()})`;
        setTimeout(() => {
          if (this.isBrowser) requestAnimationFrame(animate);
        }, 1500 + Math.random() * 1500);
      };

      requestAnimationFrame(animate);
    }
  }
}
