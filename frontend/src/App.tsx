import Header from "./components/Header";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import { useAuth } from "./context/AuthContext";
import Admin from "./pages/Admin";
import Footer from "./components/footer/Footer";

function App() {
  const auth = useAuth();
  const admin = "admin@gmail.com";
  // console.log(auth.user?.email);
  return (
    <main>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {auth?.isLoggedIn && auth.user && (
          <Route path="/chat" element={<Chat />} />
        )}
        {auth?.isLoggedIn && auth.user?.email == admin && (
          <Route path="/admin" element={<Admin />} />
        )}
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
  );
}

export default App;