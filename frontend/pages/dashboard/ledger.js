import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { Card, Table, Button, Stat } from "../../components/ui";
import { useAuth } from "../../lib/useAuth";
import api from "../../lib/api";

export default function LedgerPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [customerId, setCustomerId] = useState("1");
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ entry_type: "credit", amount: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && (user.role === "owner" || user.role === "accountant")) router.replace(router.pathname);
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
    { key: "date", label: "Date", render: (r) => new Date(r.date).toLocaleDateString() },
    { key: "entry_type", label: "Type" },
    { key: "amount", label: "Amount", render: (r) => `₹${r.amount}` },
    { key: "running_balance", label: "Balance", render: (r) => `₹${r.running_balance}` },
  ];

  return (
    <Layout user={user} onLogout={logout}>
      <h1 className="font-serif text-2xl text-navy-950 mb-1">Ledger</h1>
      <p className="text-sm text-gray-500 mb-6">Running credit/payment balance per customer.</p>

      <div className="flex gap-3 items-end mb-6">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Customer ID</label>
          <input
            type="number"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-32"
          />
        </div>
        <Button variant="ghost" onClick={refresh}>Load statement</Button>
      </div>

      <div className="mb-6 w-64">
        <Stat label="Current balance" value={`₹${currentBalance}`} accent />
      </div>

      {(user.role === "owner" || user.role === "accountant") && (
        <Card className="p-5 mb-6">
          <form onSubmit={handleAdd} className="grid grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Type</label>
              <select
                value={form.entry_type}
                onChange={(e) => setForm({ ...form, entry_type: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="credit">Credit (owed)</option>
                <option value="payment">Payment (received)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Amount</label>
              <input
                required
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" variant="primary">Add entry</Button>
          </form>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </Card>
      )}

      <Card className="p-5">
        <Table columns={columns} rows={entries} emptyLabel="No ledger entries for this customer yet." />
      </Card>
    </Layout>
  );
}
