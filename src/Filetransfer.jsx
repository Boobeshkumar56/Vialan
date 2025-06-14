import React, { useState, useEffect, useRef } from "react";
import Socket from "./Sockets";
import { Send } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const Filetransfer = () => {
  const pendingCandidates = useRef([]);
  const [username, setUsername] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [incomingOffers, setIncomingOffers] = useState([]);
  const peerRef = useRef(null);
  const dataChannelRef = useRef(null);
  const fileBufferRef = useRef([]);
  const prompted = useRef(false);
  const [receivingMetadata, setReceivingMetadata] = useState(null);
const [receiveProgress, setReceiveProgress] = useState(0);
const [transferSpeed, setTransferSpeed] = useState(0);
const [estimatedTime, setEstimatedTime] = useState(null);
const [isReceiving, setIsReceiving] = useState(false);
const transferStartTimeRef = useRef(null);
const cancelTransferRef = useRef(false);



  useEffect(() => {
    if (!prompted.current) {
      const name = prompt("Enter your name");
      if (name) setUsername(name);
      prompted.current = true;
    }
  }, []);

  useEffect(() => {
    if (!username) return;

    Socket.emit("register", username);
    console.log("[Socket] Registered with name:", username); 

    Socket.on("clients", (clientList) => {
      console.log("[Socket] Clients received:", clientList); 
      setClients(clientList);
    });

    Socket.on("signal", async ({ from, data }) => {
      console.log("[Socket] Signal received from:", from, data); 

      if (data.sdp?.type === "offer") {
        if (peerRef.current) return;
        console.log("[Receiver] SDP offer received from", from); 
        setIncomingOffers((prev) => [...prev, { from, sdp: data.sdp }]);
        toast.info(`Incoming file offer from ${from}`);
      }
      if (data.sdp?.type === "answer") {
  console.log("[Sender] SDP answer received");
  await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
  console.log("[Sender] Remote description set with answer");
}

      if (data.candidate) {
        console.log("[Signal] ICE Candidate received"); 
        if (peerRef.current && peerRef.current.remoteDescription) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          console.log("[Signal] Candidate pending until remoteDescription set"); 
          pendingCandidates.current.push(data.candidate);
        }
      }
    });

    return () => {
      Socket.off("clients");
      Socket.off("signal");
    };
  }, [username]);

