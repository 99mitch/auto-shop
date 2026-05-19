import { useEffect, useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Splash from './pages/Splash'
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
import Balance from './pages/Balance'
import PreOrderPage from './pages/PreOrderPage'
import MesPreCommandes from './pages/MesPreCommandes'
import AdminGuard from './pages/admin/AdminGuard'
import Dashboard from './pages/admin/Dashboard'
import AdminOrders from './pages/admin/AdminOrders'
import AdminProducts from './pages/admin/AdminProducts'
import AdminSettings from './pages/admin/AdminSettings'
import AdminCollaborators from './pages/admin/AdminCollaborators'
import AdminPreOrders from './pages/admin/AdminPreOrders'
import CollabDashboard from './pages/collab/CollabDashboard'
import CollabGuard from './pages/collab/CollabGuard'
import CollabAddCard from './pages/collab/CollabAddCard'
import CollabWallets from './pages/collab/CollabWallets'
import DonneesSelection from './pages/DonneesSelection'
import ExtractionPage from './pages/ExtractionPage'
import MesCommandesDonnees from './pages/MesCommandesDonnees'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'donnees', element: <DonneesSelection /> },
      { path: 'extraction', element: <ExtractionPage /> },
      { path: 'mes-extractions', element: <MesCommandesDonnees /> },
      { path: 'catalogue', element: <Catalogue /> },
      { path: 'product/:id', element: <ProductDetail /> },
      { path: 'cart', element: <Cart /> },
      { path: 'checkout', element: <Checkout /> },
      { path: 'order/:id', element: <OrderConfirmation /> },
      { path: 'orders', element: <Orders /> },
      { path: 'orders/:id', element: <OrderDetail /> },
      { path: 'profile', element: <Profile /> },
      { path: 'balance', element: <Balance /> },
      { path: 'precommande', element: <PreOrderPage /> },
      { path: 'mes-precommandes', element: <MesPreCommandes /> },
      {
        path: 'collab',
        element: <CollabGuard />,
        children: [
          { index: true, element: <CollabDashboard /> },
          { path: 'add', element: <CollabAddCard /> },
          { path: 'edit/:id', element: <CollabAddCard /> },
          { path: 'wallets', element: <CollabWallets /> },
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
          { path: 'preorders', element: <AdminPreOrders /> },
        ],
      },
    ],
  },
])

function AppInit() {
  const init = useAuthStore((s) => s.init)
  const [splash, setSplash] = useState(() => !sessionStorage.getItem('splashSeen'))

  useEffect(() => {
    WebApp.setHeaderColor('#050505')
    WebApp.setBackgroundColor('#050505')
    WebApp.ready()
    WebApp.expand()
    init()
  }, [])

  if (splash) {
    return (
      <Splash onDone={() => {
        sessionStorage.setItem('splashSeen', '1')
        setSplash(false)
      }} />
    )
  }

  return <RouterProvider router={router} />
}

export default AppInit
