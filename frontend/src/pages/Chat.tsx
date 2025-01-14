import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ChatGPT from "../components/chat/ChatGPT";
import ChatGemini from "../components/chat/ChatGemini";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { styled, Tooltip } from "@mui/material";
import bg from '../../public/main_bg.png';
import { getUserChats } from "../helper/api-communicator";
import toast from "react-hot-toast";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CustomTooltip = styled(({ className, ...props }: React.ComponentProps<typeof Tooltip>) => (
  <Tooltip {...props} classes={{ popper: className }} >
    {props.children}
  </Tooltip>
))(({ theme }) => ({
  [`& .MuiTooltip-tooltip`]: {
    backgroundColor: '#052e16',
    color: '#fff',
    fontSize: '0.875rem',
    borderRadius: '8px',
    padding: '8px 12px',
    boxShadow: theme.shadows[3],
    border: '1px solid #22c55e',
  },
  [`& .MuiTooltip-arrow`]: {
    color: '#052e16',
    '&::before': {
      content: '""',
      display: 'block',
      position: 'absolute',
      backgroundColor: '#052e16',
      width: '10px',
      height: '10px',
      transform: 'rotate(45deg)',
      border: '1px solid #22c55e',
    },
  },
}));

const Chat = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownDisable, setDropdownDisable] = useState(false);
  const dropdownRef = useRef<HTMLUListElement | null>(null);
  const [model, setModel] = useState("Gemini");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [hasChat, setHasChat] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showBackground, setShowBackground] = useState(false);
  const backgroundTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!auth?.user) {
      return navigate("/login");
    }
  }, [auth]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectModel = (model: string) => {
    setModel(model);
    setDropdownOpen(false);
  };

  useLayoutEffect(() => {
    if (auth?.isLoggedIn && auth.user) {
      toast.loading("Loading Chats", { id: "loadchats" });
      getUserChats()
        .then((data) => {
          const hasChats = data.chats.length > 0;
          setChatMessages([...data.chats]);
          setHasChat(hasChats);
          if (!hasChats) {
            // First show background with fade
            backgroundTimeoutRef.current = setTimeout(() => {
              setShowBackground(true);
              // Then show welcome message with fade
              welcomeTimeoutRef.current = setTimeout(() => {
                setShowWelcome(true);
              }, 50); // Start welcome message fade 0.5s after background
            }, 50);
          }
          toast.success("Successfully loaded chats", { id: "loadchats" });
        })
        .catch((err) => {
          console.log(err);
          toast.error("Loading Failed", { id: "loadchats" });
        });
    }
    return () => {
      // Clear timeouts when component unmounts or re-renders
      if (welcomeTimeoutRef.current) {
        clearTimeout(welcomeTimeoutRef.current);
      }
      if (backgroundTimeoutRef.current) {
        clearTimeout(backgroundTimeoutRef.current);
      }
    };
  }, [auth]);

  const handleMessageSend = () => {
    setHasChat(true); // Hide the welcome message as soon as a chat is created
    setShowWelcome(false);
    // Implement your message sending logic here...
  };

  return (
    <div
      id="chat-container"
      className={`size-full overflow-hidden p-0.5 ${hasChat ? "bg-zinc-900" : ""} rounded-3xl`}
      style={{
        transition: "all 0.5s ease", // Increased transition time to 5s
        backgroundImage: (!hasChat && showBackground) ? `url(${bg})` : "none",
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        opacity: 1,
      }}
    >
      <div className="size-full overflow-hidden rounded-2xl flex flex-col">
        <div className="h-10 flex flex-row justify-between items-start mx-2.5 my-2.5 z-50">
          <div className="relative w-fit h-full">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setDropdownOpen(!dropdownOpen);
              }}
              className="flex w-full bg-neutral-900 h-full text-white font-bold py-2 px-4 border border-green-500 rounded-xl overflow-hidden text-left gap-2.5 justify-between"
            >
              <div className="w-5/6 flex flex-row justify-between truncate flex-1">
                {model || "Gemini"}
              </div>
              <ExpandMoreIcon
                sx={{ fontSize: 20 }}
                className="pointer-events-none col-start-1 row-start-1 size-5 self-center justify-self-end text-white sm:size-4"
              />
            </button>
            {dropdownOpen && (
              <ul
                ref={dropdownRef}
                className="absolute z-10 w-full bg-gray-950 border border-green-500 rounded-xl max-h-60 overflow-y-auto"
              >
                <li
                  key={"GPT"}
                  onClick={() => handleSelectModel("GPT")}
                  className="py-2 px-4 bg-neutral-950 hover:bg-neutral-800 hover:text-white cursor-pointer truncate"
                >
                  GPT
                </li>
                <li
                  key={"Gemini"}
                  onClick={() => handleSelectModel("Gemini")}
                  className="py-2 px-4 bg-neutral-950 hover:bg-neutral-800 hover:text-white cursor-pointer truncate"
                >
                  Gemini
                </li>
              </ul>
            )}
          </div>
          <div className="flex gap-1.5 items-center w-full h-10 justify-center">
            <p className="font-serif text-xs text-gray-500">The Dangers Are Real</p>
            <CustomTooltip title="Code can make mistakes. Check important info." arrow>
              <ErrorOutlineIcon sx={{ fontSize: 14, color: "gray" }} className="cursor-help" />
            </CustomTooltip>
          </div>
        </div>
        <div className="w-full h-full gap-1.5 overflow-hidden">
          <div className="h-full relative">
          {!hasChat && (
              <div
                className={`absolute bg-transparent top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full z-50`}
                style={{
                  transition: "all 0.5s ease", // 5s transition for welcome message
                  opacity: showWelcome ? 1 : 0,
                  transform: `translate(-50%, -50%)`,
                }}
              >
                <div className="flex size-full flex-col items-center gap-5 mb-36">
                  <h2 className="text-green-400 text-4xl font-bold">
                    How can I assist you today?
                  </h2>
                  <span className="text-lg">
                    You can ask some questions related to Frontend code optimization, request
                    HTML, CSS, JS, PHP code,...
                  </span>
                </div>
              </div>
            )}


            {model === "GPT" && <ChatGPT onMessageSend={handleMessageSend} />}
            {model === "Gemini" && <ChatGemini onMessageSend={handleMessageSend} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;