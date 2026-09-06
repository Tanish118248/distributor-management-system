import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../../components/Layout";
import { Card, Table, Button } from "../../components/ui";
import { useAuth } from "../../lib/useAuth";
import api from "../../lib/api";

export default function ProductsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", unit: "", price: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  function refresh() {
    api.get("/products").then((res) => setProducts(res.data)).catch(() => {});
  }
  useEffect(() => { if (user) refresh(); }, [user]);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/products", {
        name: form.name, category: form.category, unit: form.unit,
        price: Number(form.price || 0),
      });
      setForm({ name: "", category: "", unit: "", price: "" });
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't add product.");
    }
  }

  if (loading || !user) return null;

  const columns = [
    {
      key: "id",
      label: "ID",
      render: (r) => <span className="text-surface-400 tabular-nums">#{r.id}</span>,
    },
    {
      key: "name",
      label: "Name",
      render: (r) => <span className="font-medium text-surface-100">{r.name}</span>,
    },
    {
      key: "category",
      label: "Category",
      render: (r) => r.category ? (
        <span className="pill pill-info">{r.category}</span>
      ) : (
        <span className="text-surface-500 text-xs">—</span>
      ),
    },
    {
      key: "unit",
      label: "Unit",
      render: (r) => r.unit ? (
        <span className="pill pill-neutral">{r.unit}</span>
      ) : (
        <span className="text-surface-500 text-xs">—</span>
      ),
    },
    {
      key: "price",
      label: "Price",
      render: (r) => <span className="font-semibold tabular-nums text-accent-cyan">₹{r.price}</span>,
    },
  ];

  return (
    <Layout user={user} onLogout={logout}>
      <Head>
        <title>Products — Distributor Management</title>
      </Head>

      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold text-surface-50">Products</h1>
          {user.role === "owner" && (
            <Button variant="accent" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ Add product"}
            </Button>
          )}
        </div>
        <p className="text-sm text-surface-400 mb-6">Products available for stock and orders.</p>

        {showForm && (
          <Card className="p-5 mb-6 animate-slide-down" hover={false}>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
                  Name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
                  Category
                </label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
                  Unit
                </label>
                <input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
                  Price
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="glass-input"
                />
              </div>
              <Button type="submit" variant="primary" className="md:col-start-4">Save product</Button>
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
          <Table columns={columns} rows={products} emptyLabel="No products yet." />
        </Card>
      </div>
    </Layout>
  );
}