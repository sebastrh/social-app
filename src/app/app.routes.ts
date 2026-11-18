import { Routes } from '@angular/router';
import { Login } from './componentes/login/login';
import { Publicaciones } from './componentes/publicaciones/publicaciones';
import { autenticacionGuard, invitadoGuard } from './guardianes/autenticacion.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    canActivate: [invitadoGuard],
    title: 'Iniciar sesión',
  },
  {
    path: 'posts',
    component: Publicaciones,
    canActivate: [autenticacionGuard],
    title: 'Publicaciones',
  },
  {
    path: '',
    redirectTo: 'posts',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'posts',
  },
];
