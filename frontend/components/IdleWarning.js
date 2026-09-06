export default function IdleWarning({ show, onStayLoggedIn, onLogoutNow }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="glass-card p-6 max-w-sm w-full mx-4 animate-scale-in border-white/[0.08]">
        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-status-warning/20 to-status-warning/5 border border-status-warning/20 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-status-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-surface-50 mb-1.5">Still there?</h2>
        <p className="text-sm text-surface-400 mb-5 leading-relaxed">
          You&apos;ve been inactive for a while. You&apos;ll be logged out in{" "}
          <span className="text-status-warning font-medium">1 minute</span> for security.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onStayLoggedIn}
            className="btn-gradient flex-1 py-2.5"
          >
            Stay logged in
          </button>
          <button
            onClick={onLogoutNow}
            className="btn-ghost flex-1 py-2.5"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}