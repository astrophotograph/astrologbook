import {Collection, User} from "@/lib/models"
import {fetchCollectionImages} from "@/lib/db"
import {CollectionHeader} from "@/app/c/[id]/collection-header"
import {AstroLogImage} from "@/app/c/[id]/astro-log-image"
import {YouTube} from "@/components/youtube"
import {MoonPhase} from "@/components/moon"

export async function AstroLogCollection({id, user, collection}: { id: string, user: User, collection: Collection }) {
  const rawImage = await fetchCollectionImages(collection.id)
  const images = rawImage.filter((image) => !!image.description)
  const imagesNoDescription = rawImage.filter((image) => !image.description)
  const video_id = collection.metadata_?.video_id

  return (
    <main className="container mx-auto py-8 lg:px-20">
      <CollectionHeader name={`AstroLog - ${collection.session_date}`} user={user} collection={collection}/>

      <div className={'flex space-x-5'}>
        <article
          className="prose lg:prose-xl prose-invert prose-img:rounded-xl prose-figcaption:text-sm prose-figcaption:text-center prose-img:mt-0"
          suppressHydrationWarning>
          <p
            dangerouslySetInnerHTML={{__html: collection.description_html}}
          />

          <div className="mt-6 space-y-5">
            {images.map((image, index) => (
              <AstroLogImage key={image.id} index={index} image={image}/>
            ))}
          </div>

          <div className="mt-6 gap-5 flex flex-wrap">
            {imagesNoDescription.map((image, index) => <AstroLogImage key={image.id} index={index} image={image}/>)}
          </div>

        </article>
        <div className={'hidden lg:block lg:py-7 lg:space-y-7'}>
          {video_id && <YouTube title={collection.name} id={video_id}/>}

          <div>
            {/* @ts-ignore */}
            <MoonPhase date={collection.session_date_as_date}/>
          </div>
        </div>
      </div>

      {/*<CollectionStats collection_id={id}/>*/}

    </main>

  )
}

// <Link key={image.id} href={`/i/${image.id}`}>{image.summary}</Link>
