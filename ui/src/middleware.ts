import {clerkMiddleware} from '@clerk/nextjs/server'
import { NextResponse} from "next/server"

// https://github.com/vercel/next.js/discussions/62050.  Ugh!

// type NextApiHandler = (req: NextRequest, res: NextApiResponse) => Promise<void>;

// const actionHeaderCheckOverride = async (
//   req: NextRequest,
//   // res: NextApiResponse,
//   // next: NextApiHandler,
// ): Promise<any> => {
//   const newForward = req.headers.get("origin")?.replace(/(http|https):\/\//, "") || "*"
//   // console.debug("REQUEST HEADERS:::: ", req.headers)
//   // console.debug("NEW FORWARD:::: ", newForward)
//
//
//   const response = NextResponse.next()
//   response.headers.set("x-forwarded-host", newForward)
//   return response
// }

export default clerkMiddleware(async (auth, req) => {
  const newForward = req.headers.get("origin")?.replace(/(http|https):\/\//, "") || "*"
  const response = NextResponse.next()

  response.headers.set("x-forwarded-host", newForward)
  return response

})

// export default async function middleware(req: NextRequest) {
//   const newForward = req.headers.get("origin")?.replace(/(http|https):\/\//, "") || "*"
//   // console.debug("REQUEST HEADERS:::: ", req.headers)
//   // console.debug("NEW FORWARD:::: ", newForward)
//
//
//   const response = NextResponse.next()
//   response.headers.set("x-forwarded-host", newForward)
//   return response
//
//   // return actionHeaderCheckOverride(req)
//   // return actionHeaderCheckOverride(req, res, clerkMiddleware(async (auth, req) => {
//   //   return rewriteUserHome(req)
//   // }))
// }

// export default clerkMiddleware(async (auth, req) => {
//   return rewriteUserHome(req)
// })
// export default chainMiddleware();


// This function can be marked `async` if using `await` inside

// See "Matching Paths" below to learn more
// export const config = {
//   matcher: [
//     // Skip Next.js internals and all static files, unless found in search params
//     '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
//     // '/:path*',
//   ],
// }
