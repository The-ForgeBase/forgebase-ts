import { Route } from '@angular/router';
import { NxWelcomeComponent } from './nx-welcome.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: NxWelcomeComponent,
    pathMatch: 'full',
  },
  {
    path: 'database',
    loadComponent: () =>
      import('./features/database/database.component').then(
        (m) => m.DatabaseComponent
      ),
    title: 'Database',
  },
];
