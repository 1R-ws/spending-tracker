import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useTheme } from '../context/ThemeContext'
import { Home, PieChart, Plus, History, LogOut, Sun, Moon } from 'lucide-react'
import '../styles/navbar.css'

function Navbar() {
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useTheme()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

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
          <span className="nb-brand-name">Spendly</span>
        </div>

        <div className="nb-topbar-right">
          <button
            className="nb-icon-btn"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
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
          <Home size={22} className="nb-nav-icon" />
          <span className="nb-nav-label">Home</span>
        </NavLink>

        <NavLink
          to="/budget"
          className={({ isActive }) => `nb-nav-item${isActive ? ' active' : ''}`}
        >
          <PieChart size={22} className="nb-nav-icon" />
          <span className="nb-nav-label">Budget</span>
        </NavLink>

        <NavLink to="/add" className="nb-fab" aria-label="Add expense">
          <Plus size={28} color="#ffffff" />
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) => `nb-nav-item${isActive ? ' active' : ''}`}
        >
          <History size={22} className="nb-nav-icon" />
          <span className="nb-nav-label">History</span>
        </NavLink>

        <button
          className="nb-nav-item"
          onClick={() => setShowLogoutModal(true)}
        >
          <LogOut size={22} className="nb-nav-icon" />
          <span className="nb-nav-label">Logout</span>
        </button>
      </nav>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="nb-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="nb-modal" onClick={e => e.stopPropagation()}>
            <div className="nb-modal-icon"><LogOut size={36} /></div>
            <div className="nb-modal-title">Log out?</div>
            <div className="nb-modal-body">
              You'll need to sign in again to access your expenses.
            </div>
            <div className="nb-modal-actions">
              <button className="nb-modal-cancel" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button className="nb-modal-confirm" onClick={handleLogoutConfirm}>
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