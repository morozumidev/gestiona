import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GalleryDialog } from './gallery-dialog';

describe('GalleryDialog', () => {
  let component: GalleryDialog;
  let fixture: ComponentFixture<GalleryDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GalleryDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GalleryDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
