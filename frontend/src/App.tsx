import { useEffect, useState } from "react";
import { Warehouse } from "./pages/Warehouse.tsx";
import { Mail, Key, ShieldAlert } from "lucide-react";

function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("warehouse@claro.com");
  const [password, setPassword] = useState("claroenergy");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("claro_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // Clear corrupt session
        localStorage.removeItem("claro_user");
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in both operational credentials.");
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Single Master Warehouse Admin account
    if (cleanEmail === "warehouse@claro.com" && password === "claroenergy") {
      const loggedUser = {
        id: "user-admin",
        email: "warehouse@claro.com",
        fullName: "Milan — Maintenance Lead (Warehouse Admin)",
        role: "Warehouse Admin"
      };
      localStorage.setItem("claro_user", JSON.stringify(loggedUser));
      setUser(loggedUser);
      setErrorMsg(null);
    } else {
      setErrorMsg("Invalid operational email or security password.");
    }
  };

  if (user) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-main)" }}>
        <Warehouse />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Brand Logo Header */}
        <div style={styles.logoContainer}>
          <div style={styles.logoCard}>
            <span style={{ color: "#DC2626", fontWeight: "900", fontSize: "1.2rem", letterSpacing: "0.05em" }}>CLARO</span>
            <span style={{ color: "#000", fontWeight: "700", fontSize: "0.8rem", letterSpacing: "0.1em", marginLeft: "4px" }}>ENERGY</span>
          </div>
        </div>

        <h1 style={styles.title}>O&M Platform V2</h1>
        <p style={styles.subtitle}>Solar Operations Management & Performance Hub</p>

        {errorMsg && (
          <div style={styles.errorBanner}>
            <ShieldAlert size={18} color="#DC2626" />
            <span style={{ fontSize: "0.85rem", color: "#B91C1C", fontWeight: "600" }}>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          {/* Operational Email field */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Mail size={16} style={{ marginRight: "6px" }} />
              Operational Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. warehouse@claro.com"
              style={styles.input}
              required
            />
          </div>

          {/* Security Password field */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Key size={16} style={{ marginRight: "6px" }} />
              Security Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              style={styles.input}
              required
            />
          </div>

          <button type="submit" style={styles.submitBtn}>
            Authenticate Securely
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#F3F4F6",
    backgroundImage: "radial-gradient(circle at top left, #EFF6FF, #F3F4F6)",
    padding: "1rem"
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
    padding: "2.5rem 2rem",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    border: "1px solid rgba(229, 231, 235, 0.5)"
  },
  logoContainer: {
    marginBottom: "1.5rem"
  },
  logoCard: {
    border: "2px solid #000000",
    padding: "0.4rem 1.2rem",
    borderRadius: "6px",
    display: "inline-flex",
    alignItems: "center",
    fontWeight: "bold",
    backgroundColor: "#FFFFFF"
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "800",
    color: "#0F172A",
    margin: "0 0 4px 0",
    fontFamily: "var(--font-display)"
  },
  subtitle: {
    fontSize: "0.85rem",
    color: "#64748B",
    margin: "0 0 2rem 0",
    fontWeight: "500",
    lineHeight: "1.4"
  },
  errorBanner: {
    width: "100%",
    backgroundColor: "#FEF2F2",
    border: "1px solid #FEE2E2",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem"
  },
  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem"
  },
  formGroup: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "6px"
  },
  label: {
    fontSize: "0.8rem",
    fontWeight: "600",
    color: "#475569",
    display: "flex",
    alignItems: "center"
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    border: "1px solid #D1D5DB",
    backgroundColor: "#EFF6FF",
    fontSize: "0.95rem",
    color: "#0F172A",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s"
  },
  submitBtn: {
    width: "100%",
    padding: "0.85rem",
    backgroundColor: "#DC2626",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.2s",
    marginTop: "0.5rem"
  }
};

export default App;
