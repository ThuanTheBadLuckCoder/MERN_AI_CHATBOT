import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Typography, IconButton, Select, SelectChangeEvent, MenuItem, InputLabel, FormControl, FormHelperText } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { IoMdSend } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { getAllIndices, sendLinkRequest, createNewIndex } from "../helper/api-communicator";
import toast from "react-hot-toast";
import InputFileJSON from "../components/upload/InputFileJSON";
import InputFileDOCX from "../components/upload/InputFileDOCX";
import InputFilePDF from "../components/upload/InputFilePDF";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
      toast.loading("Link is being read", { id: "addLink" });
      const linkData = await sendLinkRequest(inputLink, chosenIndices);
      
      console.log("linkData", linkData);
      setInputLink(""); // Clear the input after submission
      if (inputRef.current) inputRef.current.value = ""; // Reset ref
      toast.success("Successfully push Linked to Elasticsearch", { id: "addLink" });
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

  const onChangeSelectLink = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as string;
    setChosenIndices(value);
  };

  const onChangeSelectFileType = (event: React.ChangeEvent<HTMLSelectElement>) => {
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
    <div className="admin-container flex flex-col">
      <h1 className="font-serif	text-2xl antialiased font-bold">Retrieval-Augmented Generation</h1>
      <div className="divide-y divide-gray-100 flex flex-col gap-2">
        <div className="web-loader-container p-2 border rounded-md border-green-500">
          <h2 className="underline font-serif text-lg antialiased font-medium">Web Loader</h2>
          <div className="w-full flex">
            <form className="w-full flex gap-1.5 items-center h-10">
              <div className="grid grid-cols-1 w-2/6 h-full">
                <select onChange={onChangeSelectLink} 
                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-gray-950 py-1.5 pl-3 pr-8 text-base text-white font-bold outline outline-1 -outline-offset-1 outline-green-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-green-600 sm:text-sm/6">
                  <option value="" className="">
                    Select an Index
                  </option>
                  {indices.map((indexData, idx) => (
                    <option key={idx} value={indexData.index}>
                      {indexData.index || "Unnamed Index"}
                    </option>
                  ))}
                </select>
                <ExpandMoreIcon sx={{ fontSize: 20 }} className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4" />
              </div>
              <div className="w-4/6 h-full flex border border-green-500 rounded-md overflow-hidden px-4 gap-1.5">
              <input ref={inputRef} type="text" value={inputLink}
                onChange={handleInputChangeLink} onKeyDown={handleKeyPressLink}
                placeholder="Input a link here..." 
                className="h-full block min-w-0 grow py-1.5 text-base text-white placeholder:text-gray-400 focus:outline focus:outline-0 bg-inherit font-sans" />
              <button onClick={handleSubmitLink} disabled={!inputLink.trim() || !isLinkValid || !chosenIndices}>
                <IoMdSend />
              </button>
            </div>
            </form>
            
          </div>
        </div>
        <div className="file-loader-container">
          <h2>File Loader</h2>
          <div>
            <div className="custom-select-file-type">
              <select onChange={onChangeSelectLink} className="">
                <option value="" disabled>
                  Select an Index
                </option>
                {indices.map((indexData, idx) => (
                  <option key={idx} value={indexData.index}>
                    {indexData.index || "Unnamed Index"}
                  </option>
                ))}
              </select>
              <select defaultValue="" onChange={onChangeSelectFileType} className="">
                <option value="" disabled>
                  Select an File Type
                </option>
                <option value="json">JSON</option>
                <option value="docx">DOCX</option>
                <option value="pdf">PDF</option>
              </select>
            </div>

            <div>
              <div>
                {selectedFileType === "json" && <InputFileJSON chosenIndices={chosenIndices} />}
                {selectedFileType === "docx" && <InputFileDOCX chosenIndices={chosenIndices} />}
                {selectedFileType === "pdf" && <InputFilePDF chosenIndices={chosenIndices} />}

              </div>

            </div>
          </div>
        </div>
        <div className="new-index-container">
          <h2>Create a New Index</h2>
          <div>
            <div>
              <input ref={inputRef} type="text" value={inputIndex} onChange={handleInputChangeIndex} />
              <IconButton onClick={handleSubmitIndex} sx={{ color: "white", mx: 1 }} disabled={!inputIndex}>
                <IoMdSend />
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
