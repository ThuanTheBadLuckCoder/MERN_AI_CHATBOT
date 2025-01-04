import React, { useState } from "react";
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
  const [isNavOpen, setIsNavOpen] = useState(true);
  const location = useLocation(); // Get the current location

  // Check if the current route is '/' or '/notfound'
  const isLeftNaviVisible = location.pathname !== "/" && location.pathname !== "/notfound";

  return (
    <main className="w-screen h-screen overflow-hidden">
      <div className="flex size-full">
        {/* Conditionally render LeftNavi based on the current route */}
        {isLeftNaviVisible && (
          <div className={`transition-all duration-300 ${isNavOpen ? 'w-64' : 'w-16'}`}>
            <LeftNavi isOpen={isNavOpen} setIsOpen={setIsNavOpen} />
          </div>
        )}
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
