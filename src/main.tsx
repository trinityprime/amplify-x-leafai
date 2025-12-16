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
import Dashboard from "./pages/Dashboard.tsx";
import Reports from "./pages/Reports.tsx";
import NewReport from "./pages/NewReport.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboardv2 from "./pages/Dashboardv2.tsx";

Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Authenticator hideSignUp>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<App />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dashboard2" element={<Dashboardv2 />} />
            <Route path="reports" element={<Reports />} />
            <Route path="new" element={<NewReport />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Authenticator>
    </BrowserRouter>
  </React.StrictMode>
);
