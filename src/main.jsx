import React, { lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'

const Admin = lazy(() => import('./Admin'))

function Root() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const f = () => setHash(location.hash)
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  return hash === '#admin' ? <Suspense fallback={null}><Admin /></Suspense> : <App />
}

createRoot(document.getElementById('root')).render(<React.StrictMode><Root /></React.StrictMode>)
