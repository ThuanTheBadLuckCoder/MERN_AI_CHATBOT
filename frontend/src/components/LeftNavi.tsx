import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Logo from "./shared/Logo";
import { useAuth } from "../context/AuthContext";
import NavigationLink from "./shared/NavigationLink";
import chat from "../../public/chat.svg"
import admin from "../../public/adminpanel.svg"
import logo from "../../public/codfe_logo.svg"
import LogOut from "./LogOut";


const LeftNavi = () => {
  const auth = useAuth();
  console.log(auth);
  return (
    <div className="h-dvh fixed">
      <div>
        <div>
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
              <LogOut />
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
      </div>
    </div>
  );
};

export default LeftNavi;