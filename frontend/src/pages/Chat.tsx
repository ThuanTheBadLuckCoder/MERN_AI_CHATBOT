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
          {/* <div className="leftNavi_userInfo">
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

          </div> */}
          <div className="clear_logout">
            
            

          </div>
        </Box>
      </Box>
        <Box sx={{width: "100%", display: "flex", height: '100%',
          flexDirection: 'column', flexWrap: 'nowrap', justifyContent: 'space-between',
          alignContent: 'center', alignItems: 'flex-start', backgroundColor: '#1D202566'
         }}>
          <FormControl fullWidth variant="standard" className="textWhiteColor"
          sx={{marginTop: '30px', marginLeft: '30px', display: 'flex', width: '10%'}}>
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
          {model == "GPT" && <ChatGPT />}
          {model == "Gemini" && <ChatGemini />}

        </Box>
      

        
      
    </Box>
  );
};

export default Chat;