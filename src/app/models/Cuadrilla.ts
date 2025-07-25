import { Turno } from "./Turno";
export interface Cuadrilla {
    _id?: string;
    name: string;
    supervisor: string;
    members: [string],
    available: boolean;
    shift: Turno;
    area:string;
}
