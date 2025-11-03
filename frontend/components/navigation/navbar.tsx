"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { navLinks, bottomNavLinks } from "@/components/custom/navLinks";
import { brand_name, MainLogo } from "@/components/custom/branding";

export function ModernNavbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto h-16 max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* Three-column layout */}
        <div className="grid grid-cols-3 h-full items-center">
          {/* Logo - Left */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <MainLogo />
              <span className="hidden font-bold sm:inline-block">
                {brand_name}
              </span>
            </Link>
          </div>

          {/* Navigation - Center */}
          <div className="hidden md:flex justify-center">
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                {navLinks.map((link) => (
                  <NavigationMenuItem key={link.href}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={link.href}
                        className={cn(
                          navigationMenuTriggerStyle(),
                          "text-sm font-medium transition-colors",
                          pathname === link.href
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {link.display_name}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Empty right section */}
          <div className="hidden md:flex justify-end items-center gap-2">
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden col-start-3 justify-end">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80%] sm:w-[350px] pr-0">
                <SheetHeader className="mb-4">
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 text-base font-medium transition-colors rounded-md",
                        pathname === link.href
                          ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      {
                        bottomNavLinks.find(
                          (item) => item.display_name === link.display_name
                        )?.icon
                      }
                      <span>{link.display_name}</span>
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
