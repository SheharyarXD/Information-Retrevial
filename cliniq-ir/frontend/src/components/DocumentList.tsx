import { ArrowUpRight, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate, recordUrl } from "../api";
import type { ClinicalRecord } from "../types";
import { EmptyState } from "./Feedback";

export function DocumentList({
  records,
  emptyTitle = "No records found",
  emptyDescription = "Try a different keyword or category, or browse another encounter.",
  action,
}: {
  records: ClinicalRecord[];
  emptyTitle?: string;
  emptyDescription?: string;
  action?: React.ReactNode;
}) {
  if (!records.length)
    return (
      <EmptyState title={emptyTitle} action={action}>
        {emptyDescription}
      </EmptyState>
    );
  return (
    <div className="table-wrap">
      <table className="records-table">
        <thead>
          <tr>
            <th scope="col">Document</th>
            <th scope="col">Patient</th>
            <th scope="col">Category</th>
            <th scope="col">Date</th>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>
                <div className="document-cell">
                  <span className={`file-icon category-${record.category_id}`}>
                    <FileText size={19} />
                  </span>
                  <div>
                    <Link className="record-title" to={recordUrl(record)}>
                      {record.title}
                    </Link>
                    <p className="record-excerpt">
                      {record.excerpt.replace(/\n/g, " ")}
                    </p>
                    <span className="record-id">{record.encounter_id}</span>
                  </div>
                </div>
              </td>
              <td>
                <Link
                  className="patient-link"
                  to={`/patients/${record.patient_id}`}
                >
                  {record.patient_name}
                </Link>
                <span className="cell-subtitle">{record.patient_id}</span>
              </td>
              <td>
                <span className={`badge category-${record.category_id}`}>
                  {record.category_name}
                </span>
              </td>
              <td className="date-cell">{formatDate(record.created_at)}</td>
              <td>
                <Link
                  className="preview-link"
                  to={recordUrl(record)}
                  aria-label={`Preview ${record.title}`}
                >
                  <span>Preview</span>
                  <ArrowUpRight size={15} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
