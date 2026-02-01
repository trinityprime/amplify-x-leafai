import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { Authenticator, View, Text, Heading } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import App from "./App.tsx";
import "./index.css";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout.tsx";
import Dashboard from "./pages/FarmReport/Dashboard.tsx";
import Reports from "./pages/FarmReport/Reports.tsx";
import NewReport from "./pages/FarmReport/NewReport.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboardv2 from "./pages/FarmReport/Dashboardv2.tsx";
import UserDashboard from "./pages/UserDashboard.tsx";
import UploadImages from "./pages/UploadImages.tsx";
import LeafHealthPredictor from "./pages/LeafModel.tsx";
import RoleGuard from "./components/RoleGuard.tsx";
import TurnstileWidget from "./components/TurnstileWidget.tsx";

Amplify.configure(outputs);

const components = {
  Header() {
    return (
      <View textAlign="center" padding="large">
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            L
          </div>
          <Heading
            level={3}
            className="text-slate-800 font-extrabold tracking-tight"
          >
            LeafCorp AI
          </Heading>
        </div>
        <Text color="gray">Enterprise Agricultural Management</Text>
      </View>
    );
  },
  Footer() {
    return (
      <View textAlign="center" padding="medium">
        <Text fontSize="small" color="gray">
          &copy; {new Date().getFullYear()} LeafCorp. All rights reserved.
        </Text>
      </View>
    );
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <InitialCaptchaGate />
    </BrowserRouter>
  </React.StrictMode>,
);

function InitialCaptchaGate() {
  const [initialCaptchaToken, setInitialCaptchaToken] = useState<string>("");

  if (!initialCaptchaToken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-6">
          <div className="flex justify-center items-center gap-2">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
              L
            </div>
            <h1 className="text-3xl font-black text-slate-900">LeafCorp AI</h1>
          </div>
          <h2 className="text-xl font-semibold text-slate-700">
            Verify you're human to continue
          </h2>
          <TurnstileWidget onVerify={setInitialCaptchaToken} />
        </div>
      </div>
    );
  }

  return (
    <Authenticator components={components} hideSignUp>
      {(authData) => {
        const { user } = authData;
        return <AppRoutes user={user} />;
      }}
    </Authenticator>
  );
}

function AppRoutes({ user }: { user: any }) {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<App />} />

        {/* ADMIN ONLY */}
        <Route
          path="userdashboard"
          element={
            <RoleGuard allowedRoles={["ADMIN"]}>
              <UserDashboard user={user} />
            </RoleGuard>
          }
        />

        {/* DATA ANALYST */}
        <Route
          path="dashboard"
          element={
            <RoleGuard allowedRoles={["DATA_ANALYST"]}>
              <Dashboard />
            </RoleGuard>
          }
        />
        <Route
          path="dashboard2"
          element={
            <RoleGuard allowedRoles={["DATA_ANALYST"]}>
              <Dashboardv2 />
            </RoleGuard>
          }
        />
        <Route
          path="reports"
          element={
            <RoleGuard allowedRoles={["DATA_ANALYST"]}>
              <Reports />
            </RoleGuard>
          }
        />
        <Route
          path="new"
          element={
            <RoleGuard allowedRoles={["DATA_ANALYST"]}>
              <NewReport />
            </RoleGuard>
          }
        />

        {/* FIELD TECHNICIAN */}
        <Route
          path="uploadimg"
          element={
            <RoleGuard allowedRoles={["FIELD_TECH"]}>
              <UploadImages />
            </RoleGuard>
          }
        />

        {/* PUBLIC */}
        <Route path="leaf-model" element={<LeafHealthPredictor />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
