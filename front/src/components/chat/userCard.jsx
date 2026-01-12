import React from "react";

const UserCard = ({ img, name, title, time }) => {
  return (
    <div className="w-full flex justify-around  bg-white/10 backdrop-blur-md">
      <div>
        <img src={img} alt="userImg" className="w-12 h-12 rounded-full" />
      </div>
      <div>
        <h1 className="text-lg font-semibold">{name}</h1>
        <p className="text-sm text-gray-400">{title}</p>
      </div>
      <div>
        <p className="text-sm text-gray-400">{time}</p>
      </div>
    </div>
  );
};

export default UserCard;
