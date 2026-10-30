"use client";

import React, { use, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/providers/SessionProvider";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import {
  AttendanceRecordDto,
  EmployeeDetail,
  SalaryDto,
} from "@/lib/types";
import { formatDate, formatINR, formatMinutes, formatTime } from "@/lib/format";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingBlock } from "@/components/common/LoadingBlock";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, UserX, UserCheck } from "lucide-react";

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user: sessionUser } = useSession();

  const { data: employee, loading, error, reload } = useApi<EmployeeDetail>(
    `/api/employees/${id}`
  );

  const [isEditing, setIsEditing] = useState(false);

  // Salary editing states
  const [basic, setBasic] = useState<number>(0);
  const [hra, setHra] = useState<number>(0);
  const [allowances, setAllowances] = useState<number>(0);
  const [pfPercent, setPfPercent] = useState<number>(12);
  const [taxPercent, setTaxPercent] = useState<number>(5);
  const [salarySaving, setSalarySaving] = useState(false);
  const [salaryInitialized, setSalaryInitialized] = useState(false);

  if (employee?.salary && !salaryInitialized) {
    setBasic(employee.salary.basic);
    setHra(employee.salary.hra);
    setAllowances(employee.salary.allowances);
    setPfPercent(employee.salary.pfPercent);
    setTaxPercent(employee.salary.taxPercent);
    setSalaryInitialized(true);
  }

  // Status toggle
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Attendance tab (current month)
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const { data: attendanceRecords } = useApi<AttendanceRecordDto[]>(
    `/api/attendance?month=${currentMonth}&year=${currentYear}&employeeId=${id}`
  );

  const canManage = sessionUser.role === "ADMIN" || sessionUser.role === "HR";
  const isSelf = sessionUser.employeeId === id;

  if (loading) return <LoadingBlock />;
  if (error || !employee) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-600">
        <p>{error || "Employee not found"}</p>
      </div>
    );
  }

  const handleSalarySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalarySaving(true);
    try {
      await api.put(`/api/employees/${id}/salary`, {
        basic: Number(basic),
        hra: Number(hra),
        allowances: Number(allowances),
        pfPercent: Number(pfPercent),
        taxPercent: Number(taxPercent),
      });
      toast.success("Salary updated successfully");
      reload();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to update salary");
      }
    } finally {
      setSalarySaving(false);
    }
  };

  const handleToggleStatus = async () => {
    setStatusUpdating(true);
    const newStatus = employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.patch(`/api/employees/${id}/status`, { status: newStatus });
      toast.success(
        `Employee ${newStatus === "ACTIVE" ? "activated" : "deactivated"} successfully`
      );
      setStatusDialogOpen(false);
      reload();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to update employee status");
      }
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {employee.name}
            </h1>
            <span className="font-mono text-sm px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
              {employee.empCode}
            </span>
            <StatusBadge status={employee.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {employee.designation} • {employee.departmentName}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            {!isSelf && (
              <Button
                variant={employee.status === "ACTIVE" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setStatusDialogOpen(true)}
                className="gap-1.5"
              >
                {employee.status === "ACTIVE" ? (
                  <>
                    <UserX className="size-4" />
                    <span>Deactivate</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="size-4" />
                    <span>Activate</span>
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-1.5"
            >
              <Pencil className="size-4" />
              <span>{isEditing ? "Cancel Edit" : "Edit Profile"}</span>
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <EmployeeForm
          mode="edit"
          initial={employee}
          onSaved={() => {
            toast.success("Employee updated successfully");
            setIsEditing(false);
            reload();
          }}
        />
      ) : (
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="bg-slate-200">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {employee.salary !== null && (
              <TabsTrigger value="salary">Salary</TabsTrigger>
            )}
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-xs font-medium text-slate-400">Full Name</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {employee.firstName} {employee.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Email Address</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {employee.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Phone</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {employee.phone || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Department</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {employee.departmentName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Designation</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {employee.designation}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Reporting Manager</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {employee.managerName || "None"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Date Joined</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {formatDate(employee.joinDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Role</p>
                  <div className="mt-1">
                    <StatusBadge status={employee.role} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salary Tab */}
          {employee.salary !== null && (
            <TabsContent value="salary">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Monthly Salary Structure
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  {canManage ? (
                    <form onSubmit={handleSalarySave} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="sal-basic">Basic Salary (₹)</Label>
                          <Input
                            id="sal-basic"
                            type="number"
                            min="1"
                            value={basic}
                            onChange={(e) => setBasic(Number(e.target.value))}
                            required
                            disabled={salarySaving}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="sal-hra">HRA (₹)</Label>
                          <Input
                            id="sal-hra"
                            type="number"
                            min="0"
                            value={hra}
                            onChange={(e) => setHra(Number(e.target.value))}
                            required
                            disabled={salarySaving}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="sal-allowances">Allowances (₹)</Label>
                          <Input
                            id="sal-allowances"
                            type="number"
                            min="0"
                            value={allowances}
                            onChange={(e) => setAllowances(Number(e.target.value))}
                            required
                            disabled={salarySaving}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="sal-pf">PF Rate (%)</Label>
                          <Input
                            id="sal-pf"
                            type="number"
                            min="0"
                            max="100"
                            value={pfPercent}
                            onChange={(e) => setPfPercent(Number(e.target.value))}
                            required
                            disabled={salarySaving}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="sal-tax">Tax Rate (%)</Label>
                          <Input
                            id="sal-tax"
                            type="number"
                            min="0"
                            max="100"
                            value={taxPercent}
                            onChange={(e) => setTaxPercent(Number(e.target.value))}
                            required
                            disabled={salarySaving}
                          />
                        </div>
                      </div>
                      <div className="pt-2">
                        <Button
                          type="submit"
                          disabled={salarySaving}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          {salarySaving ? "Saving..." : "Save Salary"}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                      <div>
                        <p className="text-xs text-slate-400">Basic Salary</p>
                        <p className="text-lg font-bold text-slate-900 mt-0.5">
                          {formatINR(employee.salary.basic)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">HRA</p>
                        <p className="text-lg font-bold text-slate-900 mt-0.5">
                          {formatINR(employee.salary.hra)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Allowances</p>
                        <p className="text-lg font-bold text-slate-900 mt-0.5">
                          {formatINR(employee.salary.allowances)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">PF Rate</p>
                        <p className="text-lg font-bold text-slate-900 mt-0.5">
                          {employee.salary.pfPercent}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Tax Rate</p>
                        <p className="text-lg font-bold text-slate-900 mt-0.5">
                          {employee.salary.taxPercent}%
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">
                  This Month's Attendance Records
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!attendanceRecords || attendanceRecords.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No attendance records for this month
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold text-slate-700">Date</TableHead>
                        <TableHead className="font-semibold text-slate-700">Check In</TableHead>
                        <TableHead className="font-semibold text-slate-700">Check Out</TableHead>
                        <TableHead className="font-semibold text-slate-700">Worked</TableHead>
                        <TableHead className="font-semibold text-slate-700">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-slate-900">
                            {formatDate(r.date)}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {formatTime(r.checkIn)}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {r.checkOut ? formatTime(r.checkOut) : "—"}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {formatMinutes(r.workedMinutes)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={r.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Confirm Status Change */}
      <ConfirmDialog
        open={statusDialogOpen}
        title={`${employee.status === "ACTIVE" ? "Deactivate" : "Activate"} Employee`}
        description={`Are you sure you want to ${
          employee.status === "ACTIVE" ? "deactivate" : "activate"
        } ${employee.name}? ${
          employee.status === "ACTIVE"
            ? "They will no longer be able to log in or submit attendance."
            : "Their system account will be restored."
        }`}
        confirmLabel={employee.status === "ACTIVE" ? "Deactivate" : "Activate"}
        pending={statusUpdating}
        onCancel={() => setStatusDialogOpen(false)}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}
