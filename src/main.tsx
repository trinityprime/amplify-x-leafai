import React from "react";
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
      <Authenticator components={components} hideSignUp>
        {(authData) => {
          const { user } = authData;
          return (
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<App />} />
                <Route
                  path="userdashboard"
                  element={<UserDashboard user={user} />}
                />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="dashboard2" element={<Dashboardv2 />} />
                <Route path="reports" element={<Reports />} />
                <Route path="new" element={<NewReport />} />
                <Route path="*" element={<NotFound />} />
                <Route path="uploadimg" element={<UploadImages />} />
                <Route path="leaf-model" element={<LeafHealthPredictor />} />
              </Route>
            </Routes>
          );
        }}
      </Authenticator>
    </BrowserRouter>
  </React.StrictMode>
);
