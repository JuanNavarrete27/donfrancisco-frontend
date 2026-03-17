import { Directive, ElementRef, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { gsap } from 'gsap';

@Directive({
  selector: '[appGsapEntrance]',
  standalone: true
})
export class GsapEntranceDirective implements AfterViewInit, OnDestroy {
  @Input() entranceDelay = 0;
  @Input() entranceDuration = 0.8;
  @Input() entranceFrom = 'bottom';
  @Input() entranceDistance = 50;
  @Input() entranceOpacity = 0;
  
  private animation?: gsap.core.Tween;

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {
    this.setupEntranceAnimation();
  }

  ngOnDestroy(): void {
    if (this.animation) {
      this.animation.kill();
    }
  }

  private setupEntranceAnimation(): void {
    const element = this.el.nativeElement;
    
    // Set initial state
    const fromVars = this.getFromVars();
    gsap.set(element, fromVars);
    
    // Create entrance animation
    this.animation = gsap.to(element, {
      ...this.getToVars(),
      duration: this.entranceDuration,
      delay: this.entranceDelay,
      ease: 'power3.out',
      onComplete: () => {
        // Clean up transforms after animation
        gsap.set(element, { clearProps: 'transform,opacity' });
      }
    });
  }

  private getFromVars(): gsap.TweenVars {
    const vars: gsap.TweenVars = {
      opacity: this.entranceOpacity
    };

    switch (this.entranceFrom) {
      case 'bottom':
        vars.y = this.entranceDistance;
        break;
      case 'top':
        vars.y = -this.entranceDistance;
        break;
      case 'left':
        vars.x = -this.entranceDistance;
        break;
      case 'right':
        vars.x = this.entranceDistance;
        break;
      case 'scale':
        vars.scale = 0.8;
        break;
      case 'fade':
        // Only opacity is set
        break;
    }

    return vars;
  }

  private getToVars(): gsap.TweenVars {
    const vars: gsap.TweenVars = {
      opacity: 1
    };

    switch (this.entranceFrom) {
      case 'bottom':
      case 'top':
        vars.y = 0;
        break;
      case 'left':
      case 'right':
        vars.x = 0;
        break;
      case 'scale':
        vars.scale = 1;
        break;
      case 'fade':
        // Only opacity is animated
        break;
    }

    return vars;
  }
}
