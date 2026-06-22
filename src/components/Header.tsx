import { LogoMark } from "./LogoMark";

export function Header() {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 max-w-5xl">
        <div className="flex items-center gap-2.5">
          <LogoMark size={32} />
          <span className="text-base font-bold text-foreground tracking-tight">
            TeamSpark
          </span>
        </div>
      </div>
    </header>
  );
}
