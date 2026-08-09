import { useEffect } from "react";
import { Warehouse } from "./pages/Warehouse.tsx";

function App() {
  useEffect(() => {
    // Automatically seed mock user info into localStorage to enable admin role controls (like Reset Ledger)
    if (!localStorage.getItem("claro_user")) {
      localStorage.setItem(
        "claro_user",
        JSON.stringify({
          id: "user-default-admin",
          email: "milan@claro.com",
          fullName: "Milan — Maintenance Lead",
          role: "Warehouse"
        })
      );
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-main)" }}>
      <Warehouse />
    </div>
  );
}

export default App;
