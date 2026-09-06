import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../../components/Layout";
import { Card, Table, Button } from "../../components/ui";
import { useAuth } from "../../lib/useAuth";
import api from "../../lib/api";

export default function OrdersPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: "", product_id: "", quantity: "", unit_price: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  function refresh() {
    api.get("/orders").then((res) => setOrders(res.data)).catch(() => {});
  }

  useEffect(() => {
    if (!user) return;
    refresh();
    const interval = setInterval(refresh, 15000); // refresh every 15 seconds
    return () => clearInterval(interval);
  }, [user]);
  
  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/orders", {
        customer_id: Number(form.customer_id),
        items: [
          {
            product_id: Number(form.product_id),
            quantity: Number(form.quantity),
            unit_price: Number(form.unit_price || 0),
          },
        ],
      });
      setForm({ customer_id: "", product_id: "", quantity: "", unit_price: "" });
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't create order.");
    }
  }

  async function updateStatus(orderId, status) {
    await api.patch(`/orders/${orderId}/status?status=${status}`);
    refresh();
  }

  if (loading || !user) return null;

  const columns = [
    { key: "id", label: "Order" },
    { key: "customer_id", label: "Customer" },
    {
      key: "source",
      label: "Source",
      render: (r) => (
        <span
          className={`pill ${
            r.source === "whatsapp" ? "pill-success" : "pill-neutral"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${r.source === "whatsapp" ? "bg-green-400" : "bg-gray-400"}`} />
          {r.source === "whatsapp" ? "WhatsApp" : "Manual"}
        </span>
      ),
    },
    {
      key: "total_amount",
      label: "Total",
      render: (r) => <span className="font-semibold tabular-nums">₹{r.total_amount}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) =>
        user.role !== "accountant" ? (
          <select
            value={row.status}
            onChange={(e) => updateStatus(row.id, e.target.value)}
            className="glass-select py-1.5 px-2 text-xs w-auto"
          >
            <option value="pending">pending</option>
            <option value="dispatched">dispatched</option>
            <option value="delivered">delivered</option>
          </select>
        ) : (
          <span className={`pill ${
            row.status === "delivered" ? "pill-success" :
            row.status === "dispatched" ? "pill-info" : "pill-warning"
          }`}>
            {row.status}
          </span>
        ),
    },
  ];

  return (
    <Layout user={user} onLogout={logout}>
      <Head>
        <title>Orders — Distributor Management</title>
      </Head>

      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold text-surface-50">Orders</h1>
          {user.role !== "accountant" && (
            <Button variant="accent" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ New order"}
            </Button>
          )}
        </div>
        <p className="text-sm text-surface-400 mb-6">
          Stock is deducted automatically from the nearest-expiry batch on creation.
        </p>

        {showForm && (
          <Card className="p-5 mb-6 animate-slide-down" hover={false}>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
                  Customer ID
                </label>
                <input
                  required
                  type="number"
                  value={form.customer_id}
                  onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                  className="glass-input"
                />
              </div>
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
                  Unit price
                </label>
                <input
                  type="number"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                  className="glass-input"
                />
              </div>
              <Button type="submit" variant="primary">Create order</Button>
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
          <Table columns={columns} rows={orders} emptyLabel="No orders yet." />
        </Card>
      </div>
    </Layout>
  );
}
