import React, { useState, useRef, useEffect } from 'react';
import { Send, PhoneCall, MessageCircleCode, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import Socket from './Sockets';

const Home = () => {
  const [username, setUsername] = useState(null);
  const navigate = useNavigate();
  const { SetUsername } = useUser();
  const prompted = useRef(false);

  useEffect(() => {
    if (!prompted.current) {
      let storedName = localStorage.getItem('username');

      if (!storedName) {
        const name = prompt("Enter your name");
        if (name && name.trim() !== "") {
          storedName = name.trim();
          localStorage.setItem("username", storedName);
        }
      }

      if (storedName) {
        setUsername(storedName);
        SetUsername(storedName);
        Socket.emit("register", storedName);
        console.log("[Socket] Registered with name:", storedName);
      }

      prompted.current = true;
    }
  }, []);

  const handleReset = () => {
    localStorage.removeItem('username');
    window.location.reload();
  };

  return (
    <>
      {/* Top bar with user info */}
      <div className="flex justify-between items-center px-6 pt-4">
        <div className="text-5xl">V
          iaLan</div>
        {username && (
          <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-full shadow-md">
            <User className="w-6 h-6 text-black" />
            <span className="text-md font-medium">{username}</span>
            <button
              onClick={handleReset}
              className="ml-2 text-xs text-red-600 hover:underline"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Main container */}
      <div
        id="container"
        className="w-[400px] mx-auto mt-10 border-2 border-black rounded-2xl p-4 flex flex-col gap-4 items-center justify-around"
      >
        <div
          className="w-full bg-gradient-to-r from-orange-200 to-cyan-500 rounded-xl p-4 text-center shadow-md hover:scale-105 transition-transform duration-200"
          onClick={() => navigate('/transfer')}
        >
          <Send className="mx-auto mb-2 w-8 h-8" />
          <h3 className="text-xl font-semibold">File Transfer</h3>
        </div>

        <div
          className="w-full bg-gradient-to-r from-orange-200 to-cyan-500 rounded-xl p-4 text-center shadow-md hover:scale-105 transition-transform duration-200"
          onClick={() => navigate('/chat')}
        >
          <MessageCircleCode className="mx-auto mb-2 w-8 h-8" />
          <h3 className="text-xl font-semibold">Message</h3>
        </div>

        <div className="w-full bg-gradient-to-r from-orange-200 to-cyan-500 rounded-xl p-4 text-center shadow-md hover:scale-105 transition-transform duration-200" onClick={() => navigate('/meeting')}>
          <PhoneCall className="mx-auto mb-2 w-8 h-8" />
          <h3 className="text-xl font-semibold">Video meeting</h3>
        </div>
      </div>
    </>
  );
};

export default Home;
