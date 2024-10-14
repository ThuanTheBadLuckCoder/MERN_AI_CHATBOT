import { useEffect, useState } from "react";
import { Box, Avatar, FormControl, InputLabel, Select, SelectChangeEvent, MenuItem } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import LeftNavi from "../components/LeftNavi";
import LogOut from "../components/LogOut";
import ChatGPT from "../components/chat/ChatGPT";
import ChatGemini from "../components/chat/ChatGemini";
import ModelInfo from "../components/model_info/ModelInfo";

const Chat = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [model, setModel] = useState('Gemini');
  const handleChange = (event: SelectChangeEvent) => {
    setModel(event.target.value as string);
  };
  
  useEffect(() => {
    if (!auth?.user) {
      return navigate("/login");
    }
  }, [auth]);

  return (
    <Box sx={{
      display: "flex", width: "100%", height: "100%", flexDirection: "row",
      flexWrap: 'nowrap', alignItems: 'center'
    }}>
      <Box sx={{ width: "25%", display: "flex", height: '100%', flexDirection: 'column',
        flexWrap: 'nowrap', alignContent: 'center', alignItems: 'center', justifyContent: 'center',
        
       }}>
        <Box sx={{
          display: "flex", width: "95%", height: "95%", bgcolor: "unset",
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
            <div className="chat">
              <LeftNavi />
            </div>

          </div>
          <div className="clear_logout">
            
            <LogOut />

          </div>
        </Box>
      </Box>
        <Box sx={{width: "100%", display: "flex", height: '100%',
          flexDirection: 'column', flexWrap: 'nowrap', justifyContent: 'center',
          alignContent: 'center', alignItems: 'center', backgroundColor: '#1D202566'
         }}>
          {model == "GPT" && <ChatGPT />}
          {model == "Gemini" && <ChatGemini />}

        </Box>
      <Box sx={{ width: "25%", display: "flex", height: '100%', backgroundColor:'#1D202566' }} >
          <Box sx={{ width: "100%", padding: "10px 15px", margin: "0 8px", display: "flex", flexDirection: "column", 
        height: "90vh", justifyContent: "space-between" }}>
            <Box sx={{display: 'flex', flexDirection: "column", gap: "20px"}}>
              <FormControl fullWidth variant="standard" className="textWhiteColor">
                <InputLabel id="demo-simple-select-standard-label">Model</InputLabel>
                
                <Select
                  labelId="demo-simple-select-standard-label"
                  id="demo-simple-select-standard"
                  value={model}
                  label="Model"
                  onChange={handleChange}
                  
                >
                  <MenuItem value={"GPT"}>GPT</MenuItem>
                  <MenuItem value={"Gemini"}>Gemini</MenuItem>
                </Select>
              </FormControl>

            <div>
              
            
            

              {model == "Gemini" && 
              <ModelInfo 
              imgLink="https://cdn.tgdd.vn/News/1561019/2(27)-1280x720.jpg"
              description="Gemini: Gemini (formerly known as Bard) is an artificial intelligence chatbot released by Google. 
                  It was launched in 2023 based on the Large Language Model (LLM)"
              linkDetail="https://vi.wikipedia.org/wiki/Gemini_(chatbot)"
              />}
              {model == "GPT" && 
              <ModelInfo 
              imgLink="https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/800px-ChatGPT_logo.svg.png"
              description="ChatGPT: short for Chat Generative Pre-trained Transformer, 
                is a chatbot developed by"
              linkDetail="https://vi.wikipedia.org/wiki/ChatGPT"
              />}

            </div>
            </Box>
              <i>All models currently in use are provided with a certain amount of data. This is absolutely not data that has been trained by GPT, Gemini,...</i>

          </Box>
      
    </Box>

        
      
    </Box>
  );
};

export default Chat;