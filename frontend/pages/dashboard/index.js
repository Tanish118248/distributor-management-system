import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
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

    function loadDashboard() {
      Promise.all([api.get("/stock/batches"), api.get("/orders")])
        .then(([batchRes, orderRes]) => {
          setBatches(batchRes.data);
          setOrders(orderRes.data);
        })
        .catch(() => setFetchError("Couldn't reach the backend. Is it running?"));
    }

    loadDashboard();
    const interval = setInterval(loadDashboard, 15000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading || !user) return null;

  const expiringSoon = batches.filter((b) => b.status === "expiring_soon");
  const totalStockUnits = batches.reduce((sum, b) => sum + Number(b.quantity), 0);
  const pendingOrders = orders.filter((o) => o.status === "pending");

  const statusColor = (status) => {
    if (status === "delivered") return "pill pill-success";
    if (status === "dispatched") return "pill pill-info";
    return "pill pill-warning";
  };

  return (
    <Layout user={user} onLogout={logout}>
      <Head>
        <title>Overview — Distributor Management</title>
      </Head>

      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-surface-50 mb-1">Overview</h1>
        <p className="text-sm text-surface-400 mb-6">
          A snapshot of stock, orders, and what needs attention.
        </p>

        {fetchError && (
          <div className="mb-6 animate-slide-down">
            <Banner tone="danger">{fetchError}</Banner>
          </div>
        )}

        {expiringSoon.length > 0 && (
          <div className="mb-6 animate-slide-down">
            <Banner tone="warning">
              <strong>{expiringSoon.length} batch{expiringSoon.length > 1 ? "es" : ""}</strong>{" "}
              expiring within 10 days — use these first (FEFO). See the Stock page for details.
            </Banner>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="animate-slide-up stagger-1">
            <Stat
              label="Active stock batches"
              value={batches.length}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              }
            />
          </div>
          <div className="animate-slide-up stagger-2">
            <Stat
              label="Total units in stock"
              value={totalStockUnits}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
              }
            />
          </div>
          <div className="animate-slide-up stagger-3">
            <Stat
              label="Pending orders"
              value={pendingOrders.length}
              accent
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Recent Orders */}
        <Card className="p-6 animate-slide-up stagger-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-100">Recent orders</h2>
            <span className="text-xs text-surface-500">{orders.length} total</span>
          </div>

          {orders.length === 0 ? (
            <div className="py-8 text-center">
              <svg className="w-10 h-10 mx-auto mb-2 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
              <p className="text-sm text-surface-400">No orders yet.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {orders.slice(0, 5).map((o, i) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-800/80 border border-white/5 flex items-center justify-center text-xs font-bold text-surface-300">
                      #{o.id}
                    </div>
                    <div>
                      <p className="text-sm text-surface-200 font-medium">
                        Order #{o.id}
                      </p>
                      <p className="text-xs text-surface-500">Customer #{o.customer_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={statusColor(o.status)}>
                      {o.status}
                    </span>
                    <span className="text-sm font-semibold text-surface-200 tabular-nums">
                      ₹{o.total_amount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
