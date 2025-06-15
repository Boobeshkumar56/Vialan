import React, { useEffect, useRef, useState } from "react";
import { useUser } from "./UserContext";
import Socket from "./Sockets";
import { PhoneOff, PhoneCall, Users, Hash } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const Meeting = () => {
  const { username } = useUser();
  const [clients, setClients] = useState([]);
  const [connectedUser, setConnectedUser] = useState(null);
  const [meetingId, setMeetingId] = useState("");
  const [joinedId, setJoinedId] = useState("");
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    if (!username) return;

    Socket.emit("register", username);

    Socket.on("clients", (clientList) => {
      const filtered = clientList.filter((c) => c.name !== username);
      setClients(filtered);
    });

    Socket.on("signal", async ({ from, data }) => {
      if (data.sdp?.type === "offer") {
        await createPeerConnection(from);
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        Socket.emit("signal", { to: from, data: { sdp: answer } });
      }

      if (data.sdp?.type === "answer") {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }

      if (data.candidate) {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    return () => {
      Socket.off("clients");
      Socket.off("signal");
    };
  }, [username]);

  const createPeerConnection = async (peerName) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    localVideoRef.current.srcObject = stream;

    const peer = new RTCPeerConnection();
    peerRef.current = peer;
    setConnectedUser(peerName);

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        Socket.emit("signal", {
          to: peerName,
          data: { candidate: e.candidate },
        });
      }
    };
  };

  const callUser = async (peerName) => {
    await createPeerConnection(peerName);
    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);
    Socket.emit("signal", { to: peerName, data: { sdp: offer } });
  };

  const endCall = () => {
    peerRef.current?.close();
    peerRef.current = null;
    setConnectedUser(null);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  };

  const generateMeetingId = () => {
    const id = uuidv4().split("-")[0];
    setMeetingId(id);
    navigator.clipboard.writeText(id);
  };

  const connectToMeetingId = () => {
    if (joinedId) {
      callUser(joinedId);
    }
  };

  return (
    <div className="p-6 font-sans text-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 min-h-screen">
      <h2 className="text-4xl font-extrabold text-gray-800 mb-6 flex items-center justify-center gap-2">
        <Users className="w-8 h-8 text-indigo-500" /> ViaLAN Meeting Room
      </h2>

      <div className="flex justify-center gap-6 mb-6">
        <button
          onClick={generateMeetingId}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Hash className="w-4 h-4" /> Generate Meeting ID
        </button>
        {meetingId && (
          <div className="px-4 py-2 bg-white border rounded-lg text-sm shadow">
            Meeting ID: <strong>{meetingId}</strong> (copied!)
          </div>
        )}
        <input
          type="text"
          placeholder="Enter Meeting ID"
          className="px-3 py-2 border rounded-lg shadow"
          value={joinedId}
          onChange={(e) => setJoinedId(e.target.value)}
        />
        <button
          onClick={connectToMeetingId}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Join Meeting
        </button>
      </div>

      {!connectedUser && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8">
          {clients.length === 0 ? (
            <p className="col-span-full text-gray-600">No users available to call.</p>
          ) : (
            clients.map((client, index) => (
              <button
                key={index}
                onClick={() => callUser(client.name)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <PhoneCall className="w-5 h-5" /> Call {client.name}
              </button>
            ))
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-center mt-10 gap-6 items-center">
        <div>
          <p className="mb-2 text-sm text-gray-700">You</p>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-72 h-48 rounded-lg border border-gray-300 shadow"
          />
        </div>
        <div>
          <p className="mb-2 text-sm text-gray-700">{connectedUser || "Remote User"}</p>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-72 h-48 rounded-lg border border-gray-300 shadow"
          />
        </div>
      </div>

      {connectedUser && (
        <div className="mt-8">
          <button
            onClick={endCall}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl shadow-md flex items-center gap-2"
          >
            <PhoneOff className="w-5 h-5" /> End Call
          </button>
        </div>
      )}
    </div>
  );
};

export default Meeting;
