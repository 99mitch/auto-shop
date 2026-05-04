import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import { useAuthStore } from './stores/auth'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Catalogue from './pages/Catalogue'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Profile from './pages/Profile'
import AdminGuard from './pages/admin/AdminGuard'
import Dashboard from './pages/admin/Dashboard'
import AdminOrders from './pages/admin/AdminOrders'
import AdminProducts from './pages/admin/AdminProducts'
import AdminSettings from './pages/admin/AdminSettings'
import AdminCollaborators from './pages/admin/AdminCollaborators'
import CollabDashboard from './pages/collab/CollabDashboard'
import CollabGuard from './pages/collab/CollabGuard'
import CollabAddCard from './pages/collab/CollabAddCard'
import DonneesSelection from './pages/DonneesSelection'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'donnees', element: <DonneesSelection /> },
      { path: 'catalogue', element: <Catalogue /> },
      { path: 'product/:id', element: <ProductDetail /> },
      { path: 'cart', element: <Cart /> },
      { path: 'checkout', element: <Checkout /> },
      { path: 'order/:id', element: <OrderConfirmation /> },
      { path: 'orders', element: <Orders /> },
      { path: 'orders/:id', element: <OrderDetail /> },
      { path: 'profile', element: <Profile /> },
      {
        path: 'collab',
        element: <CollabGuard />,
        children: [
          { index: true, element: <CollabDashboard /> },
          { path: 'add', element: <CollabAddCard /> },
          { path: 'edit/:id', element: <CollabAddCard /> },
        ],
      },
      {
        path: 'admin',
        element: <AdminGuard />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'orders', element: <AdminOrders /> },
          { path: 'products', element: <AdminProducts /> },
          { path: 'settings', element: <AdminSettings /> },
          { path: 'collaborators', element: <AdminCollaborators /> },
        ],
      },
    ],
  },
])

function AppInit() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
    init()
  }, [])

  return <RouterProvider router={router} />
}

export default AppInit
