export default function Unauthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-4xl font-black text-slate-800">Access Denied</h1>
      <p className="text-slate-500 mt-2">
        You do not have the required permissions to view this page.
      </p>
      <button
        onClick={() => (window.location.href = "/")}
        className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold"
      >
        Return Home
      </button>
    </div>
  );
}
