"use client";

import React, { use } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { PayslipDto } from "@/lib/types";
import { formatINR, monthName } from "@/lib/format";
import { LoadingBlock } from "@/components/common/LoadingBlock";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";

const COMPANY_NAME = "CorpERP Pvt. Ltd.";

export default function PayslipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: payslip, loading, error } = useApi<PayslipDto>(
    `/api/payslips/${id}`
  );

  if (loading) return <LoadingBlock />;
  if (error || !payslip) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-600 max-w-3xl mx-auto">
        <p>{error || "Payslip not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top action bar (hidden when printing) */}
      <div className="flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" />
          <span>Back</span>
        </Button>

        <Button
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
        >
          <Printer className="size-4" />
          <span>Print / Save as PDF</span>
        </Button>
      </div>

      {/* Payslip Document Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm print:shadow-none print:border-none print:p-0">
        {/* 1. Header */}
        <div className="border-b border-slate-200 pb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {COMPANY_NAME}
            </h1>
            <p className="text-sm font-medium text-indigo-600 mt-1">
              Payslip for {monthName(payslip.month)} {payslip.year}
            </p>
          </div>
          <div className="text-right">
            <StatusBadge status={payslip.status} />
            {payslip.paidAt && (
              <p className="text-xs text-slate-400 mt-1">
                Paid on {payslip.paidAt.slice(0, 10)}
              </p>
            )}
          </div>
        </div>

        {/* 2. Employee Details */}
        <div className="py-6 border-b border-slate-100 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-slate-400 block">Employee Name</span>
            <span className="font-semibold text-slate-800">
              {payslip.employeeName}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Employee Code</span>
            <span className="font-mono font-semibold text-slate-800">
              {payslip.empCode}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Department</span>
            <span className="font-medium text-slate-700">
              {payslip.departmentName}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Designation</span>
            <span className="font-medium text-slate-700">
              {payslip.designation}
            </span>
          </div>
        </div>

        {/* 3. Attendance Summary */}
        <div className="py-5 border-b border-slate-100">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Attendance Summary
          </h2>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50">
              <span className="text-slate-400 block">Working Days</span>
              <span className="text-base font-bold text-slate-800 mt-0.5 block">
                {payslip.totalWeekdays}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50">
              <span className="text-slate-400 block">Counted</span>
              <span className="text-base font-bold text-slate-800 mt-0.5 block">
                {payslip.countedDays}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800">
              <span className="text-emerald-600 block">Present Eq.</span>
              <span className="text-base font-bold mt-0.5 block">
                {payslip.presentDays}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-800">
              <span className="text-indigo-600 block">Paid Leave</span>
              <span className="text-base font-bold mt-0.5 block">
                {payslip.paidLeaveDays}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800">
              <span className="text-rose-600 block">Loss of Pay</span>
              <span className="text-base font-bold mt-0.5 block">
                {payslip.lopDays}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Earnings and Deductions Table */}
        <div className="py-6 border-b border-slate-200">
          <div className="grid grid-cols-2 gap-8 text-sm">
            {/* Earnings Column */}
            <div>
              <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-3">
                Earnings
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Basic Salary</span>
                  <span className="font-medium text-slate-900">
                    {formatINR(payslip.basic)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">House Rent Allowance (HRA)</span>
                  <span className="font-medium text-slate-900">
                    {formatINR(payslip.hra)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Special Allowances</span>
                  <span className="font-medium text-slate-900">
                    {formatINR(payslip.allowances)}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between font-semibold">
                  <span className="text-slate-900">Gross Earnings</span>
                  <span className="text-slate-900">
                    {formatINR(payslip.grossEarnings)}
                  </span>
                </div>
              </div>
            </div>

            {/* Deductions Column */}
            <div>
              <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-3">
                Deductions
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Provident Fund (PF)</span>
                  <span className="font-medium text-slate-900">
                    {formatINR(payslip.pfDeduction)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Income Tax (TDS)</span>
                  <span className="font-medium text-slate-900">
                    {formatINR(payslip.taxDeduction)}
                  </span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Loss of Pay (LOP)</span>
                  <span className="font-medium">
                    {formatINR(payslip.lopDeduction)}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between font-semibold">
                  <span className="text-slate-900">Total Deductions</span>
                  <span className="text-rose-600">
                    {formatINR(payslip.totalDeductions)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Net Pay Bar */}
        <div className="pt-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-indigo-700">
                Net Take-Home Pay
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Gross Earnings minus Total Deductions
              </p>
            </div>
            <div className="text-3xl font-extrabold text-indigo-700">
              {formatINR(payslip.netPay)}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          This is a system-generated payslip from CorpERP. No physical signature is required.
        </p>
      </div>
    </div>
  );
}
