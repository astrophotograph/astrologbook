import {User} from "./models"
import {auth} from "@clerk/nextjs/server"
import {fetchImage, fetchUser} from "@/lib/db"

export async function isOwner(user: User) {
  const {userId} = await auth()
  return user.metadata_['clerk:user_id'] === userId
}

export async function isImageOwner(id: string) {
  const image = await fetchImage(id)
  const user = await fetchUser(image!.user_id!)

  return await isOwner(user!)
}
