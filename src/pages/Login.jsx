import { signInWithPopup } from 'firebase/auth'
import { auth, provider } from '../firebase/config'

function Login() {

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error("Login error:", error)
      alert("Login failed. Please try again.")
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>💰 Spending Tracker</h1>
        <p>Track your expenses easily and smartly</p>
        <button className="google-btn" onClick={handleLogin}>
          <img src="https://www.google.com/favicon.ico" alt="Google" width="20" />
          Sign in with Google
        </button>
      </div>
    </div>
  )
}

export default Login