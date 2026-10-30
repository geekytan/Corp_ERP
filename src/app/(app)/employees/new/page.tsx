"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/components/providers/SessionProvider";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { PageHeader } from "@/components/common/PageHeader";
import { EmployeeDetail } from "@/lib/types";

export default function NewEmployeePage() {
  const { user } = useSession();
  const router = useRouter();

  if (user.role !== "ADMIN" && user.role !== "HR") {
    return (
      <div className="p-8 text-center text-slate-500">
        You do not have access to this page
      </div>
    );
  }

  const handleSaved = (employee: EmployeeDetail) => {
    toast.success("Employee created");
    router.push(`/employees/${employee.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Add Employee"
        subtitle="Create a new employee profile and system account"
      />
      <EmployeeForm mode="create" onSaved={handleSaved} />
    </div>
  );
}
