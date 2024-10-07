import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Logo from "./shared/Logo";
import { useAuth } from "../context/AuthContext";
import NavigationLink from "./shared/NavigationLink";
import chat from "../../public/chat.svg"
import admin from "../../public/adminpanel.svg"
import logout from "../../public/logout.svg"


const LogOut = () => {
  const auth = useAuth();
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
                textColor="white"
                to="/"
                text="Logout"
                icon={<img src={logout} alt="Admin icon" style={{ width: '20px', height: '20px' }} />}
                onClick={auth.logout}
                class="logout"
              />
            </>
          ) : (
            <>
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

export default LogOut;