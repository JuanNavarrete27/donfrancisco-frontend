import { Directive, ElementRef, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { gsap } from 'gsap';

@Directive({
  selector: '[appParticleEffect]',
  standalone: true
})
export class ParticleEffectDirective implements AfterViewInit, OnDestroy {
  @Input() particleCount = 15;
  @Input() particleSize = 2;
  @Input() particleColor = 'rgba(212, 175, 55, 0.3)';
  
  private particles: HTMLElement[] = [];
  private animationTimeline?: gsap.core.Timeline;
  private resizeObserver?: ResizeObserver;

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {
    this.createParticles();
    this.animateParticles();
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private createParticles(): void {
    const container = this.el.nativeElement;
    
    for (let i = 0; i < this.particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.cssText = `
        position: absolute;
        width: ${this.particleSize}px;
        height: ${this.particleSize}px;
        background: ${this.particleColor};
        border-radius: 50%;
        pointer-events: none;
        opacity: 0;
        z-index: 1;
      `;
      
      container.appendChild(particle);
      this.particles.push(particle);
    }
  }

  private animateParticles(): void {
    const container = this.el.nativeElement;
    const containerRect = container.getBoundingClientRect();
    
    this.animationTimeline = gsap.timeline({ repeat: -1 });
    
    this.particles.forEach((particle, index) => {
      // Random starting position
      const startX = Math.random() * containerRect.width;
      const startY = Math.random() * containerRect.height;
      
      // Random movement path
      const endX = startX + (Math.random() - 0.5) * 200;
      const endY = startY + (Math.random() - 0.5) * 200;
      
      // Set initial position
      gsap.set(particle, { x: startX, y: startY });
      
      // Create animation for this particle
      const particleTimeline = gsap.timeline({ repeat: -1 });
      
      // Fade in
      particleTimeline.to(particle, {
        opacity: 1,
        duration: 1,
        ease: 'power2.inOut'
      });
      
      // Move along path
      particleTimeline.to(particle, {
        x: endX,
        y: endY,
        duration: 8 + Math.random() * 4,
        ease: 'none'
      }, '-=0.5');
      
      // Fade out
      particleTimeline.to(particle, {
        opacity: 0,
        duration: 1,
        ease: 'power2.inOut'
      }, '-=1');
      
      // Reset position
      particleTimeline.set(particle, {
        x: Math.random() * containerRect.width,
        y: Math.random() * containerRect.height
      });
      
      // Stagger particle animations
      particleTimeline.delay(index * 0.3);
    });
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.repositionParticles();
    });
    
    this.resizeObserver.observe(this.el.nativeElement);
  }

  private repositionParticles(): void {
    const container = this.el.nativeElement;
    const containerRect = container.getBoundingClientRect();
    
    this.particles.forEach(particle => {
      gsap.set(particle, {
        x: Math.random() * containerRect.width,
        y: Math.random() * containerRect.height
      });
    });
  }

  private cleanup(): void {
    if (this.animationTimeline) {
      this.animationTimeline.kill();
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    this.particles.forEach(particle => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    });
    
    this.particles = [];
  }
}
