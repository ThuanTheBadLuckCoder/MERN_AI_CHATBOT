import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import LeftNavi from "./components/LeftNavi";
import "./App.css";
import ChangePassword from "./pages/ForgotPassword";
import RequestOTP from "./pages/RequestOTP";

function App() {
  const auth = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [isNaviShow, setIsNaviShow] = useState(true);
  const location = useLocation();

  const protectedRoutes = ["/chat", "/admin", "/chat/:conversationId?"];
  const authRoutes = ["/", "/login", "/otp-request", "/change-password", "/signup"];
  const isRouteNotFound = ![...authRoutes].includes(location.pathname) &&
    !location.pathname.startsWith("/chat") &&
    location.pathname !== "/admin";

  // Hide LeftNavi if:
  // - The route is in authRoutes (login/signup/etc.)
  // - The user is trying to access /chat but is not logged in
  // - The page does not exist (404)
  const isLeftNaviVisible =
    !isRouteNotFound &&
    !authRoutes.includes(location.pathname) &&
    !(location.pathname.startsWith("/chat") && !auth?.isLoggedIn);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      setIsNaviShow(width > 425);
      setIsNavOpen(width >= 900);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <main className="w-screen h-screen overflow-hidden">
      <div className="flex size-full">
        {isLeftNaviVisible && isNaviShow && (
          <div className={`transition-all duration-300 ${isNavOpen ? "w-64" : "w-16"}`}>
            <LeftNavi isOpen={isNavOpen} setIsOpen={setIsNavOpen} />
          </div>
        )}
        <div className="flex-1 overflow-auto p-2 w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/otp-request" element={<RequestOTP />} />
            <Route path="/change-password" element={<ChangePassword />} />

            {/* Protected Routes */}
            <Route path="/chat/:conversationId?" element={auth?.isLoggedIn ? <Chat /> : <Navigate to="/login" replace />} />
            <Route path="/admin" element={auth?.isLoggedIn && auth.user?.role === "Admin" ? <Admin /> : <Navigate to="/" replace />} />

            {/* Catch all unknown routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </main>
  );
}

export default App;