import React from "react";
import { FaSearch, FaPlus } from "react-icons/fa";
import UserCard from "./userCard";


const Users = () => {
  return (
    <section className="leftSec p-4 flex flex-col gap-4 w-1/3 h-full border-r-2 border-amber-50 font-serif">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl">Chats</h1>
        <FaPlus
          className="text-2xl cursor-pointer hover:text-blue-500"
          title="Start new chat"
        />
      </div>
      <div className="relative">
        <input
          type="text"
          placeholder="Search chats... "
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
      </div>
      <div>
        <UserCard
          img="https://randomuser.me/api/portraits/men/75.jpg"
          name="John Doe"
          title="Hey! How are you?"
          time="2:30 PM"
        />
      </div>
    </section>
  );
};

export default Users;
