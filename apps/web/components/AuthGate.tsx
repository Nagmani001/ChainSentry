"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { api, setAuthTokenGetter } from "../lib/api";
import { Icon } from "./Icon";

function identity(user: unknown) {
  const u = user as {
    id?: string;
    email?: { address?: string };
    phone?: { number?: string };
    wallet?: { address?: string };
  } | null;
  return {
    privyId: u?.id ?? "",
    email: u?.email?.address ?? null,
    phone: u?.phone?.number ?? null,
    name: u?.email?.address ?? u?.wallet?.address ?? null,
  };
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, login, getAccessToken } = usePrivy();
  const current = identity(user);

  useEffect(() => {
    setAuthTokenGetter(authenticated ? getAccessToken : null);
    return () => setAuthTokenGetter(null);
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (!ready || !authenticated || !current.privyId) return;
    api.syncUser(current).catch(() => undefined);
  }, [
    ready,
    authenticated,
    current.privyId,
    current.email,
    current.name,
    current.phone,
  ]);

  if (!ready) return <div className="panel-loading">Loading auth…</div>;

  if (!authenticated) {
    return (
      <div className="alert-page auth-gate">
        <section className="alert-hero">
          <div>
            <span className="auth-logo-mark">
              <Image src="/logo.png" alt="" width={38} height={38} priority />
            </span>
            <h1>Sign in to ChainSentry</h1>
            <p>
              ChainSentry reads live Graph-indexed telemetry and org data from
              the API. Sign in with Privy before connecting contracts, viewing
              dashboards, or managing alerts.
            </p>
          </div>
          <button className="btn primary lg" onClick={login}>
            <Icon name="user" size={16} /> Sign in with Privy
          </button>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}

export function AuthButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const current = identity(user);
  const label = current.email ?? current.name ?? "Signed in";

  if (!ready) {
    return (
      <button className="auth-button" disabled>
        <span className="topbar-avatar">
          <Icon name="user" size={16} />
        </span>
        <span>Loading</span>
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button className="auth-button" onClick={login}>
        <span className="topbar-avatar">
          <Icon name="user" size={16} />
        </span>
        <span>Sign in</span>
      </button>
    );
  }

  return (
    <button className="auth-button" onClick={logout} title="Sign out">
      <span className="topbar-avatar">
        <Icon name="user" size={16} />
      </span>
      <span>{label}</span>
    </button>
  );
}
