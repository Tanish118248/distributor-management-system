import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../../components/Layout";
import { Card, Table, Button, Stat } from "../../components/ui";
import { useAuth } from "../../lib/useAuth";
import api from "../../lib/api";

export default function LedgerPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ entry_type: "credit", amount: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && (user.role === "owner" || user.role === "accountant")) router.replace(router.pathname);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.get("/customers").then((res) => {
      setCustomers(res.data);
      if (res.data.length > 0) setCustomerId((cur) => cur || String(res.data[0].id));
    }).catch(() => {});
  }, [user]);

  function refresh() {
    if (!customerId) return;
    api.get(`/ledger/${customerId}`).then((res) => setEntries(res.data)).catch(() => setEntries([]));
  }

  useEffect(() => {
    if (user) refresh();
  }, [user, customerId]);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/ledger", {
        customer_id: Number(customerId),
        entry_type: form.entry_type,
        amount: Number(form.amount),
      });
      setForm({ entry_type: "credit", amount: "" });
      refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't add entry.");
    }
  }

  if (loading || !user) return null;

  const currentBalance = entries.length > 0 ? entries[entries.length - 1].running_balance : 0;

  const columns = [
    {
      key: "date",
      label: "Date",
      render: (r) => (
        <span className="text-surface-300 tabular-nums">{new Date(r.date).toLocaleDateString()}</span>
      ),
    },
    {
      key: "entry_type",
      label: "Type",
      render: (r) => (
        <span className={`pill ${r.entry_type === "payment" ? "pill-success" : "pill-danger"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${r.entry_type === "payment" ? "bg-emerald-400" : "bg-red-400"}`} />
          {r.entry_type}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (r) => (
        <span className={`font-semibold tabular-nums ${r.entry_type === "payment" ? "text-emerald-400" : "text-red-400"}`}>
          {r.entry_type === "payment" ? "+" : "-"}₹{r.amount}
        </span>
      ),
    },
    {
      key: "running_balance",
      label: "Balance",
      render: (r) => <span className="font-semibold tabular-nums text-surface-200">₹{r.running_balance}</span>,
    },
  ];

  return (
    <Layout user={user} onLogout={logout}>
      <Head>
        <title>Ledger — Distributor Management</title>
      </Head>

      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-surface-50 mb-1">Ledger</h1>
        <p className="text-sm text-surface-400 mb-6">Running credit/payment balance per customer.</p>

        {/* Customer Selector */}
        <div className="flex gap-3 items-end mb-6">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
              Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="glass-select w-64"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Button variant="ghost" onClick={refresh}>Refresh</Button>
        </div>

        {/* Balance Stat */}
        <div className="mb-6 w-72">
          <Stat
            label="Current balance"
            value={`₹${currentBalance}`}
            accent
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            }
          />
        </div>

        {/* Add Entry Form */}
        {(user.role === "owner" || user.role === "accountant") && (
          <Card className="p-5 mb-6" hover={false}>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
                  Type
                </label>
                <select
                  value={form.entry_type}
                  onChange={(e) => setForm({ ...form, entry_type: e.target.value })}
                  className="glass-select"
                >
                  <option value="credit">Credit (owed)</option>
                  <option value="payment">Payment (received)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
                  Amount
                </label>
                <input
                  required
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="glass-input"
                />
              </div>
              <Button type="submit" variant="primary">Add entry</Button>
            </form>
            <p className="text-xs text-surface-500 mt-3">
              Sales are added here automatically when an order is created. A payment is applied to the
              customer&apos;s oldest unpaid orders first.
            </p>
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

        {/* Entries Table */}
        <Card className="p-5">
          <Table columns={columns} rows={entries} emptyLabel="No ledger entries for this customer yet." />
        </Card>
      </div>
    </Layout>
  );
}
