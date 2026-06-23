import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import '../styles/navbar.css'

function Navbar() {
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(
    () => document.documentElement.classList.contains('dark')
  )
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const handleLogoutConfirm = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const user = auth.currentUser
  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?'

  return (
    <>
      {/* TOP BAR */}
      <header className="nb-topbar">
        <div className="nb-brand">
          <span className="nb-brand-icon">💰</span>
          <span className="nb-brand-name">ExpenseApp</span>
        </div>

        <div className="nb-topbar-right">
          <button
            className="nb-icon-btn"
            onClick={() => setDarkMode(prev => !prev)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          <div className="nb-avatar" title={user?.email}>
            {initials}
          </div>
        </div>
      </header>

      {/* BOTTOM NAV */}
      <nav className="nb-bottom">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nb-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nb-nav-icon">🏠</span>
          <span className="nb-nav-label">Home</span>
        </NavLink>

        <NavLink
          to="/budget"
          className={({ isActive }) => `nb-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nb-nav-icon">💰</span>
          <span className="nb-nav-label">Budget</span>
        </NavLink>

        <NavLink to="/add" className="nb-fab" aria-label="Add expense">
          <span className="nb-fab-icon">+</span>
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) => `nb-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nb-nav-icon">📜</span>
          <span className="nb-nav-label">History</span>
        </NavLink>

        {/* LOGOUT — opens modal */}
        <button
          className="nb-nav-item"
          onClick={() => setShowLogoutModal(true)}
        >
          <span className="nb-nav-icon">🚪</span>
          <span className="nb-nav-label">Logout</span>
        </button>
      </nav>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="nb-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="nb-modal" onClick={e => e.stopPropagation()}>
            <div className="nb-modal-icon">🚪</div>
            <div className="nb-modal-title">Log out?</div>
            <div className="nb-modal-body">
              You'll need to sign in again to access your expenses.
            </div>
            <div className="nb-modal-actions">
              <button
                className="nb-modal-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="nb-modal-confirm"
                onClick={handleLogoutConfirm}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar
