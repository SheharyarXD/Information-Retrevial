import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SearchBar({
  value = "",
  onSearch,
  instant = false,
  large = false,
}: {
  value?: string;
  onSearch: (query: string) => void;
  instant?: boolean;
  large?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    setDraft(value);
    clearTimeout(timer.current);
  }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <form
      className={`search-form ${large ? "large" : ""}`}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        clearTimeout(timer.current);
        onSearch(draft.trim());
      }}
    >
      <Search size={21} aria-hidden="true" />
      <label className="sr-only" htmlFor="record-search">
        Search clinical records
      </label>
      <input
        id="record-search"
        type="search"
        maxLength={200}
        placeholder="Search records, symptoms, patient names, or encounter IDs…"
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          clearTimeout(timer.current);
          if (instant)
            timer.current = setTimeout(() => onSearch(next.trim()), 350);
        }}
      />
      {draft && (
        <button
          type="button"
          className="clear-search"
          aria-label="Clear search"
          onClick={() => {
            clearTimeout(timer.current);
            setDraft("");
            onSearch("");
          }}
        >
          <X size={16} />
        </button>
      )}
      <button className="button primary" type="submit">
        Search
        <span className="search-shortcut" aria-hidden="true">
          ↵
        </span>
      </button>
    </form>
  );
}
