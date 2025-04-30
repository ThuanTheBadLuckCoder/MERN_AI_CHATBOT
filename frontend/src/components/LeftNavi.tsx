import { useAuth } from "../context/AuthContext";
import NavigationLink from "./shared/NavigationLink";
import logo from "../../public/codfe_logo.svg";
import LogOut from "./LogOut";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import { useLocation } from "react-router-dom";
import { useEffect, useLayoutEffect, useState } from "react";
import "./styles/isOnSite.css";
import { getConversationList } from "../helper/api-communicator";
import toast from "react-hot-toast";
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

// Define the ConversationMeta type (lightweight version without messages)
interface ConversationMeta {
  _id?: string;
  id?: string;
  title: string;
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
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Function to load conversation list (metadata only)
  const loadConversationList = async () => {
    if (!auth?.isLoggedIn || !auth.user || isLoading) return;
    
    setIsLoading(true);
    toast.loading("Loading Chats", { id: "loadchats" });
    try {
      const data = await getConversationList();
      // Store the conversations in state
      if (data && data.conversations && Array.isArray(data.conversations)) {
        // Sort conversations by updatedAt (newest first)
        const sortedConversations = [...data.conversations].sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setConversations(sortedConversations);
        toast.success("Chats Loaded", { id: "loadchats" });
      } else {
        toast.error("Invalid conversation data", { id: "loadchats" });
      }
    } catch (err) {
      console.log(err);
      toast.error("Loading Failed", { id: "loadchats" });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load of conversations
  useLayoutEffect(() => {
    loadConversationList();
  }, [auth]);

  // Add listener for refresh events
  useEffect(() => {
    // Debounce function to prevent multiple rapid calls
    let timeoutId: number | null = null;
    
    const handleRefresh = () => {
      // Clear any existing timeout
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      
      // Set a new timeout
      timeoutId = window.setTimeout(() => {
        loadConversationList();
        timeoutId = null;
      }, 300); // 300ms debounce
    };

    // Listen for refresh events only
    window.addEventListener('refreshConversations', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshConversations', handleRefresh);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
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
            {isOpen ? <><h1 className="text-2xl font-normal cursor-not-allowed power-grotesk">Codfe</h1></> : <></>}
          </div>
        </div>
        
        {isOpen && (
          <div className="flex flex-col size-full justify-between p-2">
            {auth?.isLoggedIn ? (
              <>
                <div className="flex justify-between flex-col gap-3">
                  
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
                    text={isOpen ? "Start new Chat" : ""}
                    textColor="black"
                    icon={<EditOutlinedIcon />}
                    class={isOnSite("/chat") ? "isOnSite" : ""}
                    id={"start-newchat"}
                  />

                  {/* Display the conversation list if navigated to chat */}
                  {isOpen && conversations.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-white text-sm mb-2 font-medium">Recent</h3>
                      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                        {conversations.map((conversation) => (
                          <NavigationLink
                            key={conversation.id || conversation._id}
                            bg="#2D3035"
                            to={`/chat/${conversation.id || conversation._id}`}
                            text={conversation.title}
                            textColor="white"
                            class={location.pathname === `/chat/${conversation.id || conversation._id}` ? "isOnSite" : ""}
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