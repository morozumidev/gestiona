import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Luminarias } from './luminarias';

describe('Luminarias', () => {
  let component: Luminarias;
  let fixture: ComponentFixture<Luminarias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Luminarias]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Luminarias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
