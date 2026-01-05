import { useState } from "react";
import { UserPlus, Mail, ShieldCheck, AlertCircle } from "lucide-react";

export default function CreateUserForm({ onCreate, validate, error }: any) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ADMIN");

  const handleCreate = () => {
    onCreate(email, role);
    setEmail("");
    setRole("ADMIN");
  };

  const isInvalid = !!error || !email;

  return (
    <div className="flex flex-col gap-5">
      {/* Email Field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
          <Mail size={13} className="text-emerald-600" />
          Email Address
        </label>
        <div className="relative group">
          <input
            type="email"
            placeholder="name@leafcorp.ai"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              validate(e.target.value);
            }}
            className={`w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-4 ${
              error
                ? "border-red-200 bg-red-50 text-red-900 focus:ring-red-100"
                : "border-slate-200 bg-slate-50 group-hover:bg-white focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/10"
            }`}
          />
          {error && (
            <div className="flex items-center gap-1.5 mt-2 px-1 text-red-500">
              <AlertCircle size={12} />
              <p className="text-[10px] font-bold uppercase tracking-tight leading-none">
                {error}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Role Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
          <ShieldCheck size={13} className="text-emerald-600" />
          Access Level
        </label>
        <div className="relative">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer group-hover:bg-white"
          >
            <option value="ADMIN">System Administrator</option>
            <option value="FIELD_TECH">Field Technician</option>
            <option value="DATA_ANALYST">Data Analyst</option>
          </select>
          {/* Custom Select Arrow */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
        <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
          New users will receive an invitation email and will be required to
          change their password on first login.
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={handleCreate}
        disabled={isInvalid}
        className="flex items-center justify-center gap-2 py-4 w-full rounded-2xl bg-slate-900 text-white font-black text-sm transition-all 
                   hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 disabled:bg-slate-100 disabled:text-slate-400 disabled:translate-y-0 shadow-lg shadow-slate-200"
      >
        <UserPlus size={18} />
        Provision Account
      </button>
    </div>
  );
}
