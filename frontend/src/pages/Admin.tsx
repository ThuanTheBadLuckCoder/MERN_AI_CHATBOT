import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getAllIndices, createNewIndex } from "../helper/api-communicator";
import toast from "react-hot-toast";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import IndexSelector from "../components/shared/IndexSelector";
import IndexList from "../components/index/IndexList";
import bg from '../../public/main_bg.png'
import InputFileHTML from "../components/upload/InputFileHTML";

type Indexies = {
  index: string;
  content: string;
};

const Admin = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const auth = useAuth();
  const [indices, setIndices] = useState<Indexies[]>([]);
  const [inputIndex, setInputIndex] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLUListElement | null>(null);
  const [fileSelectedIndex, setFileSelectedIndex] = useState<string>("");
  const [fileTypeSelectedIndex, setFileTypeSelectedIndex] = useState<string>("");
  const fileTypes: string[] = ["HTML"];

  // Removed unused state variables:
  // - isIndexValid (not used but setter was used)
  // - inputLink (commented out section)
  // - webSelectedIndex (commented out section)
  // - handleSubmitLink (commented out section)

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

  const handleInputChangeIndex = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputIndex(value);
    validateIndex(value); // Just validate without storing the result
  };

  const handleCancelIndex = () => {
    setInputIndex("");
  };

  function validateIndex(input: string): boolean {
    // Check if input is lowercase
    if (input !== input.toLowerCase()) {
      toast.error("Index must be lower case");
      return false;
    }
    return true;
  };

  const handleFileTypeSelect = (type: string) => {
    setFileTypeSelectedIndex(type);
    setDropdownOpen(false);
  };

  return (
    <div id="admin-container" className="h-full flex flex-col gap-3 p-3" style={{
      backgroundImage: `url(${bg})`,
      backgroundSize: "contain",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}>
      <h1 className="text-2xl antialiased font-bold">Retrieval-Augmented Generation</h1>
      <div className="flex flex-col gap-4">
        {/* Web Loader section was commented out in original code */}

        <div id="index-list-container" className="p-2 border rounded-md border-green-500 gap-1.5 flex flex-col">
          <IndexList />
        </div>
        <div id="file-loader-container" className="p-2 border rounded-md border-green-500 gap-1.5 flex flex-col">
          <h2 className="underline text-lg antialiased font-medium">File Loader</h2>
          <div className="flex gap-2">
          <IndexSelector indices={indices} onSelectIndex={setFileSelectedIndex} selectedIndex={fileSelectedIndex} />
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="bg-green-950 border border-green-500 h-10 text-white px-3 py-1 rounded w-64 flex justify-between items-center"
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
            {fileTypeSelectedIndex === "HTML" && <InputFileHTML chosenIndices={fileSelectedIndex} />}
          </div>
        </div>
        </div>

        <div id="new-index-container" className="p-2 border rounded-md border-green-500 gap-1.5 flex flex-col">
          <h2 className="underline text-lg antialiased font-medium">Create a New Index</h2>
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
                  type="button"
                  onClick={handleCancelIndex}
                  disabled={!inputIndex}
                  className="border-2 border-red-500 px-2 py-1 rounded-md hover:bg-red-600 cursor-pointer disabled:cursor-not-allowed "
                >
                  Cancel
                </button>
                <button
                  type="button"
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
      </div>
    </div>
  );
};

export default Admin;