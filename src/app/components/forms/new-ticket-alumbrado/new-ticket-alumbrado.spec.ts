import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewTicketAlumbrado } from './new-ticket-alumbrado';

describe('NewTicketAlumbrado', () => {
  let component: NewTicketAlumbrado;
  let fixture: ComponentFixture<NewTicketAlumbrado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewTicketAlumbrado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewTicketAlumbrado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
