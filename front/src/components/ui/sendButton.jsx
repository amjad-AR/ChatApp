import Button from "./Button.jsx";
import { FaPaperPlane } from "react-icons/fa";

const sendButton = () => {
  return (
    <Button
      // title="Send"
      icon={<FaPaperPlane />}
      className="
        bg-green-800
        text-gray-800
        w-16
        h-12
        text-2xl
        hover:bg-green-700
        duration-200
        rounded-full
        "
    />
  );
};

export default sendButton;
