import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: 'bouquets' }, update: {}, create: { slug: 'bouquets', name: 'Bouquets', order: 1 } }),
    prisma.category.upsert({ where: { slug: 'roses' }, update: {}, create: { slug: 'roses', name: 'Roses', order: 2 } }),
    prisma.category.upsert({ where: { slug: 'plantes' }, update: {}, create: { slug: 'plantes', name: 'Plantes', order: 3 } }),
    prisma.category.upsert({ where: { slug: 'sechees' }, update: {}, create: { slug: 'sechees', name: 'Séchées', order: 4 } }),
    prisma.category.upsert({ where: { slug: 'compositions' }, update: {}, create: { slug: 'compositions', name: 'Compositions', order: 5 } }),
  ])

  const [bouquets, roses, plantes, sechees, compositions] = categories

  // Products
  const products = [
    {
      categoryId: bouquets.id,
      name: 'Bouquet Romantique Rose',
      description: 'Un bouquet de roses rouges classiques, symbole de passion et d\'amour. Parfait pour une occasion romantique.',
      price: 45,
      stock: 10,
      imageUrl: 'https://picsum.photos/seed/product-1/400/400',
    },
    {
      categoryId: bouquets.id,
      name: 'Composition Printanière',
      description: 'Un mélange de tulipes colorées et de renoncules délicates pour célébrer le printemps tout au long de l\'année.',
      price: 38,
      stock: 8,
      imageUrl: 'https://picsum.photos/seed/product-2/400/400',
    },
    {
      categoryId: bouquets.id,
      name: 'Bouquet Sauvage',
      description: 'Un bouquet champêtre de fleurs des champs soigneusement sélectionnées pour un rendu naturel et authentique.',
      price: 35,
      stock: 12,
      imageUrl: 'https://picsum.photos/seed/product-3/400/400',
    },
    {
      categoryId: bouquets.id,
      name: 'Bouquet Luxe Pivoine',
      description: 'Des pivoines majestueuses en pleine floraison, pour une occasion exceptionnelle qui mérite le meilleur.',
      price: 65,
      stock: 6,
      imageUrl: 'https://picsum.photos/seed/product-4/400/400',
    },
    {
      categoryId: roses.id,
      name: 'Rose Rouge Classique',
      description: 'La rose rouge par excellence : élégante, parfumée, intemporelle. Offrez un classique indémodable.',
      price: 28,
      stock: 20,
      imageUrl: 'https://picsum.photos/seed/product-5/400/400',
    },
    {
      categoryId: roses.id,
      name: 'Rose Blanche Élégance',
      description: 'Des roses blanches d\'une pureté absolue, idéales pour les mariages, baptêmes et cérémonies.',
      price: 32,
      stock: 15,
      imageUrl: 'https://picsum.photos/seed/product-6/400/400',
    },
    {
      categoryId: roses.id,
      name: 'Rose Arc-en-Ciel',
      description: 'Des roses teintées aux couleurs de l\'arc-en-ciel, pour une touche d\'originalité et de gaieté.',
      price: 55,
      stock: 7,
      imageUrl: 'https://picsum.photos/seed/product-7/400/400',
    },
    {
      categoryId: plantes.id,
      name: 'Plante Monstera',
      description: 'Le Monstera deliciosa, la plante tropicale tendance. Idéale pour décorer votre intérieur avec style.',
      price: 29,
      stock: 15,
      imageUrl: 'https://picsum.photos/seed/product-8/400/400',
    },
    {
      categoryId: plantes.id,
      name: 'Plante Pothos Doré',
      description: 'Le Pothos est la plante idéale pour les débutants : robuste, belle et facile à entretenir.',
      price: 18,
      stock: 25,
      imageUrl: 'https://picsum.photos/seed/product-9/400/400',
    },
    {
      categoryId: sechees.id,
      name: 'Rose Éternelle Séchée',
      description: 'Des roses séchées et stabilisées qui gardent leur beauté pour toujours. Souvenir inoubliable.',
      price: 22,
      stock: 20,
      imageUrl: 'https://picsum.photos/seed/product-10/400/400',
    },
    {
      categoryId: sechees.id,
      name: 'Couronne Séchée Bohème',
      description: 'Une couronne florale séchée au style bohème, à suspendre chez soi pour une décoration unique.',
      price: 48,
      stock: 9,
      imageUrl: 'https://picsum.photos/seed/product-11/400/400',
    },
    {
      categoryId: compositions.id,
      name: 'Composition Tropicale',
      description: 'Un arrangement exotique de fleurs tropicales aux couleurs vives : strelitzias, héliconiass et anthuriums.',
      price: 72,
      stock: 5,
      imageUrl: 'https://picsum.photos/seed/product-12/400/400',
    },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: products.indexOf(product) + 1 },
      update: {},
      create: { ...product, images: '[]' },
    })
  }

  // Default settings
  await prisma.setting.upsert({
    where: { key: 'deliveryFee' },
    update: {},
    create: { key: 'deliveryFee', value: '5.00' },
  })
  await prisma.setting.upsert({
    where: { key: 'timeSlots' },
    update: {},
    create: {
      key: 'timeSlots',
      value: JSON.stringify(['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00']),
    },
  })

  console.log('Seed complete: 5 categories, 12 products, default settings')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
