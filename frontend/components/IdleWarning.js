export default function IdleWarning({ show, onStayLoggedIn, onLogoutNow }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg">
        <h2 className="font-serif text-lg text-navy-950 mb-2">Still there?</h2>
        <p className="text-sm text-gray-600 mb-4">
          You've been inactive for a while. You'll be logged out in 1 minute for security.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onStayLoggedIn}
            className="flex-1 bg-amber-500 text-navy-950 font-medium rounded-md py-2 hover:bg-amber-600"
          >
            Stay logged in
          </button>
          <button
            onClick={onLogoutNow}
            className="flex-1 border border-gray-300 text-gray-700 rounded-md py-2 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}