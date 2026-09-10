import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { OrderRow } from "./schema";

function formatOrderDate(date: string) {
  return format(parseISO(date), "h:mm a, d MMM yyyy");
}

function PaymentBadge({ status }: { status: OrderRow["stageName"] }) {
  const normalized = status.toLowerCase();

  if (normalized.includes("closed") || normalized.includes("won") || normalized.includes("paid")) {
    return (
      <Badge
        className="border-green-700/25 text-green-700 dark:border-green-300/25 dark:text-green-300"
        variant="outline"
      >
        <span className="size-1.5 rounded-full bg-current" />
        {status}
      </Badge>
    );
  }

  if (normalized.includes("declined") || normalized.includes("refunded") || normalized.includes("failed")) {
    return (
      <Badge variant="destructive">
        <span className="size-1.5 rounded-full bg-current" />
        {status}
      </Badge>
    );
  }

  return (
    <Badge
      className="border-yellow-700/25 text-yellow-700 dark:border-yellow-300/25 dark:text-yellow-300"
      variant="outline"
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status || "Pending"}
    </Badge>
  );
}

function _FulfillmentBadge({ status }: { status: OrderRow["syncedWithSalesforce"] }) {
  if (status === true) {
    return (
      <Badge
        className="border-green-700/25 text-green-700 dark:border-green-300/25 dark:text-green-300"
        variant="outline"
      >
        <span className="size-1.5 rounded-full bg-current" />
        Synced
      </Badge>
    );
  }

  return (
    <Badge variant="destructive">
      <span className="size-1.5 rounded-full bg-current" />
      Not synced
    </Badge>
  );
}

export const recentOrdersColumns: ColumnDef<OrderRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="w-10">
        <Checkbox
          aria-label="Select all orders"
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="w-10">
        <Checkbox
          aria-label={`Select order ${row.original.id}`}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <div className="font-medium leading-none">{row.original.id}</div>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "frequency",
    header: "Frequency",
  },
  {
    accessorKey: "donationSource",
    header: "Source",
  },
  {
    accessorKey: "syncedWithSalesforce",
    header: "Synced",
  },
  {
    id: "statusSummary",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <PaymentBadge status={row.original.stageName} />
      </div>
    ),
    filterFn: (row, _columnId, value) => {
      const stageName = row.original.stageName.toLowerCase();

      if (value === "Needs action") {
        return (
          stageName.includes("pending") ||
          stageName.includes("declined") ||
          stageName.includes("review") ||
          stageName.includes("incomplete") ||
          row.original.donationSource.toLowerCase().includes("fund")
        );
      }

      if (value === "Unpaid") {
        return stageName.includes("pending") || stageName.includes("open") || stageName.includes("unpaid");
      }

      if (value === "Returns") {
        return stageName.includes("declined") || stageName.includes("refunded") || stageName.includes("return");
      }

      return true;
    },
  },
  {
    accessorKey: "total",
    header: () => <div className="w-28">Amount</div>,
    cell: ({ row }) => <div className="w-28 tabular-nums">{row.original.amount}</div>,
  },
  {
    accessorKey: "date",
    header: () => <div className="w-44">Date</div>,
    cell: ({ row }) => <div className="w-44 text-muted-foreground">{formatOrderDate(row.original.createdDate)}</div>,
  },
  {
    id: "actions",
    header: () => <div className="flex w-full justify-end">Actions</div>,
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex w-full justify-end">
            <Button aria-label="Open order actions" size="icon-sm" variant="ghost">
              <MoreHorizontal />
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>View order</DropdownMenuItem>
            <DropdownMenuItem>Contact customer</DropdownMenuItem>
            <DropdownMenuItem>Copy order ID</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableHiding: false,
    enableSorting: false,
  },
];
