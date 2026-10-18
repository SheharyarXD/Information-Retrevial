import { AlertCircle, LoaderCircle, SearchX } from "lucide-react";
import type { ReactNode } from "react";

export function Loading({
  label = "Loading clinical records…",
}: {
  label?: string;
}) {
  return (
    <div className="feedback" role="status">
      <LoaderCircle className="spin" size={25} />
      <p>{label}</p>
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="feedback error" role="alert">
      <AlertCircle size={26} />
      <h3>Information unavailable</h3>
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="feedback empty">
      <div className="empty-icon">
        <SearchX size={25} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
