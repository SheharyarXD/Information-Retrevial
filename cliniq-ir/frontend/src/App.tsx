import {
  Activity,
  BookOpen,
  ChevronRight,
  Files,
  FolderHeart,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { api, ApiError } from "./api";
import type { User } from "./types";
import { EmptyState, ErrorState, Loading } from "./components/Feedback";
import { Explorer } from "./pages/Explorer";
import { Records } from "./pages/Records";
import { EncounterDetail, PatientDetail, Patients } from "./pages/Patients";
import { DocumentPreview } from "./pages/Preview";
import { Guide } from "./pages/Guide";

function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Activity size={23} strokeWidth={2.1} />
      </span>
      <span>
        Clin<span className="brand-iq">IQ</span>
        <span className="brand-subtitle">CLINICAL WORKSPACE</span>
      </span>
    </span>
  );
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("doctor@cliniq.demo");
  const [password, setPassword] = useState("DemoClinic!2026");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="login-page">
      <section className="login-story">
        <Brand />
        <div>
          <span className="login-kicker">INFORMATION, CONNECTED.</span>
          <h1>
            A clearer view of
            <br />
            every patient story.
          </h1>
          <p>
            Browse clinical records, follow connected encounters, and find the
            information you need.
          </p>
          <div className="login-illustration" aria-hidden="true">
            <div>
              <FolderHeart size={32} />
              <span>Clinical Records</span>
            </div>
            <span className="illustration-line" />
            <div className="illustration-row">
              <span>
                <Users size={22} />
                Patients
              </span>
              <span>
                <Files size={22} />
                Documents
              </span>
            </div>
          </div>
        </div>
        <p className="login-caption">
          ClinIQ · Week 5 Information Retrieval case study
        </p>
      </section>
      <section className="login-form-panel">
        <div className="login-form-inner">
          <span className="workspace-tag">
            <span className="status-dot" />
            Assignment demo
          </span>
          <h2>Welcome to ClinIQ</h2>
          <p>Sign in to explore your clinic’s fictional records.</p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api("/auth/login", {
                  method: "POST",
                  body: JSON.stringify({ email, password }),
                });
                onLogin(await api<User>("/auth/me"));
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to sign in.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label htmlFor="email">Email address</label>
            <input
              autoComplete="username"
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor="password">Password</label>
            <input
              autoComplete="current-password"
              type="password"
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary login-submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in to workspace"}
              <ChevronRight size={17} />
            </button>
          </form>
          <div className="demo-accounts">
            <h3>Use a demo account</h3>
            <p>
              Both clinics use <code>DemoClinic!2026</code>
            </p>
            <div>
              <button
                className={email === "doctor@cliniq.demo" ? "selected" : ""}
                onClick={() => {
                  setEmail("doctor@cliniq.demo");
                  setPassword("DemoClinic!2026");
                }}
              >
                Northstar Clinic<span>7 fictional patients</span>
              </button>
              <button
                className={email === "doctor@river.demo" ? "selected" : ""}
                onClick={() => {
                  setEmail("doctor@river.demo");
                  setPassword("DemoClinic!2026");
                }}
              >
                Riverside Clinic<span>2 fictional patients</span>
              </button>
            </div>
          </div>
          <p className="login-privacy">
            <ShieldCheck size={19} />
            Development data only. No real patient information.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch((error) => {
        if (!(error instanceof ApiError && error.status === 401))
          setConnectionError(
            "The API is unavailable. Start the backend on port 8000, then retry.",
          );
      })
      .finally(() => setChecking(false));
    const expire = () => {
      setUser(null);
      navigate("/", { replace: true });
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, [navigate]);
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    document.title = "ClinIQ · Clinical Records Explorer";
  }, [location.pathname]);
  if (checking) return <Loading label="Opening ClinIQ workspace…" />;
  if (connectionError)
    return (
      <main className="connection-error">
        <Brand />
        <ErrorState
          message={connectionError}
          retry={() => window.location.reload()}
        />
      </main>
    );
  if (!user) return <Login onLogin={setUser} />;
  const logout = async () => {
    setSigningOut(true);
    setLogoutError("");
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      navigate("/");
    } catch {
      setLogoutError("Sign out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {mobileOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${mobileOpen ? "open" : ""}`}
        aria-label="Workspace navigation"
      >
        <Link to="/" className="brand-link" aria-label="ClinIQ home">
          <Brand />
        </Link>
        <button
          className="mobile-close icon-button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        >
          <X size={19} />
        </button>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav">
          <NavLink to="/" end>
            <LayoutDashboard size={19} />
            Records Explorer
            <span className="nav-indicator" />
          </NavLink>
          <NavLink to="/patients">
            <Users size={19} />
            Patient Directory
          </NavLink>
          <NavLink to="/records">
            <Files size={19} />
            All Documents
          </NavLink>
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label">RESOURCES</div>
        <nav className="main-nav">
          <NavLink to="/guide">
            <BookOpen size={19} />
            Explorer Guide
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-sidebar-note">
            <ShieldCheck size={20} />
            <div>
              <strong>Classroom demo</strong>
              <p>Fictional data. Secure access.</p>
            </div>
          </div>
          <div className="sidebar-profile">
            <span className="profile-avatar">
              {user.name
                .replace("Dr. ", "")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{user.name}</strong>
              <span>
                {user.role === "doctor" ? "Clinician" : "Receptionist"}
              </span>
            </div>
            <button
              className="icon-button logout-button"
              title="Sign out"
              aria-label="Sign out"
              disabled={signingOut}
              onClick={logout}
            >
              <LogOut size={18} />
            </button>
          </div>
          {logoutError && (
            <p className="form-error" role="alert">
              {logoutError}
            </p>
          )}
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="topbar-title">Clinical workspace</span>
            <span className="topbar-separator" />
            <span className="topbar-clinic">{user.clinic_name}</span>
          </div>
          <span className="topbar-status">
            <span className="status-dot" />
            Demo environment
          </span>
        </header>
        <main id="main-content" className="main-content" key={user.id}>
          {user.role !== "doctor" ? (
            <ErrorState message="Clinical records are available to doctors only. Sign out and use a doctor demo account." />
          ) : (
            <Routes>
              <Route path="/" element={<Explorer />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/patients/:patientId" element={<PatientDetail />} />
              <Route
                path="/patients/:patientId/encounters/:encounterId"
                element={<EncounterDetail />}
              />
              <Route
                path="/patients/:patientId/encounters/:encounterId/records/:recordId"
                element={<DocumentPreview />}
              />
              <Route path="/records" element={<Records />} />
              <Route path="/guide" element={<Guide />} />
              <Route
                path="*"
                element={
                  <EmptyState
                    title="Page not found"
                    action={
                      <Link className="button primary" to="/">
                        Open Records Explorer
                      </Link>
                    }
                  >
                    This page is unavailable. Return to your clinical workspace.
                  </EmptyState>
                }
              />
            </Routes>
          )}
          <footer className="app-footer">
            <span>
              ClinIQ <span className="separator">/</span> Clinical Records
              Explorer
            </span>
            <span>Fictional records · Educational use</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
