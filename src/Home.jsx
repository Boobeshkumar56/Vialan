import React from 'react'
import {Send,PhoneCall,MessageCircleCode} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Home = () => {
    const navigate=useNavigate();
  return (
    <>
    <div className="text-center text-5xl pt-5 ">ViaLan</div>

<div
  id="container"
  className="w-[400px] mx-auto mt-5 border-2 border-black rounded-2xl p-4 flex flex-col gap-4 items-center justify-around"
>
 
  <div className="w-full bg-gradient-to-r from-orange-200 to-cyan-500 rounded-xl p-4 text-center shadow-md hover:scale-105 transition-transform duration-200" onClick={()=>{navigate('/transfer')}}>
    <Send className="mx-auto mb-2 w-8 h-8" />
    <h3 className="text-xl font-semibold">File Transfer</h3>
  </div>

 
  <div className="w-full bg-gradient-to-r from-orange-200 to-cyan-500 rounded-xl p-4 text-center shadow-md hover:scale-105 transition-transform duration-200">
    <MessageCircleCode className="mx-auto mb-2 w-8 h-8" />
    <h3 className="text-xl font-semibold">Message</h3>
  </div>

  <div className="w-full bg-gradient-to-r from-orange-200 to-cyan-500 rounded-xl p-4 text-center shadow-md hover:scale-105 transition-transform duration-200">
    <PhoneCall className="mx-auto mb-2 w-8 h-8" />
    <h3 className="text-xl font-semibold">Calling</h3>
  </div>
</div>

    </>
    
    
  )
}

export default Home;