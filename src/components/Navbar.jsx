import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { auth } from '../firebase/config'
import { signOut } from 'firebase/auth'

function Navbar() {

  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(false)

  const toggleMenu = () => {
    setOpen(!open)
  }

  const toggleDark = () => {
    setDark(!dark)
    document.body.classList.toggle('dark')
  }

  const logout = async () => {
    await signOut(auth)
  }

  return (
    <div className="topbar">

      {/* TOP BAR */}
      <div className="topbar-header">

        <div className="brand">
          💰 ExpenseApp
        </div>

        <button className="menu-btn" onClick={toggleMenu}>
          ☰
        </button>

      </div>

      {/* DROPDOWN MENU */}
      {open && (
        <div className="menu-dropdown">

          <NavLink to="/dashboard" onClick={() => setOpen(false)}>
            🏠 Dashboard
          </NavLink>

          <NavLink to="/add" onClick={() => setOpen(false)}>
            ➕ Add Expense
          </NavLink>

          <NavLink to="/history" onClick={() => setOpen(false)}>
            📜 History
          </NavLink>

          <NavLink to="/budget" onClick={() => setOpen(false)}>
            💰 Budget
          </NavLink>

          <button onClick={toggleDark}>
            ☀️ Dark Mode
          </button>

          <button onClick={logout} className="logout">
            🚪 Logout
          </button>

        </div>
      )}

    </div>
  )
}

export default Navbar