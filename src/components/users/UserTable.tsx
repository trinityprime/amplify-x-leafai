import { useState, useMemo, useEffect } from "react";
import {
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  loading = false,
}: any) {
  // --- STATE ---
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- LOGIC: Filtering ---
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

  // --- LOGIC: Sorting ---
  const sortedUsers = useMemo(() => {
    if (!sortConfig) return filteredUsers;
    return [...filteredUsers].sort((a, b) => {
      let aValue, bValue;

      if (sortConfig.key === "role") {
        aValue = a.groups?.[0] || "USER";
        bValue = b.groups?.[0] || "USER";
      } else {
        aValue = (a as any)[sortConfig.key] || "";
        bValue = (b as any)[sortConfig.key] || "";
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortConfig]);

  // --- LOGIC: Pagination ---
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(start, start + itemsPerPage);
  }, [sortedUsers, currentPage]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, dateFilter]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" =
      sortConfig?.key === key && sortConfig.direction === "asc"
        ? "desc"
        : "asc";
    setSortConfig({ key, direction });
  };

  // Helper to render sort icons
  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey)
      return <ArrowUpDown size={12} className="opacity-30" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUp size={12} className="text-emerald-500" />
    ) : (
      <ChevronDown size={12} className="text-emerald-500" />
    );
  };

  const LoadingRows = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4 rounded-l-2xl border-y border-l border-slate-100 bg-white">
            <div className="h-4 w-40 bg-slate-100 rounded-md" />
          </td>
          <td className="px-6 py-4 border-y border-slate-100 bg-white">
            <div className="h-3 w-20 bg-slate-50 rounded-md" />
          </td>
          <td className="px-6 py-4 border-y border-slate-100 bg-white">
            <div className="h-8 w-32 bg-slate-50 rounded-lg" />
          </td>
          <td className="px-6 py-4 rounded-r-2xl border-y border-r border-slate-100 bg-white">
            <div className="flex justify-end gap-2">
              <div className="h-8 w-16 bg-slate-50 rounded-md" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );

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
          className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-600 appearance-none cursor-pointer hover:border-emerald-500 transition-colors"
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
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <th
                className="px-6 py-2 cursor-pointer group"
                onClick={() => requestSort("email")}
              >
                <div className="flex items-center gap-2">
                  Email Address <SortIcon columnKey="email" />
                </div>
              </th>
              <th
                className="px-6 py-2 cursor-pointer group"
                onClick={() => requestSort("createdAt")}
              >
                <div className="flex items-center gap-2">
                  Creation Date <SortIcon columnKey="createdAt" />
                </div>
              </th>
              <th
                className="px-6 py-2 cursor-pointer group"
                onClick={() => requestSort("role")}
              >
                <div className="flex items-center gap-2">
                  Role Assignment <SortIcon columnKey="role" />
                </div>
              </th>
              <th className="px-6 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows />
            ) : paginatedUsers.length > 0 ? (
              paginatedUsers.map((u: any) => {
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
                      {isSelf && (
                        <span className="ml-2 text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase font-black tracking-wider">
                          You
                        </span>
                      )}
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
                              : "bg-white border-slate-200 hover:border-emerald-500 cursor-pointer"
                          }`}
                        >
                          <option value="ADMIN">System Administrator</option>
                          <option value="FIELD_TECH">Field Technician</option>
                          <option value="DATA_ANALYST">Data Analyst</option>
                        </select>
                        <div className="absolute left-2.5 pointer-events-none text-slate-400 group-focus-within:text-emerald-500">
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
              })
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="text-center py-20 text-slate-300 font-bold uppercase text-[10px] tracking-widest"
                >
                  No Users Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-2 pt-4 border-t border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Showing{" "}
          <span className="text-slate-900">
            {Math.min(sortedUsers.length, (currentPage - 1) * itemsPerPage + 1)}
            -{Math.min(sortedUsers.length, currentPage * itemsPerPage)}
          </span>{" "}
          of {sortedUsers.length}
        </p>

        <div className="flex items-center gap-1">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-20 transition-all"
          >
            <ChevronLeft size={16} />
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`min-w-[32px] h-8 text-[10px] font-black rounded-lg transition-all ${
                currentPage === i + 1
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "text-slate-400 hover:bg-slate-100"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-20 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
