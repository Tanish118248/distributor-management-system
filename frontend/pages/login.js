import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import api from "../lib/api";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("salesperson");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const timedOut = router.query.reason === "timeout";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        await api.post("/auth/signup", { email, password, role });
      }
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);
      const { data } = await api.post("/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      localStorage.setItem("dsms_token", data.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>Sign In — Distributor Management System</title>
        <meta name="description" content="Log in to your distributor management dashboard" />
      </Head>

      <div className="min-h-screen gradient-mesh flex items-center justify-center px-4 relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="login-orb w-96 h-96 bg-accent-cyan/30 top-[-10%] left-[-10%] animate-float" />
        <div className="login-orb w-80 h-80 bg-accent-violet/25 bottom-[-5%] right-[-5%] animate-float" style={{ animationDelay: "3s" }} />
        <div className="login-orb w-64 h-64 bg-accent-cyan/15 top-[50%] right-[20%] animate-float" style={{ animationDelay: "1.5s" }} />

        <div className="w-full max-w-md relative z-10 animate-slide-up">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center mx-auto mb-4 shadow-glow">
              <svg className="w-7 h-7 text-surface-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <p className="text-xs tracking-[0.25em] text-accent-cyan font-semibold uppercase">
              Distributor Management
            </p>
            <h1 className="text-2xl font-bold text-surface-50 mt-2">
              Order · Stock · Ledger
            </h1>
          </div>

          {/* Timeout warning */}
          {timedOut && (
            <div className="glass-card-static flex items-center gap-2 px-4 py-3 mb-5 border-status-warning/20 animate-fade-in">
              <svg className="w-4 h-4 text-status-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-status-warning">
                You were logged out due to inactivity.
              </p>
            </div>
          )}

          {/* Card */}
          <div className="glass-card-static p-7">
            {/* Tabs */}
            <div className="flex mb-6 rounded-xl bg-surface-800/60 p-1 border border-white/[0.04]">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === "login"
                    ? "bg-gradient-to-r from-accent-cyan to-accent-violet text-surface-950 shadow-glow"
                    : "text-surface-400 hover:text-surface-200"
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === "signup"
                    ? "bg-gradient-to-r from-accent-cyan to-accent-violet text-surface-950 shadow-glow"
                    : "text-surface-400 hover:text-surface-200"
                }`}
              >
                Sign up
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input"
                  placeholder="you@distributor.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input"
                  placeholder="••••••••"
                />
              </div>

              {mode === "signup" && (
                <div className="animate-slide-down">
                  <label className="block text-xs font-medium text-surface-400 mb-1.5 uppercase tracking-wider">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="glass-select"
                  >
                    <option value="owner">Owner</option>
                    <option value="salesperson">Salesperson</option>
                    <option value="accountant">Accountant</option>
                  </select>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-status-danger animate-fade-in">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="btn-gradient w-full py-3 text-sm mt-2"
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Please wait…
                  </span>
                ) : mode === "signup" ? (
                  "Create account"
                ) : (
                  "Log in"
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-surface-500 mt-6">
            Secure distributor portal · Session protected
          </p>
        </div>
      </div>
    </>
  );
}