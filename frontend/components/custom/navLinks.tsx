import { HomeIcon, Code, User, LogIn } from "lucide-react";
import { NavLinkProps, NavLinkIconProps } from "@/components/navigation/navtypes";

export const navLinks: Array<NavLinkProps> = [
  {
    display_name: "Play",
    href: "/",
  },
  {
    display_name: "Github Repo",
    href: "https://github.com/zop-hacks/recognize-my-drawing",
  },
];

export const bottomNavLinks: Array<NavLinkIconProps> = [
  {
    display_name: "Home",
    href: "/home",
    icon: <HomeIcon />,
  },
  {
    display_name: "Code",
    href: "/code",
    icon: <Code />,
  },
];