import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'studio-root',
  imports: [RouterOutlet],
  template: ` <router-outlet></router-outlet> `,
})
export class AppComponent {}
