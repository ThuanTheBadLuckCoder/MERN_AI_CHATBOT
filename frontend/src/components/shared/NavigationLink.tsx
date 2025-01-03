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
};
const NavigationLink = (props: Props) => {
  return (
    <Link
    onClick={props.onClick}
    className={`nav-link ${props.class}`}
    to={props.to}>
      <div id="nav-container" className="flex flex-row h-12 border border-green-950 rounded-md hover:border-green-500 hover:bg-green-950 justify-start items-center px-4 gap-1.5">
      {props.icon && <span className="size-5">{props.icon}</span>}
      <p className="text-lg font-bold">{props.text}</p>
      
      </div>
      
    </Link>
  );
};

export default NavigationLink;