export function Card({ children, className = "", hover = true }) {
  return (
    <div className={`${hover ? "glass-card" : "glass-card-static"} ${className}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, accent = false, icon }) {
  return (
    <Card className="p-5 relative overflow-hidden group">
      {/* Gradient accent strip */}
      <div
        className={`absolute top-0 left-0 w-full h-0.5 ${
          accent
            ? "bg-gradient-to-r from-accent-cyan to-accent-violet"
            : "bg-gradient-to-r from-surface-600 to-surface-500"
        }`}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-surface-400 font-medium mb-2">
            {label}
          </p>
          <p
            className={`text-2xl font-bold tracking-tight ${
              accent ? "text-accent-cyan" : "text-surface-50"
            }`}
          >
            {value}
          </p>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-surface-800/50 border border-white/5 flex items-center justify-center text-surface-400 group-hover:text-accent-cyan transition-colors">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "btn-gradient",
    accent: "btn-gradient",
    surface: "btn-surface",
    ghost: "btn-ghost",
  };
  return (
    <button className={`${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Banner({ tone = "warning", children }) {
  const tones = {
    warning: "pill-warning border-amber-500/20 bg-amber-500/8",
    danger: "pill-danger border-red-500/20 bg-red-500/8",
    info: "pill-info border-blue-500/20 bg-blue-500/8",
  };
  const icons = {
    warning: (
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86l-8.58 14.86A1 1 0 002.59 20h18.82a1 1 0 00.88-1.28L13.71 3.86a1 1 0 00-1.42 0z" />
      </svg>
    ),
    danger: (
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
    ),
  };
  return (
    <div className={`glass-card-static flex items-start gap-3 px-4 py-3.5 text-sm ${tones[tone] || tones.warning}`}>
      {icons[tone]}
      <div>{children}</div>
    </div>
  );
}

export function Table({ columns, rows, emptyLabel = "Nothing here yet." }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg className="w-12 h-12 mx-auto mb-3 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm text-surface-400">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            {columns.map((col) => (
              <th
                key={col.key}
                className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-surface-400"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {columns.map((col) => (
                <td key={col.key} className="py-3 pr-4 text-surface-200">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
