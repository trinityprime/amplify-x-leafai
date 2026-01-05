import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { fetchAuthSession } from "aws-amplify/auth";

export default function Layout() {
  const { signOut } = useAuthenticator();
  const location = useLocation();
  const [groups, setGroups] = useState<string[]>([]);

  useEffect(() => {
    const getGroups = async () => {
      try {
        const session = await fetchAuthSession();
        const userGroups =
          (session.tokens?.accessToken.payload["cognito:groups"] as string[]) ||
          [];
        setGroups(userGroups);
      } catch (err) {
        console.error("Error fetching session groups", err);
      }
    };
    getGroups();
  }, []);

  const isActive = (path: string) => location.pathname === path;
  const isAdmin = groups.includes("ADMIN");

  const navLinks = [
    { name: "Dashboard", path: "/dashboard", roles: ["DATA_ANALYST"] },
    { name: "Dashboardv2", path: "/dashboard2", roles: ["DATA_ANALYST"] },
    { name: "Reports", path: "/reports", roles: ["DATA_ANALYST"] },
    { name: "New Report", path: "/new", roles: ["DATA_ANALYST"] },
    {
      name: "Leaf AI",
      path: "/leaf-model",
      roles: ["ADMIN", "FIELD_TECH", "DATA_ANALYST"],
    },
    { name: "Upload", path: "/uploadimg", roles: ["FIELD_TECH"] },
    { name: "Users", path: "/userdashboard", roles: ["ADMIN"] },
  ];

  const visibleLinks = navLinks.filter(
    (link) => isAdmin || link.roles.some((role) => groups.includes(role))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold transition-transform group-hover:scale-110">
                  L
                </div>
                <span className="text-xl font-bold text-gray-900 tracking-tight">
                  LeafCorp <span className="text-emerald-600">AI</span>
                </span>
              </Link>

              <div className="hidden md:flex items-center gap-1">
                {visibleLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                      isActive(link.path)
                        ? "bg-emerald-50 text-emerald-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden lg:block text-right mr-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Access Level
                </p>
                <p className="text-xs font-medium text-emerald-600">
                  {isAdmin
                    ? "Administrator"
                    : groups[0]?.replace("_", " ") || "Guest"}
                </p>
              </div>
              <button
                onClick={signOut}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
