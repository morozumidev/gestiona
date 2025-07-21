export interface Status {
  _id?: string;
  name: string;           // Ej: 'operativa', 'apagada'
  description?: string;
  color?: string;         // Ej: '#00ff00' para representación visual
  createdAt?: Date;
  updatedAt?: Date;
}
