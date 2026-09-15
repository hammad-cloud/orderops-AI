import { ApiStatus } from "@/components/layout/ApiStatus";
import { listAuditQueue } from "@/lib/api/audit";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  let rows: Awaited<ReturnType<typeof listAuditQueue>> = [];
  let error: string | null = null;

  try {
    rows = await listAuditQueue();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to reach FastAPI";
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <h1>Audit Queue</h1>
          <p>High-risk orders flagged for manual human review.</p>
        </div>
        <ApiStatus />
      </div>

      {error ? (
        <p className="error">API error: {error}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Audit</th>
                <th>Order</th>
                <th>Customer</th>
                <th>Risk</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.orderId}</td>
                  <td>{row.customerId}</td>
                  <td>
                    <span className="badge risk-high">
                      {row.riskLevel} ({row.riskScore})
                    </span>
                  </td>
                  <td>{row.reason}</td>
                  <td>
                    <span className="badge">{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
