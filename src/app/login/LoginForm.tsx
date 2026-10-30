"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api, ApiClientError } from "@/lib/api-client";

const DEMO_ACCOUNTS = [
  { role: "ADMIN", email: "admin@corperp.com" },
  { role: "HR", email: "hr@corperp.com" },
  { role: "MANAGER", email: "manager@corperp.com" },
  { role: "EMPLOYEE", email: "employee@corperp.com" },
];

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post("/api/auth/login", { email, password });
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password@123");
    setError(null);
  };

  return (
    <Card className="w-full max-w-sm bg-white border-slate-200 shadow-sm">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-indigo-600">
          CorpERP
        </CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@corperp.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600 bg-red-50 p-2.5 rounded-md border border-red-200">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 p-3 rounded-lg text-xs space-y-2">
          <p className="font-semibold text-slate-700">Demo accounts (Password: Password@123):</p>
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleFillDemo(acc.email)}
                className="text-left py-1 px-1.5 rounded hover:bg-slate-200 text-indigo-600 font-medium transition-colors truncate"
              >
                {acc.role}: {acc.email.split("@")[0]}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
