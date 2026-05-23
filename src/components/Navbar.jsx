import { NavLink } from 'react-router-dom'

function Navbar() {
  return (
    <div className="bottom-nav">

      <NavLink to="/dashboard" className="nav-item">
        🏠
        <span>Dashboard</span>
      </NavLink>

      <NavLink to="/add" className="nav-item">
        ➕
        <span>Add</span>
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
  )
}

export default Navbar