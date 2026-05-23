import {
  NavLink
} from 'react-router-dom'

import {
  signOut
} from 'firebase/auth'

import {
  auth
} from '../firebase/config'

import {
  useTheme
} from '../context/ThemeContext'

function Navbar() {

  const {
    darkMode,
    toggleDarkMode
  } = useTheme()

  return (

    <nav className="navbar">

      <div className="nav-brand">
        💰 Spending Tracker
      </div>

      <div className="nav-links">

        <NavLink to="/">
          🏠 Dashboard
        </NavLink>

        <NavLink to="/add">
          ➕ Add
        </NavLink>

        <NavLink to="/history">
          📜 History
        </NavLink>

        <NavLink to="/budget">
          💰 Budget
        </NavLink>

      </div>

      <div
        style={{
          display: 'flex',
          gap: '10px'
        }}
      >

        <button
          className="theme-btn"
          onClick={toggleDarkMode}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        <button
          className="logout-btn"
          onClick={() => signOut(auth)}
        >
          Logout
        </button>

      </div>

    </nav>

  )

}

export default Navbar