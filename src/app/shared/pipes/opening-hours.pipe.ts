import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'openingHours',
  standalone: true
})
export class OpeningHoursPipe implements PipeTransform {
  transform(value: any): string {
    if (!value) return '';
    
    // If it's already a string, clean it and return as-is
    if (typeof value === 'string') {
      // Remove any [object Object] artifacts
      if (value.includes('[object Object]')) {
        return '';
      }
      // Trim whitespace and return
      return value.trim();
    }
    
    // If it's an object, format it properly
    if (typeof value === 'object' && value !== null) {
      // Handle different opening hours formats
      if (value.monday && value.tuesday && value.wednesday && value.thursday && value.friday && value.saturday && value.sunday) {
        return `${value.monday} - ${value.tuesday} - ${value.wednesday} - ${value.thursday} - ${value.friday} - ${value.saturday} - ${value.sunday}`;
      }
      
      // Handle single day format
      if (value.monday && value.tuesday && value.wednesday && value.thursday && value.friday && !value.saturday && !value.sunday) {
        return `${value.monday} - ${value.tuesday} - ${value.wednesday} - ${value.thursday} - ${value.friday}`;
      }
      
      // Handle hours only format
      if (value.monday && value.tuesday && value.wednesday && !value.thursday && !value.friday && !value.saturday && !value.sunday) {
        return `${value.monday} - ${value.tuesday} - ${value.wednesday}`;
      }
      
      // Handle custom format
      if (value.formatted) {
        return value.formatted;
      }
      
      // Handle array format
      if (Array.isArray(value)) {
        return value.filter(day => day && day.trim()).join(' - ');
      }
    }
    
    return '';
  }
}
