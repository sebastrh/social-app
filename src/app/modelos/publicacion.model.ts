export interface Publicacion {
  id: number;
  userId: number;
  title: string;
  body: string;
  esLocal?: boolean;
}

export interface CrearPublicacion {
  title: string;
  body: string;
  userId: number;
}

export interface ActualizarPublicacion {
  id: number;
  title: string;
  body: string;
  userId: number;
}

export interface EditarParcialPublicacion {
  title?: string;
  body?: string;
}
