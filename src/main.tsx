import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Note: we intentionally do NOT use <React.StrictMode> — react-chessboard uses
// react-dnd (HTML5 backend), which breaks with StrictMode's double-mount in dev
// ("Cannot have two HTML5 backends at the same time").
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
