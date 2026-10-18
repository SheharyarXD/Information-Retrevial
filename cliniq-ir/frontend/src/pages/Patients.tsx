import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  FolderOpen,
  UserRound,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { encounterUrl, formatDate } from "../api";
import { useResource } from "../hooks";
import type { Encounter, Page, Patient } from "../types";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { CategoryGrid } from "../components/CategoryGrid";
import { EmptyState, ErrorState, Loading } from "../components/Feedback";
import { Pagination } from "../components/Pagination";
import { RecordsBrowser } from "./Records";

export function Patients() {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get("page") || 1);
  const page = Number.isInteger(raw) && raw > 0 ? raw : 1;
  const patients = useResource<Page<Patient>>(`/patients?page=${page}`);
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Clinical Records", to: "/" }, { label: "Patients" }]}
      />
      <div className="page-heading">
        <div>
          <p className="eyebrow">STRUCTURED GUIDED BROWSING</p>
          <h1>Patient directory</h1>
          <p>
            Choose a patient to explore their encounters and clinical records.
          </p>
        </div>
        <Link className="button secondary" to="/">
          <ArrowLeft size={16} /> Explorer
        </Link>
      </div>
      <div className="info-strip">
        <FolderOpen size={17} />
        <span>
          Patients <ChevronRight size={13} /> Encounters{" "}
          <ChevronRight size={13} /> Categories <ChevronRight size={13} />{" "}
          Documents
        </span>
      </div>
      {patients.loading ? (
        <Loading />
      ) : patients.error ? (
        <ErrorState message={patients.error} retry={patients.retry} />
      ) : (
        patients.data && (
          <>
            <div className="patient-grid">
              {patients.data.items.map((patient) => (
                <Link
                  className="surface patient-card"
                  to={`/patients/${patient.id}`}
                  key={patient.id}
                >
                  <div className="patient-card-top">
                    <span className="avatar">
                      {patient.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                    <span className="record-id">{patient.id}</span>
                  </div>
                  <h2>{patient.name}</h2>
                  <p>
                    Born {patient.birth_year} <span>·</span> {patient.sex}
                  </p>
                  <div className="patient-card-bottom">
                    <span>
                      <FolderOpen size={15} />
                      {patient.encounter_count}{" "}
                      {patient.encounter_count === 1
                        ? "encounter"
                        : "encounters"}
                    </span>
                    <ArrowRight size={18} />
                  </div>
                  <span className="last-visit">
                    {patient.last_encounter
                      ? `Latest encounter: ${formatDate(patient.last_encounter)}`
                      : "No encounters recorded"}
                  </span>
                </Link>
              ))}
            </div>
            {!patients.data.items.length && (
              <EmptyState title="No patients in this collection">
                Return to the explorer or choose a previous page.
              </EmptyState>
            )}
            <Pagination
              total={patients.data.total}
              page={page}
              pageSize={patients.data.page_size}
              onPage={(next) => setParams({ page: String(next) })}
            />
          </>
        )
      )}
    </>
  );
}

