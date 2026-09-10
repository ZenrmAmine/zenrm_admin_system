export const orderFilters = ["All", "Needs action", "Unfulfilled", "Unpaid", "Returns"] as const;

export type OrderFilter = (typeof orderFilters)[number];

export type OrderRow = {
  id: string;
  name: string;
  amount: number;
  stageName: string;
  frequency: string;
  syncedWithSalesforce: boolean;
  donationSource: string;
  createdDate: string;
};
