import React from 'react'
import { FaVideo } from 'react-icons/fa';

const ChatCard = ({img, name}) => {
    return (
        <section className="rightSec">
            <div>
                <div>
                    <img src={img} alt="image" />
                    <h2>{name}</h2>
                </div>
                <div>
                    <button className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        <FaVideo />
                    </button>
                </div>
          </div>
          <div></div>
          <div></div>
        </section>
    )
}

export default ChatCard