"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/providers/SessionProvider";
import { api, ApiClientError } from "@/lib/api-client";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, User } from "lucide-react";

export default function ProfilePage() {
  const { user } = useSession();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    setChanging(true);
    try {
      await api.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to change password");
      }
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="User Profile"
        subtitle="Manage your personal account settings and password"
      />

      {/* Account Info */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center gap-3">
          <div className="size-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <User className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Account Overview
            </CardTitle>
            <p className="text-xs text-slate-500">Your profile details</p>
          </div>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-slate-400 block">Full Name</span>
            <span className="font-semibold text-slate-900">{user.name}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Email Address</span>
            <span className="font-semibold text-slate-900">{user.email}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">System Role</span>
            <div className="mt-1">
              <StatusBadge status={user.role} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Form */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center gap-3">
          <div className="size-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <KeyRound className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Change Password
            </CardTitle>
            <p className="text-xs text-slate-500">
              Ensure your new password is at least 8 characters long
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={changing}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={changing}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={changing}
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-red-600 bg-red-50 p-2.5 rounded-md border border-red-200">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={changing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {changing ? "Updating Password..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
