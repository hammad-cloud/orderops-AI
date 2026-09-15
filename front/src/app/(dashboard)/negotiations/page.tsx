import { ApiStatus } from "@/components/layout/ApiStatus";
import { listNegotiations } from "@/lib/api/negotiations";

export const dynamic = "force-dynamic";

export default async function NegotiationsPage() {
  let rows: Awaited<ReturnType<typeof listNegotiations>> = [];
  let error: string | null = null;

  try {
    rows = await listNegotiations();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to reach FastAPI";
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <h1>Negotiations</h1>
          <p>Out-of-stock offers, discounts, and customer responses.</p>
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
                <th>ID</th>
                <th>Order</th>
                <th>Original</th>
                <th>Alternative</th>
                <th>Discount</th>
                <th>Channel</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.orderId}</td>
                  <td>
                    <div>{row.originalName ?? row.originalSku}</div>
                    <div className="cell-sub">{row.originalSku}</div>
                  </td>
                  <td>
                    <div>{row.alternativeName ?? row.alternativeSku}</div>
                    <div className="cell-sub">{row.alternativeSku}</div>
                  </td>
                  <td>{row.discountPercent}%</td>
                  <td>
                    <span className="badge">{row.channel}</span>
                  </td>
                  <td>
                    <span className={`badge decision-${row.customerDecision ?? "pending"}`}>
                      {row.customerDecision}
                    </span>
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
