import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AppProvider } from "./state/AppContext";
import { ThemeProvider } from "./state/ThemeContext";
import Shell from "./components/Shell";
import Landing from "./pages/Landing";
import Overview from "./pages/Overview";
import Agent from "./pages/Agent";
import Leads from "./pages/Leads";
import Onboarding from "./pages/Onboarding";
import Appointments from "./pages/Appointments";
import CallLogs from "./pages/CallLogs";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import "./styles.css";

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <div className="boot">
        <h1>Something needs a second look.</h1>
        <p>{this.state.error.message}</p>
        <button className="button" onClick={() => window.location.reload()}>
          Reload workspace
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AppProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/app" element={<Shell />}>
                <Route index element={<Overview />} />
                <Route path="agent" element={<Agent />} />
                <Route path="leads" element={<Leads />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="calls" element={<CallLogs />} />
                <Route path="settings" element={<Settings />} />
                <Route path="onboarding" element={<Onboarding />} />
              </Route>

              <Route
                path="*"
                element={
                  <div className="boot">
                    <h1>A little off track.</h1>
                    <p>This page could not be found.</p>
                    <Link className="button" to="/auth">
                      Sign in or Go to workspace
                    </Link>
                  </div>
                }
              />
            </Routes>
          </AppProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
