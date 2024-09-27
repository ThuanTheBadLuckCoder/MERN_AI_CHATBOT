import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box, Avatar, Typography, Button, IconButton, Select, SelectChangeEvent, MenuItem } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { IoMdSend } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import {
  getAllIndices,
  sendLinkRequest,
} from "../helper/api-communicator";
import toast from "react-hot-toast";
import ChatItem from "../components/chat/ChatItem";
import Chat from "./Chat";
type Indexies = {
  index: string;
  content: string;
};
type Link = {
  link: string;
}
const Admin = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const auth = useAuth();
  const [indices, setIndices] = useState<Indexies[]>([]);
  const [chosenIndices, setChosenIndices] = useState<string>("")
  const [linkMessages, setLinkMessages] = useState<Link[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [inputLink, setInputLink] = useState<string>("");
  const [isLinkValid, setIsLinkValid] = useState(false);

  const handleSubmitLink = async () => {
    if (isLinkValid && indices) {
      const link = inputRef.current?.value.trim() as string;
      const chosenIndex = chosenIndices;
      console.log("chosenIndex: ", chosenIndex);
      if (!link && !indices) {
        return;
      }
      if (inputRef && inputRef.current) {
        inputRef.current.value = "";
        setInputLink("");
      }
      const newLink: Link = { link };
      setLinkMessages((prev) => [...prev, newLink]);
      const linkData = await sendLinkRequest(link, chosenIndex);
      setLinkMessages([...linkData.links]);

    }
  }

  useLayoutEffect(() => {
    if (auth?.isLoggedIn && auth.user) {
      toast.loading("Loading Indices", { id: "loadindices" });
      getAllIndices()
        .then((data) => {
          console.log("Raw indices data: ", data); // Log the entire data structure for inspection
          setIndices([...data.indices]);
          toast.success("Successfully loaded indices", { id: "loadindices" });
        })
        .catch((err) => {
          console.log(err);
          toast.error("Loading Failed", { id: "loadindices" });
        });
    }
  }, [auth]);
  
  useEffect(() => {
    if (!auth?.user) {
      return navigate("/login");
    }
  }, [auth]);


  const handleInputChangeLink = (event: React.ChangeEvent<HTMLInputElement>) => {
    const valueFinal = event.target.value;
    setInputLink(valueFinal);
    setIsLinkValid(isValidURL(valueFinal));
  }

  const handleKeyPressLink = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && isLinkValid) {
      event.preventDefault(); // Prevents the default behavior (like form submission)
      handleSubmitLink();
    }
  }

  const onChangeSelectLink = (event: SelectChangeEvent<unknown>, child: React.ReactNode) => {
    const value = event.target.value as string;
    setChosenIndices(value);
    
  };
  // console.log(`selected: ${chosenIndices}`);
  

  function isValidURL(string: string) {
    try {
      const url = new URL(string);
      return url.protocol === "http:" || url.protocol === "https:"; // Chỉ chấp nhận http/https
    } catch (err) {
      return false;
    }
  }


  return (
    <Box sx={{ display: "flex", flex: 1, width: "100%", height: "100%", mt: 3, gap: 3, }}>
      <Box sx={{ display: { md: "flex", xs: "none", sm: "none" }, flex: 0.2, flexDirection: "column", }}>
        <Box sx={{
          display: "flex", width: "100%", height: "60vh", bgcolor: "rgb(17,29,39)",
          borderRadius: 5, flexDirection: "column", mx: 3,
        }} >
          <Avatar
            sx={{
              mx: "auto",
              my: 2,
              bgcolor: "white",
              color: "black",
              fontWeight: 700,
            }}
          >
            {auth?.user?.name ? `${auth.user.name[0]}${auth.user.name.split(" ")[1]?.[0] ?? ''}` : 'A'}
          </Avatar>
          <Typography sx={{ mx: "auto", fontFamily: "work sans", my: 1, p: 0 }}>
            Hi, {auth?.user?.name}
          </Typography>

          <Typography sx={{ mx: "auto", fontFamily: "work sans", p: 3 }}>
            You are at the Admin Panel to giving more information for ChatBOT
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flex: { md: 0.8, xs: 1, sm: 1 }, flexDirection: "column", px: 3, }} >
        <Typography
          sx={{
            fontSize: "40px",
            color: "white",
            mb: 2,
            mx: "auto",
            fontWeight: "600",
          }}
        >
          Model - GPT 3.5 Turbo
        </Typography>

        <Typography sx={{
          fontSize: "20px", color: "white", mb: 2,
          mx: "auto", fontWeight: "600",
        }}>
          Web Base Loader
        </Typography>
        <div style={{ width: "100%", borderRadius: 8, backgroundColor: "rgb(17,27,39)", display: "flex" }}>
          {" "}
          <input ref={inputRef} type="text" value={inputLink}
            onChange={handleInputChangeLink} onKeyDown={handleKeyPressLink}
            style={{
              width: "100%", backgroundColor: "transparent", padding: "30px", border: "none",
              outline: "none", color: "white", fontSize: "20px",
            }} />
          <Select
            displayEmpty
            defaultValue=""
            onChange={onChangeSelectLink}
          >
            <MenuItem value="" disabled>
              Select a Index
            </MenuItem>

            {indices.map((indexData, idx) => (
              <MenuItem key={idx} value={indexData.index || idx}>
                {indexData.index || "Unnamed Index"}
              </MenuItem>
            ))}


          </Select>
          <IconButton onClick={handleSubmitLink} sx={{ color: "white", mx: 1 }} disabled={!inputLink.trim()}>
            <IoMdSend />
          </IconButton>

        </div>

      </Box>

    </Box>
  );
};

export default Admin;