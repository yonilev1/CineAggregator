import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import MovieDetails from './pages/MovieDetails'
import Preferences from './pages/Preferences'
import Login from './pages/Login'
import { isAuthenticated } from './services/authService'

function App() {
  if (!isAuthenticated()) {
    return <Login />
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/preferences" element={<Preferences />} />
        </Routes>
      </div>
    </>
  )
}

export default App
