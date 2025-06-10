import {fetchAstroObservations, fetchUser} from "@/lib/db"
import {DefaultBreadcrumb} from "@/components/default-breadcrumb"
import {enrichCollections} from "@/components/enrichCollections"
import {ObservationLogCard} from "@/components/observation-log-card"


export default async function AstroLogPage({
                                             params,
                                           }: {
  params: Promise<{ id: string }>
}) {
  const {id} = await params
  const user = await fetchUser(id)
  const initialCollections = await fetchAstroObservations(id)
  const rawCollections = await enrichCollections(initialCollections)
  const collections = rawCollections.filter((item) => !item.favorite)

  const groupedCollections = collections.reduce((acc, collection) => {
    const date = new Date(collection.session_date!)
    const monthYear = date.toLocaleString('default', {month: 'long', year: 'numeric'})
    return {
      ...acc,
      [monthYear]: [...(acc[monthYear] || []), collection],
    }
  }, {} as Record<string, typeof collections>)

  return (
    <main className="container mx-auto py-8 flex-grow relative">
      <DefaultBreadcrumb user={user!} pageName={'Astro Log'}/>
      <h3 className="text-2xl font-semibold my-6">Observation Log</h3>
      <p className={''}>
        Daily observation logs. Photos and some commentary. Most of these include just
        the raw, out-of-scope photos without any formal processing. At times, it may include a combination of
        out-of-scope and post-processed photos. But they will always be clearly marked.
      </p>
      {Object.entries(groupedCollections).map(([monthYear, monthCollections]) => (
        <div key={monthYear} className={''}>
          <h4 className="text-xl font-semibold mt-8 mb-4 bg-slate-800 p-3 rounded sticky top-0 z-50">{monthYear}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monthCollections.map((collection) => (
              <div key={collection.id}>
                <ObservationLogCard collection={collection} size={'medium'}/>
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}
