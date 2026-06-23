import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from './firebase/config'

import Navbar from './components/Navbar'

import Dashboard from './pages/Dashboard'
import AddExpense from './pages/AddExpense'
import History from './pages/History'
import Budget from './pages/Budget'
import Login from './pages/Login'

import './styles/global.css'

function App() {
  const [user, loading] = useAuthState(auth)

  if (loading) return <div className="app-loading">Loading…</div>

  return (
    <Router>
      {user ? (
        <>
          <Navbar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add" element={<AddExpense />} />
              <Route path="/history" element={<History />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </>
      ) : (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      )}
    </Router>
  )
}

export default App
