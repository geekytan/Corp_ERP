"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/components/providers/SessionProvider";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import { PayrollRunDto } from "@/lib/types";
import { formatDate, formatINR, monthName, MONTH_NAMES } from "@/lib/format";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingBlock } from "@/components/common/LoadingBlock";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Play, Trash2, Eye } from "lucide-react";

export default function PayrollPage() {
  const { user } = useSession();
  const router = useRouter();
  const canAccess = user.role === "ADMIN" || user.role === "HR";
  const isAdmin = user.role === "ADMIN";

  const today = new Date();
  const prevMonthNum = today.getMonth() === 0 ? 12 : today.getMonth();
  const prevMonthYear =
    today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();

  const [genMonth, setGenMonth] = useState(prevMonthNum.toString());
  const [genYear, setGenYear] = useState(prevMonthYear.toString());
  const [generating, setGenerating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PayrollRunDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    data: runs,
    loading,
    error,
    reload,
  } = useApi<PayrollRunDto[]>(canAccess ? "/api/payroll/runs" : null);

  if (!canAccess) {
    return (
      <div className="p-8 text-center text-slate-500">
        You do not have access to this page
      </div>
    );
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const created = await api.post<PayrollRunDto>("/api/payroll/runs", {
        month: Number(genMonth),
        year: Number(genYear),
      });
      toast.success("Payroll generated successfully");
      router.push(`/payroll/${created.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to generate payroll");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/api/payroll/runs/${deleteTarget.id}`);
      toast.success("Payroll run deleted successfully");
      setDeleteTarget(null);
      reload();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to delete payroll run");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        subtitle="Generate monthly payroll runs and manage payslips"
      />

      {/* Generator Card */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">
            Generate Payroll
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form
            onSubmit={handleGenerate}
            className="flex flex-col sm:flex-row items-end gap-4"
          >
            <div className="space-y-1.5 w-full sm:w-44">
              <label className="text-xs font-medium text-slate-600">Month</label>
              <Select value={genMonth} onValueChange={(val) => val && setGenMonth(val)} disabled={generating}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, idx) => (
                    <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-full sm:w-36">
              <label className="text-xs font-medium text-slate-600">Year</label>
              <Select value={genYear} onValueChange={(val) => val && setGenYear(val)} disabled={generating}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={(today.getFullYear() - 1).toString()}>
                    {today.getFullYear() - 1}
                  </SelectItem>
                  <SelectItem value={today.getFullYear().toString()}>
                    {today.getFullYear()}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={generating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 w-full sm:w-auto"
            >
              <Play className="size-4" />
              <span>{generating ? "Generating..." : "Generate Payroll"}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Runs Table */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          Payroll History
        </h2>

        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-600">
            {error}
          </div>
        ) : !runs || runs.length === 0 ? (
          <EmptyState message="No payroll runs yet" />
        ) : (
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700">Period</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Employees</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Total Net Pay</TableHead>
                    <TableHead className="font-semibold text-slate-700">Generated By</TableHead>
                    <TableHead className="font-semibold text-slate-700">Generated On</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold text-slate-900">
                        {monthName(r.month)} {r.year}
                      </TableCell>
                      <TableCell className="text-center text-slate-600">
                        {r.payslipCount}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-900">
                        {formatINR(r.totalNetPay)}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {r.createdByName}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatDate(r.createdAt.slice(0, 10))}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Link
                          href={`/payroll/${r.id}`}
                          title="View Run"
                          className={buttonVariants({
                            variant: "ghost",
                            size: "icon-sm",
                            className: "text-slate-600 hover:text-indigo-600",
                          })}
                        >
                          <Eye className="size-4" />
                        </Link>

                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-slate-500 hover:text-red-600"
                            onClick={() => setDeleteTarget(r)}
                            title="Delete Run"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Payroll Run"
        description="This deletes all payslips of this run so payroll can be generated again."
        confirmLabel="Delete Run"
        pending={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
