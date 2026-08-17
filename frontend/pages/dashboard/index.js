import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { Stat, Banner, Card } from "../../components/ui";
import { useAuth } from "../../lib/useAuth";
import api from "../../lib/api";

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [batches, setBatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.get("/stock/batches"), api.get("/orders")])
      .then(([batchRes, orderRes]) => {
        setBatches(batchRes.data);
        setOrders(orderRes.data);
      })
      .catch(() => setFetchError("Couldn't reach the backend. Is it running?"));
  }, [user]);

  if (loading || !user) return null;

  const expiringSoon = batches.filter((b) => b.status === "expiring_soon");
  const totalStockUnits = batches.reduce((sum, b) => sum + Number(b.quantity), 0);
  const pendingOrders = orders.filter((o) => o.status === "pending");

  return (
    <Layout user={user} onLogout={logout}>
      <h1 className="font-serif text-2xl text-navy-950 mb-1">Overview</h1>
      <p className="text-sm text-gray-500 mb-6">A snapshot of stock, orders, and what needs attention.</p>

      {fetchError && <Banner tone="danger" className="mb-6">{fetchError}</Banner>}

      {expiringSoon.length > 0 && (
        <div className="mb-6">
          <Banner tone="warning">
            <strong>{expiringSoon.length} batch{expiringSoon.length > 1 ? "es" : ""}</strong> expiring within
            10 days — use these first (FEFO). See the Stock page for details.
          </Banner>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat label="Active stock batches" value={batches.length} />
        <Stat label="Total units in stock" value={totalStockUnits} />
        <Stat label="Pending orders" value={pendingOrders.length} accent />
      </div>

      <Card className="p-5">
        <h2 className="font-serif text-lg text-navy-950 mb-3">Recent orders</h2>
        {orders.slice(0, 5).map((o) => (
          <div key={o.id} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
            <span>Order #{o.id} — Customer #{o.customer_id}</span>
            <span className="text-gray-500">{o.status} · ₹{o.total_amount}</span>
          </div>
        ))}
        {orders.length === 0 && <p className="text-sm text-gray-500">No orders yet.</p>}
      </Card>
    </Layout>
  );
}
