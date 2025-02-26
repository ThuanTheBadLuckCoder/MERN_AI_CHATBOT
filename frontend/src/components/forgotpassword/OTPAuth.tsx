import React, { useRef, useState } from 'react'
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import { authOTPUser } from "../../helper/api-communicator";
import { toast } from "react-hot-toast";

const OTPAuth = ({ email, onVerify }) => {
    const [emailError, setEmailError] = useState("");
    const otpLength = 6;
    const [otp, setOtp] = useState(Array(otpLength).fill(""));
    const inputRefs = useRef<HTMLInputElement[]>([]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Clear previous errors
        setEmailError("");
        // const formData = new FormData(e.currentTarget);
        // const email = formData.get("email") as string;
        const otpCode = otp.join("");
        try {
            const response = await authOTPUser(email, otpCode);
            console.log(response);
            // Check for successful message instead of status code
            if (response && response.message === "OTP verified successfully.") {
                console.log("Success condition met, preparing to navigate");
                onVerify();
                toast.success(`OTP auth successfully!`);

            } else {
                console.log("Response received but success message wasn't found:", response);
                setEmailError("Failed to send OTP. Please try again.");
            }
        } catch (error) {
            console.log(error);
            // Set specific error messages based on the error response
            if (error) {
                setEmailError("Invalid email");
            }
        }
    };

    const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (!/^\d*$/.test(value)) return; // Allow only numbers

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move to next input if value is entered
        if (value && index < otpLength - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").replace(/\D/g, ""); // Extract only numbers
        if (!pastedData) return;

        const newOtp = [...otp];
        for (let i = 0; i < otpLength; i++) {
            if (pastedData[i]) {
                newOtp[i] = pastedData[i];
            }
        }

        setOtp(newOtp);
        // Move focus to the last filled input
        const nextIndex = pastedData.length >= otpLength ? otpLength - 1 : pastedData.length;
        inputRefs.current[nextIndex]?.focus();
    };

    const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };
    return (
        <div>
            <div className="border border-neutral-900 items-center flex flex-col p-10 gap-5 rounded-3xl bg-neutral-900/1 backdrop-blur">
                <h1 className="text-4xl font-bold">Reset Password</h1>
                <form onSubmit={handleSubmit} className="text-neutral-400 w-full">
                    <div className="flex flex-col gap-3">
                        <div id='email' className="flex flex-col gap-0.5">
                            <label className="text-sm">Email</label>
                            <div className={`flex w-full h-10 items-center rounded-full bg-inherit outline outline-1 -outline-offset-1 
                focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1 overflow-hidden px-4 py-3 gap-3 ${emailError ? 'outline-red-600 focus-within:outline-red-600' : 'outline-neutral-600 focus-within:outline-neutral-600'} `}>
                                <MarkEmailReadOutlinedIcon sx={{ fontSize: 20, }} />
                                <input type="email" name="email" value={email} disabled
                                    className="flex w-full size-full items-center bg-inherit pr-2 outline outline-0 -outline-offset-0 outline-transparent 
                    focus-within:outline focus-within:outline-0 focus-within:-outline-offset-0 focus-within:outline-transparent text-neutral-400 text-sm text-white"
                                    placeholder="Enter your Email" />
                            </div>
                            {emailError && (
                                <span className="text-red-500 text-sm">{emailError}</span>
                            )}
                        </div>
                        <div id='otpcode' className="flex flex-col gap-0.5">
                            <label className="text-sm">Please input <i>OTP Code</i> sent to your E-mail</label>
                            <div className=
                                {`flex w-full h-fit items-center bg-inherit overflow-hidden py-3 gap-3 `}>
                                {/* <FiberPinIcon sx={{ fontSize: 20 }} /> */}
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => (inputRefs.current[index] = el!)}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(index, e)}
                                        onKeyDown={(e) => handleOTPKeyDown(index, e)}
                                        onPaste={handlePaste}
                                        className="w-12 h-12 text-center bg-inherit text-lg border border-gray-300 rounded-md focus:outline-none focus:border-green-500"
                                    />
                                ))}
                            </div>
                        </div>

                        <button type="submit" className="border-gradient-to-r from-green-950 to-green-200 bg-green-custom hover:bg-green-400 text-black h-12 rounded-full text-base">
                            Authentication
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default OTPAuth