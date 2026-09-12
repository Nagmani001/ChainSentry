"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export function PrivyShell({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
  if (!appId) return <>{children}</>;
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#3d71d9",
          logo: undefined,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
