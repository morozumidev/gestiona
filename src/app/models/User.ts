import { Area } from "./Area";
import { Role } from "./Role";

export interface User {
  _id?: string;
  name: string;
  first_lastname: string;
  second_lastname: string;
  email: string;
  phone: string;
  password?: string; // opcional porque no se debe exponer
  role?: Role | string | null; // Puede ser ID o modelo expandido
  area?: Area | string | null; // Puede ser ID o modelo expandido
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}
