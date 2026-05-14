import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Home from "./pages/Home";
import StationsPage from "./pages/Stations";
import HistoryPage from "./pages/History";
import Profile from "./pages/Profile";
import { Toaster } from "sonner";
import { DashboardShell } from "./components/DashboardShell";

function isLoggedIn() {
  return Boolean(localStorage.getItem("token"));
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  return isLoggedIn() ? <Navigate to="/home" replace /> : children;
}

function ProtectedShell() {
  return isLoggedIn() ? <DashboardShell /> : <Navigate to="/signin" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/signin" element={<PublicOnlyRoute><SignIn /></PublicOnlyRoute>} />
        <Route path="/signup" element={<PublicOnlyRoute><SignUp /></PublicOnlyRoute>} />
        <Route path="/" element={<Navigate to={isLoggedIn() ? "/home" : "/signin"} replace />} />

        <Route element={<ProtectedShell />}>
          <Route path="/home" element={<Home />} />
          <Route path="/stations" element={<StationsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to={isLoggedIn() ? "/home" : "/signin"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
