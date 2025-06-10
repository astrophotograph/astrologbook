import {SignedIn, SignedOut, SignInButton, SignUpButton, UserButton} from "@clerk/nextjs"
import Link from "next/link"

export function Header() {
  return (
    <header className="container mx-auto py-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold"><a href="https://www.astrophotography.tv/">Astro Log Book</a></h1>
      <nav className="">
        <ul className="flex space-x-4">
          <li><Link href="/" className="hover:text-neutral-300">Home</Link></li>
          {/*<li><a href="/gallery" className="hover:text-neutral-300">Gallery</a></li>*/}
          {/*<li><a href="/about" className="hover:text-neutral-300">About</a></li>*/}
          {/*<li><a href="#" className="hover:text-neutral-300">Contact</a></li>*/}
          <li>
            <SignedOut>
              <SignInButton>
                <a href={"#"} className={'hover:text-neutral-300'}>Sign In</a>
              </SignInButton>
              <SignUpButton>
                <a href={"#"} className={'ml-4 hover:text-neutral-300'}>Sign Up</a>

              </SignUpButton>
            </SignedOut>
          </li>
          <li>
            <SignedIn>
              <UserButton/>
            </SignedIn>
          </li>
        </ul>
      </nav>
    </header>
  )
}
