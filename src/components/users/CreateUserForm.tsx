import { useState } from "react";
import { UserPlus, Mail, ShieldCheck } from "lucide-react";

export default function CreateUserForm({ onCreate, validate, error }: any) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ADMIN");

  const handleCreate = () => {
    onCreate(email, role);
    setEmail("");
    setRole("ADMIN");
  };

  return (
    <div className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 items-start">
      <div className="flex flex-col flex-1 gap-2 w-full relative">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Mail size={14} className="text-emerald-600" />
          User Email
        </label>
        <input
          type="email"
          placeholder="ryan@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            validate(e.target.value);
          }}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-4 ${
            error
              ? "border-red-300 focus:ring-red-100 text-red-900"
              : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-50/50"
          }`}
        />

        {error && (
          <p className="absolute -bottom-5 left-0 text-[10px] font-bold text-red-500 uppercase tracking-tight">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full md:w-64">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-600" />
          Access Level
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 outline-none transition-all cursor-pointer"
        >
          <option value="ADMIN">Admin</option>
          <option value="FIELD_TECH">Field Technician</option>
          <option value="DATA_ANALYST">Analyst</option>
        </select>
      </div>

      <div className="pt-6 w-full md:w-auto">
        <button
          onClick={handleCreate}
          disabled={!!error || !email}
          className="flex items-center justify-center gap-2 h-[42px] w-full md:w-auto rounded-lg bg-emerald-600 px-8 text-sm font-bold text-white transition-all 
                    hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 shadow-sm"
        >
          <UserPlus size={18} />
          Create
        </button>
      </div>
    </div>
  );
}
