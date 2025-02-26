import React, { useEffect, useState } from "react";
import logo from '../../public/codfe_logo.svg';
import bg from '../../public/main_bg.png';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import PasswordOutlinedIcon from '@mui/icons-material/PasswordOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      setPasswordError("Passwords do not match")
      return;
    }

    try {
      await auth?.signup(name, email, password);
    } catch (error) {
      console.log(error);
      if (error) {
        setEmailError("Invalid email");
        setPasswordError("Invalid password");
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  useEffect(() => {
    if (auth?.user) {
      return navigate("/chat");
    }
  }, [auth]);

  const handleLogin = () => {
    navigate("/login");
  };

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
          <h1 className="text-4xl font-bold">Sign up</h1>
          <form onSubmit={handleSubmit} className="text-neutral-400">
            <div className="flex flex-col gap-3">
              {/* Name */}
              <div id="name" className="flex flex-col gap-0.5">
                <label className="text-sm">Name</label>
                <div className="flex w-full h-10 items-center rounded-full bg-inherit outline outline-1 -outline-offset-1 
                  focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1 overflow-hidden px-4 py-3 gap-3 outline-neutral-600 focus-within:outline-neutral-600">
                  <BadgeOutlinedIcon sx={{ fontSize: 20 }} />
                  <input type="text" name="name" className="flex w-full size-full items-center bg-inherit pr-2 outline-none text-neutral-400 text-sm text-white"
                    placeholder="Enter your Name" />
                </div>
              </div>

              {/* Email */}
              <div id="email" className="flex flex-col gap-0.5 justify-center items-center ">
                <label className="w-full text-sm">Email</label>
                <div className={`flex w-full h-10 items-center rounded-full bg-inherit outline outline-1 -outline-offset-1 
                  focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1 overflow-hidden px-4 py-3 gap-3 ${emailError ? 'outline-red-600 focus-within:outline-red-600' : 'outline-neutral-600 focus-within:outline-neutral-600'}`}>
                  <MarkEmailReadOutlinedIcon sx={{ fontSize: 20 }} />
                  <input type="email" name="email" className="flex w-full size-full items-center bg-inherit pr-2 outline-none text-neutral-400 text-sm text-white"
                    placeholder="Enter your Email" />
                </div>
                <p className="text-yellow-300 text-xs mt-1 italic">*Ensure that you enter your actual email address.</p>
                {emailError && <span className="text-red-500 text-sm">{emailError}</span>}
              </div>

              {/* Password */}
              <div id="password" className="flex flex-col gap-0.5">
                <label className="text-sm">Password</label>
                <div className={`flex w-full h-10 items-center rounded-full bg-inherit outline outline-1 -outline-offset-1 
                  focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1 overflow-hidden px-4 py-3 gap-3 ${passwordError ? 'outline-red-600 focus-within:outline-red-600' : 'outline-neutral-600 focus-within:outline-neutral-600'}`}>
                  <PasswordOutlinedIcon sx={{ fontSize: 20 }} />
                  <input type={showPassword ? "text" : "password"} name="password" className="flex w-full size-full items-center bg-inherit pr-2 outline-none text-neutral-400 text-sm text-white"
                    placeholder="Enter your Password" />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="size-fit">
                    <div className="flex items-center justify-center hover:bg-neutral-800 rounded-full transition-colors size-fit p-1">
                      {showPassword ? <VisibilityOffOutlinedIcon sx={{ fontSize: 20 }} /> : <VisibilityOutlinedIcon sx={{ fontSize: 20 }} />}
                    </div>
                  </button>
                </div>
                {passwordError && <span className="text-red-500 text-sm">{passwordError}</span>}
              </div>

              {/* Confirm Password */}
              <div id="confirmPassword" className="flex flex-col gap-0.5">
                <label className="text-sm">Confirm Password</label>
                <div className={`flex w-full h-10 items-center rounded-full bg-inherit outline outline-1 -outline-offset-1 
                  focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1 overflow-hidden px-4 py-3 gap-3 ${confirmPasswordError ? 'outline-red-600 focus-within:outline-red-600' : 'outline-neutral-600 focus-within:outline-neutral-600'}`}>
                  <PasswordOutlinedIcon sx={{ fontSize: 20 }} />
                  <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" className="flex w-full size-full items-center bg-inherit pr-2 outline-none text-neutral-400 text-sm text-white"
                    placeholder="Confirm your Password" />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className="size-fit">
                    <div className="flex items-center justify-center hover:bg-neutral-800 rounded-full transition-colors size-fit p-1">
                      {showConfirmPassword ? <VisibilityOffOutlinedIcon sx={{ fontSize: 20 }} /> : <VisibilityOutlinedIcon sx={{ fontSize: 20 }} />}
                    </div>
                  </button>
                </div>
                {confirmPasswordError && <span className="text-red-500 text-sm">{confirmPasswordError}</span>}
              </div>

              {/* Submit */}
              <button type="submit" className="border-gradient-to-r from-green-950 to-green-200 bg-green-custom hover:bg-green-400 text-black h-12 rounded-full text-base">
                Signup
              </button>

              <div id="sign-up" className="flex gap-1 justify-center"><span>Already had an account?</span>
                <button
                  onClick={handleLogin}
                  className="text-green-custom hover:text-green-400">
                  Login
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
