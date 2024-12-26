import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ChatGPT from "../components/chat/ChatGPT";
import ChatGemini from "../components/chat/ChatGemini";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const Chat = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [model, setModel] = useState('Gemini');
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(event.target.value as string);
  };

  useEffect(() => {
    if (!auth?.user) {
      return navigate("/login");
    }
  }, [auth]);

  return (
    <div id="chat-container" className="size-full">
      <div className="size-full gap-1.5 overflow-hidden">
        <div className="sticky top-0 bg-black z-50">
          <form className="h-full">
            <div className="grid grid-cols-1 w-1/6">
              <select
                id="country"
                name="country"
                autoComplete="country-name"
                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-gray-950 py-1.5 pl-3 pr-8 text-base text-white font-bold outline outline-1 -outline-offset-1 outline-green-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-green-600 sm:text-sm/6"
                value={model}
                onChange={handleChange}
              >
                <option value={"GPT"}>GPT</option>
                <option value={"Gemini"}>Gemini</option>
              </select>
              <ExpandMoreIcon sx={{ fontSize: 20 }} className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"/>
            </div>
          </form>

        </div>
        <div className="h-95percent overflow-y-auto mt-2">
          {model == "GPT" && <ChatGPT />}
          {model == "Gemini" && <ChatGemini />}

        </div>

      </div>
    </div>

  );
};

export default Chat;