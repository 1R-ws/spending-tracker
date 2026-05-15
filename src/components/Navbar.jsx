import { Link, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'

function Navbar() {
  const location = useLocation()

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <nav className="navbar">
      <div className="nav-brand">💰 SpendTracker</div>
      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Dashboard</Link>
        <Link to="/add" className={location.pathname === '/add' ? 'active' : ''}>Add</Link>
        <Link to="/history" className={location.pathname === '/history' ? 'active' : ''}>History</Link>
        <Link to="/budget" className={location.pathname === '/budget' ? 'active' : ''}>Budget</Link>
      </div>
      <button className="logout-btn" onClick={handleLogout}>Logout</button>
    </nav>
  )
}

export default Navbar