import { Creator } from "./Creator";
import { Ticket } from "./Ticket";

export interface TicketDto extends Ticket {
  createdByPreview?: Creator | null;
}