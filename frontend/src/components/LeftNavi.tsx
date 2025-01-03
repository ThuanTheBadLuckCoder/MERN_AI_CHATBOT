import { useAuth } from "../context/AuthContext";
import NavigationLink from "./shared/NavigationLink";
import chat from "../../public/chat.svg";
import admin from "../../public/adminpanel.svg";
import logo from "../../public/codfe_logo.svg";
import LogOut from "./LogOut";
import AutoAwesomeMosaicIcon from '@mui/icons-material/AutoAwesomeMosaic';
import { useLocation } from "react-router-dom"; // Import useLocation
import './styles/isOnSite.css'

interface LeftNaviProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const LeftNavi: React.FC<LeftNaviProps> = ({ isOpen, setIsOpen }) => {
  const auth = useAuth();
  const location = useLocation(); // Get current location

  const toggleNav = () => {
    setIsOpen(!isOpen);
  };

  const isOnSite = (path: string) => location.pathname === path; // Helper to check if on a specific path

  return (
    <div className="flex flex-col flex-nowrap h-full bg-zinc-900">
      <div className={`flex h-full flex-col bg-inherit shadow-lg relative py-2 px-2 ${isOpen ? "gap-2" : ""}`}>
        <div className="flex flex-col size-fit justify-between px-2">
          <button
            onClick={toggleNav}
            className="flex size-8 items-center justify-center rounded-md bg-inherit shadow-md hover:border hover:border-green-500 hover:bg-green-950"
            aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
          >
            <AutoAwesomeMosaicIcon />
          </button>
        </div>
        {/* Hiển thị các thành phần còn lại chỉ khi isOpen === true */}
        {isOpen && (
          <div className="flex flex-col size-full justify-between p-2">
            {auth?.isLoggedIn ? (
              <>
                <div className="flex justify-between flex-col gap-3">
                  <NavigationLink
                    bg="#1D2025"
                    to="/"
                    text={isOpen ? "Home" : ""}
                    textColor="black"
                    icon={<img src={logo} alt="Logo icon" className="border rounded-full" />}
                    class={isOnSite("/") ? "isOnSite" : ""}
                  />
                  {auth.user?.role === "Admin" && (
                    <NavigationLink
                      bg="#1D2025"
                      to="/admin"
                      text={isOpen ? "Admin Panel" : ""}
                      textColor="black"
                      icon={<img src={admin} alt="Admin icon" />}
                      class={isOnSite("/admin") ? "isOnSite" : ""}
                    />
                  )}
                  <NavigationLink
                    bg="#1D2025"
                    to="/chat"
                    text={isOpen ? "Chat" : ""}
                    textColor="black"
                    icon={<img src={chat} alt="Chat icon" />}
                    class={isOnSite("/chat") ? "isOnSite" : ""}
                  />
                </div>

                <LogOut />
              </>
            ) : (
              <>
                <NavigationLink
                  bg="#00fffc"
                  to="/"
                  text=""
                  textColor="black"
                  icon={<img src={logo} alt="Chat icon" />}
                  class={isOnSite("/") ? "isOnSite" : ""}
                />
                <NavigationLink
                  bg="#00fffc"
                  to="/login"
                  text={isOpen ? "Login" : ""}
                  textColor="black"
                  class={isOnSite("/login") ? "isOnSite" : ""}
                />
                <NavigationLink
                  bg="#51538f"
                  textColor="white"
                  to="/signup"
                  text={isOpen ? "Signup" : ""}
                  class={isOnSite("/signup") ? "isOnSite" : ""}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

};

export default LeftNavi;
