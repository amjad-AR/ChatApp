import React from "react";

const Button = ({ title, icon, className = "" }) => {
  return (
    <button
      className={`px-4 py-2  text-white rounded flex justify-center items-center ${className}`}
      type="button"
    >
      <span>{title}</span>
      {icon && <span className="">{icon}</span>}
    </button>
  );
};

export default Button;
