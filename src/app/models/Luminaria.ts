import { Status } from './Status';
import { Maintenance } from './Maintenance';



export interface Luminaria {
  _id?: string;
  code: string;
  type: string;            // Ej: LED, Halógena
  power: number;           // Watts
  voltage: number;         // Volts
  poleHeight: number;      // Metros
  location: {
    lat: number;
    lng: number;
  };
  statusId: Status | string;
  installationDate: Date;
  maintenances: Maintenance[];
  createdAt?: Date;
  updatedAt?: Date;
}
