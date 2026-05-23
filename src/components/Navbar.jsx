import { NavLink } from 'react-router-dom'
import { auth } from '../firebase/config'
import { signOut } from 'firebase/auth'
import { useState } from 'react'

function Navbar() {

  const [dark, setDark] = useState(false)

  const toggleDarkMode = () => {
    setDark(!dark)
    document.body.classList.toggle('dark')
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <div className="navbar">

      {/* LEFT - BRAND */}
      <div className="nav-brand">
        💰 ExpenseApp
      </div>

      {/* CENTER - MENU */}
      <div className="nav-links">

        <NavLink to="/dashboard">🏠 Dashboard</NavLink>
        <NavLink to="/add">➕ Add</NavLink>
        <NavLink to="/history">📜 History</NavLink>
        <NavLink to="/budget">💰 Budget</NavLink>

      </div>

      {/* RIGHT - ACTIONS */}
      <div className="nav-actions">

        <button className="theme-btn" onClick={toggleDarkMode}>
          {dark ? '☀️' : '🌙'}
        </button>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>

      </div>

    </div>
  )
}

export default Navbar