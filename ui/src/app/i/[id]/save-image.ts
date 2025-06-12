'use server'

import {neon} from '@neondatabase/serverless'
import {z} from "zod"
import {isImageOwner} from "@/lib/aaa"
import {imageFormSchema} from "@/app/i/[id]/edit-types"

export async function saveImage(values: z.infer<typeof imageFormSchema>) {
  if (!await isImageOwner(values.id)) {
    return
  }

  // Connect to the Neon database
  const sql = neon(`${process.env.DATABASE_URL}`)

  await sql`UPDATE image 
               SET summary = ${values.summary},
                   description = ${values.description},
                   tags = ${values.tags},
                   location = ${values.location},
                   favorite = ${values.favorite || false}
             WHERE id = ${values.id}`
}
