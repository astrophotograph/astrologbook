// Database utilities

import {neon} from '@neondatabase/serverless'
import {
  AstroObject,
  AstroObjectArraySchema,
  AstroObjectSchema,
  Collection,
  CollectionArraySchema,
  CollectionSchema,
  Image,
  ImageArraySchema,
  ImageSchema,
  User,
  UserSchema,
} from "@/lib/models"
import {marked} from "marked"
import ObjectTypeMap from "@/lib/objectTypeMap"

// Add these new functions to db.ts
import {z} from "zod"
import {AstronomyObject} from "@/components/todo-list-types"

// Update the AstronomyTodoSchema to include the flagged field
const AstronomyTodoSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  ra: z.string(),
  dec: z.string(),
  magnitude: z.string(),
  size: z.string(),
  objectType: z.string().nullish(),
  addedAt: z.string(),
  completed: z.boolean(),
  completedAt: z.string().nullish(),
  goalTime: z.string().nullish(),
  notes: z.string().nullish(),
  flagged: z.boolean().optional().default(false), // New field with default value
  last_updated: z.string().nullish(),
});

const AstronomyTodoArraySchema = z.array(AstronomyTodoSchema);

// Fetch all astronomy todo items for a user
export async function fetchAstronomyTodoItems(userId: string): Promise<AstronomyObject[]> {
  const sql = neon(`${process.env.DATABASE_URL}`);

  const results = await sql`
    SELECT * FROM astronomy_todo
    WHERE user_id = ${userId}
    ORDER BY "addedAt" DESC
  `;

  // Parse and convert to AstronomyObject format
  const todoItems = AstronomyTodoArraySchema.parse(results);
  return todoItems.map(item => ({
    id: item.id,
    name: item.name,
    ra: item.ra,
    dec: item.dec,
    magnitude: item.magnitude,
    size: item.size,
    objectType: item.objectType,
    addedAt: item.addedAt,
    completed: item.completed,
    completedAt: item.completedAt,
    goalTime: item.goalTime,
    notes: item.notes,
    flagged: item.flagged
  }));
}

// Create a new astronomy todo item
export async function createAstronomyTodoItem(
  userId: string,
  todoItem: AstronomyObject
): Promise<AstronomyObject> {
  const sql = neon(`${process.env.DATABASE_URL}`);

  const result = await sql`
    INSERT INTO astronomy_todo (
      id, user_id, name, ra, dec, magnitude, size, 
      "objectType", "addedAt", completed, "completedAt", 
      "goalTime", notes, flagged, last_updated
    )
    VALUES (
      ${todoItem.id},
      ${userId},
      ${todoItem.name},
      ${todoItem.ra},
      ${todoItem.dec},
      ${todoItem.magnitude},
      ${todoItem.size},
      ${todoItem.objectType || null},
      ${todoItem.addedAt},
      ${todoItem.completed},
      ${todoItem.completedAt || null},
      ${todoItem.goalTime || null},
      ${todoItem.notes || null},
      ${todoItem.flagged || false},
      ${new Date().toISOString()}
    )
    RETURNING *
  `;

  const createdItem = AstronomyTodoSchema.parse(result[0]);
  return {
    id: createdItem.id,
    name: createdItem.name,
    ra: createdItem.ra,
    dec: createdItem.dec,
    magnitude: createdItem.magnitude,
    size: createdItem.size,
    objectType: createdItem.objectType,
    addedAt: createdItem.addedAt,
    completed: createdItem.completed,
    completedAt: createdItem.completedAt,
    goalTime: createdItem.goalTime,
    notes: createdItem.notes,
    flagged: createdItem.flagged
  };
}

