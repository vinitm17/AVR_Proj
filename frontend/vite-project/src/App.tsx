import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Home from "./pages/Home";
import StationsPage from "./pages/Stations";
import HistoryPage from "./pages/History";
// import OffersPage from "./pages/Offers";
import Start from "./pages/Start";
import OperatorDashboard from "./pages/OperatorDashboard";
import Profile from "./pages/Profile";
import { Toaster } from "sonner";

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/stations" element={<StationsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/operator-dashboard" element={<OperatorDashboard />} />
        <Route path="/profile" element={<Profile />} />
        {/* <Route path="/offers" element={<OffersPage />} /> */}
        <Route path="/" element={<Start/>}/>

        {/* Protected Route */}
        {/* <Route
          path="/home"
          element={token ? <Home /> : <Navigate to="/signin" replace />}
        /> */}

         <Route path="/home" element={<Home />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
