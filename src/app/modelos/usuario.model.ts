export interface NombreUsuarioApi {
  firstname: string;
  lastname: string;
}

export interface UsuarioApi {
  id: number;
  email: string;
  username: string;
  password: string;
  name: NombreUsuarioApi;
  phone?: string;
}

export interface SesionUsuario {
  token: string;
  usuarioId: number;
  nombreUsuario: string;
  nombreCompleto: string;
  correo: string;
  fechaIngreso: string;
}
