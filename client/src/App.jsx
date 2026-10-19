import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { DataProvider } from './data/store.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Search from './pages/Search.jsx'
import Carts from './pages/Carts.jsx'
import NewCart from './pages/NewCart.jsx'
import Cart from './pages/Cart.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Dummy carts/customers/staff. Sits inside AuthProvider because the
            cart pages merge the signed-in user into the assignable buyers. */}
        <DataProvider>
          <Routes>
            {/* The index is the login page. */}
            <Route path="/" element={<Login />} />

            {/* Everything nested here requires a signed-in user. */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<Dashboard />} />
              <Route path="/app/search" element={<Search />} />
              <Route path="/app/carts" element={<Carts />} />
              <Route path="/app/carts/new" element={<NewCart />} />
              <Route path="/app/carts/:id" element={<Cart />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