const transfer = async (id) => {
  if (!selectedFile) return alert("Please select a file first.");

  const peer = new RTCPeerConnection();
  peerRef.current = peer;

  console.log("[Sender] Creating data channel...");
  const channel = peer.createDataChannel("file-transfer");
  dataChannelRef.current = channel;

  channel.onopen = () => {
    console.log("[Sender] Data channel open");

    const chunkSize = 128 * 1024; // 16 KB
    const file = selectedFile;
    const metadata = {
      type: "metadata",
      name: file.name,
      fileType: file.type,
      size: file.size,
    };

    channel.send(JSON.stringify(metadata));
    console.log("[Sender] Metadata sent:", metadata);

    const fileReader = new FileReader();
    let offset = 0;

    const readSlice = async () => {
      const slice = file.slice(offset, offset + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };

    fileReader.onload = async (e) => {
      // Wait if bufferedAmount is too high
      while (channel.bufferedAmount > 16 * chunkSize) {
        await new Promise((res) => setTimeout(res, 100));
      }

      channel.send(e.target.result);
      offset += chunkSize;

      if (offset < file.size) {
        readSlice(); // read next slice
      } else {
        channel.send("done");
        console.log("[Sender] Finished sending file.");
        toast.success("File sent successfully!");
      }
    };

    readSlice(); // start reading
  };

  channel.onerror = (e) => console.error("[Sender] Channel error:", e);
  channel.onclose = () => console.log("[Sender] Data channel closed");

  peer.onicecandidate = (e) => {
    if (e.candidate) {
      console.log("[Sender] ICE candidate generated");
      Socket.emit("signal", { to: id, data: { candidate: e.candidate } });
    }
  };

  peer.oniceconnectionstatechange = () => {
    console.log("[Sender] ICE state:", peer.iceConnectionState);
  };

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  console.log("[Sender] Offer created and sent");
  Socket.emit("signal", { to: id, data: { sdp: offer } });

  toast.info("Waiting for receiver to accept...");
};


 const acceptOffer = async ({ from, sdp }) => {
  if (peerRef.current) return;

  const peer = new RTCPeerConnection();
  peerRef.current = peer;

  // ⚠️ Set this BEFORE setRemoteDescription
  peer.ondatachannel = (event) => {
    console.log("[Receiver] Data channel received:", event.channel.label);
    const channel = event.channel;
    fileBufferRef.current = [];
    dataChannelRef.current = channel;
    let incomingMetadata = null;

    channel.onmessage = (e) => {
  if (typeof e.data === "string") {
    if (e.data === "done") {
      console.log("[Receiver] Done signal received");

      const blob = new Blob(fileBufferRef.current, {
        type: incomingMetadata?.fileType || "application/octet-stream",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = incomingMetadata?.name || "received_file";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("File received and downloaded!");
      setReceiveProgress(100);
      return;
    }

    try {
      const parsed = JSON.parse(e.data);
      if (parsed.type === "metadata") {
        incomingMetadata = parsed;
        setReceivingMetadata(parsed);
        setReceiveProgress(0);
        console.log("[Receiver] Metadata received:", parsed);
          setIsReceiving(true);
  transferStartTimeRef.current = Date.now();
  cancelTransferRef.current = false;
  setTransferSpeed(0);
  setEstimatedTime(null);

        return;
      }
    } catch (err) {
      console.warn("[Receiver] Failed to parse string:", e.data);
    }
  } else {
    console.log("[Receiver] Binary chunk received");
    fileBufferRef.current.push(e.data);

    if (incomingMetadata) {
  const receivedSize = fileBufferRef.current.reduce((acc, chunk) => acc + chunk.byteLength, 0);
  const percent = Math.min((receivedSize / incomingMetadata.size) * 100, 100);
  setReceiveProgress(percent);

  const elapsed = (Date.now() - transferStartTimeRef.current) / 1000; // seconds
  const speed = receivedSize / elapsed; // bytes per second
  setTransferSpeed(speed);

  const remaining = incomingMetadata.size - receivedSize;
  const estTime = speed > 0 ? remaining / speed : null;
  setEstimatedTime(estTime);
}
if (cancelTransferRef.current) {
  channel.close();
  peerRef.current?.close();
  toast.error("Transfer cancelled!");
  setIsReceiving(false);
  return;
}


  }
};


    channel.onopen = () => console.log("[Receiver] Data channel open");
    channel.onerror = (e) => console.error("[Receiver] Channel error:", e);
    channel.onclose = () => console.log("[Receiver] Data channel closed");
  };

  peer.onicecandidate = (e) => {
    if (e.candidate) {
      console.log("[Receiver] ICE candidate generated");
      Socket.emit("signal", { to: from, data: { candidate: e.candidate } });
    }
  };

  peer.oniceconnectionstatechange = () => {
    console.log("[Receiver] ICE state:", peer.iceConnectionState);
  };

  await peer.setRemoteDescription(new RTCSessionDescription(sdp));
  console.log("[Receiver] Remote SDP set");

  setTimeout(async () => {
    for (const candidate of pendingCandidates.current) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("[Receiver] Pending ICE added");
      } catch (err) {
        console.error("[Receiver] Error adding ICE:", err);
      }
    }

    pendingCandidates.current = [];

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    console.log("[Receiver] Answer created and sent");
    Socket.emit("signal", { to: from, data: { sdp: answer } });
    setIncomingOffers((prev) => prev.filter((o) => o.from !== from));
  }, 100);
};


  return (
    <div>
      <ToastContainer />
      <h1 className="text-center text-4xl font-bold mt-4 mb-6">Connected Devices on LAN</h1>
      <h3 className="text-center text-2xl font-semibold mb-3">Select peer to transfer File</h3>

      <div className="w-[90%] mx-auto text-center mb-6">
        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files[0])}
          className="block mx-auto border p-2 rounded"
        />
        {selectedFile && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>

      <div className="w-[90%] mx-auto p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 bg-gray-100 rounded-xl shadow-sm">
        {clients.map((client, index) => (
          <div
            key={index}
            className="bg-white rounded-lg p-4 flex flex-col items-center border border-gray-300 relative"
          >
            <span className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border border-white"></span>

            <img
              src={`https://ui-avatars.com/api/?name=${client.name}&background=random`}
              alt="user avatar"
              className="w-16 h-16 rounded-full mb-2"
            />

            <p className="text-lg font-medium text-gray-700">{client.name}</p>

            <button
              className="mt-3 flex items-center gap-2 bg-green-400 text-white px-4 py-2 rounded hover:bg-green-600 transition"
              onClick={() => transfer(client.name)} // name not id
            >
              <Send className="w-5 h-5" />
              <span>Send file</span>
            </button>
          </div>
        ))}
      </div>

      <h3 className="text-center text-2xl mt-6 font-semibold">Incoming Files</h3>
      <div className="w-[90%] mx-auto mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {incomingOffers.map((offer, i) => (
          <div key={i} className="p-4 bg-white border rounded shadow flex flex-col items-center">
            <p className="mb-2">File offer from <strong>{offer.from}</strong></p>
            <button
              onClick={() => acceptOffer(offer)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Accept & Download
            </button>
          </div>
        ))}
      </div>
      {receivingMetadata && (
  <div className="w-[90%] mx-auto mt-6 mb-5 p-4 bg-blue-50 border rounded shadow">
    <p className="font-semibold text-lg mb-2">Receiving: {receivingMetadata.name}</p>
    <p className="text-sm text-gray-600 mb-2">Size: {(receivingMetadata.size / 1024).toFixed(2)} KB</p>

    <div className="w-full bg-gray-300 rounded h-4 overflow-hidden mb-2">
      <div
        className="bg-green-500 h-4 transition-all"
        style={{ width: `${receiveProgress}%` }}
      />
    </div>

    <p className="text-sm text-center mb-1">{receiveProgress.toFixed(1)}%</p>
    <p className="text-sm text-center text-gray-600">
      Speed: {(transferSpeed / 1024).toFixed(2)} KB/s
      {estimatedTime && ` • Time left: ${Math.ceil(estimatedTime)}s`}
    </p>

    <button
      className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      onClick={() => {
        cancelTransferRef.current = true;
        setReceivingMetadata(null);
        setReceiveProgress(0);
        setEstimatedTime(null);
        setTransferSpeed(0);
        setIsReceiving(false);
      }}
    >
      Cancel Transfer
    </button>
  </div>
)}


    </div>
  );
};
