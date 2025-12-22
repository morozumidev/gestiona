import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UsersList } from './users-list';
import { UserService } from '../../../services/user-service';
import { TicketsService } from '../../../services/tickets-service';
import { Router } from '@angular/router';

describe('UsersList', () => {
  let component: UsersList;
  let fixture: ComponentFixture<UsersList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersList],
      providers: [
        {
          provide: UserService,
          useValue: {
            search: () => of({ page: 1, pageSize: 10, total: 0, items: [] }),
            getOverview: () => of({ total: 0, active: 0, inactive: 0, recent: { last7: 0, last30: 0 }, byRole: [], byArea: [] }),
            update: () => of({}),
            remove: () => of({}),
          },
        },
        {
          provide: TicketsService,
          useValue: {
            getAreas: () => of([]),
            getRoles: () => of([]),
          },
        },
        {
          provide: Router,
          useValue: { navigate: () => {} },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
