import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box, Avatar, Typography, Button, IconButton, Select, SelectChangeEvent, MenuItem, InputLabel, FormControl, FormHelperText } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { IoMdSend } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { getAllIndices, sendLinkRequest, sendFileRequest, createNewIndex } from "../helper/api-communicator";
import toast from "react-hot-toast";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { VisuallyHiddenInput } from "../components/shared/VisuallyHiddenInput";
import { Tester } from "./Test";
import InputFileJSON from "../components/upload/InputFileJSON";
import InputFileDOCX from "../components/upload/InputFileDOCX";
import InputFilePDF from "../components/upload/InputFilePDF"
import LeftNavi from "../components/LeftNavi";
import LogOut from "../components/LogOut";
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
  const [inputIndex, setInputIndex] = useState<string>("");
  const [isLinkValid, setIsLinkValid] = useState(false);
  const [isIndexValid, setIsIndexValid] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileType, setSelectedFileType] = useState('');

  const handleSubmitLink = async () => {
    if (isLinkValid && chosenIndices) {
      
      console.log("link: ", inputLink);
      if (!inputLink) return;

      const linkData = await sendLinkRequest(inputLink, chosenIndices);
      console.log("linkData", linkData);
      setInputLink(""); // Clear the input after submission
      if (inputRef.current) inputRef.current.value = ""; // Reset ref
    }
  };

  const handleSubmitIndex = async () => {
    // if (isIndexValid) {
    const index = inputRef.current?.value.trim() as string;
    if (!index) return;
    try {
      await createNewIndex(inputIndex)
      toast.success("Successful Create New Index");
    } catch (error) {
      toast.error("Can't Create New Index with error");

    }
    setInputIndex(""); // Clear the input after submission
    if (inputRef.current) inputRef.current.value = ""; // Reset ref
    // }
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

  const handleInputChangeIndex = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputIndex(value);
    setIsIndexValid(validateIndex(value));
  };

  const handleKeyPressLink = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && isLinkValid && chosenIndices) {
      event.preventDefault(); // Prevents the default behavior
      handleSubmitLink();
    } else if (event.key === "Enter") {
      toast.error("The Link is not Valid");
    }
  };

  const onChangeSelectLink = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as string;
    setChosenIndices(value);
  };

  const onChangeSelectFileType = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as string;
    setSelectedFileType(value);
  }

  function validateIndex(input: string): boolean {
    // Kiểm tra nếu input là chữ thường
    if (input !== input.toLowerCase()) {
      toast.error("Index must be lower case");
      return false;
    }
    return true;
  }


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
        <Box sx={{
          display: "flex", width: "100%", height: "92vh", bgcolor: "unset",
          borderRadius: 5, flexDirection: "column", mx: 1, paddingTop: "10px", paddingBottom: "10px;",
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
            <div className="admin">
              <LeftNavi />
            </div>

          </div>
          <div className="clear_logout">
            <div className="clearButton">

            </div>
            <LogOut />

          </div>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flex: { md: 0.8, xs: 1, sm: 1 }, flexDirection: "column", px: 3 }}>
        <Typography sx={{ fontSize: "40px", color: "white", mb: 2, mx: "auto", fontWeight: "600" }}>
          Model - GPT 3.5 Turbo
        </Typography>
        <div className="webLoaderContainer">
          <Typography sx={{ fontSize: "20px", color: "white", mb: 2, mx: "auto", fontWeight: "600" }}>
            Web Loader
          </Typography>
          
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <InputLabel id="demo-simple-select-autowidth-label">Index</InputLabel>
            <Select onChange={onChangeSelectLink} className="customIndexSelector"
              labelId="demo-simple-select-autowidth-label"
              id="demo-simple-select-autowidth"
              autoWidth
              label="Index">

              {indices.map((indexData, idx) => (
                <MenuItem key={idx} value={indexData.index}>
                  {indexData.index || "Unnamed Index"}
                </MenuItem>
              ))}
            </Select>

          </FormControl>
          <div style={{
            width: "100%", backgroundColor: "unset", display: "flex",
            border: "1px solid #515357", borderRadius: "100px",
          }} className="inputLinkAdmin">
            <input
              ref={inputRef}
              type="text"
              value={inputLink}
              onChange={handleInputChangeLink}
              onKeyDown={handleKeyPressLink}
              style={{
                width: "100%",
                backgroundColor: "transparent",
                padding: "0px 20px 0px 20px",
                border: "none",
                outline: "none",
                color: "white",
                fontSize: "20px",
                height: "54px",

              }}
              placeholder="Input a link here..."
              
            />
            <IconButton onClick={handleSubmitLink} sx={{ color: "white", mx: 1 }} disabled={!inputLink.trim() || !isLinkValid || !chosenIndices}>
              <IoMdSend />
            </IconButton>
          </div>

        </div>


        <Typography sx={{ fontSize: "20px", color: "white", mb: 2, mx: "auto", mt: 2, fontWeight: "600" }}>
          File Loader
        </Typography>
        <div className="custom-select-file-type">
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
          <Select displayEmpty defaultValue="" onChange={onChangeSelectFileType} className="customFileTypeSelector">
            <MenuItem value="" disabled>
              Select an File Type
            </MenuItem>
            <MenuItem value="json">JSON</MenuItem>
            <MenuItem value="docx">DOCX</MenuItem>
            <MenuItem value="pdf">PDF</MenuItem>
          </Select>
        </div>

        <div style={{ width: "100%", borderRadius: 8, display: "flex", justifyContent: "space-between", gap: "10px", flexDirection: "column" }}>
          <div style={{ width: "100%", borderRadius: 8, display: "flex" }}>
            {selectedFileType === "json" && <InputFileJSON chosenIndices={chosenIndices} />}
            {selectedFileType === "docx" && <InputFileDOCX chosenIndices={chosenIndices} />}
            {selectedFileType === "pdf" && <InputFilePDF chosenIndices={chosenIndices} />}

          </div>

        </div>

        <div>
          <Typography sx={{ fontSize: "20px", color: "white", mb: 2, mx: "auto", mt: 2, fontWeight: "600" }}>
            Create New Index
          </Typography>

          <div style={{ width: "100%", borderRadius: 8, backgroundColor: "rgb(17,27,39)", display: "flex" }}>
            <input
              ref={inputRef}
              type="text"
              value={inputIndex}
              onChange={handleInputChangeIndex}
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
            <IconButton onClick={handleSubmitIndex} sx={{ color: "white", mx: 1 }} disabled={!inputIndex}>
              <IoMdSend />
            </IconButton>
          </div>

        </div>

      </Box>
    </Box>
  );
};

export default Admin;
