import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../../components/Layout";
import { Card, Table, Button } from "../../components/ui";
import { useAuth } from "../../lib/useAuth";
import api from "../../lib/api";

const EMPTY = { name: "", phone: "", address: "", credit_limit: "", credit_days: "15" };

export default function CustomersPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // customer being edited (owner only)

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  function refresh() {
    api.get("/customers").then((res) => setCustomers(res.data)).catch(() => {});
  }

  useEffect(() => {
    if (user) refresh();
  }, [user]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/customers", {
        name: form.name,
        phone: form.phone,
        address: form.address || null,
        credit_limit: Number(form.credit_limit || 0),
        credit_days: Number(form.credit_days || 15),
      });
      setForm(EMPTY);
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't add customer.");
    }
  }

  async function saveTerms(e) {
    e.preventDefault();
    setError("");
    try {
      await api.patch(`/customers/${editing.id}`, {
        credit_limit: Number(editing.credit_limit || 0),
        credit_days: Number(editing.credit_days || 15),
      });
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't save credit terms.");
    }
  }

  if (loading || !user) return null;

  const isOwner = user.role === "owner";
  const canAdd = user.role === "owner" || user.role === "salesperson";

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name", render: (r) => <span className="font-medium text-surface-100">{r.name}</span> },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address", render: (r) => r.address || "—" },
    {
      key: "credit_limit",
      label: "Credit limit",
      render: (r) =>
        Number(r.credit_limit) > 0 ? (
          <span className="tabular-nums">₹{r.credit_limit}</span>
        ) : (
          <span className="text-surface-500">Not set</span>
        ),
    },
    { key: "credit_days", label: "Pay within", render: (r) => `${r.credit_days} days` },
    ...(isOwner
      ? [{
          key: "edit",
          label: "",
          render: (r) => (
            <Button variant="ghost" onClick={() => setEditing({ ...r })}>Edit terms</Button>
          ),
        }]
      : []),
  ];

  return (
    <Layout user={user} onLogout={logout}>
      <Head>
        <title>Customers — Distributor Management</title>
      </Head>

      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold text-surface-50">Customers</h1>
          {canAdd && (
            <Button variant="accent" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ New customer"}
            </Button>
          )}
        </div>
        <p className="text-sm text-surface-400 mb-6">
          Set a credit limit and payment days for each shop. Orders beyond the limit are held for the owner&apos;s approval.
        </p>

        {showForm && (
          <Card className="p-5 mb-6 animate-slide-down" hover={false}>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Field label="Shop / customer name">
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="glass-input" />
              </Field>
              <Field label="Phone (with +91)">
                <input required placeholder="+919876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="glass-input" />
              </Field>
              <Field label="Address">
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="glass-input" />
              </Field>
              <Field label="Credit limit (₹, 0 = none)">
                <input type="number" min="0" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} className="glass-input" />
              </Field>
              <Field label="Pay within (days)">
                <input type="number" min="0" value={form.credit_days} onChange={(e) => setForm({ ...form, credit_days: e.target.value })} className="glass-input" />
              </Field>
              <Button type="submit" variant="primary">Add customer</Button>
            </form>
          </Card>
        )}

        {editing && (
          <Card className="p-5 mb-6 animate-slide-down" hover={false}>
            <p className="text-sm text-surface-300 mb-3">Credit terms for <b>{editing.name}</b></p>
            <form onSubmit={saveTerms} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Field label="Credit limit (₹, 0 = none)">
                <input type="number" min="0" value={editing.credit_limit} onChange={(e) => setEditing({ ...editing, credit_limit: e.target.value })} className="glass-input" />
              </Field>
              <Field label="Pay within (days)">
                <input type="number" min="0" value={editing.credit_days} onChange={(e) => setEditing({ ...editing, credit_days: e.target.value })} className="glass-input" />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" variant="primary">Save</Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        {error && <p className="text-sm text-status-danger mb-4">{error}</p>}

        <Card className="p-5">
          <Table columns={columns} rows={customers} emptyLabel="No customers yet. Add your first shop above." />
        </Card>
      </div>
    </Layout>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