export async function updateAstronomyTodoItem(
  userId: string,
  todoItem: AstronomyObject
): Promise<AstronomyObject> {
  const sql = neon(`${process.env.DATABASE_URL}`);

  const result = await sql`
    UPDATE astronomy_todo
    SET 
      name = ${todoItem.name},
      ra = ${todoItem.ra},
      dec = ${todoItem.dec},
      magnitude = ${todoItem.magnitude},
      size = ${todoItem.size},
      "objectType" = ${todoItem.objectType || null},
      completed = ${todoItem.completed},
      "completedAt" = ${todoItem.completedAt || null},
      "goalTime" = ${todoItem.goalTime || null},
      notes = ${todoItem.notes || null},
      flagged = ${todoItem.flagged || false},
      last_updated = ${new Date().toISOString()}
    WHERE id = ${todoItem.id} AND user_id = ${userId}
    RETURNING *
  `;

  const updatedItem = AstronomyTodoSchema.parse(result[0]);
  return {
    id: updatedItem.id,
    name: updatedItem.name,
    ra: updatedItem.ra,
    dec: updatedItem.dec,
    magnitude: updatedItem.magnitude,
    size: updatedItem.size,
    objectType: updatedItem.objectType,
    addedAt: updatedItem.addedAt,
    completed: updatedItem.completed,
    completedAt: updatedItem.completedAt,
    goalTime: updatedItem.goalTime,
    notes: updatedItem.notes,
    flagged: updatedItem.flagged
  };
}

// Delete an astronomy todo item
export async function deleteAstronomyTodoItem(
  userId: string,
  itemId: string
): Promise<boolean> {
  const sql = neon(`${process.env.DATABASE_URL}`);

  const result = await sql`
    DELETE FROM astronomy_todo
    WHERE id = ${itemId} AND user_id = ${userId}
    RETURNING id
  `;

  return result.length > 0;
}

// Batch update or create multiple astronomy todo items
export async function syncAstronomyTodoItems(
  userId: string,
  todoItems: AstronomyObject[]
): Promise<AstronomyObject[]> {
  const sql = neon(`${process.env.DATABASE_URL}`);

  // First, get all existing items for this user
  const existingItems = await sql`
    SELECT id FROM astronomy_todo
    WHERE user_id = ${userId}
  `;

  const existingIds = new Set(existingItems.map(item => item.id));
  const results: AstronomyObject[] = [];

  // Process each item - update existing or create new
  for (const item of todoItems) {
    if (existingIds.has(item.id)) {
      // Item exists, update it
      const updatedItem = await updateAstronomyTodoItem(userId, item);
      results.push(updatedItem);
    } else {
      // Item is new, create it
      const newItem = await createAstronomyTodoItem(userId, item);
      results.push(newItem);
    }
  }

  // Delete items that are in the database but not in the provided list
  const currentIds = new Set(todoItems.map(item => item.id));
  for (const existingId of existingIds) {
    if (!currentIds.has(existingId)) {
      await deleteAstronomyTodoItem(userId, existingId);
    }
  }

  return results;
}


export async function fetchUser(id: string): Promise<User | null> {
  const sql = neon(`${process.env.DATABASE_URL}`)

  const results = await sql`SELECT *
                            FROM "user"
                            WHERE id = ${id}
                            LIMIT 1`
  return results.length > 0 ? UserSchema.parse(results[0]) : null
}

export async function fetchUserFromClerkUser(userId: string): Promise<User | null> {
  const sql = neon(`${process.env.DATABASE_URL}`)

  const results = await sql`SELECT *
                            FROM "user"
                            WHERE metadata_ ->> 'clerk:user_id' = ${userId}
                            LIMIT 1`
  return results.length > 0 ? UserSchema.parse(results[0]) : null
}


export async function fetchCollections(user_id: string, visibility: string = 'public'): Promise<Array<Collection>> {
  const sql = neon(`${process.env.DATABASE_URL}`)
  const results = await sql`SELECT *
                            FROM collection
                            WHERE user_id = ${user_id}
                              AND visibility = ${visibility}
                              AND (template != 'astrolog' or template is null)
                            ORDER BY created_at DESC `

  return CollectionArraySchema.parse(results)
}

export async function fetchAstroObservations(user_id: string, visibility: string = 'public'): Promise<Array<Collection>> {
  const sql = neon(`${process.env.DATABASE_URL}`)
  const results = await sql`SELECT *
                            FROM collection
                            WHERE user_id = ${user_id}
                              AND visibility = ${visibility}
                              AND template = 'astrolog'
                            ORDER BY metadata_ ->> 'session_date' DESC`

  return CollectionArraySchema.parse(results)
}

