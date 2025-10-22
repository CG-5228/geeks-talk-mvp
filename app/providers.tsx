"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import React from "react";
import { useAggressiveHeartbeat } from "@/utils/useAggressiveHeartbeat";
import { NotificationProvider } from "@/components/ui/NotificationSystem";

function HeartbeatProvider({ children }: { children: React.ReactNode }) {
  useAggressiveHeartbeat();
  return <>{children}</>;
}

export default function Providers({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  return (
    <SessionProvider session={session}>
      <NotificationProvider>
        <HeartbeatProvider>
          {children}
        </HeartbeatProvider>
      </NotificationProvider>
    </SessionProvider>
  );
}
