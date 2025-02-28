import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
    
      if (inputRef.current) {
          inputRef.current.value = "";
          setInputValue("");
      }
    
      // Append the user's message immediately
      const newUserMessage: Message = { role: "user", content };
      setChatMessages((prev) => [...prev, newUserMessage]);
    
      // Create a unique ID for the typing message
      const typingMessageId = Date.now().toString();
      
      // Append a temporary assistant message as a "typing..." placeholder
      const typingMessage: Message = { 
        role: "assistant", 
        content: "Assistant is typing...", 
        id: typingMessageId
      };
      
      setChatMessages((prev) => [...prev, typingMessage]);
    
      try {
          // Fetch assistant response
          const chatData = await sendChatRequestGemini(content, conversationId);
          
          // The API returns the full conversation, so we need to extract the latest assistant message
          if (chatData.conversation && chatData.conversation.messages) {
              // Get the most recent assistant message from the conversation
              const messages = chatData.conversation.messages;
              const latestAssistantMessage = messages
                  .filter(msg => msg.role === "assistant")
                  .pop();
              
              if (latestAssistantMessage) {
                  // Replace the typing message with the actual response
                  setChatMessages((prev) =>
                      prev.map((msg) => {
                          // Check if this is our typing message using the ID
                          if ('id' in msg && msg.id === typingMessageId) {
                              return {
                                  role: "assistant",
                                  content: latestAssistantMessage.content
                              };
                          }
                          return msg;
                      })
                  );
              } else {
                  // Remove the typing message if no assistant message was found
                  setChatMessages((prev) => 
                      prev.filter((msg) => !('id' in msg) || msg.id !== typingMessageId)
                  );
                  toast.error("No response received from assistant");
              }
          } else {
              // If the response doesn't have the expected structure
              setChatMessages((prev) => 
                  prev.filter((msg) => !('id' in msg) || msg.id !== typingMessageId)
              );
              toast.error("Unexpected response format");
          }
      } catch (error) {
          console.log(error);
          toast.error("Failed to send message");
    
          // Remove the "typing..." placeholder in case of failure
          setChatMessages((prev) => 
              prev.filter((msg) => !('id' in msg) || msg.id !== typingMessageId)
          );
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
            await deleteUserChats(conversationId); // Pass the conversationId to delete specific conversation
            setChatMessages([]);
            toast.success("Deleted Chats Successfully", { id: "deletechats" });
        } catch (error) {
            console.log(error);
            toast.error("Deleting chats failed", { id: "deletechats" });
        }
    };

    return (
        <div id="chat-gemini" className="relative h-full">
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