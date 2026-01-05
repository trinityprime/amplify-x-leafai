import { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  Shield,
  User,
  Database,
  Power,
  PowerOff,
  RotateCcw,
} from "lucide-react";

export default function UserTable({
  users,
  onEnable,
  onDisable,
  onChangeRole,
  currentUserEmail,
}: any) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  const filteredUsers = useMemo(() => {
    return users.filter((u: any) => {
      const matchesSearch = u.email
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesRole =
        roleFilter === "ALL" || (u.groups && u.groups.includes(roleFilter));
      const matchesDate =
        !dateFilter ||
        new Date(u.createdAt).toISOString().split("T")[0] === dateFilter;
      return matchesSearch && matchesRole && matchesDate;
    });
  }, [users, search, roleFilter, dateFilter]);

  const sortedUsers = useMemo(() => {
    if (!sortConfig) return filteredUsers;
    return [...filteredUsers].sort((a, b) => {
      let aValue = (a as any)[sortConfig.key] || "";
      let bValue = (b as any)[sortConfig.key] || "";
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortConfig]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" =
      sortConfig?.key === key && sortConfig.direction === "asc"
        ? "desc"
        : "asc";
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-medium focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-600 appearance-none cursor-pointer"
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="FIELD_TECH">Technician</option>
          <option value="DATA_ANALYST">Analyst</option>
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-600 cursor-pointer"
        />

        <button
          onClick={() => {
            setSearch("");
            setRoleFilter("ALL");
            setDateFilter("");
          }}
          className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <th
                className="px-6 py-2 cursor-pointer"
                onClick={() => requestSort("email")}
              >
                Email Address <ArrowUpDown size={12} className="inline ml-1" />
              </th>
              <th className="px-6 py-2">Creation Date</th>
              <th className="px-6 py-2">Role Assignment</th>
              <th className="px-6 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((u: any) => {
              const isSelf = u.email === currentUserEmail;
              const role = u.groups?.[0] || "USER";

              return (
                <tr
                  key={u.username}
                  className={`bg-white hover:bg-slate-50/50 transition-colors ${
                    !u.Enabled ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-6 py-4 rounded-l-2xl border-y border-l border-slate-100">
                    <span className="text-sm font-bold text-slate-700">
                      {u.email}
                    </span>
                  </td>

                  <td className="px-6 py-4 border-y border-slate-100">
                    <span className="text-xs font-medium text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </td>

                  <td className="px-6 py-4 border-y border-slate-100">
                    <div className="relative inline-flex items-center group">
                      <select
                        value={role}
                        disabled={isSelf}
                        onChange={(e) =>
                          onChangeRole(u.username, e.target.value)
                        }
                        className={`text-[11px] font-bold py-1.5 pl-8 pr-6 rounded-lg appearance-none border transition-all ${
                          isSelf
                            ? "bg-slate-50 border-slate-100 text-slate-400"
                            : "bg-white border-slate-200 hover:border-emerald-500"
                        }`}
                      >
                        <option value="ADMIN">System Administrator</option>
                        <option value="FIELD_TECH">Field Technician</option>
                        <option value="DATA_ANALYST">Data Analyst</option>
                      </select>
                      <div className="absolute left-2.5 pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                        {role === "ADMIN" ? (
                          <Shield size={13} />
                        ) : role === "DATA_ANALYST" ? (
                          <Database size={13} />
                        ) : (
                          <User size={13} />
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 rounded-r-2xl border-y border-r border-slate-100 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEnable(u.username)}
                        disabled={isSelf || u.Enabled === true}
                        className={`p-2 rounded-lg transition-colors ${
                          isSelf || u.Enabled === true
                            ? "text-slate-100"
                            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        <Power size={18} />
                      </button>
                      <button
                        onClick={() => onDisable(u.username)}
                        disabled={isSelf || u.Enabled === false}
                        className={`p-2 rounded-lg transition-colors ${
                          isSelf || u.Enabled === false
                            ? "text-slate-100"
                            : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                        }`}
                      >
                        <PowerOff size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
