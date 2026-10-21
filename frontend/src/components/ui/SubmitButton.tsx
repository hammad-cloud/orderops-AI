"use client";

import { useFormStatus } from "react-dom";

/** Submit button that disables itself while its form's server action runs, so slow requests can't be double-submitted. */
export function SubmitButton({ children, pendingText, className }: { children: string; pendingText: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} aria-busy={pending} className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}>
      {pending ? pendingText : children}
    </button>
  );
}
