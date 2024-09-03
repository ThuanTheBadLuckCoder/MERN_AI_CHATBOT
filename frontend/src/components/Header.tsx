// import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Logo from "./shared/Logo";
import { useAuth } from "../context/AuthContext";
import NavigationLink from "./shared/NavigationLink";

export const Header = () => {
  const auth = useAuth();
  return (
    <AppBar sx={{bgcolor: "transparent", position: "static", boxShadow: "none", }}>
        <Toolbar sx={{display: 'flex'}}></Toolbar>
        <Logo />
        <div>{auth?.isLoggedIn ? <>
          <NavigationLink bg="#00fffc" to="/chat" text="Go to Chat" textColor='black'/>
          <NavigationLink bg="#51538f" to="/" text="Logout" textColor='white' onClick={auth.logout}/>
        </> : <>
          <NavigationLink bg="#00fffc" to="/login" text="Login" textColor='black'/>
          <NavigationLink bg="#51538f" to="/signup" text="Signup" textColor='white'/>
        </>}</div>
    </AppBar>
  )
}
