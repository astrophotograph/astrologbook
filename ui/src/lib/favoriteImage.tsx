import {neon} from "@neondatabase/serverless"
import {Redis} from '@upstash/redis'

// Initialize Redis
const redis = new Redis({
  url: process.env['REDIS_KV_REST_API_URL'],
  token: process.env['REDIS_KV_REST_API_TOKEN']
})

export async function favoriteImage(collection_id: string) {
  // First, check if the URL is cached in Redis
  const cachedUrl = await redis.get<string | null>(`favorite_image:${collection_id}`)

  // If URL exists in Redis, return it immediately
  if (cachedUrl) {
    return cachedUrl
  }

  // If not in Redis, compute the URL
  const sql = neon(`${process.env.DATABASE_URL}`)
  const results = await sql`SELECT *
                            FROM collectionimage
                                     JOIN image ON collectionimage.image_id = image.id
                            WHERE collectionimage.collection_id = ${collection_id}
  `
  let image = null

  const favorites = results.filter(item => item.favorite)

  if (favorites.length > 0) {
    image = favorites[0]
  } else {
    if (results.length > 0) {
      image = results[0]
    }
  }

  // Determine the URL
  const imageUrl = !image
    ? '/ph/static/empty-collection.svg'
    : `https://m.astrophotography.tv/i/${image.user_id}/1000/${image.id}.jpg`

  // Store the URL in Redis for future requests
  // You can set an expiration time if needed (e.g., 3600 for 1 hour)
  await redis.set(`favorite_image:${collection_id}`, imageUrl, {ex: 3600})

  return imageUrl
}
