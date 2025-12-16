// src/components/Layout.tsx
import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex flex-col">
      <nav className="flex gap-5 sticky top-0 z-50 p-3 border border-black bg-white">
        <Link to="/">Home</Link>
        <div className="grow"/>
        <Link to="/userdashboard">User Dashboard</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/dashboard2">Dashboard v2</Link>
        <Link to="/reports">Reports</Link>
        <Link to="/new">New Report</Link>
        <Link to="/uploadimg">Upload Image</Link>
        <Link to="/test">test</Link>
      </nav>
      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}