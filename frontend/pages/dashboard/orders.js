import { useEffect, useState } from "react";
import { useRouter } from "next/router";
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
    if (user) refresh();
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
          className={`text-xs px-2 py-1 rounded-full ${
            r.source === "whatsapp"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {r.source === "whatsapp" ? "WhatsApp" : "Manual"}
        </span>
      ),
    },
    { key: "total_amount", label: "Total", render: (r) => `₹${r.total_amount}` },
    {
      key: "status",
      label: "Status",
      render: (row) =>
        user.role !== "accountant" ? (
          <select
            value={row.status}
            onChange={(e) => updateStatus(row.id, e.target.value)}
            className="text-xs border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="pending">pending</option>
            <option value="dispatched">dispatched</option>
            <option value="delivered">delivered</option>
          </select>
        ) : (
          <span className="text-xs">{row.status}</span>
        ),
    },
  ];

  return (
    <Layout user={user} onLogout={logout}>
      <div className="flex justify-between items-center mb-1">
        <h1 className="font-serif text-2xl text-navy-950">Orders</h1>
        {user.role !== "accountant" && (
          <Button variant="accent" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ New order"}
          </Button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Stock is deducted automatically from the nearest-expiry batch on creation.
      </p>

      {showForm && (
        <Card className="p-5 mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Customer ID</label>
              <input required type="number" value={form.customer_id}
                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Product ID</label>
              <input required type="number" value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Quantity</label>
              <input required type="number" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Unit price</label>
              <input type="number" value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <Button type="submit" variant="primary">Create order</Button>
          </form>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </Card>
      )}

      <Card className="p-5">
        <Table columns={columns} rows={orders} emptyLabel="No orders yet." />
      </Card>
    </Layout>
  );
}

