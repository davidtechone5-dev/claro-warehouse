import { useEffect, useState } from "react";
import { Warehouse } from "./pages/Warehouse.tsx";
import { Mail, Key, ShieldAlert } from "lucide-react";
import { api } from "./utils/api";

const DEFAULT_WAREHOUSES = [
  { id: "all", name: "All Warehouses" },
  { id: "wh-jalna-1111", name: "Jalna MH" },
  { id: "wh-rajasthan-2222", name: "Rajasthan" },
  { id: "wh-haryana-3333", name: "Haryana" },
  { id: "wh-mp-4444", name: "MP" }
];

function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>(DEFAULT_WAREHOUSES);
  const [selectedWarehouseId] = useState<string>("all");

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

  // 12-minute inactivity auto-logout timer
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_LIMIT = 12 * 60 * 1000; // 12 minutes
    let timeoutId: any;

    const logoutUser = () => {
      console.log("Inactivity limit reached. Logging out...");
      localStorage.removeItem("claro_user");
      window.location.reload();
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(logoutUser, INACTIVITY_LIMIT);
    };

    // User activity events to listen for
    const events = ["mousemove", "keypress", "scroll", "click", "touchstart"];

    // Register event listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initialize timer
    resetTimer();

    // Cleanup on unmount or user change
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user]);

  useEffect(() => {
    async function loadWarehouses() {
      try {
        const whs = await api.getWmsWarehouses();
        if (whs && whs.length > 0) {
          setWarehouses(whs);
        }
      } catch (err) {
        console.error("Failed to load warehouses for login", err);
      }
    }
    loadWarehouses();
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
      const selectedWh = warehouses.find(w => w.id === selectedWarehouseId);
      const warehouseName = selectedWh ? selectedWh.name : "All Warehouses";

      let fullName = "Admin Control";
      let emailAddress = "warehouse@claro.com";

      if (selectedWarehouseId === "wh-rajasthan-2222") {
        fullName = "Rajasthan Warehouse";
        emailAddress = "rajasthan@claro.com";
      } else if (selectedWarehouseId === "wh-haryana-3333") {
        fullName = "Haryana Warehouse";
        emailAddress = "haryana@claro.com";
      } else if (selectedWarehouseId === "wh-mp-4444") {
        fullName = "MP Warehouse";
        emailAddress = "mp@claro.com";
      } else if (selectedWarehouseId === "wh-jalna-1111") {
        fullName = "Maharashtra Warehouse";
        emailAddress = "maharashtra@claro.com";
      }

      const loggedUser = {
        id: "user-admin",
        email: emailAddress,
        fullName: fullName,
        role: selectedWarehouseId === "all" ? "Warehouse Admin" : "Warehouse Operator",
        warehouseId: selectedWarehouseId,
        warehouseName: warehouseName
      };

      // Set active warehouse context header and save user session
      localStorage.setItem("claro_selected_warehouse", selectedWarehouseId);
      localStorage.setItem("claro_user", JSON.stringify(loggedUser));
      setUser(loggedUser);
      setErrorMsg(null);
    } else if (cleanEmail === "haryana@claro.com" && (password === "claroenergy" || password === "claro_haryana")) {
      const targetWhId = "wh-haryana-3333";
      const selectedWh = warehouses.find(w => w.id === targetWhId);
      const warehouseName = selectedWh ? selectedWh.name : "Haryana";

      const loggedUser = {
        id: "user-haryana",
        email: "haryana@claro.com",
        fullName: "Haryana Warehouse",
        role: "Warehouse Operator",
        warehouseId: targetWhId,
        warehouseName: warehouseName
      };

      localStorage.setItem("claro_selected_warehouse", targetWhId);
      localStorage.setItem("claro_user", JSON.stringify(loggedUser));
      setUser(loggedUser);
      setErrorMsg(null);
    } else if (cleanEmail === "maharashtra@claro.com" && (password === "claroenergy" || password === "claro_maharashtra")) {
      const targetWhId = "wh-jalna-1111";
      const selectedWh = warehouses.find(w => w.id === targetWhId);
      const warehouseName = selectedWh ? selectedWh.name : "Jalna MH";

      const loggedUser = {
        id: "user-maharashtra",
        email: "maharashtra@claro.com",
        fullName: "Maharashtra Warehouse",
        role: "Warehouse Operator",
        warehouseId: targetWhId,
        warehouseName: warehouseName
      };

      localStorage.setItem("claro_selected_warehouse", targetWhId);
      localStorage.setItem("claro_user", JSON.stringify(loggedUser));
      setUser(loggedUser);
      setErrorMsg(null);
    } else if (cleanEmail === "mp@claro.com" && (password === "claroenergy" || password === "claro_mp")) {
      const targetWhId = "wh-mp-4444";
      const selectedWh = warehouses.find(w => w.id === targetWhId);
      const warehouseName = selectedWh ? selectedWh.name : "MP";

      const loggedUser = {
        id: "user-mp",
        email: "mp@claro.com",
        fullName: "MP Warehouse",
        role: "Warehouse Operator",
        warehouseId: targetWhId,
        warehouseName: warehouseName
      };

      localStorage.setItem("claro_selected_warehouse", targetWhId);
      localStorage.setItem("claro_user", JSON.stringify(loggedUser));
      setUser(loggedUser);
      setErrorMsg(null);
    } else if (cleanEmail === "rajasthan@claro.com" && (password === "claroenergy" || password === "claro_rajasthan")) {
      const targetWhId = "wh-rajasthan-2222";
      const selectedWh = warehouses.find(w => w.id === targetWhId);
      const warehouseName = selectedWh ? selectedWh.name : "Rajasthan";

      const loggedUser = {
        id: "user-rajasthan",
        email: "rajasthan@claro.com",
        fullName: "Rajasthan Warehouse",
        role: "Warehouse Operator",
        warehouseId: targetWhId,
        warehouseName: warehouseName
      };

      localStorage.setItem("claro_selected_warehouse", targetWhId);
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
          <img src="/logo.png" alt="Claro Energy Logo" style={{ height: "45px", objectFit: "contain" }} />
        </div>

        <h1 style={styles.title}>O&M Platform V2</h1>
        <p style={styles.subtitle}>Solar Operations Management & Performance Hub</p>

        {errorMsg && (
          <div style={styles.errorBanner}>
            <ShieldAlert size={18} color="#DC2626" />
            <span style={{ fontSize: "0.85rem", color: "#B91C1C", fontWeight: "600" }}>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form} autoComplete="off">


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
              autoComplete="off"
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
              autoComplete="new-password"
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
