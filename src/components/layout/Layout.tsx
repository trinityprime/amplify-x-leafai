import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Menu,
  X,
  LayoutDashboard,
  FilePlus,
  Download,
  CloudSun,
  Leaf,
  UploadCloud,
  Users,
  LogOut,
  ShieldCheck,
} from "lucide-react";

export default function Layout() {
  const { signOut } = useAuthenticator();
  const location = useLocation();
  const [groups, setGroups] = useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const isAdmin = groups.includes("ADMIN");
  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    {
      name: "New Report",
      path: "/new",
      roles: ["DATA_ANALYST"],
      icon: FilePlus,
    },
    {
      name: "Dashboard",
      path: "/dashboard2",
      roles: ["DATA_ANALYST"],
      icon: LayoutDashboard,
    },
    { name: "Export", 
      path: "/export", 
      roles: ["FIELD_TECH"], 
      icon: Download },
    {
      name: "Weather",
      path: "/weather",
      roles: ["FIELD_TECH"],
      icon: CloudSun,
    },
    {
      name: "Leaf AI",
      path: "/leaf-model",
      roles: ["ADMIN", "FIELD_TECH", "DATA_ANALYST"],
      icon: Leaf,
    },
    {
      name: "Upload",
      path: "/uploadimg",
      roles: ["FIELD_TECH"],
      icon: UploadCloud,
    },
    { name: "Users",
       path: "/userdashboard",
        roles: ["ADMIN"],
         icon: Users },
  ];

  const visibleLinks = navLinks.filter(
    (link) => isAdmin || link.roles.some((role) => groups.includes(role)),
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navbar with Glassmorphism */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo Section */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 transition-transform group-hover:rotate-3">
                  <Leaf size={20} fill="currentColor" />
                </div>
                <span className="text-lg font-black text-slate-800 tracking-tight">
                  LeafCorp <span className="text-emerald-600 italic">AI</span>
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-1">
                {visibleLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                        isActive(link.path)
                          ? "bg-emerald-50 text-emerald-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Icon
                        size={16}
                        strokeWidth={isActive(link.path) ? 2.5 : 2}
                      />
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Profile & Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col items-end px-3 py-1 border-r border-slate-200 mr-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] leading-tight">
                  Security Level
                </span>
                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <ShieldCheck size={12} className="text-emerald-500" />
                  )}
                  <span className="text-xs font-bold text-slate-700">
                    {isAdmin
                      ? "System Admin"
                      : groups[0]?.replace("_", " ") || "Authorized User"}
                  </span>
                </div>
              </div>

              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-red-600 transition-all shadow-md shadow-slate-200"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                className="md:hidden p-2 text-slate-600"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 animate-in slide-in-from-top duration-300">
            <div className="px-4 pt-2 pb-6 space-y-1">
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold ${
                      isActive(link.path)
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-600"
                    }`}
                  >
                    <Icon size={20} />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}



