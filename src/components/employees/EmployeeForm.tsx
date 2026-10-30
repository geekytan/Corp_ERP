"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/providers/SessionProvider";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import {
  DepartmentDto,
  EmployeeDetail,
  Role,
} from "@/lib/types";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OptionItem {
  id: string;
  name: string;
  empCode: string;
}

interface EmployeeFormProps {
  mode: "create" | "edit";
  initial?: EmployeeDetail;
  onSaved: (e: EmployeeDetail) => void;
}

export function EmployeeForm({ mode, initial, onSaved }: EmployeeFormProps) {
  const { user: sessionUser } = useSession();

  const { data: departments } = useApi<DepartmentDto[]>("/api/departments");
  const { data: managerOptions } = useApi<OptionItem[]>("/api/employees/options");

  const [firstName, setFirstName] = useState(initial?.firstName || "");
  const [lastName, setLastName] = useState(initial?.lastName || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [designation, setDesignation] = useState(initial?.designation || "");
  const [departmentId, setDepartmentId] = useState(initial?.departmentId || "");
  const [managerId, setManagerId] = useState(initial?.managerId || "NONE");
  const [joinDate, setJoinDate] = useState(initial?.joinDate || "2025-01-06");
  const [role, setRole] = useState<Role>(initial?.role || "EMPLOYEE");

  // Salary fields (create mode only)
  const [basic, setBasic] = useState<number>(initial?.salary?.basic || 50000);
  const [hra, setHra] = useState<number>(initial?.salary?.hra || 20000);
  const [allowances, setAllowances] = useState<number>(initial?.salary?.allowances || 5000);
  const [pfPercent, setPfPercent] = useState<number>(initial?.salary?.pfPercent || 12);
  const [taxPercent, setTaxPercent] = useState<number>(initial?.salary?.taxPercent || 5);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  // Auto-compute HRA & allowances when basic changes in create mode
  const handleBasicChange = (val: number) => {
    setBasic(val);
    setHra(Math.round(val * 0.4));
    setAllowances(Math.round(val * 0.1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const actualManagerId = managerId === "NONE" || !managerId ? null : managerId;
    const actualPhone = phone.trim() === "" ? null : phone.trim();

    if (mode === "create") {
      const payload = {
        firstName,
        lastName,
        email,
        phone: actualPhone,
        designation,
        departmentId,
        managerId: actualManagerId,
        joinDate,
        role,
        basic: Number(basic),
        hra: Number(hra),
        allowances: Number(allowances),
        pfPercent: Number(pfPercent),
        taxPercent: Number(taxPercent),
      };

      const parsed = createEmployeeSchema.safeParse(payload);
      if (!parsed.success) {
        setFieldErrors(parsed.error.flatten().fieldErrors);
        return;
      }

      setSubmitting(true);
      try {
        const saved = await api.post<EmployeeDetail>("/api/employees", parsed.data);
        onSaved(saved);
      } catch (err: unknown) {
        if (err instanceof ApiClientError) {
          if (err.fieldErrors) setFieldErrors(err.fieldErrors);
          toast.error(err.message);
        } else {
          toast.error("Failed to create employee");
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      // edit mode
      const payload = {
        firstName,
        lastName,
        email,
        phone: actualPhone,
        designation,
        departmentId,
        managerId: actualManagerId,
        joinDate,
        role,
      };

      const parsed = updateEmployeeSchema.safeParse(payload);
      if (!parsed.success) {
        setFieldErrors(parsed.error.flatten().fieldErrors);
        return;
      }

      setSubmitting(true);
      try {
        const saved = await api.put<EmployeeDetail>(
          `/api/employees/${initial!.id}`,
          parsed.data
        );
        onSaved(saved);
      } catch (err: unknown) {
        if (err instanceof ApiClientError) {
          if (err.fieldErrors) setFieldErrors(err.fieldErrors);
          toast.error(err.message);
        } else {
          toast.error("Failed to update employee");
        }
      } finally {
        setSubmitting(false);
      }
    }
  };

  const isHr = sessionUser.role === "HR";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Section */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={submitting}
            />
            {fieldErrors.firstName && (
              <p className="text-xs text-red-600">{fieldErrors.firstName[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={submitting}
            />
            {fieldErrors.lastName && (
              <p className="text-xs text-red-600">{fieldErrors.lastName[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              disabled={submitting}
            />
            {fieldErrors.phone && (
              <p className="text-xs text-red-600">{fieldErrors.phone[0]}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job Section */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">
            Job Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="designation">Designation</Label>
            <Input
              id="designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              required
              disabled={submitting}
            />
            {fieldErrors.designation && (
              <p className="text-xs text-red-600">{fieldErrors.designation[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="department">Department</Label>
            <Select
              value={departmentId}
              onValueChange={(val) => val && setDepartmentId(val)}
              disabled={submitting}
            >
              <SelectTrigger id="department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.departmentId && (
              <p className="text-xs text-red-600">{fieldErrors.departmentId[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manager">Reporting Manager</Label>
            <Select
              value={managerId}
              onValueChange={(val) => val && setManagerId(val)}
              disabled={submitting}
            >
              <SelectTrigger id="manager">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No manager</SelectItem>
                {managerOptions
                  ?.filter((m) => mode === "create" || m.id !== initial?.id)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.empCode})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {fieldErrors.managerId && (
              <p className="text-xs text-red-600">{fieldErrors.managerId[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="joinDate">Join Date</Label>
            <Input
              id="joinDate"
              type="date"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
              required
              disabled={submitting}
            />
            {fieldErrors.joinDate && (
              <p className="text-xs text-red-600">{fieldErrors.joinDate[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">User Role</Label>
            <Select
              value={role}
              onValueChange={(val) => val && setRole(val as Role)}
              disabled={submitting}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {!isHr && <SelectItem value="ADMIN">ADMIN</SelectItem>}
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="MANAGER">MANAGER</SelectItem>
                <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
              </SelectContent>
            </Select>
            {fieldErrors.role && (
              <p className="text-xs text-red-600">{fieldErrors.role[0]}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Salary Section (Create mode only) */}
      {mode === "create" && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">
              Initial Salary Structure (Monthly INR)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="basic">Basic Salary</Label>
              <Input
                id="basic"
                type="number"
                min="1"
                value={basic}
                onChange={(e) => handleBasicChange(Number(e.target.value))}
                required
                disabled={submitting}
              />
              {fieldErrors.basic && (
                <p className="text-xs text-red-600">{fieldErrors.basic[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hra">HRA (40% default)</Label>
              <Input
                id="hra"
                type="number"
                min="0"
                value={hra}
                onChange={(e) => setHra(Number(e.target.value))}
                required
                disabled={submitting}
              />
              {fieldErrors.hra && (
                <p className="text-xs text-red-600">{fieldErrors.hra[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="allowances">Allowances (10% default)</Label>
              <Input
                id="allowances"
                type="number"
                min="0"
                value={allowances}
                onChange={(e) => setAllowances(Number(e.target.value))}
                required
                disabled={submitting}
              />
              {fieldErrors.allowances && (
                <p className="text-xs text-red-600">{fieldErrors.allowances[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pfPercent">PF Rate (%)</Label>
              <Input
                id="pfPercent"
                type="number"
                min="0"
                max="100"
                value={pfPercent}
                onChange={(e) => setPfPercent(Number(e.target.value))}
                required
                disabled={submitting}
              />
              {fieldErrors.pfPercent && (
                <p className="text-xs text-red-600">{fieldErrors.pfPercent[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="taxPercent">Tax Rate (%)</Label>
              <Input
                id="taxPercent"
                type="number"
                min="0"
                max="100"
                value={taxPercent}
                onChange={(e) => setTaxPercent(Number(e.target.value))}
                required
                disabled={submitting}
              />
              {fieldErrors.taxPercent && (
                <p className="text-xs text-red-600">{fieldErrors.taxPercent[0]}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-32"
        >
          {submitting
            ? "Saving..."
            : mode === "create"
            ? "Create Employee"
            : "Update Employee"}
        </Button>
      </div>
    </form>
  );
}
