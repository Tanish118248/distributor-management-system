import Link from "next/link";
import { useRouter } from "next/router";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", roles: ["owner", "salesperson", "accountant"] },
  { href: "/dashboard/stock", label: "Stock", roles: ["owner", "salesperson", "accountant"] },
  { href: "/dashboard/orders", label: "Orders", roles: ["owner", "salesperson", "accountant"] },
  { href: "/dashboard/ledger", label: "Ledger", roles: ["owner", "accountant"] },
  { href: "/dashboard/products", label: "Products", roles: ["owner", "salesperson", "accountant"] },
];

export default function Layout({ children, user, onLogout }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-60 bg-navy-950 text-white flex flex-col">
        <div className="px-6 py-6 border-b border-navy-800">
          <p className="text-xs tracking-widest text-amber-500 font-semibold">DISTRIBUTOR</p>
          <p className="font-serif text-lg leading-tight mt-1">Order · Stock · Ledger</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.filter((item) => !user || item.roles.includes(user.role)).map((item) => {
            const active = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-navy-800 text-amber-500 font-medium"
                    : "text-gray-300 hover:bg-navy-900 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-navy-800">
          {user && (
            <>
              <p className="text-xs text-gray-400">Signed in as</p>
              <p className="text-sm truncate">{user.email}</p>
              <p className="text-xs uppercase tracking-wide text-amber-500 mt-0.5">{user.role}</p>
            </>
          )}
          <button
            onClick={onLogout}
            className="mt-3 text-xs text-gray-400 hover:text-white underline"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
