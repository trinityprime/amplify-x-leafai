import { Link, Outlet } from "react-router-dom";
import { useAuthenticator } from "@aws-amplify/ui-react";

export default function Layout() {
  const { signOut } = useAuthenticator();

  return (
    <div className="flex flex-col">
      <nav className="flex gap-5 sticky top-0 z-50 p-3 border-b-1 border-black bg-white items-center">
        <Link to="/">Home</Link>
        <div className="grow" />
        <Link to="/userdashboard">User Dashboard</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/dashboard2">Dashboard v2</Link>
        <Link to="/reports">Reports</Link>
        <Link to="/new">New Report</Link>
        <Link to="/uploadimg">Upload Image</Link>
        <Link to="/leaf-model">Leaf AI Model</Link>

        <button
          onClick={signOut}
          className="ml-4 px-3 py-1 border border-black hover:bg-black hover:text-white cursor-pointer"
        >
          Logout
        </button>
      </nav>

      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
