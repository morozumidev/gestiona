import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketAssignmentDialog } from './ticket-assignment-dialog';

describe('TicketAssignmentDialog', () => {
  let component: TicketAssignmentDialog;
  let fixture: ComponentFixture<TicketAssignmentDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketAssignmentDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketAssignmentDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
