import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { createCustomElement } from '@angular/elements';
import { VideoCallComponent } from '@acme/video-angular';

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    const injector = appRef.injector;
    const element = createCustomElement(VideoCallComponent, { injector });
    if (!customElements.get('acme-video-call')) {
      customElements.define('acme-video-call', element);
    }
  })
  .catch((err) => console.error(err));
