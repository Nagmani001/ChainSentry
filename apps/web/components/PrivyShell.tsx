"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export function PrivyShell({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
  if (!appId) {
    return (
      <div className="auth-config-missing">
        <section className="alert-hero">
          <div>
            <h1>Privy configuration required</h1>
            <p>
              Set NEXT_PUBLIC_PRIVY_APP_ID in the web environment before using
              ChainSentry. The product is gated by Privy auth and does not load
              operational data without a signed-in user.
            </p>
          </div>
        </section>
      </div>
    );
  }
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#3d71d9",
          logo: "/logo.png",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
