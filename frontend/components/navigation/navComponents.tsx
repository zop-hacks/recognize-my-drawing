import { NavLinkIconProps, NavLinkProps } from "@/components/navigation/navtypes";
import Link from "next/link";

export const NavLink = ({
  href,
  display_name,
}: NavLinkProps
) => (
  <Link
    href={href}
    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-foreground hover:text-foreground/80"
  >
    {display_name}
  </Link>
);

export const NavItem = (({display_name, href, icon} : NavLinkIconProps)  => (
    <Link href={href} className="flex flex-col items-center">
      {icon}
      <span className="text-xs mt-1">{display_name}</span>
    </Link>
));