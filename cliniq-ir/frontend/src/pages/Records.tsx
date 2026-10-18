import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useResource } from "../hooks";
import type { Catalog, Category, ClinicalRecord, Page } from "../types";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { DocumentList } from "../components/DocumentList";
import { ErrorState, Loading } from "../components/Feedback";
import { Pagination } from "../components/Pagination";
import { SearchBar } from "../components/SearchBar";

export function RecordsBrowser({
  categories,
  patientId,
  encounterId,
}: {
  categories: Category[];
  patientId?: string;
  encounterId?: string;
}) {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const category = params.get("category") || "";
  const sort = params.get("sort") || (query ? "relevance" : "newest");
  const parsedPage = Number(params.get("page") || 1);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const request = new URLSearchParams(params);
  request.set("page", String(page));
  request.set("sort", sort);
  if (patientId) request.set("patient_id", patientId);
  if (encounterId) request.set("encounter_id", encounterId);
  const result = useResource<Page<ClinicalRecord>>(`/records?${request}`);
  const change = (changes: Record<string, string>) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("page");
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    });
  };
  return (
    <section
      className="surface records-browser"
      aria-label="Clinical document list"
    >
      <SearchBar
        value={query}
        instant
        onSearch={(q) => change({ q, sort: q ? "relevance" : "newest" })}
      />
      <div className="filter-bar">
        <div className="filter-controls">
          <SlidersHorizontal size={17} aria-hidden="true" />
          <label htmlFor="category-filter">Category</label>
          <select
            id="category-filter"
            value={category}
            onChange={(e) => change({ category: e.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.count})
              </option>
            ))}
          </select>
        </div>
        <div className="sort-controls">
          <label htmlFor="sort-filter">Sort by</label>
          <select
            id="sort-filter"
            value={sort}
            onChange={(e) => change({ sort: e.target.value })}
          >
            {query && <option value="relevance">Relevance</option>}
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>
      {(query || category) && (
        <div className="active-filters">
          <span>
            {query
              ? `Results for “${query}”`
              : categories.find((c) => c.id === category)?.name || category}
          </span>
          <button
            className="text-link"
            onClick={() => change({ q: "", category: "", sort: "newest" })}
          >
            Clear filters
          </button>
        </div>
      )}
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorState message={result.error} retry={result.retry} />
      ) : (
        result.data && (
          <>
            <div className="result-summary" role="status">
              {result.data.total}{" "}
              {result.data.total === 1 ? "record" : "records"}{" "}
              {query ? "matched your search" : "in this collection"}
            </div>
            <DocumentList
              records={result.data.items}
              emptyTitle={
                query
                  ? "No matching records"
                  : category
                    ? "No documents in this category"
                    : "No clinical documents yet"
              }
              emptyDescription={
                query
                  ? "Try fewer words, check the spelling, or clear filters to browse available records."
                  : "This collection has no documents yet. Choose another category or return to its parent."
              }
              action={
                <button
                  className="button secondary"
                  onClick={() =>
                    change({ q: "", category: "", sort: "newest" })
                  }
                >
                  Show all in this collection
                </button>
              }
            />
            <Pagination
              total={result.data.total}
              page={result.data.page}
              pageSize={result.data.page_size}
              onPage={(next) =>
                setParams((previous) => {
                  const updated = new URLSearchParams(previous);
                  updated.set("page", String(next));
                  return updated;
                })
              }
            />
          </>
        )
      )}
    </section>
  );
}

export function Records() {
  const catalog = useResource<Catalog>("/catalog");
  const [params] = useSearchParams();
  const category = catalog.data?.categories.find(
    (c) => c.id === params.get("category"),
  );
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Clinical Records", to: "/" },
          { label: category?.name || "All documents" },
        ]}
      />
      <div className="page-heading">
        <div>
          <p className="eyebrow">SEARCH & FLAT BROWSING</p>
          <h1>{category?.name || "All clinical documents"}</h1>
          <p>Search the collection or open any record directly.</p>
        </div>
        <Link className="button secondary" to="/">
          <ArrowLeft size={16} /> Explorer
        </Link>
      </div>
      {catalog.loading ? (
        <Loading />
      ) : catalog.error ? (
        <ErrorState message={catalog.error} retry={catalog.retry} />
      ) : (
        <RecordsBrowser categories={catalog.data?.categories || []} />
      )}
    </>
  );
}
