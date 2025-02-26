import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../../helper/api-communicator";
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import PasswordOutlinedIcon from '@mui/icons-material/PasswordOutlined';
import toast from "react-hot-toast";
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';


interface ChangePasswordProps {
    email: string;
    isVerified: boolean;
}

const ChangePassword = ({ email, isVerified }: ChangePasswordProps) => {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);

        try {
            if (isVerified) {
                const response = await changePassword(email, password);
                toast.loading("Password Changing!", { id: "pwchange" });

                if (response.success) {
                    toast.success("Successfully Changed Password!", { id: "pwchange" });
                    setTimeout(() => navigate("/login"), 2000); // Redirect to login after 2s
                } else {
                    setError(response.message || "Failed to change password.");
                    toast.error("Failed to Change Password!", { id: "pwchange" });
                }
            }
        } catch (error) {
            setError("Failed to update password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleCofirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    return (
        <div id="change-password-container" className="border border-neutral-900 items-center flex flex-col p-10 gap-5 rounded-3xl bg-neutral-900/1 backdrop-blur">
            <h1 className="text-4xl font-bold">Change Password</h1>
            <form onSubmit={handleChangePassword} className="text-neutral-400 w-full">
                <div className="flex flex-col gap-3">
                    <div>
                        <label className="text-sm">Email</label>
                        <div className={`flex w-full h-10 items-center rounded-full bg-inherit outline outline-1 -outline-offset-1 
                focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1 overflow-hidden px-4 py-3 gap-3 outline-green-600`}>
                            <MarkEmailReadOutlinedIcon sx={{ fontSize: 20, color: "oklch(0.627 0.194 149.214)" }} />
                            <input type="email" name="email" disabled
                                className="flex w-full size-full items-center bg-inherit pr-2 outline outline-0 -outline-offset-0 outline-transparent 
                    focus-within:outline focus-within:outline-0 focus-within:-outline-offset-0 focus-within:outline-transparent text-green-400 text-sm text-green-600"
                                value={email} />
                        </div>
                    </div>
                    <div id='password-change' className="flex flex-col gap-0.5">
                        <label className="text-sm">New Password:</label>
                        <div className={`flex w-full h-10 items-center rounded-full bg-inherit outline outline-1 -outline-offset-1 
                focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1 overflow-hidden px-4 py-3 gap-3 ${error ? 'outline-red-600 focus-within:outline-red-600' : 'outline-neutral-600 focus-within:outline-neutral-600'} `}>
                            <PasswordOutlinedIcon sx={{ fontSize: 20 }} />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flex w-full size-full items-center bg-inherit pr-2 outline outline-0 -outline-offset-0 outline-transparent 
                    focus-within:outline focus-within:outline-0 focus-within:-outline-offset-0 focus-within:outline-transparent text-neutral-400 text-sm text-white"
                                required
                                placeholder="Your New Password"
                            />
                            <button
                                type="button"
                                onClick={togglePasswordVisibility}
                                className="size-fit">
                                <div className="flex items-center justify-center hover:bg-neutral-800 hover:bg-neutral-800 rounded-full transition-colors size-fit p-1">
                                    {showPassword ?
                                        <VisibilityOffOutlinedIcon sx={{ fontSize: 20 }} /> :
                                        <VisibilityOutlinedIcon sx={{ fontSize: 20 }} />
                                    }
                                </div>
                            </button>
                        </div>
                    </div>
                    <div id='confirm-password-change' className="flex flex-col gap-0.5">
                        <label className="text-sm">Confirm Password:</label>
                        <div className={`flex w-full h-10 items-center rounded-full bg-inherit outline outline-1 -outline-offset-1 
                focus-within:outline focus-within:outline-1 focus-within:-outline-offset-1 overflow-hidden px-4 py-3 gap-3 ${error ? 'outline-red-600 focus-within:outline-red-600' : 'outline-neutral-600 focus-within:outline-neutral-600'} `}>
                            <PasswordOutlinedIcon sx={{ fontSize: 20 }} />
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="flex w-full size-full items-center bg-inherit pr-2 outline outline-0 -outline-offset-0 outline-transparent 
                    focus-within:outline focus-within:outline-0 focus-within:-outline-offset-0 focus-within:outline-transparent text-neutral-400 text-sm text-white"
                                required
                                placeholder="Confirm Your New Password"
                            />
                            <button
                                type="button"
                                onClick={toggleCofirmPasswordVisibility}
                                className="size-fit">
                                <div className="flex items-center justify-center hover:bg-neutral-800 hover:bg-neutral-800 rounded-full transition-colors size-fit p-1">
                                    {showConfirmPassword ?
                                        <VisibilityOffOutlinedIcon sx={{ fontSize: 20 }} /> :
                                        <VisibilityOutlinedIcon sx={{ fontSize: 20 }} />
                                    }
                                </div>
                            </button>
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="border-gradient-to-r from-green-950 to-green-200 bg-green-custom hover:bg-green-400 text-black h-12 rounded-full text-base">
                        {loading ? "Updating..." : "Change Password"}
                    </button>
                </div>
            </form>

        </div>
    );
};

export default ChangePassword;
