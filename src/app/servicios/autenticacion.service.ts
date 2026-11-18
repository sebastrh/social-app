import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, throwError } from 'rxjs';
import { SesionUsuario, UsuarioApi } from '../modelos/usuario.model';

const CLAVE_TOKEN = 'desem_token';
const CLAVE_SESION = 'desem_sesion';
const URL_USUARIOS = 'https://fakestoreapi.com/users';

@Injectable({
  providedIn: 'root',
})
export class AutenticacionService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly estadoSesion = signal<SesionUsuario | null>(this.leerSesionGuardada());

  readonly sesionActual = this.estadoSesion.asReadonly();
  readonly estaLogueado = computed(() => Boolean(this.estadoSesion()?.token));

  iniciarSesion(usuario: string, contrasena: string): Observable<SesionUsuario> {
    const nombreLimpio = usuario.trim();
    const claveLimpia = contrasena.trim();

    return this.http.get<UsuarioApi[]>(URL_USUARIOS).pipe(
      map((usuarios) => {
        const encontrado = usuarios.find(
          (u) => u.username === nombreLimpio && u.password === claveLimpia,
        );

        if (!encontrado) {
          throw new Error('Usuario o contraseña incorrectos.');
        }

        const sesion: SesionUsuario = {
          token: this.generarToken(encontrado),
          usuarioId: encontrado.id,
          nombreUsuario: encontrado.username,
          nombreCompleto: this.armarNombreCompleto(encontrado),
          correo: encontrado.email,
          fechaIngreso: new Date().toISOString(),
        };

        this.guardarSesion(sesion);
        this.estadoSesion.set(sesion);
        return sesion;
      }),
      catchError((error) => {
        if (error instanceof Error && error.message.includes('Usuario o contraseña')) {
          return throwError(() => error);
        }
        return throwError(() => new Error('No se pudo conectar con el servidor. Intenta nuevamente.'));
      }),
    );
  }

  estaAutenticado(): boolean {
    const token = this.obtenerToken();
    const sesion = this.leerSesionGuardada();

    if (!token || !sesion) {
      if (this.estadoSesion() !== null) {
        this.estadoSesion.set(null);
      }
      return false;
    }

    if (this.estadoSesion()?.token !== token) {
      this.estadoSesion.set(sesion);
    }
    return true;
  }

  obtenerToken(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(CLAVE_TOKEN);
  }

  cerrarSesion(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CLAVE_TOKEN);
      localStorage.removeItem(CLAVE_SESION);
    }
    this.estadoSesion.set(null);
    this.router.navigate(['/login']);
  }

  private guardarSesion(sesion: SesionUsuario): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(CLAVE_TOKEN, sesion.token);
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  }

  private leerSesionGuardada(): SesionUsuario | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const token = localStorage.getItem(CLAVE_TOKEN);
    const textoSesion = localStorage.getItem(CLAVE_SESION);

    if (!token || !textoSesion) {
      return null;
    }

    try {
      const sesion = JSON.parse(textoSesion) as SesionUsuario;
      if (sesion && sesion.token === token && sesion.nombreUsuario) {
        return sesion;
      }
      return null;
    } catch {
      return null;
    }
  }

  private generarToken(usuario: UsuarioApi): string {
    const encabezado = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const datos = btoa(
      JSON.stringify({
        sub: usuario.id,
        usuario: usuario.username,
        correo: usuario.email,
        iat: Math.floor(Date.now() / 1000),
      }),
    );
    const firma = btoa(`desem-${usuario.id}-${Date.now()}`).replace(/=+$/, '');
    return `${encabezado}.${datos}.${firma}`;
  }

  private armarNombreCompleto(usuario: UsuarioApi): string {
    const capitalizar = (texto: string) =>
      texto ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase() : '';
    return `${capitalizar(usuario.name.firstname)} ${capitalizar(usuario.name.lastname)}`.trim();
  }
}
