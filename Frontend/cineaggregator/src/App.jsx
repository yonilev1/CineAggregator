import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import MovieDetails from './pages/MovieDetails'
import Preferences from './pages/Preferences'
import ActorMovies from './pages/ActorMovies'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminPanel from './pages/AdminPanel'
import { getPublicSettings } from './services/movieService'

function App() {
  const [announcement, setAnnouncement] = useState(null)

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await getPublicSettings()
      if (settings && settings.siteAnnouncement) {
        setAnnouncement(settings.siteAnnouncement)
      }
    }
    fetchSettings()
  }, [])

  return (
    <>
      <Navbar />
      {announcement && (
        <div className="site-announcement-banner">
          📢 {announcement}
        </div>
      )}
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/actor/:id" element={<ActorMovies />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </>
  )
}

export default App
