import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Obs.: NÃO usamos <React.StrictMode> de propósito — o react-chessboard usa
// react-dnd (HTML5 backend), que quebra com o double-mount do StrictMode em dev
// ("Cannot have two HTML5 backends at the same time").
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
