import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import MovieDetails from './pages/MovieDetails'
import Preferences from './pages/Preferences'
import ActorMovies from './pages/ActorMovies'

function App() {
  return (
    <>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/actor/:id" element={<ActorMovies />} />
          <Route path="/preferences" element={<Preferences />} />
        </Routes>
      </div>
    </>
  )
}

export default App
