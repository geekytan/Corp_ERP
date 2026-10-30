"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";
import { useApi } from "@/hooks/useApi";
import { DepartmentDto, EmployeeListItem, Paginated } from "@/lib/types";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingBlock } from "@/components/common/LoadingBlock";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function EmployeesPage() {
  const { user } = useSession();
  const router = useRouter();
  const canAdd = user.role === "ADMIN" || user.role === "HR";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: departments } = useApi<DepartmentDto[]>("/api/departments");

  // Construct query URL
  const queryParams = new URLSearchParams();
  queryParams.set("page", page.toString());
  queryParams.set("pageSize", "10");
  if (debouncedSearch) queryParams.set("search", debouncedSearch);
  if (deptFilter !== "ALL") queryParams.set("departmentId", deptFilter);
  if (statusFilter !== "ALL") queryParams.set("status", statusFilter);

  const url = `/api/employees?${queryParams.toString()}`;
  const { data, loading, error, reload } = useApi<Paginated<EmployeeListItem>>(url);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={user.role === "MANAGER" ? "Your team" : "Manage company employees"}
        actions={
          canAdd && (
            <Link
              href="/employees/new"
              className={cn(
                buttonVariants(),
                "bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              )}
            >
              <Plus className="size-4" />
              <span>Add Employee</span>
            </Link>
          )
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input
            placeholder="Search by name, code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        <div className="flex gap-3">
          <Select
            value={deptFilter}
            onValueChange={(val) => {
              if (val) {
                setDeptFilter(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All departments</SelectItem>
              {departments?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(val) => {
              if (val) {
                setStatusFilter(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="w-32 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-600 flex items-center justify-between">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState message="No employees found" />
      ) : (
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700 w-24">Code</TableHead>
                  <TableHead className="font-semibold text-slate-700">Name</TableHead>
                  <TableHead className="font-semibold text-slate-700">Email</TableHead>
                  <TableHead className="font-semibold text-slate-700">Department</TableHead>
                  <TableHead className="font-semibold text-slate-700">Designation</TableHead>
                  <TableHead className="font-semibold text-slate-700">Manager</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => router.push(`/employees/${emp.id}`)}
                  >
                    <TableCell className="font-mono text-xs font-semibold text-indigo-600">
                      {emp.empCode}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {emp.name}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {emp.email}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {emp.departmentName}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {emp.designation}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {emp.managerName || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={emp.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
              <p>
                Showing {data.items.length} of {data.total} employees
              </p>
              <div className="flex items-center gap-2">
                <span>
                  Page {data.page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={data.page >= totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
