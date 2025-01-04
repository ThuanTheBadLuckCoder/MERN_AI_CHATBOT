import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ChatGPT from "../components/chat/ChatGPT";
import ChatGemini from "../components/chat/ChatGemini";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { styled, Tooltip } from "@mui/material";
import zIndex from "@mui/material/styles/zIndex";

const CustomTooltip = styled(({ className, ...props }: React.ComponentProps<typeof Tooltip>) => (
  <Tooltip {...props} classes={{ popper: className }}>
    {props.children}
  </Tooltip>
))(({ theme }) => ({
  [`& .MuiTooltip-tooltip`]: {
    backgroundColor: '#052e16', // Tooltip background
    color: '#fff', // Tooltip text color
    fontSize: '0.875rem',
    borderRadius: '8px', // Rounded corners
    padding: '8px 12px',
    boxShadow: theme.shadows[3],
    border: '1px solid #22c55e', // Tooltip border
  },
  [`& .MuiTooltip-arrow`]: {
    color: '#052e16', // Match tooltip background
    '&::before': {
      content: '""',
      display: 'block',
      position: 'absolute',
      backgroundColor: '#052e16',
      width: '10px',
      height: '10px',
      transform: 'rotate(45deg)', // Create diamond shape
      border: '1px solid #22c55e', // Arrow border color
    },
  },
}));

const Chat = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownDisable, setDropdownDisable] = useState(false);
  const dropdownRef = useRef<HTMLUListElement | null>(null);
  const [model, setModel] = useState('Gemini');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
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
    <div id="chat-container" className="size-full overflow-hidden p-2 bg-zinc-900 rounded-3xl">
      <div className="h-chat-model flex flex-row justify-between items-start px-2 py-1">
        <div className="relative h-fit w-fit	">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setDropdownOpen(!dropdownOpen);
            }}
            className="flex w-full bg-green-950 h-10 text-white font-bold py-2 px-4 border border-green-500 rounded-md overflow-hidden text-left gap-2.5 justify-between">

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
        <div className='flex gap-1.5 items-center w-full h-10 justify-center'>
          <p className='font-serif text-xs text-gray-500 '>The Dangers Are Real</p>
          <CustomTooltip title="Code can make mistakes. Check important info." arrow>
            <ErrorOutlineIcon sx={{ fontSize: 14, color: 'gray' }} className="cursor-help" />
          </CustomTooltip>
        </div>
        <div className="relative h-fit w-fit	">
          <button
            type="button"
            disabled
            className="disabled:opacity-75 flex w-full bg-green-950 h-10 text-white font-bold py-2 px-4 border border-green-500 rounded-md overflow-hidden text-left gap-2.5 justify-between">
            <div className="w-5/6 flex flex-row justify-between truncate flex-1">
              Retrieval-Augmented Generation
            </div>
            <ExpandMoreIcon
              sx={{ fontSize: 20 }}
              className="pointer-events-none col-start-1 row-start-1 size-5 self-center justify-self-end text-white sm:size-4"
            />
          </button>
          {dropdownDisable && (
            <ul
              className="absolute z-10 w-full bg-gray-950 border border-green-500 rounded-md max-h-60 overflow-y-auto"
            >
              <li key={'Retrieval-Augmented Generation'}
                className="py-2 px-4 hover:bg-green-800 hover:text-white cursor-pointer truncate">Retrieval-Augmented Generation</li>
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