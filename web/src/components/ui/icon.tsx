import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  X,
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/ui/brand-icons";

/**
 * A thin, enumerable wrapper over the exact icons this app uses - so the
 * whole icon set is visible in one file, and every icon on the site is
 * either a real technology mark or one of these motif-adjacent glyphs,
 * never a decorative icon-in-a-rounded-square. Github/Linkedin are
 * hand-drawn (see brand-icons.tsx) since lucide-react v1 dropped
 * third-party brand logos.
 */
export const Icon = {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Github: GithubIcon,
  Linkedin: LinkedinIcon,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Close: X,
} as const;
