import React from 'react'
import { BrowserRouter as Router ,Route,Routes } from 'react-router-dom'
import Home from './Home'
import Chatscreen from './Chatscreen'
import {Filetransfer as Ftransfer } from './Filetransfer' 
import { UserProvider } from './UserContext'
import Meeting from './Meeting'
const App = () => {
  return (
    <>
    <UserProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Home/>}></Route>
        <Route path='/transfer' element={<Ftransfer/>} ></Route>
        <Route path='/chat' element={<Chatscreen/>}></Route>
        <Route path='/meeting' element={<Meeting/>}></Route>
      </Routes>
    </Router>
    </UserProvider>
    </>
  )
}

export default App