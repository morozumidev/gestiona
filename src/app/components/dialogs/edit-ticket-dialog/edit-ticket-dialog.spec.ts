import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditTicketDialog } from './edit-ticket-dialog';

describe('EditTicketDialog', () => {
  let component: EditTicketDialog;
  let fixture: ComponentFixture<EditTicketDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditTicketDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditTicketDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
