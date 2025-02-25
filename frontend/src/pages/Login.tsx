import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from '../../public/codfe_logo.svg'
import bg from '../../public/main_bg.png'
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import PasswordOutlinedIcon from '@mui/icons-material/PasswordOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import '../index.css'

const Login = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Clear previous errors
    setEmailError("");
    setPasswordError("");
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      await auth?.login(email, password, rememberMe);
    } catch (error) {
      console.log(error);
      // Set specific error messages based on the error response
      if (error) {
        setEmailError("Invalid email");
        setPasswordError("Invalid password");
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    if (auth?.user) {
      return navigate("/chat");
    }
  }, [auth]);

  const handleSignup = () => {
    navigate("/signup");
  };

  const handleForgotPassword = () => {
    navigate("/otp-request");
  }

  const backToHomePage = () => {
    navigate("/");
  }

  return (
    <div className="size-full" style={{
      backgroundImage: `url(${bg})`,
      backgroundSize: "contain",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}>
      <div className="flex size-full flex-col items-center justify-center gap-8">
        <button onClick={backToHomePage}><img src={logo} className="size-12" /></button>
        <div className="border border-neutral-900 items-center flex flex-col p-10 gap-5 rounded-3xl bg-neutral-900/1 backdrop-blur">
          <h1 className="text-4xl font-bold">Log in</h1>
          <form onSubmit={handleSubmit} className="text-neutral-400">
            <div className="flex flex-col gap-3">
              <div id='email' className="flex flex-col gap-0.5">
                <label className="text-sm">Email</label>
                <div className={`flex w-full h-10 items-center rounded-full bg-inherit outline outline-1 -outline-offset-1 
                focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1 overflow-hidden px-4 py-3 gap-3 ${emailError ? 'outline-red-600 focus-within:outline-red-600' : 'outline-neutral-600 focus-within:outline-neutral-600'} `}>
                  <MarkEmailReadOutlinedIcon sx={{ fontSize: 20, }} />
                  <input type="email" name="email"
                    className="flex w-full size-full items-center bg-inherit pr-2 outline outline-0 -outline-offset-0 outline-transparent 
                    focus-within:outline focus-within:outline-0 focus-within:-outline-offset-0 focus-within:outline-transparent text-neutral-400 text-sm text-white"
                    placeholder="Enter your Email" />
                </div>
                {emailError && (
                  <span className="text-red-500 text-sm">{emailError}</span>
                )}
              </div>
              <div id='password' className="flex flex-col gap-0.5">
                <label className="text-sm">Password</label>
                <div className={`flex w-full h-10 items-center rounded-full bg-inherit outline outline-1 -outline-offset-1 
                focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1 overflow-hidden px-4 py-3 gap-3 ${emailError ? 'outline-red-600 focus-within:outline-red-600' : 'outline-neutral-600 focus-within:outline-neutral-600'} `}>
                  <PasswordOutlinedIcon sx={{ fontSize: 20 }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className="flex w-full size-full items-center bg-inherit pr-2 outline outline-0 -outline-offset-0 outline-transparent 
                    focus-within:outline focus-within:outline-0 focus-within:-outline-offset-0 focus-within:outline-transparent text-neutral-400 text-sm text-white"
                    placeholder="Enter your Password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="size-fit"
                  >
                    <div className="flex items-center justify-center hover:bg-neutral-800 hover:bg-neutral-800 rounded-full transition-colors size-fit p-1">
                      {showPassword ?
                        <VisibilityOffOutlinedIcon sx={{ fontSize: 20 }} /> :
                        <VisibilityOutlinedIcon sx={{ fontSize: 20 }} />
                      }
                    </div>
                  </button>
                </div>
                {passwordError && (
                  <span className="text-red-500 text-sm mt-1">{passwordError}</span>
                )}
              </div>
              <div className="flex justify-between">
                  <div id='remember-me' className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <label className="custom-checkbox">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <div className="cursor-pointer flex items-center"><span></span>Remember me</div>
                        
                      </label>
                    </div>
                  </div>
                <div>
                <button type="button" onClick={handleForgotPassword}
                    className="text-green-custom hover:text-green-400">
                    Forgot password?
                  </button>
                </div>
              </div>
              <button type="submit" className="border-gradient-to-r from-green-950 to-green-200 bg-green-custom hover:bg-green-400 text-black h-12 rounded-full text-base">
                Log in
              </button>

              <div id="sign-up" className="flex gap-1 justify-center"><span>Don't have an acount?</span>
                <button type="button"
                  onClick={handleSignup}
                  className="text-green-custom hover:text-green-400">
                  Sign up
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;