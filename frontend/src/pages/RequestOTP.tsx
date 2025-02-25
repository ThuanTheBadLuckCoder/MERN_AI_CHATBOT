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
import { sendOTPUser } from "../helper/api-communicator";

const RequestOTP = () => {
  const navigate = useNavigate();
  const [emailError, setEmailError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError(""); // Clear previous errors
  
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
  
    try {
      const response = await sendOTPUser(email);
      console.log("response: ", response);
  
      // Check for successful message instead of status code
      if (response && response.message === "OTP sent successfully") {
        console.log("Success condition met, preparing to navigate");
        toast.success(`OTP sent successfully! Please check your email. Expires in ${response.expiresIn}.`);
        
        console.log("About to navigate to /change-password");
        navigate("/change-password", {
          state: {
            email: email
          }
        });
        console.log("Navigation called");
      } else {
        console.log("Response received but success message wasn't found:", response);
        setEmailError("Failed to send OTP. Please try again.");
      }
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      
      if (error.response && error.response.data?.message) {
        setEmailError(error.response.data.message);
      } else {
        setEmailError("An unexpected error occurred. Please try again.");
      }
    }
  };

  const handleSignup = () => {
    navigate("/signup");
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
              <button type="submit" className="border-gradient-to-r from-green-950 to-green-200 bg-green-custom hover:bg-green-400 text-black h-12 rounded-full text-base">
                Send E-mail
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

export default RequestOTP;