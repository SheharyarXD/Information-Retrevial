import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  FileText,
  Link2,
  UserRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { encounterUrl, formatDate, recordUrl } from "../api";
import { useResource } from "../hooks";
import type { ClinicalRecord } from "../types";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { EmptyState, ErrorState, Loading } from "../components/Feedback";

export function RelatedDocuments({ recordId }: { recordId: number }) {
  const related = useResource<{ items: ClinicalRecord[] }>(
    `/records/${recordId}/related`,
  );
  return (
    <aside className="surface related-panel" aria-label="Related documents">
      <div className="related-heading">
        <span className="related-icon">
          <Link2 size={19} />
        </span>
        <h2>Related documents</h2>
      </div>
      <p className="related-description">
        Connected by this encounter or patient. Same-encounter records appear
        first.
      </p>
      {related.loading ? (
        <Loading label="Finding connected records…" />
      ) : related.error ? (
        <ErrorState message={related.error} retry={related.retry} />
      ) : related.data?.items.length ? (
        <div className="related-list">
          {related.data.items.map((record) => (
            <Link
              className="related-item"
              key={record.id}
              to={recordUrl(record)}
            >
              <span className="relationship">{record.relationship}</span>
              <h3>
                {record.title}
                <ArrowUpRight size={15} />
              </h3>
              <p>{record.category_name}</p>
              <span>
                {formatDate(record.created_at)}{" "}
                <span className="separator">·</span> {record.encounter_id}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No related documents">
          No other documents exist for this patient yet.
        </EmptyState>
      )}
    </aside>
  );
}

export function DocumentPreview() {
  const { patientId, encounterId, recordId } = useParams();
  const result = useResource<ClinicalRecord>(
    `/records/${encodeURIComponent(recordId || "")}`,
  );
  if (result.loading) return <Loading label="Opening document preview…" />;
  if (
    result.error ||
    !result.data ||
    result.data.patient_id !== patientId ||
    result.data.encounter_id !== encounterId
  )
    return (
      <>
        <Breadcrumbs
          items={[
            { label: "Clinical Records", to: "/" },
            { label: "Unavailable document" },
          ]}
        />
        <ErrorState
          message={
            result.error || "This document is unavailable at this location."
          }
        />
        <Link className="button secondary" to="/records">
          Return to clinical documents
        </Link>
      </>
    );
  const record = result.data;
  const encounter = encounterUrl(record.patient_id, record.encounter_id);
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Clinical Records", to: "/" },
          { label: "Patients", to: "/patients" },
          { label: record.patient_name, to: `/patients/${record.patient_id}` },
          { label: record.encounter_id, to: encounter },
          {
            label: record.category_name,
            to: `${encounter}?category=${record.category_id}`,
          },
          { label: record.title },
        ]}
      />
      <Link
        className="text-link back-link"
        to={`${encounter}?category=${record.category_id}`}
      >
        <ArrowLeft size={16} /> Back to {record.category_name.toLowerCase()}
      </Link>
      <div className="preview-layout">
        <article className="surface document-preview">
          <header>
            <div className="preview-document-label">
              <FileText size={17} /> CLINICAL DOCUMENT PREVIEW
            </div>
            <span className={`badge category-${record.category_id}`}>
              {record.category_name}
            </span>
            <h1>{record.title}</h1>
            <div className="preview-metadata">
              <Link to={`/patients/${record.patient_id}`}>
                <UserRound size={15} />
                {record.patient_name}
              </Link>
              <span>
                <CalendarDays size={15} />
                {formatDate(record.created_at, true)}
              </span>
              <Link to={encounter}>{record.encounter_id}</Link>
            </div>
          </header>
          <div className="document-content">
            {record.content?.trim() ? (
              record.content.split("\n\n").map((section, index) => {
                const [heading, ...body] = section.split("\n");
                return body.length ? (
                  <section key={index}>
                    <h2>{heading}</h2>
                    <p>{body.join("\n")}</p>
                  </section>
                ) : (
                  <p key={index}>{heading}</p>
                );
              })
            ) : (
              <EmptyState title="No document content">
                This record contains metadata only.
              </EmptyState>
            )}
          </div>
          <footer>
            Fictional development record <span>·</span> For the Week 5
            Information Retrieval assignment
          </footer>
        </article>
        <RelatedDocuments recordId={record.id} />
      </div>
    </>
  );
}
