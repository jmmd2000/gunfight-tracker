import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { type PropsWithChildren, useState, useEffect } from "react";
import { api } from "~/utils/api";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";

export const Layout = (props: PropsWithChildren) => {
  return (
    <>
      <Navbar />
      <main>{props.children}</main>
    </>
  );
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const user = useUser();
  return (
    <nav
      className="bg-gray-0 w-full rounded-md bg-opacity-10 bg-clip-padding shadow-lg backdrop-blur-lg backdrop-filter
    "
    >
      <div className="mr-auto px-4">
        <div className="flex justify-between">
          <div className="flex space-x-7">
            <div>
              {/* Website Logo */}
              <Link href="/" passHref legacyBehavior>
                <a className="flex items-center px-2 py-4">
                  <span className="text-2xl font-semibold text-gray-200">
                    GunfightTracker
                  </span>
                </a>
              </Link>
            </div>
            {/* Primary Navbar items */}
            <div className="hidden items-center space-x-1 md:flex">
              <Link href="/teams" passHref legacyBehavior>
                <a className="px-2 py-4 font-semibold text-gray-500 hover:text-gray-300">
                  Teams
                </a>
              </Link>
              <Link href="/matches" passHref legacyBehavior>
                <a className="px-2 py-4 font-semibold text-gray-500 hover:text-gray-300">
                  Matches
                </a>
              </Link>
              <Link href="/stats" passHref legacyBehavior>
                <a className="px-2 py-4 font-semibold text-gray-500 hover:text-gray-300">
                  Stats
                </a>
              </Link>
            </div>
          </div>
          {/* Secondary Navbar items */}
          <div className="ml-auto hidden items-center space-x-3 md:flex">
            {!user.isSignedIn && (
              <SignInButton>
                <Button variant="outline">Login</Button>
              </SignInButton>
            )}
            {!!user.isSignedIn && (
              <SignOutButton>
                <Button variant="outline">Log Out</Button>
              </SignOutButton>
            )}
          </div>
          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              className="mobile-menu-button outline-none"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <X className="h-6 w-6 text-gray-500" />
              ) : (
                <Menu className="h-6 w-6 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      <div className={`md:hidden ${isOpen ? "block" : "hidden"}`}>
        <Link href="/teams" passHref legacyBehavior>
          <a className="block px-8 py-4 text-sm font-semibold text-white">
            Teams
          </a>
        </Link>
        <Link href="/matches" passHref legacyBehavior>
          <a className="block px-8 py-4 text-sm font-semibold text-white">
            Matches
          </a>
        </Link>
        <Link href="/stats" passHref legacyBehavior>
          <a className="block px-8 py-4 text-sm font-semibold text-white">
            Stats
          </a>
        </Link>
        <div className="flex w-full items-center justify-center pb-6">
          {!user.isSignedIn && (
            <SignInButton>
              <Button variant="outline" size="sm">
                Login
              </Button>
            </SignInButton>
          )}
          {!!user.isSignedIn && (
            <SignInButton>
              <Button variant="outline" size="sm">
                Log Out
              </Button>
            </SignInButton>
          )}
        </div>
      </div>
    </nav>
  );
};
