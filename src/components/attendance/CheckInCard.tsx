"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import { AttendanceRecordDto } from "@/lib/types";
import { formatMinutes, formatTime } from "@/lib/format";
import { Clock } from "lucide-react";

interface CheckInCardProps {
  onChange?: () => void;
}

export function CheckInCard({ onChange }: CheckInCardProps) {
  const { data: record, loading, reload } = useApi<AttendanceRecordDto | null>(
    "/api/attendance/today"
  );
  const [submitting, setSubmitting] = useState(false);

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      await api.post("/api/attendance/check-in");
      toast.success("Checked in successfully");
      reload();
      onChange?.();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to check in");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setSubmitting(true);
    try {
      await api.post("/api/attendance/check-out");
      toast.success("Checked out successfully");
      reload();
      onChange?.();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to check out");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="bg-white border-slate-200 shadow-sm mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Today: {todayFormatted}
              </p>
              <div className="text-sm text-slate-500 mt-0.5">
                {loading ? (
                  <span>Checking attendance status...</span>
                ) : !record ? (
                  <span>You have not checked in today</span>
                ) : !record.checkOut ? (
                  <span>Checked in at {formatTime(record.checkIn)}</span>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      Checked in {formatTime(record.checkIn)} • Checked out{" "}
                      {formatTime(record.checkOut)} • Worked{" "}
                      {formatMinutes(record.workedMinutes)}
                    </span>
                    <StatusBadge status={record.status} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {!loading && (
            <div>
              {!record ? (
                <Button
                  onClick={handleCheckIn}
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {submitting ? "Processing..." : "Check In"}
                </Button>
              ) : !record.checkOut ? (
                <Button
                  onClick={handleCheckOut}
                  disabled={submitting}
                  variant="outline"
                  className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                >
                  {submitting ? "Processing..." : "Check Out"}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
