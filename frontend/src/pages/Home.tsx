import logo from "../../public/codfe_logo.svg";
import bg from '../../public/main_bg.png'
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  const handleTryCodfe = () => {
    navigate("/login");
  };

  return (
    <div className="size-full flex flex-col gap-40 my-40">
      {/* Intro Section */}
      <div id="intro-codfe" className="flex flex-row gap-5 mt-40 px-10">
        <div className="size-full" style={{
      backgroundImage: `url(${bg})`,
      backgroundSize: "contain",
      backgroundPosition: "left",
      backgroundRepeat: "no-repeat",
    }}>

        <div className="h-96 gap-10 flex flex-col ml-20">
          <h1 className="text-8xl flex relative cursor-not-allowed font-bold">
            Meet C
            <img
              src={logo}
              alt="Logo icon"
              className="border border-green-500 bg-green-950 overflow-hidden size-12 self-end mb-4 rounded-full cursor-not-allowed"
            />
            dfe
          </h1>
          <span className="text-5xl cursor-not-allowed">
            Codfe is an AI assistant tailored to empower every developer, <br />every project, and maximize productivity.
          </span>
          <button
            onClick={handleTryCodfe}
            className="border-2 px-8 py-2 rounded-md border-green-500 bg-green-950 hover:bg-green-900 text-xl w-fit">
            Try Codfe
          </button>
        </div>
    </div>
      </div>
    </div>
  );
};

export default Home;
