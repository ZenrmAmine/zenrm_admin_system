"use client";
"use no memo";

import * as React from "react";

import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { Cog, Download, Grid, Plus, RefreshCw, Rows3, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { extractRecords, filters, mapBackendUserToUserRow, type UserRow } from "./data";
import { usersColumns } from "./users-columns";
import { UsersTable } from "./users-table";

export function Users({ users: initialUsers, clientId = "CLT-QJM2RL" }: { users: UserRow[]; clientId?: string }) {
  const [usersList, setUsersList] = React.useState<UserRow[]>(initialUsers);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [addForm, setAddForm] = React.useState({
    client_id: clientId,
    full_name: "",
    email: "",
    password: "",
    role: "admin",
    status: "active",
  });

  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "joinedDate", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    search: false,
    team: false,
  });
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const loadUsersFromDb = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/zenrm?operation=listUsers&clientId=${encodeURIComponent(clientId)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      console.log("[ZenRM Users API] Received users data:", data);

      if (!response.ok) {
        const errorMsg =
          typeof data === "object" && data && "error" in data
            ? String((data as { error?: string }).error)
            : `Failed to fetch users (HTTP ${response.status})`;
        toast.error(errorMsg);
        return;
      }

      const records = extractRecords(data);
      if (records.length > 0) {
        const mapped = records.map((record, index) => mapBackendUserToUserRow(record, index));
        setUsersList(mapped);
        toast.success(`Loaded ${mapped.length} users from database.`);
      } else {
        toast.info("No users found in database for this client.");
      }
    } catch (err) {
      console.error("[ZenRM Users API] Fetch error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to load users from database.");
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  React.useEffect(() => {
    void loadUsersFromDb();
  }, [loadUsersFromDb]);

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email.trim() || !addForm.password || !addForm.full_name.trim()) {
      toast.error("Please fill in all required fields (Name, Email, Password).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        client_id: addForm.client_id.trim() || clientId,
        email: addForm.email.trim(),
        password: addForm.password,
        full_name: addForm.full_name.trim(),
        role: addForm.role,
        status: addForm.status,
      };

      console.log("[ZenRM Users API] Creating user with payload:", payload);

      const response = await fetch("/api/zenrm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "createUser",
          payload,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        const errorMsg =
          typeof result === "object" && result && "error" in result
            ? String((result as { error?: string }).error)
            : `Failed to create user (HTTP ${response.status})`;
        toast.error(errorMsg);
        return;
      }

      toast.success("User created successfully!");
      setIsAddUserOpen(false);
      setAddForm({
        client_id: clientId,
        full_name: "",
        email: "",
        password: "",
        role: "admin",
        status: "active",
      });

      // Reload users from DB
      await loadUsersFromDb();
    } catch (error) {
      console.error("[ZenRM Users API] Create user error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const table = useReactTable({
    data: usersList,
    columns: usersColumns,
    state: {
      rowSelection,
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
    getRowId: (row) => row.email,
    autoResetPageIndex: false,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const searchQuery = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const roleFilter = (table.getColumn("role")?.getFilterValue() as string | undefined) ?? filters.role[0];
  const teamFilter = (table.getColumn("team")?.getFilterValue() as string | undefined) ?? filters.team[0];
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? filters.status[0];
  const workspaceFilter =
    (table.getColumn("workspace")?.getFilterValue() as string | undefined) ?? filters.workspace[0];
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  function setColumnSelectFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">Users</CardTitle>
          <CardDescription className="max-w-sm leading-snug">
            Manage your organization members and their access.
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(event) => {
                  table.getColumn("search")?.setFilterValue(event.target.value || undefined);
                  table.setPageIndex(0);
                }}
              />
              <InputGroupAddon align="inline-end">
                <Kbd className="h-4 text-[10px]">⌘K</Kbd>
              </InputGroupAddon>
            </InputGroup>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadUsersFromDb()}
              disabled={isLoading}
              title="Reload users from database"
            >
              <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
            <Button variant="outline" size="sm">
              <SlidersHorizontal /> Hide
            </Button>
            <Button variant="outline" size="sm">
              <Cog /> Customize
            </Button>
            <Button variant="outline" size="sm">
              <Download /> Export
            </Button>
            <Button size="sm" onClick={() => setIsAddUserOpen(true)}>
              <Plus /> Add User
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={roleFilter} onValueChange={(value) => setColumnSelectFilter("role", value)}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Role:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {filters.role.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={teamFilter} onValueChange={(value) => setColumnSelectFilter("team", value)}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Team:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {filters.team.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value) => setColumnSelectFilter("status", value)}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Status:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {filters.status.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <Select value={workspaceFilter} onValueChange={(value) => setColumnSelectFilter("workspace", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Workspace:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                <SelectGroup>
                  {filters.workspace.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 px-4">
            <div className="text-muted-foreground text-sm tabular-nums">{selectedCount} selected</div>

            <Tabs defaultValue="list">
              <TabsList>
                <TabsTrigger value="list" aria-label="List view">
                  <Rows3 />
                </TabsTrigger>
                <TabsTrigger value="grid" aria-label="Grid view">
                  <Grid />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <UsersTable table={table} />
        </CardContent>
      </Card>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddUserSubmit}>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user under client <span className="font-mono font-semibold">{clientId}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="add-user-name">Full Name *</Label>
                <Input
                  id="add-user-name"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm((cur) => ({ ...cur, full_name: e.target.value }))}
                  placeholder="e.g. Amine Kammoun"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="add-user-email">Email Address *</Label>
                <Input
                  id="add-user-email"
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((cur) => ({ ...cur, email: e.target.value }))}
                  placeholder="e.g. user@zrm.co"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="add-user-password">Password *</Label>
                <Input
                  id="add-user-password"
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm((cur) => ({ ...cur, password: e.target.value }))}
                  placeholder="Enter temporary password"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="add-user-role">Role</Label>
                  <Select value={addForm.role} onValueChange={(val) => setAddForm((cur) => ({ ...cur, role: val }))}>
                    <SelectTrigger id="add-user-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                      <SelectItem value="contributor">Contributor</SelectItem>
                      <SelectItem value="team lead">Team Lead</SelectItem>
                      <SelectItem value="security admin">Security Admin</SelectItem>
                      <SelectItem value="billing admin">Billing Admin</SelectItem>
                      <SelectItem value="workspace owner">Workspace Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="add-user-status">Status</Label>
                  <Select
                    value={addForm.status}
                    onValueChange={(val) => setAddForm((cur) => ({ ...cur, status: val }))}
                  >
                    <SelectTrigger id="add-user-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="deactivated">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="add-user-client-id">Client ID</Label>
                <Input
                  id="add-user-client-id"
                  value={addForm.client_id}
                  onChange={(e) => setAddForm((cur) => ({ ...cur, client_id: e.target.value }))}
                  placeholder="CLT-QJM2RL"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
