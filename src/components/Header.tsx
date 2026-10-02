import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Moon, Sun } from "lucide-react";
import SearchInput from "./SearchInput";
import ProjectSwitcher from "./ProjectSwitcher";
import { useSearch } from "../context/SearchContext";

export default function Header({ onMenu }: { onMenu: () => void }) {
  const { submitQuery } = useSearch();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("rankscope-theme", dark ? "dark" : "light");
  }, [dark]);

  const onSubmit = (q: string) => {
    const kind = submitQuery(q);
    if (kind === "keyword") navigate("/keywords");
    else if (kind === "domain" && location.pathname === "/keywords") navigate("/");
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-hairline bg-bg/90 px-4 backdrop-blur">
      <button
        className="rounded-md p-1.5 text-muted hover:bg-surface-2 lg:hidden"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <div className="w-full max-w-md">
        <SearchInput onSubmit={onSubmit} placeholder="Search a domain or keyword…" compact />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ProjectSwitcher />
        <button
          className="rounded-md border border-hairline bg-surface p-2 text-ink-2 hover:bg-surface-2"
          onClick={() => setDark((d) => !d)}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
