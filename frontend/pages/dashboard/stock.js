import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../../components/Layout";
import { Card, Table, Button, Banner } from "../../components/ui";
import { useAuth } from "../../lib/useAuth";
import api from "../../lib/api";

export default function StockPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [batches, setBatches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product_id: "", quantity: "", expiry_date: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  function refresh() {
    api.get("/stock/batches").then((res) => setBatches(res.data)).catch(() => {});
  }

  useEffect(() => {
    if (!user) return;
    refresh();
    const interval = setInterval(refresh, 15000); // refresh every 15 seconds
    return () => clearInterval(interval);
  }, [user]);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/stock/batches", {
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        expiry_date: form.expiry_date,
      });
      setForm({ product_id: "", quantity: "", expiry_date: "" });
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't add batch.");
    }
  }

  if (loading || !user) return null;

  const columns = [
    { key: "id", label: "Batch" },
    { key: "product_id", label: "Product" },
    {
      key: "quantity",
      label: "Qty",
      render: (r) => <span className="font-semibold tabular-nums">{r.quantity}</span>,
    },
    { key: "expiry_date", label: "Expiry" },
    { key: "purchase_date", label: "Received" },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const cls =
          row.status === "expiring_soon"
            ? "pill-warning"
            : row.status === "depleted"
            ? "pill-neutral"
            : "pill-success";
        return (
          <span className={`pill ${cls}`}>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                row.status === "expiring_soon"
                  ? "bg-amber-400"
                  : row.status === "depleted"
                  ? "bg-gray-400"
                  : "bg-emerald-400"
              }`}
            />
            {row.status.replace("_", " ")}
          </span>
        );
      },
    },
  ];

  return (
    <Layout user={user} onLogout={logout}>
      <Head>
        <title>Stock — Distributor Management</title>
      </Head>

      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold text-surface-50">Stock</h1>
          {user.role === "owner" && (
            <Button variant="accent" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ Add batch"}
            </Button>
          )}
        </div>
        <p className="text-sm text-surface-400 mb-6">
          Batch-level inventory. Orders are fulfilled from the nearest-expiry batch first (FEFO).
        </p>

        {showForm && (
          <Card className="p-5 mb-6 animate-slide-down" hover={false}>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
                  Product ID
                </label>
                <input
                  required
                  type="number"
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
                  Quantity
                </label>
                <input
                  required
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
                  Expiry date
                </label>
                <input
                  required
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  className="glass-input"
                />
              </div>
              <Button type="submit" variant="primary">Save batch</Button>
            </form>
            {error && (
              <div className="flex items-center gap-2 text-sm text-status-danger mt-3 animate-fade-in">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}
          </Card>
        )}

        <Card className="p-5">
          <Table columns={columns} rows={batches} emptyLabel="No stock batches yet." />
        </Card>
      </div>
    </Layout>
  );
}
