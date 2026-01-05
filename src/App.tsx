import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import { Users, BarChart3, UploadCloud, Sprout, FilePlus } from "lucide-react";

export default function App() {
  const [groups, setGroups] = useState<string[]>([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const getSession = async () => {
      const session = await fetchAuthSession();
      const payload = session.tokens?.idToken?.payload;
      setGroups((payload?.["cognito:groups"] as string[]) || []);
      setUserName(
        (payload?.given_name as string) || (payload?.email as string) || "User"
      );
    };
    getSession();
  }, []);

  const isAdmin = groups.includes("ADMIN");

  const portalActions = [
    {
      name: "User Management",
      desc: "Manage employee roles and system access",
      path: "/userdashboard",
      icon: <Users className="w-6 h-6" />,
      roles: ["ADMIN"],
      color: "bg-blue-500",
    },
    {
      name: "Farm Reports",
      desc: "View detailed agricultural analytics",
      path: "/reports",
      icon: <BarChart3 className="w-6 h-6" />,
      roles: ["DATA_ANALYST"],
      color: "bg-emerald-500",
    },
    {
      name: "New Assessment",
      desc: "Start a fresh crop health report",
      path: "/new",
      icon: <FilePlus className="w-6 h-6" />,
      roles: ["DATA_ANALYST"],
      color: "bg-emerald-600",
    },
    {
      name: "Upload Field Data",
      desc: "Upload images from the field for processing",
      path: "/uploadimg",
      icon: <UploadCloud className="w-6 h-6" />,
      roles: ["FIELD_TECH"],
      color: "bg-orange-500",
    },
    {
      name: "Leaf AI Model",
      desc: "Run health predictions on plant samples",
      path: "/leaf-model",
      icon: <Sprout className="w-6 h-6" />,
      roles: ["ADMIN", "FIELD_TECH", "DATA_ANALYST"],
      color: "bg-green-600",
    },
  ];

  const visibleActions = portalActions.filter(
    (action) => isAdmin || action.roles.some((r) => groups.includes(r))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Header */}
      <header className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900">
          Welcome back,{" "}
          <span className="text-emerald-600">{userName.split("@")[0]}</span>
        </h1>
        <p className="text-slate-500 mt-2 text-lg">
          What would you like to accomplish today?
        </p>
      </header>

      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleActions.map((action) => (
          <Link
            key={action.path}
            to={action.path}
            className="group flex flex-col h-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300"
          >
            {/* Icon Section */}
            <div
              className={`w-12 h-12 ${action.color} text-white rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shrink-0 shadow-sm`}
            >
              {action.icon}
            </div>

            {/* Content Section */}
            <div className="flex-grow">
              <h3 className="text-xl font-bold text-slate-900 mb-1 leading-tight">
                {action.name}
              </h3>
              {/* line-clamp-2 ensures 2 lines max so cards stay uniform */}
              <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
                {action.desc}
              </p>
            </div>

            {/* Footer Section - Clean & Simple */}
            <div className="mt-6 flex justify-end items-center pt-4 border-t border-slate-50">
              <div className="text-emerald-600 font-bold text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                Open <span className="text-lg">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
