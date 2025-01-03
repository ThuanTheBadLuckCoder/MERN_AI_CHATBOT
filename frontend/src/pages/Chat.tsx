import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ChatGPT from "../components/chat/ChatGPT";
import ChatGemini from "../components/chat/ChatGemini";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const Chat = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLUListElement | null>(null);
  const [model, setModel] = useState('Gemini');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    console.log("model: ", model);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectModel = (model: string) => {
    setModel(model);
    setDropdownOpen(false);
  };


  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(event.target.value as string);
  };

  useEffect(() => {
    if (!auth?.user) {
      return navigate("/login");
    }
  }, [auth]);

  return (
    <div id="chat-container" className="size-full overflow-hidden">
      <div className="h-chat-model flex">
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setDropdownOpen(!dropdownOpen);
            }}
            className="flex w-full bg-green-950 h-10 text-white font-bold py-2 px-4 border border-green-500 rounded-md overflow-hidden text-left">
            <div className="w-5/6 flex flex-row justify-between truncate flex-1">
              {model || "Gemini"}
            </div>
            <ExpandMoreIcon
              sx={{ fontSize: 20 }}
              className="pointer-events-none col-start-1 row-start-1 size-5 self-center justify-self-end text-white sm:size-4"
            />
          </button>
          {dropdownOpen && (
            <ul
              ref={dropdownRef}
              className="absolute z-10 w-full bg-gray-950 border border-green-500 rounded-md max-h-60 overflow-y-auto"
            >
              <li key={'GPT'}
                onClick={() => handleSelectModel("GPT")}
                className="py-2 px-4 hover:bg-green-800 hover:text-white cursor-pointer truncate">GPT</li>
              <li key={'Gemini'}
                onClick={() => handleSelectModel("Gemini")}
                className="py-2 px-4 hover:bg-green-800 hover:text-white cursor-pointer truncate">Gemini</li>

            </ul>
          )}
        </div>
      </div>
      <div className="w-full h-chat-content gap-1.5 overflow-hidden">

        <div className="h-full">
          {model == "GPT" && <ChatGPT />}
          {model == "Gemini" && <ChatGemini />}

        </div>

      </div>
    </div>

  );
};

export default Chat;