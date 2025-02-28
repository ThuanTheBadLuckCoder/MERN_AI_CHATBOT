import { useAuth } from "../context/AuthContext";
import NavigationLink from "./shared/NavigationLink";
import logo from "../../public/codfe_logo.svg";
import LogOut from "./LogOut";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import { useLocation } from "react-router-dom";
import { useLayoutEffect, useState } from "react";
import "./styles/isOnSite.css";
import { getUserCons } from "../helper/api-communicator";
import toast from "react-hot-toast";

// Define the Conversation type
interface Conversation {
  _id?: string;
  id?: string;
  title: string;
  messages: any[];
  createdAt: string;
  updatedAt: string;
}

interface LeftNaviProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const LeftNavi: React.FC<LeftNaviProps> = ({ isOpen, setIsOpen }) => {
  const auth = useAuth();
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useLayoutEffect(() => {
    if (auth?.isLoggedIn && auth.user) {
      toast.loading("Loading Chats", { id: "loadchats" });
      getUserCons()
        .then((data) => {
          // Store the conversations in state
          if (data && data.conversations && Array.isArray(data.conversations)) {
            setConversations(data.conversations);
            toast.success("Chats Loaded", { id: "loadchats" });
          } else {
            toast.error("Invalid conversation data", { id: "loadchats" });
          }
        })
        .catch((err) => {
          console.log(err);
          toast.error("Loading Failed", { id: "loadchats" });
        });
    }
  }, [auth]);

  const toggleNav = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsOpen(!isOpen);
      setIsTransitioning(false);
    }, 300); // Match this duration with your CSS transition time
  };

  const isOnSite = (path: string) => location.pathname === path; // Helper to check if on a specific path

  return (
    <div
      className={`flex flex-col flex-nowrap bg-black size-full ${
        isOpen ? "navi-open" : "navi-closed"
      } ${isTransitioning ? "navi-transitioning" : ""}`}
    >
      <div
        className={`flex size-full flex-col bg-inherit shadow-lg relative py-2 px-2 ${
          isOpen ? "gap-2" : ""
        }`}
      >
        <div
          className={`flex flex-row w-full justify-start gap-5 items-center p-2 rounded-md`}
        >
          <div>
            <button
              onClick={toggleNav}
              className="flex size-8 items-center justify-center bg-inherit shadow-md"
              aria-label={isOpen ? "Close navigation" : "Open navigation"}
            >
              <img
                src={logo}
                alt="Logo icon"
                className="border border-green-500 rounded-md bg-green-950 overflow-hidden"
              />
            </button>
          </div>
          <div className="w-full flex">
            {isOpen ? <><h1 className="font-serif text-2xl italic font-bold cursor-not-allowed">Codfe</h1></> : <></>}
          </div>
        </div>
        
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
                    icon={<HomeOutlinedIcon />}
                    class={isOnSite("/") ? "isOnSite" : ""}
                  />
                  {auth.user?.role === "Admin" && (
                    <NavigationLink
                      bg="#1D2025"
                      to="/admin"
                      text={isOpen ? "Admin Panel" : ""}
                      textColor="black"
                      icon={<AdminPanelSettingsOutlinedIcon />}
                      class={isOnSite("/admin") ? "isOnSite" : ""}
                    />
                  )}
                  <NavigationLink
                    bg="#1D2025"
                    to="/chat"
                    text={isOpen ? "Chat" : ""}
                    textColor="black"
                    icon={<ChatOutlinedIcon />}
                    class={isOnSite("/chat") ? "isOnSite" : ""}
                  />

                  {/* Display the conversation list if navigated to chat */}
                  {isOpen && conversations.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-white text-sm mb-2 font-medium">Recent Chats</h3>
                      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                        {conversations.map((conversation) => (
                          <NavigationLink
                            key={conversation.id}
                            bg="#2D3035"
                            to={`/chat/${conversation.id}`}
                            text={conversation.title}
                            textColor="white"
                            class={isOnSite(`/chat/${conversation.id}`) ? "isOnSite" : ""}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <LogOut />
              </>
            ) : (
              <>
                
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftNavi;