import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { deleteUserChats, getUserChats, sendChatRequestGemini } from '../../helper/api-communicator';
import toast from 'react-hot-toast';
import ChatBox from './ChatBox';

interface ChatGeminiProps {
    onMessageSend: () => void;
  }

type Message = {
    role: "user" | "assistant";
    content: string;
};

const ChatGemini = ({ onMessageSend }: ChatGeminiProps) => {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const auth = useAuth();
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState<string>("");
    const chatBoxRef = useRef<HTMLDivElement>(null)
    const handleSubmit = async () => {
        const content = inputRef.current?.value.trim() as string;
        if (!content) {
            return;
        }
        if (inputRef && inputRef.current) {
            inputRef.current.value = "";
            setInputValue("");
        }
        const newMessage: Message = { role: "user", content };
        setChatMessages((prev) => [...prev, newMessage]);
        onMessageSend();
        const chatData = await sendChatRequestGemini(content);
        setChatMessages([...chatData.chats]);
    };

    useLayoutEffect(() => {
        if (auth?.isLoggedIn && auth.user) {
            toast.loading("Loading Chats", { id: "loadchats" });
            getUserChats()
                .then((data) => {
                    setChatMessages([...data.chats]);
                    toast.success("Successfully loaded chats", { id: "loadchats" });
                })
                .catch((err) => {
                    console.log(err);
                    toast.error("Loading Failed", { id: "loadchats" });
                });
        }
    }, [auth]);
    useEffect(() => {
        if (!auth?.user) {
            return navigate("/login");
        }
    }, [auth]);

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
            await deleteUserChats();
            setChatMessages([]);
            toast.success("Deleted Chats Successfully", { id: "deletechats" });
        } catch (error) {
            console.log(error);
            toast.error("Deleting chats failed", { id: "deletechats" });
        }
    };

    return (
        <div id="chat-gemini" className="relative h-full">
            <ChatBox chatMessages={chatMessages} chatBoxRef={chatBoxRef}
                handleSubmit={handleSubmit} handleDeleteChats={handleDeleteChats}
                inputRef={inputRef} inputValue={inputValue} handleInputChange={handleInputChange}
                handleKeyPress={handleKeyPress}
            />
        </div>
    )
}

export default ChatGemini;