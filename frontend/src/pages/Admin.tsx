import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box, Avatar, Typography, Button, IconButton, Select, SelectChangeEvent, MenuItem } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { IoMdSend } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { getAllIndices, sendLinkRequest, sendFileRequest } from "../helper/api-communicator";
import toast from "react-hot-toast";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { VisuallyHiddenInput } from "../components/shared/VisuallyHiddenInput";
import { Tester } from "./Test";
import InputFileJSON from "../components/upload/InputFileJSON";
import InputFileDOCX from "../components/upload/InputFileDOCX";
type Indexies = {
  index: string;
  content: string;
};

type Link = {
  link: string;
};

const Admin = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const auth = useAuth();
  const [indices, setIndices] = useState<Indexies[]>([]);
  const [chosenIndices, setChosenIndices] = useState<string>("");
  const [chosenFile, setChosenFile] = useState(null);
  const [linkMessages, setLinkMessages] = useState<Link[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [inputLink, setInputLink] = useState<string>("");
  const [isLinkValid, setIsLinkValid] = useState(false);

  const handleSubmitLink = async () => {
    if (isLinkValid && chosenIndices) {
      const link = inputRef.current?.value.trim() as string;
      if (!link) return;

      setLinkMessages((prev) => [...prev, { link }]);
      const linkData = await sendLinkRequest(link, chosenIndices);
      setLinkMessages([...linkData.links]);
      setInputLink(""); // Clear the input after submission
      if (inputRef.current) inputRef.current.value = ""; // Reset ref
    }
  };

  useLayoutEffect(() => {
    if (auth?.isLoggedIn && auth.user) {
      toast.loading("Loading Indices", { id: "loadindices" });
      getAllIndices()
        .then((data) => {
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
  };

  const handleKeyPressLink = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && isLinkValid && chosenIndices) {
      event.preventDefault(); // Prevents the default behavior
      handleSubmitLink();
    }
  };

  const onChangeSelectLink = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as string;
    setChosenIndices(value);
  };


  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; // Check if there's a file
    if (file) {
      setSelectedFile(file);
    }
  };


  const handleSubmitFile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fakeIndex = "uncategorized_vectorstore";
    setChosenIndices(fakeIndex);
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }
    Tester(selectedFile);
    // console.log(selectedFile);

    // Send the file to the API route
    // await sendFileRequest(selectedFile, chosenIndices)
  };


  function isValidURL(string: string) {
    try {
      const url = new URL(string);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (err) {
      return false;
    }
  }

  return (
    <Box sx={{ display: "flex", flex: 1, width: "100%", height: "100%", mt: 3, gap: 3 }}>
      <Box sx={{ display: { md: "flex", xs: "none", sm: "none" }, flex: 0.2, flexDirection: "column" }}>
        <Box sx={{ display: "flex", width: "100%", height: "60vh", bgcolor: "rgb(17,29,39)", borderRadius: 5, flexDirection: "column", mx: 3 }}>
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
            You are at the Admin Panel to give more information for ChatBOT
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flex: { md: 0.8, xs: 1, sm: 1 }, flexDirection: "column", px: 3 }}>
        <Typography sx={{ fontSize: "40px", color: "white", mb: 2, mx: "auto", fontWeight: "600" }}>
          Model - GPT 3.5 Turbo
        </Typography>

        <Typography sx={{ fontSize: "20px", color: "white", mb: 2, mx: "auto", fontWeight: "600" }}>
          Web Loader
        </Typography>
        <Select displayEmpty defaultValue="" onChange={onChangeSelectLink} className="customIndexSelector">
          <MenuItem value="" disabled>
            Select an Index
          </MenuItem>
          {indices.map((indexData, idx) => (
            <MenuItem key={idx} value={indexData.index}>
              {indexData.index || "Unnamed Index"}
            </MenuItem>
          ))}
        </Select>

        <div style={{ width: "100%", borderRadius: 8, backgroundColor: "rgb(17,27,39)", display: "flex" }}>
          <input
            ref={inputRef}
            type="text"
            value={inputLink}
            onChange={handleInputChangeLink}
            onKeyDown={handleKeyPressLink}
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
          <IconButton onClick={handleSubmitLink} sx={{ color: "white", mx: 1 }} disabled={!inputLink.trim() || !isLinkValid || !chosenIndices}>
            <IoMdSend />
          </IconButton>
        </div>

        <Typography sx={{ fontSize: "20px", color: "white", mb: 2, mx: "auto", mt: 2, fontWeight: "600" }}>
          File Loader
        </Typography>
        <Select displayEmpty defaultValue="" onChange={onChangeSelectLink} className="customIndexSelector">
          <MenuItem value="" disabled>
            Select an Index
          </MenuItem>
          {indices.map((indexData, idx) => (
            <MenuItem key={idx} value={indexData.index}>
              {indexData.index || "Unnamed Index"}
            </MenuItem>
          ))}
        </Select>
        <div style={{ width: "100%", borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
          <div style={{ width: "45%", borderRadius: 8, display: "flex"}}>
            <InputFileJSON chosenIndices={chosenIndices}/>

          </div>

          <div style={{ width: "45%", borderRadius: 8, display: "flex"}}>
            <InputFileDOCX chosenIndices={chosenIndices} />

          </div>

        </div>

        {/* <form onSubmit={handleSubmitFile}>
          <input type="file" onChange={handleFileChange} />
          <button type="submit">Upload</button>
        </form> */}

      </Box>
    </Box>
  );
};

export default Admin;
