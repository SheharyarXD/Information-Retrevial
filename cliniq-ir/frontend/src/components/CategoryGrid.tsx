import {
  Activity,
  ArrowUpRight,
  ClipboardList,
  FileHeart,
  FileText,
  FlaskConical,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Category } from "../types";

const icons = {
  history: History,
  intake: ClipboardList,
  consultation: FileHeart,
  observations: Activity,
  investigations: FlaskConical,
  other: FileText,
};
export function CategoryGrid({
  categories,
  base = "/records",
  compact = false,
}: {
  categories: Category[];
  base?: string;
  compact?: boolean;
}) {
  return (
    <div className={`category-grid ${compact ? "compact" : ""}`}>
      {categories.map((category) => {
        const Icon = icons[category.id as keyof typeof icons] || FileText;
        return (
          <Link
            className={`category-card category-${category.id}`}
            key={category.id}
            to={`${base}?category=${encodeURIComponent(category.id)}`}
          >
            <div className="category-top">
              <span className="category-icon">
                <Icon size={21} strokeWidth={1.6} />
              </span>
              <ArrowUpRight size={17} />
            </div>
            <h3>{category.name}</h3>
            {!compact && <p>{category.description}</p>}
            <span className="category-count">
              {category.count} {category.count === 1 ? "record" : "records"}
              <span>
                Browse <span aria-hidden="true">→</span>
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
