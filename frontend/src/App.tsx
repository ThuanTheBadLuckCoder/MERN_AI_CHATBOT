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
import "./App.css";
import ChangePassword from "./pages/ChangePassword";

function App() {
  const auth = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [isNaviShow, setIsNaviShow] = useState(true);
  const location = useLocation();

  const isLeftNaviVisible =
    location.pathname !== "/" &&
    location.pathname !== "/login" &&
    location.pathname !== "/changepw" &&
    location.pathname !== "/signup" &&
    location.pathname !== "/notfound";

  // Combined resize logic
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      // Handle visibility (smaller screens)
      if (width <= 425) {
        setIsNaviShow(false);
      } else {
        setIsNaviShow(true);
      }

      // Handle width-based open/close
      if (width < 900) {
        setIsNavOpen(false);
      } else {
        setIsNavOpen(true);
      }
    };

    // Set initial state based on window width
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup event listener
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <main className="w-screen h-screen overflow-hidden">
      <div className="flex size-full">
        {isLeftNaviVisible && isNaviShow && (
          <div
            className={`transition-all duration-300 ${
              isNavOpen ? "w-64" : "w-16"
            }`}
          >
            <LeftNavi isOpen={isNavOpen} setIsOpen={setIsNavOpen} />
          </div>
        )}
        <div className="flex-1 overflow-auto p-2 w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/changepw" element={<ChangePassword />} />
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
