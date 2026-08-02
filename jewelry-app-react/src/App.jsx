import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Storefront from './storefront/Storefront'
import Admin from './admin/Admin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
