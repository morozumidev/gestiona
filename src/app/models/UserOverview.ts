export interface UsersOverviewItem {
  _id?: string | null;
  name?: string;
  count: number;
}

export interface UsersOverview {
  total: number;
  active: number;
  inactive: number;
  recent: {
    last7: number;
    last30: number;
  };
  byRole: UsersOverviewItem[];
  byArea: UsersOverviewItem[];
}
