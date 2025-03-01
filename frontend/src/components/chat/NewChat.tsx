import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { sendChatRequestGemini } from "../../helper/api-communicator";
import toast from "react-hot-toast";
import logo from "../../../public/codfe_logo.svg"
import bg from '../../../public/main_bg.png'
import CodeIcon from '@mui/icons-material/Code';



const NewChat = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState("Good day");

  useEffect(() => {
    // Auto-grow textarea when input changes
    if (inputRef.current) {
      inputRef.current.style.height = "auto"; // Reset height
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`; // Adjust height
    }
  }, [inputValue]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Time to rest");
    }
  }, []);

  const handleSubmit = async () => {
    const content = inputRef.current?.value.trim();
    if (!content) return;

    if (!auth?.isLoggedIn || !auth.user) {
      toast.error("Please login to continue");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    toast.loading("Creating new conversation...", { id: "newchat" });

    try {
      const chatData = await sendChatRequestGemini(content, "");
      console.log("Chat response data:", chatData);

      if (chatData.conversation && (chatData.conversation._id || chatData.conversation.id)) {
        const conversationId = chatData.conversation._id || chatData.conversation.id;
        toast.success("Conversation created!", { id: "newchat" });

        setInputValue("");

        const refreshEvent = new CustomEvent("refreshConversations", {
          detail: { conversationId },
        });
        window.dispatchEvent(refreshEvent);

        navigate(`/chat/${conversationId}`);
      } else {
        console.error("Invalid conversation data:", chatData);
        toast.error("Failed to create conversation", { id: "newchat" });
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Something went wrong", { id: "newchat" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      if (event.shiftKey) {
        // Allow Shift + Enter to create a new line
        event.preventDefault();
        const { selectionStart, selectionEnd } = event.currentTarget;
        setInputValue(
          (prev) =>
            prev.substring(0, selectionStart) + "\n" + prev.substring(selectionEnd)
        );
        // Move cursor to the new line position
        setTimeout(() => {
          event.currentTarget.selectionStart = event.currentTarget.selectionEnd = selectionStart + 1;
        }, 0);
      } else {
        // Normal Enter keypress sends the message
        event.preventDefault();
        handleSubmit();
      }
    }
  };
  

  return (
    <div id="new-chat" className="flex flex-col size-full justify-center gap-4"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <h2 className="flex flex-row flex-wrap justify-center items-center mb-4 text-4xl font-thin gap-4">
        <img src={logo} />{greeting}, {auth?.user?.name || "User"}!
      </h2>
      <div className="flex h-16 w-full justify-center">

        <div className="flex flex-col w-1/2 h-fit items-center justify-between gap-1.5 p-4 rounded-2xl bg-inherit outline outline-1 -outline-offset-1 outline-[#515357] focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1">
          <div className='w-full pl-3'>
            <span>Codfe 3.5</span>
          </div>
          <div className="flex size-full">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex flex-col w-full text-lg items-center justify-center border border-transparent bg-transparent pl-3 outline-none resize-none min-h-[40px] py-1 leading-normal scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-transparent"
              placeholder="How can Codfe help you today?"
              rows={1}
              disabled={isLoading}
              onKeyDown={handleKeyPress}
              style={{
                height: 'auto',
                maxHeight: '300px',
                overflowY: 'hidden' // Initial state, will be updated by adjustHeight
              }}
            />
            <button
              onClick={handleSubmit}
              className="flex flex-col items-center justify-center rounded-full size-10 disabled:cursor-not-allowed disabled:opacity-75 bg-green-900 border border-green-800 shrink-0"
              disabled={isLoading}
            >
              <CodeIcon className="size-5" />
            </button>
          </div>


        </div>
      </div>
    </div>
  );
};

export default NewChat;
