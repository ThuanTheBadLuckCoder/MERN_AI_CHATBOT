import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Logo from "./shared/Logo";
import { useAuth } from "../context/AuthContext";
import NavigationLink from "./shared/NavigationLink";
import chat from "../../public/chat.svg"
import admin from "../../public/adminpanel.svg"
import logo from "../../public/codfe_logo.svg"


const LeftNavi = () => {
  const auth = useAuth();
  console.log(auth);
  return (
    <AppBar
      sx={{ bgcolor: "transparent", position: "static", boxShadow: "none" }}
    >
      <Toolbar sx={{ display: "flex", width: "100%" }}>
        <div className="leftNaviContainer">
          {auth?.isLoggedIn ? (
            <>
            <NavigationLink
                  bg="#1D2025"
                  to="/"
                  text="Home"
                  textColor="black"
                  icon={<img src={logo} alt="Logo icon" style={{ width: '20px', height: '20px' }} />}
                />
              {auth.user?.role === "Admin" && (
                <NavigationLink
                  bg="#1D2025"
                  to="/admin"
                  text="Admin Panel"
                  textColor="black"
                  icon={<img src={admin} alt="Admin icon" style={{ width: '20px', height: '20px' }} />}
                  class="admin"
                />
              )}
              <NavigationLink
                bg="#1D2025"
                to="/chat"
                text="Chat"
                textColor="black"
                icon={<img src={chat} alt="Chat icon" style={{ width: '20px', height: '20px' }} />}
                class="chat"
              />
            </>
          ) : (
            <>
              <NavigationLink
                  bg="#00fffc"
                  to="/"
                  text=""
                  textColor="black"
                  icon={<img src={logo} alt="Chat icon" style={{ width: '20px', height: '20px' }} />}
                />
              <NavigationLink
                bg="#00fffc"
                to="/login"
                text="Login"
                textColor="black"
              />
              <NavigationLink
                bg="#51538f"
                textColor="white"
                to="/signup"
                text="Signup"
              />
            </>
          )}
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default LeftNavi;