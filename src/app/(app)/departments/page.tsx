"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/providers/SessionProvider";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import { DepartmentDto } from "@/lib/types";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingBlock } from "@/components/common/LoadingBlock";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function DepartmentsPage() {
  const { user } = useSession();
  const canManage = user.role === "ADMIN" || user.role === "HR";

  const { data: departments, loading, error, reload } = useApi<DepartmentDto[]>(
    "/api/departments"
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentDto | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DepartmentDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openAdd = () => {
    setEditingDept(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  };

  const openEdit = (dept: DepartmentDto) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || "");
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDept) {
        await api.put(`/api/departments/${editingDept.id}`, {
          name,
          description: description || null,
        });
        toast.success("Department updated successfully");
      } else {
        await api.post("/api/departments", {
          name,
          description: description || null,
        });
        toast.success("Department created successfully");
      }
      setDialogOpen(false);
      reload();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to save department");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/api/departments/${deleteTarget.id}`);
      toast.success("Department deleted successfully");
      setDeleteTarget(null);
      reload();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to delete department");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Manage company departments and view headcount"
        actions={
          canManage && (
            <Button
              onClick={openAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <Plus className="size-4" />
              <span>Add Department</span>
            </Button>
          )
        }
      />

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-600 flex items-center justify-between">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : !departments || departments.length === 0 ? (
        <EmptyState
          message="No departments yet"
          action={
            canManage && (
              <Button onClick={openAdd} variant="outline" size="sm">
                Add the first department
              </Button>
            )
          }
        />
      ) : (
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Name</TableHead>
                  <TableHead className="font-semibold text-slate-700">Description</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-32">Employees</TableHead>
                  {canManage && (
                    <TableHead className="font-semibold text-slate-700 text-right w-28">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium text-slate-900">
                      {dept.name}
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-md truncate">
                      {dept.description || "—"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {dept.employeeCount}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(dept)}
                          className="text-slate-500 hover:text-slate-900"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(dept)}
                          className="text-slate-500 hover:text-red-600"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingDept ? "Edit Department" : "Add Department"}
              </DialogTitle>
              <DialogDescription>
                {editingDept
                  ? "Update department information"
                  : "Create a new company department"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="dept-name">Department Name</Label>
                <Input
                  id="dept-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Legal"
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dept-desc">Description (Optional)</Label>
                <Textarea
                  id="dept-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of department responsibilities"
                  rows={3}
                  disabled={saving}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Department"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        pending={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
