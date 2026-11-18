import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AutenticacionService } from '../../servicios/autenticacion.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly autenticacion = inject(AutenticacionService);
  private readonly router = inject(Router);

  protected readonly formularioLogin = this.fb.nonNullable.group({
    usuario: ['', [Validators.required]],
    contrasena: ['', [Validators.required]],
  });

  protected readonly enviando = signal(false);
  protected readonly mensajeError = signal<string | null>(null);
  protected readonly mostrarContrasena = signal(false);

  protected alternarContrasena(): void {
    this.mostrarContrasena.update((visible) => !visible);
  }

  protected enviarFormulario(): void {
    if (this.formularioLogin.invalid) {
      this.formularioLogin.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.mensajeError.set(null);

    const { usuario, contrasena } = this.formularioLogin.getRawValue();

    this.autenticacion.iniciarSesion(usuario, contrasena).subscribe({
      next: () => {
        this.enviando.set(false);
        this.router.navigate(['/posts']);
      },
      error: (error: Error) => {
        this.enviando.set(false);
        this.mensajeError.set(error.message || 'Error al iniciar sesión.');
      },
    });
  }

  protected campoInvalido(campo: 'usuario' | 'contrasena'): boolean {
    const control = this.formularioLogin.controls[campo];
    return control.invalid && (control.dirty || control.touched);
  }
}
