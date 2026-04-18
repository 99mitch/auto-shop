import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { api } from '../lib/api'
import type { Product } from 'floramini-types'
import { useCartStore } from '../stores/cart'
import { useTelegramMainButton } from '../hooks/useTelegramMainButton'
import { Badge } from '../components/ui/badge'
import PageHeader from '../components/PageHeader'
import AddedToCartSheet from '../components/AddedToCartSheet'
import CartIcon from '../components/CartIcon'
import LoadingSkeleton from '../components/LoadingSkeleton'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const addItem = useCartStore((s) => s.addItem)
  const [activeImage, setActiveImage] = useState(0)
  const [showSheet, setShowSheet] = useState(false)

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
    setShowSheet(true)
  }, [product, addItem])

  useTelegramMainButton(
    product ? `Ajouter au panier — €${product.price.toFixed(2)}` : 'Chargement...',
    handleAddToCart,
    !!product && product.stock > 0 && !showSheet
  )

  if (isLoading) {
    return (
      <>
        <PageHeader title="Produit" />
        <div className="p-4">
          <LoadingSkeleton className="h-64 w-full mb-4" />
          <LoadingSkeleton className="h-6 w-3/4 mb-2" />
          <LoadingSkeleton className="h-4 w-full mb-1" />
          <LoadingSkeleton className="h-4 w-2/3" />
        </div>
      </>
    )
  }

  if (!product) {
    return (
      <>
        <PageHeader title="Produit introuvable" />
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-5xl mb-3">🌿</span>
          <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>
            Produit introuvable
          </p>
        </div>
      </>
    )
  }

  const allImages = [product.imageUrl, ...product.images]

  return (
    <>
      <PageHeader title={product.name} right={<CartIcon />} />

      {/* Image gallery */}
      <div className="relative" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f8fafc)' }}>
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
        <div className="flex items-start justify-between mb-3">
          <h1
            className="text-xl font-bold flex-1 mr-2 tracking-tight"
            style={{ color: 'var(--tg-theme-text-color, #0f172a)' }}
          >
            {product.name}
          </h1>
          <span
            className="text-xl font-bold shrink-0 tracking-tight"
            style={{ color: 'var(--tg-theme-text-color, #0f172a)' }}
          >
            €{product.price.toFixed(2)}
          </span>
        </div>

        {product.category && (
          <Badge variant="default" className="mb-3">{product.category.name}</Badge>
        )}

        <p
          className="text-sm leading-relaxed mb-4"
          style={{ color: 'var(--tg-theme-hint-color, #64748b)' }}
        >
          {product.description}
        </p>

        {product.stock === 0 ? (
          <Badge variant="danger" className="w-full justify-center py-2 text-xs">
            Rupture de stock — non disponible actuellement
          </Badge>
        ) : product.stock <= 5 ? (
          <Badge variant="warning" className="w-full justify-center py-2 text-xs">
            ⚠️ Plus que {product.stock} en stock !
          </Badge>
        ) : (
          <Badge variant="success" className="w-full justify-center py-2 text-xs">
            ✓ En stock · {product.stock} disponibles
          </Badge>
        )}
      </div>

      {showSheet && (
        <AddedToCartSheet
          productName={product.name}
          productPrice={product.price}
          onClose={() => setShowSheet(false)}
        />
      )}
    </>
  )
}
