import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { AutenticacionService } from './servicios/autenticacion.service';
import { PublicacionesService } from './servicios/publicaciones.service';

describe('Aplicación Desem Social', () => {
  let httpMock: HttpTestingController;
  let autenticacion: AutenticacionService;
  let publicaciones: PublicacionesService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    autenticacion = TestBed.inject(AutenticacionService);
    publicaciones = TestBed.inject(PublicacionesService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('crea el componente principal', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('redirige de /posts a /login cuando no hay sesión', async () => {
    await router.navigate(['/posts']);
    expect(router.url).toBe('/login');
  });

  it('inicia sesión, guarda token en localStorage y permite acceder a /posts', async () => {
    let nombreUsuario = '';

    autenticacion.iniciarSesion('johnd', 'm38rmF$').subscribe((sesion) => {
      nombreUsuario = sesion.nombreUsuario;
    });

    const peticion = httpMock.expectOne('https://fakestoreapi.com/users');
    expect(peticion.request.method).toBe('GET');
    peticion.flush([
      {
        id: 1,
        email: 'john@gmail.com',
        username: 'johnd',
        password: 'm38rmF$',
        name: { firstname: 'john', lastname: 'doe' },
      },
    ]);

    expect(nombreUsuario).toBe('johnd');
    expect(autenticacion.estaAutenticado()).toBe(true);
    expect(localStorage.getItem('desem_token')).toBeTruthy();

    await router.navigate(['/posts']);
    expect(router.url).toBe('/posts');
  });

  it('rechaza credenciales incorrectas sin guardar sesión', () => {
    let mensajeError = '';

    autenticacion.iniciarSesion('johnd', 'clave_mala').subscribe({
      error: (err: Error) => {
        mensajeError = err.message;
      },
    });

    const peticion = httpMock.expectOne('https://fakestoreapi.com/users');
    peticion.flush([
      {
        id: 1,
        email: 'john@gmail.com',
        username: 'johnd',
        password: 'm38rmF$',
        name: { firstname: 'john', lastname: 'doe' },
      },
    ]);

    expect(mensajeError).toContain('Usuario o contraseña incorrectos');
    expect(autenticacion.estaAutenticado()).toBe(false);
    expect(localStorage.getItem('desem_token')).toBeNull();
  });

  it('ejecuta GET, POST, PUT, PATCH y DELETE en JSONPlaceholder', () => {
    publicaciones.obtenerPublicaciones().subscribe((lista) => {
      expect(lista.length).toBe(1);
    });
    const reqGet = httpMock.expectOne('https://jsonplaceholder.typicode.com/posts');
    expect(reqGet.request.method).toBe('GET');
    reqGet.flush([{ id: 1, userId: 1, title: 'Hola', body: 'Mundo' }]);

    publicaciones.crearPublicacion({ userId: 1, title: 'Nuevo', body: 'Contenido' }).subscribe((pub) => {
      expect(pub.id).toBe(101);
    });
    const reqPost = httpMock.expectOne('https://jsonplaceholder.typicode.com/posts');
    expect(reqPost.request.method).toBe('POST');
    reqPost.flush({ id: 101, userId: 1, title: 'Nuevo', body: 'Contenido' });

    publicaciones
      .actualizarPublicacion(1, { id: 1, userId: 1, title: 'Editado', body: 'Cuerpo editado' })
      .subscribe((pub) => {
        expect(pub.title).toBe('Editado');
      });
    const reqPut = httpMock.expectOne('https://jsonplaceholder.typicode.com/posts/1');
    expect(reqPut.request.method).toBe('PUT');
    reqPut.flush({ id: 1, userId: 1, title: 'Editado', body: 'Cuerpo editado' });

    publicaciones.modificarParcialPublicacion(1, { title: 'Parcial' }).subscribe((pub) => {
      expect(pub.title).toBe('Parcial');
    });
    const reqPatch = httpMock.expectOne('https://jsonplaceholder.typicode.com/posts/1');
    expect(reqPatch.request.method).toBe('PATCH');
    reqPatch.flush({ id: 1, userId: 1, title: 'Parcial', body: 'Cuerpo editado' });

    publicaciones.eliminarPublicacion(1).subscribe();
    const reqDelete = httpMock.expectOne('https://jsonplaceholder.typicode.com/posts/1');
    expect(reqDelete.request.method).toBe('DELETE');
    reqDelete.flush({});
  });
});
