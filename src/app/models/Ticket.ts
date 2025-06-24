export interface Ticket {
  _id?: string;
  folio: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  service: string;
  area: string;
  problem: string;
  description: string;
  status: 'Pendiente' | 'En desarrollo' | 'Atendida';
  location: {
    street: string;
    crossStreets: string;
    extNumber: string;
    neighborhood: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  images: string[];
  tracking: {
    event: string;
    description: string;
    files: string[];
    date: Date;
  }[];
  createdBy?: string; // puede ser un ID de usuario
  createdAt?: Date;
  updatedAt?: Date;
}
