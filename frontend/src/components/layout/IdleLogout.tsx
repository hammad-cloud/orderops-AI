"use client";

import { useEffect } from "react";
import { logoutIdle } from "@/lib/actions";
import { IDLE_TIMEOUT_SECONDS } from "@/lib/session";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/** Signs the user out after IDLE_TIMEOUT_SECONDS with no activity in this tab. */
export function IdleLogout() {
  useEffect(() => {
    let timer = window.setTimeout(logoutIdle, IDLE_TIMEOUT_SECONDS * 1000);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(logoutIdle, IDLE_TIMEOUT_SECONDS * 1000);
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  return null;
}
