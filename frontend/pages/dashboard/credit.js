import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../../components/Layout";
import { Card, Table, Button, Stat, Banner } from "../../components/ui";
import { useAuth } from "../../lib/useAuth";
import api from "../../lib/api";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const RISK_PILL = { high: "pill-danger", medium: "pill-warning", low: "pill-success" };

export default function CreditPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [holds, setHolds] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role === "salesperson") router.replace("/dashboard");
  }, [loading, user, router]);

  function refresh() {
    api.get("/credit/overview").then((r) => setData(r.data)).catch(() => {});
    api.get("/credit/reminders").then((r) => setReminders(r.data)).catch(() => {});
    if (user?.role === "owner") api.get("/credit/holds").then((r) => setHolds(r.data)).catch(() => {});
  }

  useEffect(() => {
    if (!user || user.role === "salesperson") return;
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [user]);

  async function decide(orderId, action) {
    setError("");
    try {
      await api.post(`/orders/${orderId}/${action}`);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't update the order.");
    }
  }

  if (loading || !user || user.role === "salesperson") return null;

  const totals = data?.totals;

  const holdColumns = [
    { key: "order_id", label: "Order" },
    { key: "customer", label: "Customer" },
    { key: "total_amount", label: "Amount", render: (r) => <span className="tabular-nums font-semibold">{inr(r.total_amount)}</span> },
    { key: "reason", label: "Why held", render: (r) => <span className="text-surface-300">{r.reason}</span> },
    {
      key: "act",
      label: "",
      render: (r) => (
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => decide(r.order_id, "approve")}>Approve</Button>
          <Button variant="ghost" onClick={() => decide(r.order_id, "reject")}>Reject</Button>
        </div>
      ),
    },
  ];

  const customerColumns = [
    { key: "name", label: "Customer", render: (r) => <span className="font-medium text-surface-100">{r.name}</span> },
    {
      key: "risk",
      label: "Risk",
      render: (r) => (
        <span title={r.risk_reasons.join("; ")} className={`pill ${RISK_PILL[r.risk]}`}>{r.risk}</span>
      ),
    },
    { key: "outstanding", label: "Owes", render: (r) => <span className="tabular-nums font-semibold">{inr(r.outstanding)}</span> },
    {
      key: "limit",
      label: "Limit used",
      render: (r) => (r.limit_used_pct === null ? <span className="text-surface-500">No limit</span> : `${r.limit_used_pct}% of ${inr(r.credit_limit)}`),
    },
    { key: "b1", label: "0–30 d", render: (r) => inr(r.buckets["0-30"]) },
    { key: "b2", label: "30–60 d", render: (r) => inr(r.buckets["30-60"]) },
    {
      key: "b3",
      label: "60+ d",
      render: (r) => <span className={Number(r.buckets["60+"]) > 0 ? "text-red-400 font-semibold" : ""}>{inr(r.buckets["60+"])}</span>,
    },
    {
      key: "avg",
      label: "Avg days to pay",
      render: (r) => (r.avg_days_to_pay === null ? "—" : `${r.avg_days_to_pay} d`),
    },
  ];

  const reminderColumns = [
    { key: "name", label: "Customer" },
    { key: "overdue", label: "Overdue", render: (r) => <span className="tabular-nums text-red-400 font-semibold">{inr(r.overdue)}</span> },
    { key: "max_days_overdue", label: "Days late", render: (r) => `${r.max_days_overdue} d` },
    {
      key: "send",
      label: "",
      render: (r) => (
        <a href={r.whatsapp_link} target="_blank" rel="noopener noreferrer" className="btn-gradient inline-block text-xs px-3 py-1.5 rounded-lg">
          Remind on WhatsApp
        </a>
      ),
    },
  ];

  return (
    <Layout user={user} onLogout={logout}>
      <Head>
        <title>Credit & Dues — Distributor Management</title>
      </Head>

      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 mb-1">Credit &amp; Dues</h1>
          <p className="text-sm text-surface-400">Who owes you, how old the dues are, and who needs a reminder.</p>
        </div>

        {error && <Banner tone="danger">{error}</Banner>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Stat label="Total outstanding" value={inr(totals?.outstanding)} accent />
          <Stat label="Overdue" value={inr(totals?.overdue)} />
          <Stat label="High-risk customers" value={totals?.high_risk_customers ?? 0} />
          <Stat label="Orders on hold" value={totals?.on_hold_orders ?? 0} />
        </div>

        {user.role === "owner" && holds.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-surface-100 mb-3">Orders waiting for your approval</h2>
            <Card className="p-5" hover={false}>
              <Table columns={holdColumns} rows={holds} />
            </Card>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-surface-100 mb-3">Customers by risk</h2>
          <Card className="p-5" hover={false}>
            <Table columns={customerColumns} rows={data?.customers || []} emptyLabel="No customers yet." />
          </Card>
          <p className="text-xs text-surface-500 mt-2">
            Risk is a simple rule, not a prediction: High = over limit or dues 30+ days late; Medium = dues late or usually pays after the agreed days. Hover a badge to see why.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-surface-100 mb-3">Payment reminders</h2>
          <Card className="p-5" hover={false}>
            <Table columns={reminderColumns} rows={reminders} emptyLabel="Nobody is overdue. 🎉" />
          </Card>
          <p className="text-xs text-surface-500 mt-2">
            Opens WhatsApp with the message already written. You press send.
          </p>
        </div>
      </div>
    </Layout>
  );
}
