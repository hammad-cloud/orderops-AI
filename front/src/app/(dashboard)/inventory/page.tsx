import { ApiStatus } from "@/components/layout/ApiStatus";
import { listInventory } from "@/lib/api/inventory";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  let rows: Awaited<ReturnType<typeof listInventory>> = [];
  let error: string | null = null;

  try {
    rows = await listInventory();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to reach FastAPI";
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p>Live stock availability used by the validation agent.</p>
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
                <th>SKU</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Warehouse</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sku}>
                  <td>{row.sku}</td>
                  <td>{row.name}</td>
                  <td>{row.quantityAvailable}</td>
                  <td>{row.warehouseId}</td>
                  <td>
                    <span className={`badge stock-${row.status ?? "in_stock"}`}>
                      {row.status?.replaceAll("_", " ")}
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
