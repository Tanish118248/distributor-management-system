import { useState } from "react";
import { useRouter } from "next/router";
import api from "../lib/api";
import { Button, Card } from "../components/ui";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("salesperson");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

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
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs tracking-widest text-amber-500 font-semibold">DISTRIBUTOR MANAGEMENT</p>
          <h1 className="font-serif text-2xl text-white mt-2">Order, Stock & Ledger</h1>
        </div>

        <Card className="p-6">
          <div className="flex mb-5 rounded-md border border-gray-200 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 ${mode === "login" ? "bg-navy-950 text-white" : "bg-white text-gray-600"}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 ${mode === "signup" ? "bg-navy-950 text-white" : "bg-white text-gray-600"}`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="you@distributor.com"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
              />
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="owner">Owner</option>
                  <option value="salesperson">Salesperson</option>
                  <option value="accountant">Accountant</option>
                </select>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" variant="accent" disabled={busy} className="w-full">
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
