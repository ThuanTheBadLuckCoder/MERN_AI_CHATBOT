import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box, Avatar, Typography, Button, IconButton } from "@mui/material";
import red from "@mui/material/colors/red";
import { useAuth } from "../context/AuthContext";
import ChatItem from "../components/chat/ChatItem";
import { IoMdSend } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import {
  deleteUserChats,
  getUserChats,
  sendChatRequest,
} from "../helper/api-communicator";
import toast from "react-hot-toast";
import LeftNavi from "../components/LeftNavi";
import LogOut from "../components/LogOut";
type Message = {
  role: "user" | "assistant";
  content: string;
};
const Chat = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const auth = useAuth();
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");


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
    const chatData = await sendChatRequest(content);
    setChatMessages([...chatData.chats]);
    //
  };
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

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  }

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevents the default behavior (like form submission)
      handleSubmit();
    }
  }

  const chatBoxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <Box sx={{
      display: "flex", flex: 1, width: "100%", height: "100%",
      mt: 3, gap: 3,
    }}>
      <Box sx={{
        display: { md: "flex", xs: "none", sm: "none" }, flex: 0.2,
        flexDirection: "column",
      }}>
        <Box sx={{
          display: "flex", width: "100%", height: "92.6vh", bgcolor: "rgb(17,29,39)",
          borderRadius: 5, flexDirection: "column", mx: 3, paddingTop: "10px", paddingBottom: "10px;",
          justifyContent: "space-between"
        }}>
          <div className="leftNavi_userInfo">
            <div className="userInfo">
            <Avatar sx={{ bgcolor: "white", color: "black", fontWeight: 700, }}>
              {auth?.user?.name ? `${auth.user.name[0]}${auth.user.name.split(" ")[1]?.[0] ?? ''}` : 'A'}
              
            </Avatar>
            <p className="customFont">
                Hi, {auth?.user?.name}
              </p>

            </div>
            <div className="chat">
              <LeftNavi />

            </div>

          </div>
          {/* <Box sx={{ width: "100%", display: "flex" }}>
            <Button
              onClick={handleDeleteChats}
              sx={{
                width: "232.2px", my: "auto", color: "white",
                fontWeight: "700", borderRadius: 3, mx: "auto",
                bgcolor: red[300],
                ":hover": {
                  bgcolor: red.A400,
                },
              }}
            >
              Clear Conversation
            </Button>
          </Box> */}

          <LogOut />
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          flex: { md: 0.8, xs: 1, sm: 1 },
          flexDirection: "column",
          px: 3,
        }}
        className="custom-scrollbar"
      >
        <div className="clear-model">
          <Typography
            sx={{
              fontSize: "40px",
              color: "white",
              mb: 2,
              mx: "auto",
              fontWeight: "600",
              width: "100%,"
            }}
          >
            Model - GPT 3.5 Turbo
          </Typography>
          <button
            onClick={handleDeleteChats}
            className="clearButton">
            Clear Chat
          </button>

        </div>

        <Box sx={{
          width: "100%",
          height: "77vh",
          borderRadius: 3,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          overflow: "scroll",
          overflowX: "hidden",
          overflowY: "auto",
          scrollBehavior: "smooth",
        }} ref={chatBoxRef} >
          {chatMessages.map((chat, index) => (
            //@ts-ignore
            <ChatItem content={chat.content} role={chat.role} key={index} />
          ))}
        </Box>
        <div
          style={{
            width: "100%",
            borderRadius: 8,
            backgroundColor: "rgb(17,27,39)",
            display: "flex",
            marginTop: "20px",
          }}
        >
          {" "}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            style={{
              width: "100%",
              backgroundColor: "transparent",
              padding: "30px",
              border: "none",
              outline: "none",
              color: "white",
              fontSize: "20px",
            }}
          />
          <IconButton onClick={handleSubmit} sx={{ color: "white", mx: 1 }} disabled={!inputValue.trim()}>
            <IoMdSend />
          </IconButton>
        </div>
      </Box>
    </Box>
  );
};

export default Chat;