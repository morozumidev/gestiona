export interface TicketTracking {
  event: string; // type: 'ticket_event'
  description: string;
  files: string[];
  date?: Date;
  user: {
    _id: string;
    name: string;
    role: string; // type: 'role'
  };
}
