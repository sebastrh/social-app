import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Publicacion } from '../../modelos/publicacion.model';
import { AutenticacionService } from '../../servicios/autenticacion.service';
import { PublicacionesService } from '../../servicios/publicaciones.service';

interface Aviso {
  tipo: 'exito' | 'error' | 'info';
  texto: string;
}

@Component({
  selector: 'app-publicaciones',
  imports: [ReactiveFormsModule],
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.css',
})
export class Publicaciones implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly autenticacion = inject(AutenticacionService);
  private readonly servicioPublicaciones = inject(PublicacionesService);

  protected readonly sesionActual = this.autenticacion.sesionActual;

  protected readonly publicaciones = signal<Publicacion[]>([]);
  protected readonly cargandoMuro = signal(false);
  protected readonly errorMuro = signal<string | null>(null);
  protected readonly creando = signal(false);
  protected readonly actualizando = signal(false);
  protected readonly eliminando = signal(false);

  protected readonly busqueda = signal('');
  protected readonly cantidadVisible = signal(15);

  protected readonly publicacionEnEdicion = signal<Publicacion | null>(null);
  protected readonly publicacionAEliminar = signal<Publicacion | null>(null);
  protected readonly aviso = signal<Aviso | null>(null);

  private temporizadorAviso: ReturnType<typeof setTimeout> | null = null;

  protected readonly formularioCrear = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    contenido: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
  });

  protected readonly formularioEditar = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    contenido: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
  });

  protected readonly publicacionesFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) {
      return this.publicaciones();
    }

    return this.publicaciones().filter(
      (pub) =>
        pub.title.toLowerCase().includes(texto) || pub.body.toLowerCase().includes(texto),
    );
  });

  protected readonly publicacionesVisibles = computed(() =>
    this.publicacionesFiltradas().slice(0, this.cantidadVisible()),
  );

  protected readonly hayMasPublicaciones = computed(
    () => this.publicacionesFiltradas().length > this.cantidadVisible(),
  );

  ngOnInit(): void {
    this.cargarPublicaciones();
  }

  protected cargarPublicaciones(): void {
    this.cargandoMuro.set(true);
    this.errorMuro.set(null);

    this.servicioPublicaciones.obtenerPublicaciones().subscribe({
      next: (lista) => {
        this.publicaciones.set(lista);
        this.cargandoMuro.set(false);
      },
      error: () => {
        this.cargandoMuro.set(false);
        this.errorMuro.set('No se pudieron cargar las publicaciones. Intenta nuevamente.');
      },
    });
  }

  protected crearPublicacion(): void {
    if (this.formularioCrear.invalid) {
      this.formularioCrear.markAllAsTouched();
      return;
    }

    const usuarioId = this.sesionActual()?.usuarioId ?? 1;
    const { titulo, contenido } = this.formularioCrear.getRawValue();

    this.creando.set(true);

    this.servicioPublicaciones
      .crearPublicacion({
        title: titulo.trim(),
        body: contenido.trim(),
        userId: usuarioId,
      })
      .subscribe({
        next: (creada) => {
          const idsActuales = this.publicaciones().map((p) => p.id);
          const idMaximo = idsActuales.length ? Math.max(...idsActuales) : 100;
          const idUnico = creada.id && !idsActuales.includes(creada.id) ? creada.id : idMaximo + 1;

          const nueva: Publicacion = {
            id: idUnico,
            userId: usuarioId,
            title: creada.title || titulo.trim(),
            body: creada.body || contenido.trim(),
            esLocal: true,
          };

          this.publicaciones.update((lista) => [nueva, ...lista]);
          this.formularioCrear.reset({ titulo: '', contenido: '' });
          this.creando.set(false);
          this.mostrarAviso('exito', 'Publicación creada correctamente.');
        },
        error: () => {
          this.creando.set(false);
          this.mostrarAviso('error', 'No se pudo crear la publicación.');
        },
      });
  }

  protected abrirModalEditar(publicacion: Publicacion): void {
    this.publicacionEnEdicion.set(publicacion);
    this.formularioEditar.setValue({
      titulo: publicacion.title,
      contenido: publicacion.body,
    });
    this.formularioEditar.markAsPristine();
  }

  protected cerrarModalEditar(): void {
    if (this.actualizando()) {
      return;
    }
    this.publicacionEnEdicion.set(null);
  }

  protected guardarCambios(): void {
    const objetivo = this.publicacionEnEdicion();
    if (!objetivo) {
      return;
    }
    if (this.formularioEditar.invalid) {
      this.formularioEditar.markAllAsTouched();
      return;
    }

    const nuevoTitulo = this.formularioEditar.controls.titulo.value.trim();
    const nuevoContenido = this.formularioEditar.controls.contenido.value.trim();

    const cambioTitulo = nuevoTitulo !== objetivo.title;
    const cambioContenido = nuevoContenido !== objetivo.body;

    if (!cambioTitulo && !cambioContenido) {
      this.cerrarModalEditar();
      this.mostrarAviso('info', 'No se realizaron cambios.');
      return;
    }

    this.actualizando.set(true);

    const usarPut = cambioTitulo && cambioContenido && !objetivo.esLocal && objetivo.id <= 100;

    if (usarPut) {
      this.servicioPublicaciones
        .actualizarPublicacion(objetivo.id, {
          id: objetivo.id,
          userId: objetivo.userId,
          title: nuevoTitulo,
          body: nuevoContenido,
        })
        .subscribe({
          next: () => {
            this.aplicarCambioLocal(objetivo.id, nuevoTitulo, nuevoContenido);
            this.actualizando.set(false);
            this.publicacionEnEdicion.set(null);
            this.mostrarAviso('exito', 'Publicación actualizada.');
          },
          error: () => {
            this.actualizando.set(false);
            this.mostrarAviso('error', 'No se pudo actualizar la publicación.');
          },
        });
    } else {
      const cambios: { title?: string; body?: string } = {};
      if (cambioTitulo) {
        cambios.title = nuevoTitulo;
      }
      if (cambioContenido) {
        cambios.body = nuevoContenido;
      }

      this.servicioPublicaciones.modificarParcialPublicacion(objetivo.id, cambios).subscribe({
        next: () => {
          this.aplicarCambioLocal(objetivo.id, nuevoTitulo, nuevoContenido);
          this.actualizando.set(false);
          this.publicacionEnEdicion.set(null);
          this.mostrarAviso('exito', 'Publicación actualizada.');
        },
        error: () => {
          this.actualizando.set(false);
          this.mostrarAviso('error', 'No se pudo actualizar la publicación.');
        },
      });
    }
  }

  protected abrirModalEliminar(publicacion: Publicacion): void {
    this.publicacionAEliminar.set(publicacion);
  }

  protected cerrarModalEliminar(): void {
    if (this.eliminando()) {
      return;
    }
    this.publicacionAEliminar.set(null);
  }

  protected confirmarEliminacion(): void {
    const objetivo = this.publicacionAEliminar();
    if (!objetivo) {
      return;
    }

    this.eliminando.set(true);

    this.servicioPublicaciones.eliminarPublicacion(objetivo.id).subscribe({
      next: () => {
        this.publicaciones.update((lista) => lista.filter((p) => p.id !== objetivo.id));
        this.eliminando.set(false);
        this.publicacionAEliminar.set(null);
        this.mostrarAviso('exito', 'Publicación eliminada.');
      },
      error: () => {
        this.eliminando.set(false);
        this.mostrarAviso('error', 'No se pudo eliminar la publicación.');
      },
    });
  }

  protected alBuscar(valor: string): void {
    this.busqueda.set(valor);
    this.cantidadVisible.set(15);
  }

  protected cargarMas(): void {
    this.cantidadVisible.update((cantidad) => cantidad + 15);
  }

  protected cerrarSesion(): void {
    this.autenticacion.cerrarSesion();
  }

  protected cerrarAviso(): void {
    this.aviso.set(null);
  }

  protected campoCrearInvalido(campo: 'titulo' | 'contenido'): boolean {
    const control = this.formularioCrear.controls[campo];
    return control.invalid && (control.dirty || control.touched);
  }

  protected campoEditarInvalido(campo: 'titulo' | 'contenido'): boolean {
    const control = this.formularioEditar.controls[campo];
    return control.invalid && (control.dirty || control.touched);
  }

  private aplicarCambioLocal(id: number, titulo: string, contenido: string): void {
    this.publicaciones.update((lista) =>
      lista.map((item) =>
        item.id === id
          ? {
              ...item,
              title: titulo,
              body: contenido,
            }
          : item,
      ),
    );
  }

  private mostrarAviso(tipo: Aviso['tipo'], texto: string): void {
    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
    }
    this.aviso.set({ tipo, texto });
    this.temporizadorAviso = setTimeout(() => {
      this.aviso.set(null);
    }, 4000);
  }
}
