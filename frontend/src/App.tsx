import Header from "./components/Header";
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import { useAuth } from "./context/AuthContext";
import Admin from "./pages/Admin";
// import Test from "./pages/Test";
import Footer from "./components/footer/Footer";
import { useEffect, useState } from "react";
import LeftNavi from "./components/LeftNavi";

function App() {
  const auth = useAuth();

  console.log(auth);

  const [isShowHeader, setIsShowHeader] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Hide Header if the current path is "*", which is the NotFound page
    if (location.pathname === "*" || location.pathname === "/chat" || location.pathname === "/admin") {
      setIsShowHeader(false);
    } else {
      setIsShowHeader(true); // Show Header for other routes
    }
  }, [location.pathname]);
  return (
    <main>
          {isShowHeader && <Header />}
      <div className="flex">
        <div className="flex-none w-64">
          <LeftNavi />
        </div>
        <div className="flex-initial w-full">
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
          </Routes></div>

      </div>


    </main>
  );
}

export default App;