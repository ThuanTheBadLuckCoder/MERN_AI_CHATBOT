import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import { useAuth } from "../context/AuthContext";
import NavigationLink from "./shared/NavigationLink";
import logout from "../../public/logout.svg"


const LogOut = () => {
  const auth = useAuth();
  return (
    <>
        <div id="logout-container" className="">
          {auth?.isLoggedIn ? (
            <>
              <NavigationLink
                bg="#1D2025"
                textColor="white"
                to="/"
                text="Logout"
                icon={<img src={logout} alt="Logout icon" />}
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
    </>
  );
};

export default LogOut;