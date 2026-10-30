"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import {
  LeaveBalanceDto,
  LeaveRequestDto,
  LeaveTypeDto,
} from "@/lib/types";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingBlock } from "@/components/common/LoadingBlock";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { LeaveRequestsTable } from "@/components/leave/LeaveRequestsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

function computeClientWorkingDays(start: string, end: string): number {
  if (!start || !end || start > end) return 0;
  let count = 0;
  const curr = new Date(start + "T00:00:00.000Z");
  const stop = new Date(end + "T00:00:00.000Z");
  while (curr <= stop) {
    const day = curr.getUTCDay();
    if (day >= 1 && day <= 5) count++;
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return count;
}

export default function LeavePage() {
  const {
    data: balances,
    loading: balancesLoading,
    reload: reloadBalances,
  } = useApi<LeaveBalanceDto[]>("/api/leave-balances");

  const {
    data: requests,
    loading: requestsLoading,
    error: requestsError,
    reload: reloadRequests,
  } = useApi<LeaveRequestDto[]>("/api/leave-requests?scope=mine");

  const { data: leaveTypes } = useApi<LeaveTypeDto[]>("/api/leave-types");

  // Apply leave state
  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [applying, setApplying] = useState(false);

  // Cancel state
  const [cancelTarget, setCancelTarget] = useState<LeaveRequestDto | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const workingDays = computeClientWorkingDays(startDate, endDate);

  const openApply = () => {
    if (leaveTypes && leaveTypes.length > 0) {
      setLeaveTypeId(leaveTypes[0].id);
    }
    setStartDate("");
    setEndDate("");
    setReason("");
    setApplyOpen(true);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplying(true);
    try {
      await api.post("/api/leave-requests", {
        leaveTypeId,
        startDate,
        endDate,
        reason,
      });
      toast.success("Leave request submitted successfully");
      setApplyOpen(false);
      reloadBalances();
      reloadRequests();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to submit leave request");
      }
    } finally {
      setApplying(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.patch(`/api/leave-requests/${cancelTarget.id}/cancel`);
      toast.success("Leave request cancelled");
      setCancelTarget(null);
      reloadBalances();
      reloadRequests();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to cancel leave request");
      }
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle="View your leave balances and request time off"
        actions={
          <Button
            onClick={openApply}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
          >
            <Plus className="size-4" />
            <span>Apply for Leave</span>
          </Button>
        }
      />

      {/* Balances Grid */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Your Annual Leave Balances
        </h2>
        {balancesLoading ? (
          <LoadingBlock text="Loading balances..." />
        ) : !balances || balances.length === 0 ? (
          <p className="text-sm text-slate-500">No leave balances found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.map((b) => (
              <Card key={b.leaveTypeId} className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    {b.leaveTypeName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">
                    {b.isPaid ? b.remaining : "∞"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {b.isPaid ? `${b.remaining} / ${b.allocated} left` : "Unlimited (unpaid)"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Requests History */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          Your Leave Requests
        </h2>
        {requestsLoading ? (
          <LoadingBlock />
        ) : requestsError ? (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-600">
            {requestsError}
          </div>
        ) : !requests || requests.length === 0 ? (
          <EmptyState
            message="You have not applied for any leave"
            action={
              <Button onClick={openApply} variant="outline" size="sm">
                Apply now
              </Button>
            }
          />
        ) : (
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <LeaveRequestsTable
                items={requests}
                showEmployee={false}
                actions={(req) =>
                  req.status === "PENDING" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setCancelTarget(req)}
                    >
                      Cancel
                    </Button>
                  ) : null
                }
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Apply Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleApply}>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request for manager approval
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select
                  value={leaveTypeId}
                  onValueChange={(val) => val && setLeaveTypeId(val)}
                  disabled={applying}
                >
                  <SelectTrigger id="leaveType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.isPaid ? `${t.annualQuota} days` : "Unpaid"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    disabled={applying}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    disabled={applying}
                  />
                </div>
              </div>

              <div className="p-2.5 rounded bg-indigo-50 border border-indigo-100 text-xs font-medium text-indigo-700">
                Working days: {workingDays} (excludes weekends)
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason (3-300 characters)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for your leave request"
                  rows={3}
                  required
                  disabled={applying}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setApplyOpen(false)}
                disabled={applying}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={applying || workingDays < 1}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {applying ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        open={cancelTarget !== null}
        title="Cancel Leave Request"
        description="Are you sure you want to cancel this pending leave request?"
        confirmLabel="Cancel Request"
        pending={cancelling}
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleCancel}
      />
    </div>
  );
}
