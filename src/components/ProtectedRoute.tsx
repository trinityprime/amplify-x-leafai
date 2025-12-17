// import { Navigate, Outlet } from "react-router-dom";

// export default function ProtectedRoute({
//   user,
//   allowedRoles
// }: {
//   user: any;
//   allowedRoles: string[];
// }) {
//   const groups =
//     user?.signInUserSession?.accessToken?.payload["cognito:groups"] || [];

//   const isAdmin = groups.includes("ADMIN");
//   const hasAccess = isAdmin || allowedRoles.some(r => groups.includes(r));

//   if (!hasAccess) {
//     return <Navigate to="/" replace />;
//   }

//   return <Outlet />;
// }
