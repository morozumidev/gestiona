import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuccessDialog } from './success-dialog';

describe('SuccessDialog', () => {
  let component: SuccessDialog;
  let fixture: ComponentFixture<SuccessDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuccessDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuccessDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
