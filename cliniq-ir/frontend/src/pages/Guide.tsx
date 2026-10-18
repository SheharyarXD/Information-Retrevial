import { ArrowRight, Layers, Link2, List, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "../components/Breadcrumbs";

export function Guide() {
  const models = [
    {
      icon: List,
      title: "Flat browsing",
      text: "Scan a collection of documents and open any record directly. Sort by date or title to change the order.",
      to: "/records",
      action: "Open all documents",
    },
    {
      icon: Layers,
      title: "Structured guided browsing",
      text: "Follow the hierarchy: patients → patient → encounters → encounter → category → document. Click breadcrumb links to return to a parent.",
      to: "/patients",
      action: "Browse patients",
    },
    {
      icon: Link2,
      title: "Hypertext browsing",
      text: "Open a document, then follow its Related documents links. Records from the same encounter appear before other records from the same patient.",
      to: "/records",
      action: "Choose a document to explore",
    },
    {
      icon: Search,
      title: "Keyword search",
      text: "Enter words to retrieve matching titles, note content, categories, patients, or encounter identifiers. All words must match. Results can be ranked by relevance.",
      to: "/records?q=headache&sort=relevance",
      action: "Try a keyword search",
    },
  ];
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Clinical Records", to: "/" },
          { label: "Explorer guide" },
        ]}
      />
      <div className="page-heading">
        <div>
          <p className="eyebrow">WEEK 5 · INFORMATION RETRIEVAL</p>
          <h1>Find information your way</h1>
          <p>
            Four complementary ways to access the fictional clinical collection.
          </p>
        </div>
      </div>
      <div className="guide-grid">
        {models.map((model) => (
          <section className="surface guide-card" key={model.title}>
            <model.icon size={26} />
            <h2>{model.title}</h2>
            <p>{model.text}</p>
            <Link className="text-link" to={model.to}>
              {model.action}
              <ArrowRight size={16} />
            </Link>
          </section>
        ))}
      </div>
      <div className="demo-notice">
        <strong>A safe classroom demonstration</strong>
        <p>
          All names, encounters, and documents are fictional. Each demo account
          can retrieve only its clinic’s collection. The explorer retrieves
          existing information and does not generate diagnoses.
        </p>
      </div>
    </>
  );
}