export async function fetchCatalogObjects(catalog: string): Promise<Array<AstroObject>> {
  const sql = neon(`${process.env.DATABASE_URL}`)
  const results = await sql`SELECT o.*
                            FROM catalogobject ci 
                            JOIN "object" o ON ci.object_id = o.id
                           WHERE ci.catalog_id = ${catalog}
                           ORDER BY o.seq`

  return AstroObjectArraySchema.parse(results)
}


export async function fetchCollection(collection_id: string): Promise<Collection | null> {
  const sql = neon(`${process.env.DATABASE_URL}`)

  const results = await sql`SELECT *
                            FROM collection
                            WHERE id = ${collection_id}
                            LIMIT 1`
  return results.length > 0 ? CollectionSchema.parse(results[0]) : null
}

export async function fetchCollectionImages(collection_id: string): Promise<Array<Image>> {
  const sql = neon(`${process.env.DATABASE_URL}`)

  const results = await sql`SELECT image.*
                            FROM image
                            JOIN collectionimage ON collectionimage.image_id = image.id
                            WHERE collectionimage.collection_id = ${collection_id}
  `

  return ImageArraySchema.parse(results);
}

export async function fetchCollectionImageCount(collection_id: string): Promise<number> {
  const sql = neon(`${process.env.DATABASE_URL}`)

  const results = await sql`SELECT count(*) AS cnt
                            FROM collectionimage 
                            WHERE collectionimage.collection_id = ${collection_id}
  `

  return results[0]['cnt']
}


export async function fetchCollectionStats(collection_id: string) {
  const sql = neon(`${process.env.DATABASE_URL}`)

  // const results = await sql`SELECT *
  //                           FROM collection
  //                           WHERE id = ${collection_id}
  //                           LIMIT 1`

  return null;

}

export async function fetchImage(image_id: string): Promise<Image | null> {
  const sql = neon(`${process.env.DATABASE_URL}`)

  const results = await sql`SELECT *
                            FROM image
                            WHERE id = ${image_id}
                            LIMIT 1`
  return results.length > 0 ? ImageSchema.parse(results[0]) : null
}

export async function fetchAstroObjectByName(name: string): Promise<AstroObject | null> {
  const sql = neon(`${process.env.DATABASE_URL}`)

  const results = await sql`SELECT *
                            FROM "object"
                            WHERE name = ${name}
                            LIMIT 1`
  console.log('Astro object:', results, { name })
  return results.length > 0 ? AstroObjectSchema.parse(results[0]) : null
}

export async function fetchAstroObjects(): Promise<Array<AstroObject>> {
  const sql = neon(`${process.env.DATABASE_URL}`)

  const results = await sql`SELECT *
                            FROM "object"
                            ORDER BY name
                           `
  return AstroObjectArraySchema.parse(results);
}
//
// export async function fetchAstroObjectById(name: string): Promise<AstroObject | null> {
//   const sql = neon(`${process.env.DATABASE_URL}`)
//
//   const results = await sql`SELECT *
//                             FROM "object"
//                             WHERE id = ${name}
//                             LIMIT 1`
//   return results.length > 0 ? AstroObjectSchema.parse(results[0]) : null
// }
function formatLightYears(distance:number, multipler: number, prefix: string){
  const v = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 3 }).format(
    distance * multipler,
  );
  if (prefix !== '') {
    prefix += ' ';
  }
  return `${v} ${prefix}light years`
}

export function transformAstroObject(object: AstroObject){
  let title = `${object.display_name}`
  // @ts-ignore
  if (object.metadata_?.common_name) {
    title += ' - ' + object.metadata_.common_name
  }

  let distance = ''

  if (object.metadata_?.distance) {
    switch (object.metadata_?.distance_unit.trim()) {
      case 'Mpc':
        distance = formatLightYears(object.metadata_?.distance, 3.260, 'M');
        break
      case 'pc':
        distance = formatLightYears(object.metadata_?.distance, 3.260, '');
        break
      default:
        distance = formatLightYears(object.metadata_?.distance, 1.0, '')
    }
  }

  const object_type = ObjectTypeMap[object.otype || 'unknown'] || object.otype;

  console.log(object)
  return {
    ...object,
    title,
    distance,
    object_type,
    common_name: object.metadata_?.common_name,
    // ra dec magnitudesize
    description: object.metadata_?.description,
    description_html: !!object.metadata_?.description ? marked.parse(object.metadata_?.description) : null,
  }

}
