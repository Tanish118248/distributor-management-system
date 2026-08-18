import { useEffect, useState } from "react";
import { useRouter } from "next/router";
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
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "unit", label: "Unit" },
    { key: "price", label: "Price", render: (r) => `₹${r.price}` },
  ];

  return (
    <Layout user={user} onLogout={logout}>
      <div className="flex justify-between items-center mb-1">
        <h1 className="font-serif text-2xl text-navy-950">Products</h1>
        {user.role === "owner" && (
          <Button variant="accent" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add product"}
          </Button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">Products available for stock and orders.</p>

      {showForm && (
        <Card className="p-5 mb-6">
          <form onSubmit={handleAdd} className="grid grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Unit</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Price</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <Button type="submit" variant="primary">Save product</Button>
          </form>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </Card>
      )}

      <Card className="p-5">
        <Table columns={columns} rows={products} emptyLabel="No products yet." />
      </Card>
    </Layout>
  );
}