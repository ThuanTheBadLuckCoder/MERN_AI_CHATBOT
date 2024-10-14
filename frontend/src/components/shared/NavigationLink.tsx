import { Link } from "react-router-dom";

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
    to={props.to}
    style={{ background: props.bg, color: props.textColor, margin: "10px 0" }}
    >
      <div className="nav-container">
      {props.icon && <span style={{ marginRight: '8px', display: 'flex',
        flexDirection: "row", flexWrap: "wrap", alignContent: "center",
        alignItems: "center"
       }}>{props.icon}</span>}
      <p>{props.text}</p>
      
      </div>
      
    </Link>
  );
};

export default NavigationLink;