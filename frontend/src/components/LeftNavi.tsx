import { useAuth } from "../context/AuthContext";
import NavigationLink from "./shared/NavigationLink";
import logo from "../../public/codfe_logo.svg";
import LogOut from "./LogOut";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
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
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Add a lastFetchTimestamp ref to track when the last API call was made
  const lastFetchTimestampRef = useRef<number>(0);
  // Add a ref to track if data has been loaded initially
  const initialLoadCompletedRef = useRef<boolean>(false);
  // Add a pendingFetchRef to prevent multiple concurrent fetches
  const pendingFetchRef = useRef<boolean>(false);
  // Add a debounceTimerRef to handle debounced fetches
  const debounceTimerRef = useRef<number | null>(null);

  // Memoize the loadConversationList function to prevent unnecessary recreations
  const loadConversationList = useCallback(async (showToast = true, force = false) => {
    // Don't fetch if not logged in
    if (!auth?.isLoggedIn || !auth.user) return;
    
    // Skip if already loading
    if (pendingFetchRef.current) return;
    
    // Don't fetch if we've fetched recently (within the last 5 seconds), unless forced
    const currentTime = Date.now();
    if (!force && currentTime - lastFetchTimestampRef.current < 5000) {
      return;
    }
    
    // Set pending fetch flag
    pendingFetchRef.current = true;
    setIsLoading(true);
    
    if (showToast) {
      toast.loading("Loading Chats", { id: "loadchats" });
    }
    
    try {
      const data = await getConversationList();
      
      // Store the conversations in state
      if (data && data.conversations && Array.isArray(data.conversations)) {
        // Sort conversations by updatedAt (newest first)
        const sortedConversations = [...data.conversations].sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        
        // Only update state if the data is different
        const hasChanged = JSON.stringify(sortedConversations) !== JSON.stringify(conversations);
        
        if (hasChanged) {
          setConversations(sortedConversations);
        }
        
        if (showToast) {
          toast.success("Chats Loaded", { id: "loadchats" });
        }
        
        // Mark initial load as completed
        initialLoadCompletedRef.current = true;
      } else {
        if (showToast) {
          toast.error("Invalid conversation data", { id: "loadchats" });
        }
      }
    } catch (err) {
      console.log(err);
      if (showToast) {
        toast.error("Loading Failed", { id: "loadchats" });
      }
    } finally {
      // Update last fetch timestamp
      lastFetchTimestampRef.current = Date.now();
      setIsLoading(false);
      pendingFetchRef.current = false;
    }
  }, [auth, conversations]);

  // Initial load of conversations
  useLayoutEffect(() => {
    if (!initialLoadCompletedRef.current) {
      loadConversationList();
    }
  }, [loadConversationList]);

  // Add listener for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      
      // Set a new debounce timer
      debounceTimerRef.current = window.setTimeout(() => {
        loadConversationList(false, true); // Force refresh
        debounceTimerRef.current = null;
      }, 300); // 300ms debounce
    };

    // Listen for refresh events
    window.addEventListener('refreshConversations', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshConversations', handleRefresh);
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [loadConversationList]);

  // Polling mechanism to check for new conversations - REDUCED FREQUENCY
  useEffect(() => {
    if (!auth?.isLoggedIn) return;
    
    // Poll for updates every 2 minutes instead of 30 seconds
    const intervalId = setInterval(() => {
      // Only poll if the user is active and the component is visible
      if (document.visibilityState === 'visible') {
        loadConversationList(false);
      }
    }, 120000); // 2 minutes - reduced from 30 seconds
    
    // Listen for visibility changes to pause polling when tab is not visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 
          Date.now() - lastFetchTimestampRef.current > 120000) { // Only fetch if it's been at least 2 minutes
        loadConversationList(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [auth?.isLoggedIn, loadConversationList]);

  // Check for URL changes to detect when a new conversation might have been created
  useEffect(() => {
    // If we navigate to a chat page, check if we need to refresh the conversation list
    if (location.pathname.startsWith('/chat/')) {
      // Extract the conversation ID from the URL
      const currentPathId = location.pathname.split('/chat/')[1];
      
      // Only refresh if this chat isn't already in our list
      const chatExists = conversations.some(
        conv => (conv.id === currentPathId || conv._id === currentPathId)
      );
      
      if (!chatExists && initialLoadCompletedRef.current) {
        // Debounce the refresh
        if (debounceTimerRef.current) {
          window.clearTimeout(debounceTimerRef.current);
        }
        
        debounceTimerRef.current = window.setTimeout(() => {
          loadConversationList(false);
          debounceTimerRef.current = null;
        }, 300);
      }
    }
  }, [location.pathname, conversations, loadConversationList]);

  // Add listener for new conversation creation
  useEffect(() => {
    const handleNewConversation = () => {
      // Force refresh conversation list when a new conversation is created
      // But add a small delay to prevent race conditions
      setTimeout(() => {
        loadConversationList(false, true); // Force refresh for new conversation
      }, 500);
    };
    
    // Create a custom event for new conversation creation
    window.addEventListener('newConversationCreated', handleNewConversation);
    
    return () => {
      window.removeEventListener('newConversationCreated', handleNewConversation);
    };
  }, [loadConversationList]);

  const toggleNav = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsOpen(!isOpen);
      setIsTransitioning(false);
    }, 300); // Match this duration with your CSS transition time
  };

  const isOnSite = (path: string) => location.pathname === path; // Helper to check if on a specific path

  // Modified to return a Promise to match the expected type
  const handleNewChat = async (): Promise<void> => {
    // Navigate to new chat page
    navigate('/chat');
    
    // Dispatch a custom event to ensure the conversation list refreshes after creating a new chat
    // We'll use a setTimeout to ensure the navigation completes first
    setTimeout(() => {
      window.dispatchEvent(new Event('newConversationCreated'));
    }, 300);
  };

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
                    onClick={handleNewChat}
                  />

                  {/* Display conversation list with a refresh button */}
                  {isOpen && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-white text-sm font-medium">Recent</h3>
                        <button 
                          onClick={() => loadConversationList(true, true)} // Force refresh when button is clicked
                          className="text-xs text-gray-400 hover:text-white"
                          disabled={isLoading}
                        >
                          {isLoading ? "Loading..." : "Refresh"}
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                        {conversations.length > 0 ? (
                          conversations.map((conversation) => (
                            <NavigationLink
                              key={conversation.id || conversation._id}
                              bg="#2D3035"
                              to={`/chat/${conversation.id || conversation._id}`}
                              text={conversation.title}
                              textColor="white"
                              class={location.pathname === `/chat/${conversation.id || conversation._id}` ? "isOnSite" : ""}
                            />
                          ))
                        ) : (
                          <p className="text-gray-400 text-xs p-2">No recent conversations</p>
                        )}
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