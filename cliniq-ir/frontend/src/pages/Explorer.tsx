import {
  ArrowRight,
  BookOpen,
  Files,
  FolderOpen,
  Search,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useResource } from "../hooks";
import type { Catalog, ClinicalRecord, Page } from "../types";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { CategoryGrid } from "../components/CategoryGrid";
import { DocumentList } from "../components/DocumentList";
import { ErrorState, Loading } from "../components/Feedback";
import { SearchBar } from "../components/SearchBar";

export function Explorer() {
  const navigate = useNavigate();
  const catalog = useResource<Catalog>("/catalog");
  const recent = useResource<Page<ClinicalRecord>>("/records?page_size=5");
  return (
    <>
      <Breadcrumbs items={[{ label: "Clinical Records" }]} />
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR CLINICAL KNOWLEDGE WORKSPACE</p>
          <h1>
            Clinical Records Explorer<span className="heading-dot">.</span>
          </h1>
          <p>Find the right information. See the complete patient story.</p>
        </div>
        <span className="workspace-tag">
          <span className="status-dot" />
          Fictional dataset
        </span>
      </div>
      <section className="search-panel" aria-label="Find clinical information">
        <div className="section-label">
          <Search size={16} /> SEARCH YOUR RECORDS
        </div>
        <SearchBar
          large
          onSearch={(q) =>
            navigate(
              `/records${q ? `?q=${encodeURIComponent(q)}&sort=relevance` : ""}`,
            )
          }
        />
        <p className="search-hint">
          Search by keyword, patient, or encounter. Try{" "}
          <Link to="/records?q=headache&sort=relevance">headache</Link>,{" "}
          <Link to="/records?q=intake&sort=relevance">intake</Link>, or{" "}
          <Link to="/records?q=E-1001&sort=relevance">E-1001</Link>.
        </p>
      </section>
      {catalog.loading ? (
        <Loading label="Loading your clinic collection…" />
      ) : catalog.error ? (
        <ErrorState message={catalog.error} retry={catalog.retry} />
      ) : (
        catalog.data && (
          <>
            <div className="stats-grid">
              {[
                {
                  label: "Patient records",
                  value: catalog.data.counts.patients,
                  icon: Users,
                  note: "Organized patient histories",
                },
                {
                  label: "Clinical encounters",
                  value: catalog.data.counts.encounters,
                  icon: FolderOpen,
                  note: "Connected consultation records",
                },
                {
                  label: "Clinical documents",
                  value: catalog.data.counts.records,
                  icon: Files,
                  note: "Searchable and ready to explore",
                },
              ].map((stat) => (
                <div className="stat-card" key={stat.label}>
                  <div>
                    <p>{stat.label}</p>
                    <strong>{String(stat.value).padStart(2, "0")}</strong>
                    <span>{stat.note}</span>
                  </div>
                  <stat.icon size={23} strokeWidth={1.5} />
                </div>
              ))}
            </div>
            <section className="browse-section">
              <div className="section-heading">
                <div>
                  <h2>Browse your collection</h2>
                  <p>
                    Start with a patient, or explore a clinical record category.
                  </p>
                </div>
                <Link className="text-link" to="/records">
                  View all records <ArrowRight size={16} />
                </Link>
              </div>
              <Link className="patient-banner" to="/patients">
                <div className="patient-banner-icon">
                  <Users size={29} strokeWidth={1.5} />
                </div>
                <div>
                  <h3>Start with a patient</h3>
                  <p>
                    Follow their history through encounters and connected
                    records.
                  </p>
                </div>
                <span>
                  {catalog.data.counts.patients} patients{" "}
                  <ArrowRight size={19} />
                </span>
              </Link>
              <CategoryGrid categories={catalog.data.categories} />
            </section>
          </>
        )
      )}
      <section className="surface recent-section">
        <div className="section-heading">
          <div>
            <h2>Recent clinical documents</h2>
            <p>Open a record directly to preview its content.</p>
          </div>
          <Link className="text-link" to="/records">
            See all <ArrowRight size={16} />
          </Link>
        </div>
        {recent.loading ? (
          <Loading />
        ) : recent.error ? (
          <ErrorState message={recent.error} retry={recent.retry} />
        ) : (
          <DocumentList
            records={recent.data?.items || []}
            emptyDescription="Your clinic does not have any clinical documents yet."
          />
        )}
      </section>
      <div className="explorer-footnote">
        <BookOpen size={17} />
        <p>
          A connected view of your clinical information.{" "}
          <Link to="/guide">See how to explore</Link>
        </p>
      </div>
    </>
  );
}
