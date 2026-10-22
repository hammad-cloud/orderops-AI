/**
 * Idempotency keys for form submits. A key is generated once when the form renders and sent with every submit,
 * so a retry, double-click, back-button resubmit or second tab reuses it and the backend creates one order.
 * The backend answers 409 for a key it has seen; createOrder (lib/actions.ts) treats that as "already created".
 */
export function newOrderId() {
  return `ORD-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}
