import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../../components/Layout";
import { Card, Table, Button, Banner } from "../../components/ui";
import { useAuth } from "../../lib/useAuth";
import api from "../../lib/api";

export default function OrdersPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: "", product_id: "", quantity: "" });
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [credit, setCredit] = useState(null); // balance info for the selected customer

  useEffect(() => {
    if (!user) return;
    api.get("/customers").then((r) => setCustomers(r.data)).catch(() => {});
    api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
  }, [user]);

  useEffect(() => {
    setCredit(null);
    if (!form.customer_id) return;
    api.get(`/credit/customer/${form.customer_id}`).then((r) => setCredit(r.data)).catch(() => {});
  }, [form.customer_id]);

  const customerName = (id) => customers.find((c) => c.id === id)?.name || `#${id}`;
  const selectedProduct = products.find((p) => String(p.id) === String(form.product_id));
  const estimate = selectedProduct && form.quantity ? Number(selectedProduct.price) * Number(form.quantity) : 0;

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
          },
        ],
      });
      setForm({ customer_id: "", product_id: "", quantity: "" });
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't create order.");
    }
  }

  async function updateStatus(orderId, status) {
    try {
      await api.patch(`/orders/${orderId}/status?status=${status}`);
    } catch (err) {
      alert(err?.response?.data?.detail || "Couldn't change status.");
    }
    refresh();
  }

  async function decide(orderId, action) {
    try {
      await api.post(`/orders/${orderId}/${action}`);
    } catch (err) {
      alert(err?.response?.data?.detail || "Couldn't update the order.");
    }
    refresh();
  }

  if (loading || !user) return null;

  const columns = [
    { key: "id", label: "Order" },
    { key: "customer_id", label: "Customer", render: (r) => customerName(r.customer_id) },
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
        row.status === "on_hold" ? (
          <div>
            <span className="pill pill-warning">on hold</span>
            {user.role === "owner" && (
              <div className="flex gap-2 mt-2">
                <Button variant="primary" onClick={() => decide(row.id, "approve")}>Approve</Button>
                <Button variant="ghost" onClick={() => decide(row.id, "reject")}>Reject</Button>
              </div>
            )}
            <p className="text-xs text-surface-500 mt-1 max-w-xs">{row.hold_reason}</p>
          </div>
        ) : row.status === "rejected" ? (
          <span className="pill pill-danger">rejected</span>
        ) : user.role !== "accountant" ? (
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
          Prices come from the product list. Stock is taken from the nearest-expiry batch, and the sale is added to the customer's ledger automatically.
        </p>

        {showForm && (
          <Card className="p-5 mb-6 animate-slide-down" hover={false}>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">Customer</label>
                <select required value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="glass-select">
                  <option value="">Select customer…</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">Product</label>
                <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="glass-select">
                  <option value="">Select product…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} — ₹{p.price}/{p.unit || "unit"}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">Quantity</label>
                <input required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="glass-input" />
              </div>
              <Button type="submit" variant="primary">Create order{estimate ? ` (₹${estimate})` : ""}</Button>
            </form>
            {credit && (credit.risk !== "low" || Number(credit.outstanding) > 0) && (
              <div className="mt-4">
                <Banner tone={credit.risk === "high" ? "danger" : "warning"}>
                  {credit.name} currently owes ₹{credit.outstanding}
                  {Number(credit.credit_limit) > 0 ? ` (limit ₹${credit.credit_limit})` : ""}
                  {Number(credit.overdue) > 0 ? `, of which ₹${credit.overdue} is overdue` : ""}.
                  {credit.risk_reasons.length > 0 ? ` ${credit.risk_reasons.join("; ")}.` : ""}
                  {" "}Orders beyond the limit are held for the owner&apos;s approval.
                </Banner>
              </div>
            )}
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
