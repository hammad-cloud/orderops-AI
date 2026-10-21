"use client";

import { useEffect, useState } from "react";

type ApiStatusProps = {
  error?: string | null;
};

export function ApiStatus({ error }: ApiStatusProps) {
  const [label, setLabel] = useState(error ? "API offline" : "Checking API...");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (error) {
      setLabel("API offline");
      setOk(false);
      return;
    }

    let active = true;

    fetch("/health", { cache: "no-store" })
      .then((res) => res.json() as Promise<{ status: string; service: string }>)
      .then((health) => {
        if (!active) return;
        const isHealthy = health.status === "ok";
        setOk(isHealthy);
        setLabel(isHealthy ? `${health.service} online` : "API degraded");
      })
      .catch(() => {
        if (!active) return;
        setOk(false);
        setLabel("API offline");
      });

    return () => {
      active = false;
    };
  }, [error]);

  return (
    <span className={`api-status ${ok ? "ok" : "down"}`} title="FastAPI via Next.js proxy">
      {label}
    </span>
  );
}
