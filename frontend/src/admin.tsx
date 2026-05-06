import React from 'react'
import ReactDOM from 'react-dom/client'
// @ts-ignore
import AdminApp from './web-admin/App'

ReactDOM.createRoot(document.getElementById('admin-root')!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
)
