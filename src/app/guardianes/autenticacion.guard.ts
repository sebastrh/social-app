import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacionService } from '../servicios/autenticacion.service';

export const autenticacionGuard: CanActivateFn = () => {
  const autenticacion = inject(AutenticacionService);
  const router = inject(Router);

  if (autenticacion.estaAutenticado()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const invitadoGuard: CanActivateFn = () => {
  const autenticacion = inject(AutenticacionService);
  const router = inject(Router);

  if (autenticacion.estaAutenticado()) {
    return router.createUrlTree(['/posts']);
  }

  return true;
};
