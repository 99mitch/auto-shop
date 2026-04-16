import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Product, Category } from 'floramini-types'
import { useTelegramBackButton } from '../../hooks/useTelegramBackButton'
import LoadingSkeleton from '../../components/LoadingSkeleton'

interface ProductForm {
  name: string
  description: string
  categoryId: number
  price: string
  stock: string
  imageUrl: string
  isActive: boolean
}

const emptyForm = (): ProductForm => ({
  name: '',
  description: '',
  categoryId: 0,
  price: '',
  stock: '',
  imageUrl: '',
  isActive: true,
})

export default function AdminProducts() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useTelegramBackButton(useCallback(() => navigate('/admin'), [navigate]))

  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm())
  const [showForm, setShowForm] = useState(false)

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['admin-products'],
    queryFn: () => api.get('/api/admin/products').then((r) => r.data),
  })

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then((r) => r.data),
  })

  const saveProduct = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        categoryId: Number(form.categoryId),
        images: [],
      }
      return editing
        ? api.put(`/api/admin/products/${editing}`, body)
        : api.post('/api/admin/products', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      setShowForm(false)
      setEditing(null)
      setForm(emptyForm())
    },
  })

  const deleteProduct = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  })

  function startEdit(p: Product) {
    setEditing(p.id)
    setForm({
      name: p.name,
      description: p.description,
      categoryId: p.categoryId,
      price: String(p.price),
      stock: String(p.stock),
      imageUrl: p.imageUrl,
      isActive: p.isActive,
    })
    setShowForm(true)
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
          Catalogue
        </h2>
        <button
          onClick={() => { setEditing(null); setForm(emptyForm()); setShowForm(!showForm) }}
          className="text-sm px-4 py-2 rounded-full font-semibold"
          style={{ backgroundColor: 'var(--tg-theme-button-color, #3b82f6)', color: '#fff' }}
        >
          + Ajouter
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-2xl p-4 mb-4 space-y-3"
          style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tg-theme-text-color)' }}>
            {editing ? 'Modifier le produit' : 'Nouveau produit'}
          </h3>
          {[
            { key: 'name', label: 'Nom', type: 'text' },
            { key: 'description', label: 'Description', type: 'text' },
            { key: 'price', label: 'Prix (€)', type: 'number' },
            { key: 'stock', label: 'Stock', type: 'number' },
            { key: 'imageUrl', label: 'URL image', type: 'url' },
          ].map(({ key, label, type }) => (
            <input
              key={key}
              type={type}
              placeholder={label}
              value={(form as any)[key]}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid var(--tg-theme-hint-color, #e5e7eb)', color: 'var(--tg-theme-text-color)' }}
            />
          ))}
          <select
            value={form.categoryId}
            onChange={(e) => setForm((p) => ({ ...p, categoryId: Number(e.target.value) }))}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ border: '1px solid var(--tg-theme-hint-color, #e5e7eb)', color: 'var(--tg-theme-text-color)' }}
          >
            <option value={0}>Choisir une catégorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
            Actif
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => saveProduct.mutate()}
              disabled={saveProduct.isPending}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'var(--tg-theme-button-color, #3b82f6)', color: '#fff' }}
            >
              {saveProduct.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #e5e7eb)', color: 'var(--tg-theme-text-color)' }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
            >
              <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: p.isActive ? 'var(--tg-theme-text-color)' : '#9ca3af' }}>
                  {p.name} {!p.isActive && <span className="text-xs">(inactif)</span>}
                </p>
                <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
                  €{p.price.toFixed(2)} · {p.stock} en stock
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(p)} className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--tg-theme-button-color, #3b82f6)', color: '#fff' }}>Modifier</button>
                <button onClick={() => deleteProduct.mutate(p.id)} className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500">Suppr.</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
