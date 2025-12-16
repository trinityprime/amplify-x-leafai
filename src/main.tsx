import React from "react";
import ReactDOM from "react-dom/client";
import { Authenticator } from "@aws-amplify/ui-react";
import App from "./App.tsx";
import "./index.css";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout.tsx";
import Dashboard from "./pages/FarmReport/Dashboard.tsx";
import Reports from "./pages/FarmReport/Reports.tsx";
import NewReport from "./pages/FarmReport/NewReport.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboardv2 from "./pages/FarmReport/Dashboardv2.tsx";
import UserDashboard from "./pages/UserDashboard.tsx";
import UploadImages from "./pages/UploadImages.tsx";
import Test from "./pages/Test.tsx"

Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Authenticator hideSignUp>
        {(authData) => {
          const { user } = authData;
          return (
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<App />} />
                <Route path="userdashboard" element={<UserDashboard user={user} />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="dashboard2" element={<Dashboardv2 />} />
                <Route path="reports" element={<Reports />} />
                <Route path="new" element={<NewReport />} />
                <Route path="*" element={<NotFound />} />
                <Route path="uploadimg" element={<UploadImages />} />
                <Route path="test" element={<Test />} />
              </Route>
            </Routes>
          );
        }}
      </Authenticator>
    </BrowserRouter>
  </React.StrictMode>
);
