import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from '../../public/codfe_logo.svg'
import bg from '../../public/main_bg.png'
import '../index.css'
import OTPAuth from "../components/forgotpassword/OTPAuth";
import ChangePassword from "../components/forgotpassword/ChangePassword";

const ForgotPassword = () => {
    const location = useLocation();
    const email = location.state?.email || "";
    const navigate = useNavigate();
    const [isVerified, setIsVerified] = useState(false);

    const backToHomePage = () => {
        navigate("/");
    };

    return (
        <div className="size-full" style={{
            backgroundImage: `url(${bg})`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
        }}>
            {/* <ChangePassword email={email} isVerified={isVerified} /> */}
            <div className="flex size-full flex-col items-center justify-center gap-8">
                <button onClick={backToHomePage}><img src={logo} className="size-12" /></button>
                {!isVerified ? (
                <OTPAuth email={email} onVerify={() => setIsVerified(true)} />
            ) : (
                <ChangePassword email={email} isVerified={isVerified} />
            )}
            </div>
        </div>
    );
};

export default ForgotPassword;