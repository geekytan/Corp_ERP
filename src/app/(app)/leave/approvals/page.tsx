"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/providers/SessionProvider";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import { LeaveRequestDto } from "@/lib/types";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingBlock } from "@/components/common/LoadingBlock";
import { EmptyState } from "@/components/common/EmptyState";
import { LeaveRequestsTable } from "@/components/leave/LeaveRequestsTable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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

export default function LeaveApprovalsPage() {
  const { user } = useSession();
  const canReview =
    user.role === "ADMIN" || user.role === "HR" || user.role === "MANAGER";

  const [statusFilter, setStatusFilter] = useState<string>("PENDING");

  // Decision dialog state
  const [targetReq, setTargetReq] = useState<LeaveRequestDto | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const url =
    statusFilter === "ALL"
      ? "/api/leave-requests?scope=approvals"
      : `/api/leave-requests?scope=approvals&status=${statusFilter}`;

  const { data: requests, loading, error, reload } = useApi<LeaveRequestDto[]>(
    canReview ? url : null
  );

  if (!canReview) {
    return (
      <div className="p-8 text-center text-slate-500">
        You do not have access to this page
      </div>
    );
  }

  const openDecision = (
    req: LeaveRequestDto,
    dec: "APPROVED" | "REJECTED"
  ) => {
    setTargetReq(req);
    setDecision(dec);
    setComment("");
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReq) return;
    setSubmitting(true);
    try {
      await api.patch(`/api/leave-requests/${targetReq.id}/decision`, {
        decision,
        comment: comment.trim() || null,
      });
      toast.success(
        `Leave request ${decision === "APPROVED" ? "approved" : "rejected"}`
      );
      setTargetReq(null);
      reload();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to process leave request");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Leave Approvals"
          subtitle={
            user.role === "MANAGER"
              ? "Review and decide leave requests from your team"
              : "Company-wide leave request reviews"
          }
        />

        <div className="flex items-center gap-2">
          <Label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Status
          </Label>
          <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
            <SelectTrigger className="w-36 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ALL">All Requests</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-600">
          {error}
        </div>
      ) : !requests || requests.length === 0 ? (
        <EmptyState message="No leave requests to review" />
      ) : (
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <LeaveRequestsTable
              items={requests}
              showEmployee={true}
              actions={(req) =>
                req.status === "PENDING" ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                      onClick={() => openDecision(req, "APPROVED")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 h-7 text-xs"
                      onClick={() => openDecision(req, "REJECTED")}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Decision Dialog */}
      <Dialog
        open={targetReq !== null}
        onOpenChange={(val) => !val && setTargetReq(null)}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleDecisionSubmit}>
            <DialogHeader>
              <DialogTitle>
                {decision === "APPROVED" ? "Approve" : "Reject"} Leave Request
              </DialogTitle>
              <DialogDescription>
                For {targetReq?.employeeName} ({targetReq?.leaveTypeName},{" "}
                {targetReq?.days} days)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="review-comment">Reviewer Comment (Optional)</Label>
                <Textarea
                  id="review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optional comment or notes for the applicant"
                  rows={3}
                  disabled={submitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTargetReq(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className={
                  decision === "APPROVED"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }
              >
                {submitting
                  ? "Processing..."
                  : decision === "APPROVED"
                  ? "Confirm Approval"
                  : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
