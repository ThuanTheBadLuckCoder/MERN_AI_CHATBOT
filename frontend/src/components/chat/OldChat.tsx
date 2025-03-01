import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { deleteUserChats, getUserChats, sendChatRequestGemini } from '../../helper/api-communicator';
import toast from 'react-hot-toast';
import ChatBox from './ChatBox';

interface ChatGeminiProps {
    conversationId: string;
}

type Message = {
  role: "user" | "assistant";
  content: string;
  id?: string; // Optional ID for tracking purposes
};

const OldChat = ({ conversationId }: ChatGeminiProps) => {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const auth = useAuth();
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const chatBoxRef = useRef<HTMLDivElement>(null);
    
    // Function to load chats for a specific conversation
    const loadConversation = async (conversationId: string) => {
        if (!auth?.isLoggedIn || !auth.user) return;
        
        setIsLoading(true);
        toast.loading("Loading Chats", { id: "loadchats" });
        
        try {
            const data = await getUserChats(conversationId);
            setChatMessages([...data.chats]);
            toast.success("Successfully loaded chats", { id: "loadchats" });
        } catch (err) {
            console.log(err);
            toast.error("Loading Failed", { id: "loadchats" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        const content = inputRef.current?.value.trim();
        if (!content) return;
      
        // Clear input after submission
        setInputValue("");
        
        const newUserMessage: Message = { role: "user", content };
        setChatMessages((prev) => [...prev, newUserMessage]);
      
        // Set loading to true when waiting for response
        setIsLoading(true);
        
        try {
          const chatData = await sendChatRequestGemini(content, conversationId);
          
          if (chatData.conversation && chatData.conversation.messages) {
            const messages = chatData.conversation.messages;
            const latestAssistantMessage = messages.pop();
      
            if (latestAssistantMessage) {
              setChatMessages((prev) => [...prev, latestAssistantMessage]);
      
              // Dispatch event for metadata refresh only (not full conversations)
              const refreshEvent = new Event('refreshConversations');
              window.dispatchEvent(refreshEvent);
            }
          }
        } catch (error) {
          console.error("Failed to send message");
          toast.error("Failed to send message");
        } finally {
          // Set loading to false after receiving response
          setIsLoading(false);
        }
      };

    // Load conversation when component mounts or conversationId changes
    useEffect(() => {
        if (conversationId) {
          loadConversation(conversationId);
        }
      }, [conversationId, auth?.isLoggedIn]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!auth?.user) {
            return navigate("/login");
        }
    }, [auth, navigate]);

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(event.target.value);
    };
    
    const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevents the default behavior (like form submission)
            handleSubmit();
        }
    };
    
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [chatMessages]);
    
    const handleDeleteChats = async () => {
        try {
            toast.loading("Deleting Chats", { id: "deletechats" });
            await deleteUserChats(conversationId);
            setChatMessages([]);
            toast.success("Deleted Chats Successfully", { id: "deletechats" });
            
            // Trigger an event to refresh the conversation list in LeftNavi
            const refreshEvent = new Event('refreshConversations');
            window.dispatchEvent(refreshEvent);
            
            // Navigate back to new chat page
            navigate('/chat');
        } catch (error) {
            console.log(error);
            toast.error("Deleting chats failed", { id: "deletechats" });
        }
    };

    return (
        <div id="old-chat" className="size-full bg-[#1D2025]/40 rounded-2xl">
            <ChatBox 
                chatMessages={chatMessages} 
                chatBoxRef={chatBoxRef}
                handleSubmit={handleSubmit} 
                handleDeleteChats={handleDeleteChats}
                inputRef={inputRef} 
                inputValue={inputValue} 
                handleInputChange={handleInputChange}
                handleKeyPress={handleKeyPress}
                isLoading={isLoading}
            />
        </div>
    )
}

export default OldChat;