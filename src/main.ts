import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// LOCALE ESPAÑOL
import { LOCALE_ID, importProvidersFrom } from '@angular/core';
import localeEsUy from '@angular/common/locales/es-UY';
import { registerLocaleData } from '@angular/common';

// Registramos datos de idioma ES-UY
registerLocaleData(localeEsUy);

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    { provide: LOCALE_ID, useValue: 'es-UY' }
  ]
}).catch((err) => console.error(err));
