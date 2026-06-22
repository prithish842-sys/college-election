import { useEffect, useState } from "react";
import { LogoMark } from "./LogoMark";

interface NavBarProps {
  onHomeClick?: () => void;
}

export function NavBar({ onHomeClick }: NavBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      data-ocid="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        scrolled
          ? "py-3 backdrop-blur-xl bg-navy-900/80 border-b border-white/10 shadow-lg"
          : "py-5 bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          data-ocid="navbar.home_link"
          onClick={onHomeClick}
          className="flex items-center gap-3 group"
          aria-label="Go to homepage"
        >
          <LogoMark
            size={70}
            variant="plain"
            className="group-hover:scale-105 transition-transform duration-300"
          />
          <span className="font-display font-bold text-lg text-foreground tracking-wide hidden sm:block">
            Sankara College of Science and Commerce
          </span>
        </button>

        {/* Desktop Nav */}
        <ul className="hidden md:flex items-center gap-8">
          {["Home", "About", "Details"].map((item) => (
            <li key={item}>
              <a
                href={`#${item.toLowerCase()}`}
                data-ocid={`navbar.${item.toLowerCase()}_link`}
                className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors duration-300 tracking-wide uppercase"
              >
                {item}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger */}
        <button
          type="button"
          data-ocid="navbar.mobile_menu_toggle"
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle mobile menu"
          aria-expanded={menuOpen}
        >
          <span
            className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${
              menuOpen ? "rotate-45 translate-y-2" : ""
            }`}
          />
          <span
            className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${
              menuOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-500 ${
          menuOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="px-6 py-4 flex flex-col gap-4 backdrop-blur-xl bg-navy-900/90 border-t border-white/10">
          {["Home", "About", "Details"].map((item) => (
            <li key={item}>
              <a
                href={`#${item.toLowerCase()}`}
                data-ocid={`navbar.mobile_${item.toLowerCase()}_link`}
                className="block text-sm font-medium text-foreground/80 hover:text-foreground transition-colors duration-300 tracking-wide uppercase"
                onClick={() => setMenuOpen(false)}
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
