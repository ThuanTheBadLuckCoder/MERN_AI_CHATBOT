import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import LeftNavi from "./components/LeftNavi";
import './App.css';

function App() {
  const auth = useAuth();
  const [isShowHeader, setIsShowHeader] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "*" || location.pathname === "/chat" || location.pathname === "/admin") {
      setIsShowHeader(false);
    } else {
      setIsShowHeader(true);
    }
  }, [location.pathname]);

  return (
    <main className="w-screen h-screen overflow-hidden">
      <div className="flex size-full">
        <div className={`transition-all duration-300 ${isNavOpen ? 'w-64' : 'w-16'}`}>
          <LeftNavi isOpen={isNavOpen} setIsOpen={setIsNavOpen} />
        </div>
        <div className="flex-1 overflow-auto p-2 w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            {auth?.isLoggedIn && auth.user && (
              <Route path="/chat" element={<Chat />} />
            )}
            {auth?.isLoggedIn && auth.user?.role === "Admin" && (
              <Route path="/admin" element={<Admin />} />
            )}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </main>
  );
}

export default App;