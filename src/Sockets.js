import {io} from 'socket.io-client';
const socket=io('http://192.168.212.33:5500/')
console.log("got signal")
export default socket;
