'use server'

import {neon} from '@neondatabase/serverless'
import {z} from "zod"
import {formSchema} from "@/app/c/[id]/collection-edit-type"
import {fetchCollection, fetchUser} from "@/lib/db"
import {isOwner} from "@/lib/aaa"

export async function saveCollection(values: z.infer<typeof formSchema>) {
  const collection = await fetchCollection(values.id)
  const user = await fetchUser(collection!.user_id!)
  if (!await isOwner(user!)) {
    return
  }

  // Connect to the Neon database
  const sql = neon(`${process.env.DATABASE_URL}`)

  await sql`UPDATE collection 
               SET name = ${values.name},
                   description = ${values.description},
                   tags = ${values.tags}
             WHERE id = ${values.id}`
}
