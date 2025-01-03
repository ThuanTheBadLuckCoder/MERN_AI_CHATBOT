import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconButton } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { IoMdSend } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { getAllIndices, sendLinkRequest, createNewIndex } from "../helper/api-communicator";
import toast from "react-hot-toast";
import InputFileJSON from "../components/upload/InputFileJSON";
import InputFileDOCX from "../components/upload/InputFileDOCX";
import InputFilePDF from "../components/upload/InputFilePDF";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import IndexSelector from "../components/shared/IndexSelector";
import IndexList from "../components/index/IndexList";
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
  const [inputLink, setInputLink] = useState<string>("");
  const [inputIndex, setInputIndex] = useState<string>("");
  const [isIndexValid, setIsIndexValid] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState("");
  const dropdownRef = useRef<HTMLUListElement | null>(null);
  const [webSelectedIndex, setWebSelectedIndex] = useState<string>("");
  const [fileSelectedIndex, setFileSelectedIndex] = useState<string>("");
  const [fileTypeSelectedIndex, setFileTypeSelectedIndex] = useState<string>("");
  const fileTypes: string[] = ["JSON", "DOCX", "PDF"];
  const handleSubmitLink = async () => {
    if (!inputLink || !selectedIndex) {
      toast.error("Please provide both a link and select an index");
      return;
    }

    try {
      toast.loading("Processing link...", { id: "linkSubmission" });
      const linkData = await sendLinkRequest(inputLink, selectedIndex);
      console.log(linkData);
      // Clear inputs on success
      setInputLink("");
      if (inputRef.current) inputRef.current.value = "";

      toast.success("Successfully added link to Elasticsearch", { id: "linkSubmission" });
    } catch (error) {
      console.error("Error submitting link:", error);
      toast.error("Failed to process link. Please try again.", { id: "linkSubmission" });
    }

  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    const value = event.target.value.trim();
    setInputLink(value);


    if (value && !isValidURL(value)) {
      toast.error("Please enter a valid URL (must start with http:// or https://)");
    }
  };

  const handleInputChangeIndex = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputIndex(value);
    setIsIndexValid(validateIndex(value));
  };

  const handleKeyPressLink = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!selectedIndex) {
        toast.error("Please select an index first");
        return;
      }
      if (!isValidURL(inputLink)) {
        toast.error("Please enter a valid URL (must start with http:// or https://)");
        return;
      }
      handleSubmitLink();
    }
  };

  const onChangeSelectFileType = (fileTypes: string) => {
    setFileTypeSelectedIndex(fileTypes);
    setDropdownOpen(false);
  }

  function validateIndex(input: string): boolean {
    // Kiểm tra nếu input là chữ thường
    if (input !== input.toLowerCase()) {
      toast.error("Index must be lower case");
      return false;
    }
    return true;
  }

  function isValidURL(string: string): boolean {
    try {
      const url = new URL(string);

      // Ensure the URL uses the HTTP or HTTPS protocol
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return false;
      }

      if (!url.hostname) {
        return false;
      }

      return true;
    } catch (err) {
      console.error("Invalid URL error:", err);
      toast.error("The URL provided is invalid.");
      return false;
    }
  };

  const handleFileTypeSelect = (type: string) => {
    setFileTypeSelectedIndex(type);
    setDropdownOpen(false);
  };

  return (
    <div className="admin-container flex flex-col gap-3">
      <h1 className="font-serif	text-2xl antialiased font-bold">Retrieval-Augmented Generation</h1>
      <div className="flex flex-col gap-4">
        <div id="web-loader-container" className="p-2 border rounded-md border-green-500 gap-1.5 flex flex-col">
          <h2 className="underline font-serif text-lg antialiased font-medium">Web Loader</h2>
          <div className="flex gap-2">
          <IndexSelector indices={indices} onSelectIndex={setWebSelectedIndex} selectedIndex={webSelectedIndex} />
          <input
            ref={inputRef}
            type="text"
            value={inputLink}
            onChange={handleInputChangeLink}
            onKeyDown={handleKeyPressLink}
            placeholder="Input a link..."
            className="flex w-full items-center rounded-md bg-inherit pl-3 outline outline-1 -outline-offset-1 outline-green-600 focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-green-600"
          />
          <button
            onClick={handleSubmitLink}
            className="bg-green-500 text-white px-3 py-1 rounded"
            disabled={!inputLink || !webSelectedIndex}
          >
            Submit
          </button>
        </div>
        </div>

        <div id="file-loader-container" className="p-2 border rounded-md border-green-500 gap-1.5 flex flex-col">
          <h2 className="underline font-serif text-lg antialiased font-medium">File Loader</h2>
          <div className="flex gap-2">
          <IndexSelector indices={indices} onSelectIndex={setFileSelectedIndex} selectedIndex={fileSelectedIndex} />
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="bg-green-950 border border-green-500 h-full text-white px-3 py-1 rounded w-40 flex justify-between items-center"
            >
              {fileTypeSelectedIndex || "Select File Type"}
              <ExpandMoreIcon />
            </button>
            {dropdownOpen && (
              <ul ref={dropdownRef} className="absolute z-10 w-full bg-gray-950 border border-green-500 rounded-md max-h-60 overflow-y-auto">
                {fileTypes.map((type) => (
                  <li
                    key={type}
                    onClick={() => handleFileTypeSelect(type)}
                    className="py-2 px-4 hover:bg-green-800 hover:text-white cursor-pointer truncate"
                  >
                    {type}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="w-full">
            {fileTypeSelectedIndex === "JSON" && <InputFileJSON chosenIndices={fileSelectedIndex} />}
            {fileTypeSelectedIndex === "DOCX" && <InputFileDOCX chosenIndices={fileSelectedIndex} />}
            {fileTypeSelectedIndex === "PDF" && <InputFilePDF chosenIndices={fileSelectedIndex} />}
          </div>
        </div>
        </div>

        <div id="new-index-container" className="p-2 border rounded-md border-green-500 gap-1.5 flex flex-col">
          <h2 className="underline font-serif text-lg antialiased font-medium">Create a New Index</h2>
          <div className="w-full flex flex-col">
            <div className="w-full flex gap-1.5 items-center h-10">
              <div className="flex gap-2 size-full">
                <input ref={inputRef} type="text" value={inputIndex}
                  onChange={handleInputChangeIndex}
                  className="flex w-full items-center rounded-md bg-inherit pl-3 outline outline-1 -outline-offset-1 outline-green-600 focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-green-600"
                  placeholder="Enter the name of the Index here..."
                />
              </div>
              <div className="flex gap-1.5 w-fit h-full">
                <button
                  type="button" // Ensure the button does not trigger form submission
                  disabled={!inputIndex}
                  className="border-2 border-red-500 px-2 py-1 rounded-md hover:bg-red-600 cursor-pointer disabled:cursor-not-allowed "
                >
                  Cancel
                </button>
                <button
                  type="button" // Ensure the button does not trigger form submission
                  onClick={handleSubmitIndex}
                  disabled={!inputIndex}
                  className="bg-green-500 px-2 py-1 rounded-md hover:bg-green-600 cursor-pointer disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>

        <div id="index-list-container" className="p-2 border rounded-md border-green-500 gap-1.5 flex flex-col">
          <IndexList />
        </div>
      </div>

    </div>
  );
};

export default Admin;
