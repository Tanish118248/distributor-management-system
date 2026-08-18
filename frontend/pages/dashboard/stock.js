import { useEffect, useState } from "react";
import { useRouter } from "next/router";
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
    if (user) refresh();
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
    { key: "quantity", label: "Qty" },
    { key: "expiry_date", label: "Expiry" },
    { key: "purchase_date", label: "Received" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            row.status === "expiring_soon"
              ? "bg-amber-100 text-amber-700"
              : row.status === "depleted"
              ? "bg-gray-100 text-gray-500"
              : "bg-green-100 text-green-700"
          }`}
        >
          {row.status.replace("_", " ")}
        </span>
      ),
    },
  ];

  return (
    <Layout user={user} onLogout={logout}>
      <div className="flex justify-between items-center mb-1">
        <h1 className="font-serif text-2xl text-navy-950">Stock</h1>
        {user.role === "owner" && (
          <Button variant="accent" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add batch"}
          </Button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Batch-level inventory. Orders are fulfilled from the nearest-expiry batch first (FEFO).
      </p>

      {showForm && (
        <Card className="p-5 mb-6">
          <form onSubmit={handleAdd} className="grid grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Product ID</label>
              <input
                required
                type="number"
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Quantity</label>
              <input
                required
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Expiry date</label>
              <input
                required
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" variant="primary">Save batch</Button>
          </form>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </Card>
      )}

      <Card className="p-5">
        <Table columns={columns} rows={batches} emptyLabel="No stock batches yet." />
      </Card>
    </Layout>
  );
}
