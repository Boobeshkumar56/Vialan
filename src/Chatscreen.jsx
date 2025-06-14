import React, { useEffect, useState, useRef } from "react";
import { useUser } from "./UserContext";
import { User, Send } from "lucide-react";
import socket from "./Sockets";

const Chatscreen = () => {
  const { username } = useUser();
  const [activeUsers, setActiveUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messagesMap, setMessagesMap] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesMap[selectedUser]]);

  // Listen for socket events
 useEffect(() => {
  if (!username) return;

  // ✅ Register user when chat screen loads
  socket.emit("register", username);
  console.log("[ChatScreen] Registered with name:", username);

  // Listen for client list
  socket.on("clients", (clients) => {
    const filtered = clients
      .filter((client) => client.name !== username)
      .map((client) => client.name);
    setActiveUsers(filtered);
  });

  // Handle incoming messages
  socket.on("receive:message", ({ from, text, timestamp }) => {
    console.log("Message received from:", from, text);

    setMessagesMap((prev) => ({
      ...prev,
      [from]: [...(prev[from] || []), { from, text, timestamp }],
    }));

    setUnreadCounts((prev) => ({
      ...prev,
      [from]: (prev[from] || 0) + (from !== selectedUser ? 1 : 0),
    }));
  });

  return () => {
    socket.off("clients");
    socket.off("receive:message");
  };
}, [username]);
 // ✅ Only depends on `username`


  // Send a message
  const sendMessage = () => {
    if (!newMessage || !selectedUser) return;

    const timestamp = new Date().toISOString();

    socket.emit("send:message", {
      to: selectedUser,
      text: newMessage,
      timestamp,
    });

    setMessagesMap((prev) => ({
      ...prev,
      [selectedUser]: [
        ...(prev[selectedUser] || []),
        { from: username, text: newMessage, timestamp },
      ],
    }));

    setNewMessage("");
  };

  // Format time
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 p-4 font-sans text-black">
      <div className="flex h-full rounded-2xl shadow-2xl overflow-hidden">

        {/* Left Panel - Active Users */}
        <div className="w-[30%] p-4 bg-white/30 backdrop-blur-md rounded-l-2xl flex flex-col gap-4 border-r border-white/40">
          <div className="flex flex-col items-center bg-white/50 rounded-2xl p-4 shadow-inner">
            <User size={40} className="mb-2 border-3 border-black rounded-2xl" />
            <h3 className="text-lg font-semibold">Welcome {username}</h3>
          </div>

          {activeUsers.map((user, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 bg-white/50 hover:bg-white p-3 rounded-xl cursor-pointer transition shadow ${selectedUser === user ? "bg-white" : ""}`}
              onClick={() => {
                setSelectedUser(user);
                setUnreadCounts((prev) => ({ ...prev, [user]: 0 }));
              }}
            >
              <div className="w-10 h-10 bg-indigo-400 text-white rounded-full flex items-center justify-center text-lg font-bold">
                {user.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-md">{user}</p>
                <p className="text-xs text-gray-600">
                  {unreadCounts[user] > 0 ? `${unreadCounts[user]} new message${unreadCounts[user] > 1 ? 's' : ''}` : "Tap to chat"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Right Panel - Chat Window */}
        <div className="w-[70%] p-6 bg-white/30 backdrop-blur-md rounded-r-2xl flex flex-col justify-between">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="text-xl font-bold mb-2">Chat with {selectedUser}</div>

              {/* Messages Display */}
              <div className="flex-1 overflow-y-auto px-4">
                {(messagesMap[selectedUser] || []).map((msg, idx) => (
                  <div
                    key={idx}
                    className={`my-2 p-2 rounded-xl max-w-[70%] text-sm ${
                      msg.from === username
                        ? "bg-indigo-300 ml-auto text-right"
                        : "bg-white/70 text-left"
                    }`}
                  >
                    <div>{msg.text}</div>
                    <div className="text-[10px] text-gray-600 mt-1">{formatTime(msg.timestamp)}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  placeholder="Type a message"
                  className="flex-1 p-2 rounded-xl border border-gray-400"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                  className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-xl"
                  onClick={sendMessage}
                >
                  <Send size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div className="rounded-xl p-8 bg-white/40 shadow-lg w-[90%] max-w-2xl">
                <h2 className="text-3xl font-bold mb-4">LAN Messenger</h2>
                <p className="text-lg leading-relaxed font-medium">
                  Select a user on the left to begin chatting in real-time! 💬
                  <br /><br />
                  Messages sent here are local (LAN), secure and offline.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chatscreen;
