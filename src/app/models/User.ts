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
  role?: string; // Puede ser ID o modelo expandido
  area?: string; // Puede ser ID o modelo expandido
  createdAt?: string;
  updatedAt?: string;
}