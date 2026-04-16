import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { api } from '../lib/api'
import type { Product } from 'floramini-types'
import { useCartStore } from '../stores/cart'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'
import { useTelegramMainButton } from '../hooks/useTelegramMainButton'
import LoadingSkeleton from '../components/LoadingSkeleton'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const [activeImage, setActiveImage] = useState(0)

  useTelegramBackButton(useCallback(() => navigate(-1), [navigate]))

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => api.get(`/api/products/${id}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const handleAddToCart = useCallback(() => {
    if (!product) return
    addItem({
      productId: product.id,
      productName: product.name,
      productImageUrl: product.imageUrl,
      unitPrice: product.price,
      options: {},
    })
    WebApp.HapticFeedback?.notificationOccurred('success')
    navigate('/cart')
  }, [product, addItem, navigate])

  useTelegramMainButton(
    product ? `Ajouter au panier — €${product.price.toFixed(2)}` : 'Chargement...',
    handleAddToCart,
    !!product && product.stock > 0
  )

  if (isLoading) {
    return (
      <div className="p-4">
        <LoadingSkeleton className="h-64 w-full mb-4" />
        <LoadingSkeleton className="h-6 w-3/4 mb-2" />
        <LoadingSkeleton className="h-4 w-full mb-1" />
        <LoadingSkeleton className="h-4 w-2/3" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="text-5xl mb-3">🌿</span>
        <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>
          Produit introuvable
        </p>
      </div>
    )
  }

  const allImages = [product.imageUrl, ...product.images]

  return (
    <div>
      {/* Image gallery */}
      <div className="relative bg-gray-100">
        <img
          src={allImages[activeImage]}
          alt={product.name}
          className="w-full h-72 object-cover"
        />
        {allImages.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === activeImage ? 'bg-white scale-125' : 'bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h1
            className="text-xl font-bold flex-1 mr-2"
            style={{ color: 'var(--tg-theme-text-color, #111827)' }}
          >
            {product.name}
          </h1>
          <span
            className="text-2xl font-bold shrink-0"
            style={{ color: 'var(--tg-theme-button-color, #3b82f6)' }}
          >
            €{product.price.toFixed(2)}
          </span>
        </div>

        <span
          className="text-xs font-medium"
          style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}
        >
          {product.category?.name}
        </span>

        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: 'var(--tg-theme-text-color, #374151)' }}
        >
          {product.description}
        </p>

        {product.stock === 0 ? (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-center text-sm text-red-600 font-medium">
            Rupture de stock — non disponible actuellement
          </div>
        ) : product.stock <= 5 ? (
          <div className="mt-4 rounded-xl bg-orange-50 p-3 text-center text-sm text-orange-600 font-medium">
            ⚠️ Plus que {product.stock} en stock !
          </div>
        ) : null}
      </div>
    </div>
  )
}
