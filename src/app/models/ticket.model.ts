export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'Abierto' | 'En Proceso' | 'Cerrado';
  priority: 'Alta' | 'Media' | 'Baja';
  createdAt: Date;
  area:string;
  cuadrilla:string;
}
