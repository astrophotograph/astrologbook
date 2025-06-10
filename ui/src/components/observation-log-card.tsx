import {Card, CardContent} from "@/components/ui/card"
import type {Collection} from "@/lib/models"
import {cx} from "class-variance-authority"
import {fetchCollectionImageCount} from "@/lib/db"

export async function ObservationLogCard({collection, defaultPath, size = 'small' }: { size?: 'small' | 'medium', collection: Collection | null, defaultPath?: string }) {
  const containerHeight = size == 'small' ? 'h-80' : 'h-96'
  const imageCount = await fetchCollectionImageCount(collection!.id!)
  const tags = collection && collection.tags ? collection.tags.split(',') : []

  if (!collection) {
    return (
      <a href={defaultPath}>
        <Card className={cx('pt-0 overflow-hidden', containerHeight)}>
          <CardContent className={'p-0'}>
            <img src={'/ph/static/placeholder-more.svg'} className={'rounded-lg'}/>
          </CardContent>
        </Card>
      </a>
    )
  }

  return (
    <a href={`/c/${collection.id}`}>
      <Card className={cx('pt-0 relative overflow-hidden', containerHeight)}>
        <CardContent className={'p-0 relative overflow-hidden'}>
          <img src={collection.favorite_image!}
               alt={collection.name}
               className={"object-cover w-full h-96 relative"}/>
          <div className={'absolute bottom-1 left-1 text-sm'}>{imageCount} photos</div>
          <div className={'absolute bottom-1 right-1 space-x-2'}>
            {tags.map((tag) => (
              <span key={tag} className={'bg-amber-800 px-2 py-0.5 text-xs rounded-lg'}>{tag}</span>
            ))}
          </div>
        </CardContent>
        <p className={'absolute bottom-0 left-0 right-0 text-center'}>{collection.session_date || collection.name}</p>
        {/*<CardHeader>*/}
        {/*  <CardTitle>{collection.name}</CardTitle>*/}
        {/*  <CardDescription className={'truncate'}>{collection.description}</CardDescription>*/}
        {/*</CardHeader>*/}
      </Card>
    </a>
  )
}
