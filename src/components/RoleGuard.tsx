// components/RoleGuard.tsx
import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { Navigate } from "react-router-dom";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ("ADMIN" | "FIELD_TECH" | "DATA_ANALYST")[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const session = await fetchAuthSession();
        const groups =
          (session.tokens?.accessToken.payload["cognito:groups"] as string[]) ||
          [];
        setUserGroups(groups);
      } catch (err) {
        console.error("Error fetching user groups:", err);
      } finally {
        setLoading(false);
      }
    };
    checkRole();
  }, []);

  if (loading)
    return <div className="p-10 text-center">Verifying Permissions...</div>;

  if (userGroups.includes("ADMIN")) return <>{children}</>;

  const hasAccess = allowedRoles.some((role) => userGroups.includes(role));

  return hasAccess ? <>{children}</> : <Navigate to="/" replace />;
}
