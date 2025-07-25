import { Area } from './Area';

export type TemaPriority = 'alta' | 'media' | 'baja';

export interface Tema {
  _id?: string;
  name: string;
  description?: string;
  areaId?: string | Area;           // Puede ser solo ID o un objeto poblado
  requiresLuminaria: boolean;
  priority: TemaPriority;

}
