import { Link } from "react-router-dom";
import '../styles/logout.css'

type Props = {
  to: string;
  bg: string;
  text: string;
  textColor: string;
  onClick?: () => Promise<void>;
  icon?: JSX.Element;
  class?: string;
  id?: string;
};
const NavigationLink = (props: Props) => {
  return (
    <Link
      onClick={props.onClick}
      className={`nav-link ${props.class}`}
      to={props.to}
      id={props.id}>
      <div id="nav-container" className="flex flex-row size-full overflow-hidden ">
        <div className="flex flex-row w-full h-10 border border-transparent bg-inherit rounded-xl hover:bg-[#1D2025] justify-start items-center px-4 gap-1.5 overflow-hidden">
          {props.icon && <span className="size-fit">{props.icon}</span>}
          <p className="text-lg font-bold truncate">{props.text}</p>

        </div>

      </div>

    </Link>
  );
};

export default NavigationLink;