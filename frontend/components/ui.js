export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, accent = false }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-2xl font-serif mt-1 ${accent ? "text-amber-600" : "text-navy-950"}`}>
        {value}
      </p>
    </Card>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50";
  const variants = {
    primary: "bg-navy-950 text-white hover:bg-navy-800",
    accent: "bg-amber-500 text-navy-950 hover:bg-amber-600",
    ghost: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Banner({ tone = "warning", children }) {
  const tones = {
    warning: "bg-amber-50 border-amber-300 text-amber-800",
    danger: "bg-red-50 border-red-300 text-red-800",
    info: "bg-navy-50 border-navy-200 text-navy-800",
  };
  return (
    <div className={`border rounded-md px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
  );
}

export function Table({ columns, rows, emptyLabel = "Nothing here yet." }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-gray-500 py-6 text-center">{emptyLabel}</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          {columns.map((col) => (
            <th key={col.key} className="pb-2 pr-4 font-medium">{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-100 last:border-0">
            {columns.map((col) => (
              <td key={col.key} className="py-2.5 pr-4 text-navy-950">
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
