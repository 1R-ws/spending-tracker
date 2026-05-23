import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { auth } from '../firebase/config'
import { signOut } from 'firebase/auth'

function Navbar() {

  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('dark')
    if (saved === 'true') {
      setDark(true)
      document.body.classList.add('dark')
    }
  }, [])

  const toggleDark = () => {
    const newVal = !dark
    setDark(newVal)
    localStorage.setItem('dark', newVal)

    if (newVal) {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
  }

  const logout = async () => {
    await signOut(auth)
  }

  return (
    <>

      {/* TOP BAR (settings only) */}
      <div className="topbar">

        <div className="brand">
          💰 ExpenseApp
        </div>

        <button
          className="menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

      </div>

      {/* SETTINGS PANEL */}
      {menuOpen && (
        <div className="settings-panel">

          <button onClick={toggleDark}>
            {dark ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>

          <button onClick={logout} className="logout">
            🚪 Logout
          </button>

        </div>
      )}

      {/* BOTTOM NAV */}
      <div className="bottom-nav">

        <NavLink to="/dashboard" className="nav-item">
          🏠
          <span>Home</span>
        </NavLink>

        <NavLink to="/add" className="nav-item add-btn">
          ➕
        </NavLink>

        <NavLink to="/history" className="nav-item">
          📜
          <span>History</span>
        </NavLink>

        <NavLink to="/budget" className="nav-item">
          💰
          <span>Budget</span>
        </NavLink>

      </div>

    </>
  )
}

export default Navbar