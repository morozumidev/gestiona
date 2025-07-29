import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RejectionDetailsDialog } from './rejection-details-dialog';

describe('RejectionDetailsDialog', () => {
  let component: RejectionDetailsDialog;
  let fixture: ComponentFixture<RejectionDetailsDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RejectionDetailsDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RejectionDetailsDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
