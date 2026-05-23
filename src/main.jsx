import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.jsx'

import './styles/global.css'
import './styles/navbar.css'
import './styles/login.css'
import './styles/dashboard.css'
import './styles/forms.css'
import './styles/history.css'
import './styles/budget.css'
import './styles/responsive.css'

import {
  ThemeProvider
} from './context/ThemeContext'

createRoot(document.getElementById('root')).render(

  <StrictMode>

    <ThemeProvider>
      <App />
    </ThemeProvider>

  </StrictMode>

)