import React from 'react'
import { BrowserRouter as Router ,Route,Routes } from 'react-router-dom'
import Home from './Home'
import {Filetransfer as Ftransfer } from './Filetransfer' 
const App = () => {
  return (
    <>
    <Router>
      <Routes>
        <Route path="/" element={<Home/>}></Route>
        <Route path='/transfer' element={<Ftransfer/>} ></Route>
      </Routes>
    </Router>
    </>
  )
}

export default App