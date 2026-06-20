"use client";

import * as React from "react";

import DashboardFrame from "@/components/layout/DashboardFrame";
import {
  AuthProvider,
  type AuthSession,
} from "@/components/providers/AuthProvider";

const INITIAL_SYSTEM_SESSION: AuthSession = {
  authenticated: true,
  is_superuser: false,
  is_staff: false,
  is_system_user: true,
  workspace: "system",
  dashboard_path: "/system",
  role: "SYSTEM",
  user_type: "SYSTEM",
  scope_type: "SYSTEM",
  company: null,
  company_id: null,
  center_id: null,
  customer_id: null,
  agent_id: null,
  user: null,
  subscription: null,
  permissions: {
    is_superuser: false,
    is_staff: false,
    groups: [],
  },
  profile: {
    user_type: "SYSTEM",
    extra_data: {},
  },
};

export default function SystemLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider initialUser={INITIAL_SYSTEM_SESSION}>
      <DashboardFrame sidebarType="system">{children}</DashboardFrame>
    </AuthProvider>
  );
}