export function PatientDetail() {
  const { patientId } = useParams();
  const result = useResource<Patient>(
    `/patients/${encodeURIComponent(patientId || "")}`,
  );
  if (result.loading) return <Loading label="Loading patient encounters…" />;
  if (result.error || !result.data)
    return (
      <>
        <Breadcrumbs
          items={[
            { label: "Clinical Records", to: "/" },
            { label: "Patients", to: "/patients" },
            { label: "Unavailable patient" },
          ]}
        />
        <ErrorState
          message={result.error || "Patient unavailable."}
          retry={result.retry}
        />
        <Link className="text-link" to="/patients">
          Return to patient directory
        </Link>
      </>
    );
  const patient = result.data;
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Clinical Records", to: "/" },
          { label: "Patients", to: "/patients" },
          { label: patient.name },
        ]}
      />
      <div className="page-heading">
        <div>
          <p className="eyebrow">PATIENT ENCOUNTERS</p>
          <h1>{patient.name}</h1>
          <p>
            {patient.id} <span className="separator">·</span> Born{" "}
            {patient.birth_year} <span className="separator">·</span>{" "}
            {patient.sex}
          </p>
        </div>
        <Link className="button secondary" to="/patients">
          <ArrowLeft size={16} /> All patients
        </Link>
      </div>
      <section className="surface encounter-list">
        <div className="section-heading">
          <div>
            <h2>Encounter history</h2>
            <p>Select a visit to browse its clinical documents.</p>
          </div>
          <span className="count-pill">
            {patient.encounters?.length || 0} encounters
          </span>
        </div>
        {patient.encounters?.length ? (
          patient.encounters.map((encounter) => (
            <Link
              className="encounter-row"
              key={encounter.id}
              to={encounterUrl(patient.id, encounter.id)}
            >
              <span className="encounter-icon">
                <CalendarDays size={23} />
              </span>
              <div className="encounter-description">
                <span className="record-id">
                  {encounter.id} <span className="separator">·</span>{" "}
                  {formatDate(encounter.occurred_at, true)}
                </span>
                <h3>{encounter.reason}</h3>
                <p>{encounter.clinician}</p>
              </div>
              <div className="encounter-meta">
                <span
                  className={`badge ${encounter.status === "Scheduled" ? "scheduled" : "completed"}`}
                >
                  {encounter.status}
                </span>
                <span>{encounter.record_count} documents</span>
              </div>
              <ChevronRight size={20} />
            </Link>
          ))
        ) : (
          <EmptyState title="No encounters recorded">
            This fictional patient has no encounters yet. Return to the
            directory to explore another patient.
          </EmptyState>
        )}
      </section>
    </>
  );
}

export function EncounterDetail() {
  const { patientId, encounterId } = useParams();
  const result = useResource<Encounter>(
    `/encounters/${encodeURIComponent(encounterId || "")}`,
  );
  const [params] = useSearchParams();
  if (result.loading) return <Loading label="Loading encounter records…" />;
  if (result.error || !result.data || result.data.patient_id !== patientId)
    return (
      <>
        <ErrorState
          message={result.error || "Encounter unavailable for this patient."}
        />
        <Link className="text-link" to="/patients">
          Return to patient directory
        </Link>
      </>
    );
  const encounter = result.data;
  const base = encounterUrl(encounter.patient_id, encounter.id);
  const category = encounter.categories.find(
    (c) => c.id === params.get("category"),
  );
  const crumbs = [
    { label: "Clinical Records", to: "/" },
    { label: "Patients", to: "/patients" },
    {
      label: encounter.patient_name || encounter.patient_id,
      to: `/patients/${encounter.patient_id}`,
    },
    { label: encounter.id, to: base },
  ];
  if (category) crumbs.push({ label: category.name, to: "" });
  return (
    <>
      <Breadcrumbs items={crumbs} />
      <div className="page-heading">
        <div>
          <p className="eyebrow">ENCOUNTER RECORDS</p>
          <h1>{encounter.reason}</h1>
          <p>
            {encounter.patient_name} <span className="separator">·</span>{" "}
            {formatDate(encounter.occurred_at, true)}{" "}
            <span className="separator">·</span> {encounter.id}
          </p>
        </div>
        <Link
          className="button secondary"
          to={`/patients/${encounter.patient_id}`}
        >
          <ArrowLeft size={16} /> Patient encounters
        </Link>
      </div>
      <div className="encounter-summary">
        <span>
          <UserRound size={16} />
          {encounter.clinician}
        </span>
        <span
          className={`badge ${encounter.status === "Scheduled" ? "scheduled" : "completed"}`}
        >
          {encounter.status}
        </span>
      </div>
      <section className="browse-section">
        <div className="section-heading">
          <div>
            <h2>Clinical record categories</h2>
            <p>Browse documents recorded during this encounter.</p>
          </div>
          {category && (
            <Link className="text-link" to={base}>
              All encounter records <ArrowRight size={16} />
            </Link>
          )}
        </div>
        <CategoryGrid categories={encounter.categories} compact base={base} />
      </section>
      <RecordsBrowser
        categories={encounter.categories}
        patientId={encounter.patient_id}
        encounterId={encounter.id}
      />
    </>
  );
}
