import { useUsers } from "../hooks/userApi";
import CreateUserForm from "../components/users/CreateUserForm";
import UserTable from "../components/users/UserTable";
import { ShieldCheck, UserPlus, Users } from "lucide-react";

type UserDashboardProps = {
  user: any;
};

export default function UserDashboard({ user }: UserDashboardProps) {
  const {
    users,
    emailError,
    validateEmail,
    createUser,
    enableUser,
    disableUser,
    changeUserRole,
  } = useUsers(user);

  const adminCount = users.filter((u: any) =>
    u.groups?.includes("ADMIN")
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm transition-all mb-8">
        <div className="flex items-start gap-4">
          {/* Emerald Icon Box - Matches the Upload page exactly */}
          <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm border border-emerald-100/50">
            <Users size={28} strokeWidth={2.5} />
          </div>

          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              User <span className="text-emerald-600">Management</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Control system access and assign employee roles.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100 text-center min-w-[120px]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">
              Total Users
            </p>
            <p className="text-2xl font-black text-slate-700 leading-none">
              {users.length}
            </p>
          </div>
          <div className="bg-emerald-50 px-5 py-2.5 rounded-2xl border border-emerald-100 text-center min-w-[120px]">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.15em] mb-0.5">
              Admins
            </p>
            <p className="text-2xl font-black text-emerald-700 leading-none">
              {adminCount}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="xl:col-span-1">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-24">
            <div className="flex items-center gap-2 mb-6 text-emerald-600">
              <UserPlus size={20} />
              <h2 className="font-bold text-slate-900">Provision New User</h2>
            </div>
            <CreateUserForm
              onCreate={createUser}
              validate={validateEmail}
              error={emailError}
            />
          </div>
        </div>

        {/* Right Column: Table */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" size={20} />
              <h2 className="font-bold text-slate-900">Access Control List</h2>
            </div>
            <div className="p-6">
              <UserTable
                users={users}
                onEnable={enableUser}
                onDisable={disableUser}
                onChangeRole={changeUserRole}
                currentUserEmail={user?.signInDetails?.loginId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
