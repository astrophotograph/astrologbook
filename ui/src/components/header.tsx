import Link from "next/link"
import { isSQLiteModeServer } from "@/lib/auth/server"
import { HeaderClient } from "@/components/header-client"

export function Header() {
  const isSQLite = isSQLiteModeServer();

  return (
    <header className="container mx-auto py-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold"><a href="https://www.astrophotography.tv/">Astro Log Book</a></h1>
      <nav className="">
        <ul className="flex space-x-4">
          <li><Link href="/" className="hover:text-neutral-300">Home</Link></li>
          {/*<li><a href="/gallery" className="hover:text-neutral-300">Gallery</a></li>*/}
          {/*<li><a href="/about" className="hover:text-neutral-300">About</a></li>*/}
          {/*<li><a href="#" className="hover:text-neutral-300">Contact</a></li>*/}
          <HeaderClient initialIsSQLite={isSQLite} />
        </ul>
      </nav>
    </header>
  )
}
