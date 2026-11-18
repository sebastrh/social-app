import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActualizarPublicacion,
  CrearPublicacion,
  EditarParcialPublicacion,
  Publicacion,
} from '../modelos/publicacion.model';

@Injectable({
  providedIn: 'root',
})
export class PublicacionesService {
  private readonly http = inject(HttpClient);
  private readonly urlApi = 'https://jsonplaceholder.typicode.com/posts';

  obtenerPublicaciones(): Observable<Publicacion[]> {
    return this.http.get<Publicacion[]>(this.urlApi);
  }

  crearPublicacion(datos: CrearPublicacion): Observable<Publicacion> {
    return this.http.post<Publicacion>(this.urlApi, datos);
  }

  actualizarPublicacion(id: number, datos: ActualizarPublicacion): Observable<Publicacion> {
    return this.http.put<Publicacion>(`${this.urlApi}/${id}`, datos);
  }

  modificarParcialPublicacion(id: number, datos: EditarParcialPublicacion): Observable<Publicacion> {
    return this.http.patch<Publicacion>(`${this.urlApi}/${id}`, datos);
  }

  eliminarPublicacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlApi}/${id}`);
  }
}
