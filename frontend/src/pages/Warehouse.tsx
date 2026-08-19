import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Plus, Trash2, CheckCircle, AlertTriangle, ArrowRight, Warehouse as WarehouseIcon, LogOut } from "lucide-react";

export function Warehouse() {
  // Tab control: 'dashboard', 'requests', 'entry', 'log', 'challans'
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const [currentUser] = useState<any>(() => {
    const saved = localStorage.getItem("claro_user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Global selections
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Party Master dropdown data
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [pendingRMAs, setPendingRMAs] = useState<string[]>([]);

  // Loaded WMS data
  const [stockData, setStockData] = useState<any>({
    metrics: { freshUnits: 0, faultyUnits: 0, rmaPending: 0, sentToFarmersThisWeek: 0 },
    stockByPart: [],
    needsAttention: []
  });
  const [movements, setMovements] = useState<any[]>([]);
  const [challans, setChallans] = useState<any[]>([]);
  const [selectedChallan, setSelectedChallan] = useState<any>(null);

  // Ledger log filters
  const [logSearchQuery, setLogSearchQuery] = useState<string>("");
  const [logStageFilter, setLogStageFilter] = useState<string>("ALL");
  const [logStartDate, setLogStartDate] = useState<string>("");
  const [logEndDate, setLogEndDate] = useState<string>("");
  const [farmerSearchText, setFarmerSearchText] = useState<string>("");
  const [isFarmerDropdownOpen, setIsFarmerDropdownOpen] = useState<boolean>(false);
  const [farmerInputVal, setFarmerInputVal] = useState<string>("");

  // Material requests (from Google Forms)
  const [materialRequests, setMaterialRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [requestFilter, setRequestFilter] = useState<string>("PENDING"); // PENDING, APPROVED, DISPATCHED, ALL

  const [reqPage, setReqPage] = useState<number>(1);
  const reqsPerPage = 6;

  // Logging Movement Form State
  const [movementStage, setMovementStage] = useState<number>(1);
  const [partyName, setPartyName] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [reportedFault, setReportedFault] = useState<string>("");
  const [conditionReceived, setConditionReceived] = useState<string>("Repaired");

  const [formLines, setFormLines] = useState<Array<{
    partCode: string;
    quantity: number;
    serialsText: string;
    replacedSerialsText: string;
  }>>([
    { partCode: "", quantity: 1, serialsText: "", replacedSerialsText: "" }
  ]);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Time ticker
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");

  useEffect(() => {
    function tick() {
      const d = new Date();
      const opts: any = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      setCurrentTimeStr(d.toLocaleString('en-GB', opts));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial configuration (warehouses, parts, party master lists)
  useEffect(() => {
    async function initWms() {
      try {
        const whs = await api.getWmsWarehouses();
        const pts = await api.getWmsParts();
        const mfrs = await api.getWmsManufacturers();
        const engs = await api.getWmsEngineers();
        const fms = await api.getWmsFarmers();

        setWarehouses(whs);
        setParts(pts);
        setManufacturers(mfrs);
        setEngineers(engs);
        setFarmers(fms);

        if (whs.length > 0) {
          let activeWhId = whs[0].id;
          if (currentUser?.warehouseId) {
            activeWhId = currentUser.warehouseId;
          } else {
            const savedWh = localStorage.getItem("claro_selected_warehouse");
            const defaultWh = whs.find((w: any) => w.id === "all") || whs[0];
            activeWhId = savedWh && whs.some((w: any) => w.id === savedWh) ? savedWh : defaultWh.id;
          }
          setSelectedWarehouseId(activeWhId);
        }

        if (pts.length > 0) {
          setFormLines([{ partCode: pts[0].code, quantity: 1, serialsText: "", replacedSerialsText: "" }]);
        }
      } catch (err) {
        console.error("Failed to initialize WMS", err);
      } finally {
        setLoading(false);
      }
    }
    initWms();
  }, []);

  useEffect(() => {
    if (!selectedWarehouseId) return;

    localStorage.setItem("claro_selected_warehouse", selectedWarehouseId);

    async function loadWarehouseData() {
      setLoading(true);
      try {
        const stock = await api.getWmsStock(selectedWarehouseId);
        const movs = await api.getWmsMovements(selectedWarehouseId);
        const chls = await api.getWmsChallans(selectedWarehouseId);
        const matReqs = await api.getMaterialRequests(selectedWarehouseId);
        const pRMAs = await api.getWmsPendingRMAs(selectedWarehouseId);
        setStockData(stock);
        setMovements(movs);
        setChallans(chls);
        setMaterialRequests(matReqs);
        setPendingRMAs(pRMAs);

        if (chls.length > 0) {
          setSelectedChallan(chls[0]);
        }
      } catch (err) {
        console.error("Failed to load WMS data", err);
      } finally {
        setLoading(false);
      }
    }

    loadWarehouseData();
  }, [selectedWarehouseId]);

  // Filter material requests
  useEffect(() => {
    if (requestFilter === "ALL") {
      setFilteredRequests(materialRequests);
    } else {
      setFilteredRequests(materialRequests.filter(r => r.status === requestFilter));
    }
    setReqPage(1);
  }, [materialRequests, requestFilter]);

  // Trigger default partyName and referenceNumber values when movementStage shifts
  useEffect(() => {
    if (movementStage === 1) {
      setPartyName(manufacturers[0]?.name || "");
      setReferenceNumber("");
    } else if (movementStage === 2) {
      setPartyName(engineers[0]?.name || "");
      setReferenceNumber(farmers[0]?.applicationId || "");
    } else if (movementStage === 3) {
      setPartyName(engineers[0]?.name || "");
      setReferenceNumber(farmers[0]?.applicationId || "");
    } else if (movementStage === 4) {
      setPartyName(manufacturers[0]?.name || "");
      setReferenceNumber("");
    } else if (movementStage === 5) {
      setPartyName(manufacturers[0]?.name || "");
      setReferenceNumber(pendingRMAs[0] || "");
    }
  }, [movementStage, manufacturers, engineers, farmers, pendingRMAs]);

  // Filtered farmers list
  const filteredFarmers = farmers.filter((f) => {
    if (!farmerInputVal.trim()) return true;
    const q = farmerInputVal.toLowerCase();
    return (
      f.applicationId.toLowerCase().includes(q) ||
      (f.clientName && f.clientName.toLowerCase().includes(q))
    );
  });

  if (loading || !selectedWarehouseId) {
    return <div style={styles.loading}>Loading Warehouse Management Interface...</div>;
  }

  // Handle stage pre-fill from a material request
  const handlePreFillFromRequest = (req: any) => {
    setMovementStage(2); // Stage 2: Sent to farmer
    
    // Find matched engineer from party master
    const matchedEng = engineers.find(e => e.name.toLowerCase() === req.engineer?.name?.toLowerCase());
    setPartyName(matchedEng ? matchedEng.name : (engineers[0]?.name || ""));

    // Prefill application ID or reference
    const farmerAppId = req.ticket?.complaint?.applicationId || req.remarks?.match(/MK\d+/)?.[0] || "";
    const matchedFarmer = farmers.find(f => f.applicationId === farmerAppId);
    setReferenceNumber(matchedFarmer ? matchedFarmer.applicationId : (farmers[0]?.applicationId || ""));
    setFarmerSearchText("");

    // Look up matching part from our database intelligently
    const reqItemName = req.items?.[0]?.itemName || "";
    const remarksText = req.remarks || "";
    const hpMatch = remarksText.match(/(\d+(\.\d+)?)\s*HP/i);
    const matchedHp = hpMatch ? hpMatch[1] : "";

    const matchedParts = parts.filter(p => 
      p.description.toLowerCase().includes(reqItemName.toLowerCase()) || 
      reqItemName.toLowerCase().includes(p.description.toLowerCase()) ||
      p.code.toLowerCase().includes(reqItemName.toLowerCase())
    );

    let matchedPart = null;
    if (matchedParts.length > 0) {
      if (matchedHp) {
        matchedPart = matchedParts.find(p => p.hpRating && p.hpRating.toLowerCase().includes(matchedHp.toLowerCase()));
      }
      if (!matchedPart) {
        matchedPart = matchedParts[0];
      }
    }

    setFormLines([
      {
        partCode: matchedPart ? matchedPart.code : (parts[0]?.code || ""),
        quantity: req.items?.[0]?.quantity || 1,
        serialsText: "",
        replacedSerialsText: ""
      }
    ]);

    setFeedbackMsg({ type: "success", text: `Prefilled form with details from Request #${req.id.slice(0, 8)}` });
    setActiveTab("entry");
  };

  // Log movement handler
  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFeedbackMsg(null);

    // Form lines format validation
    const linesPayload = formLines.map(line => {
      const serials = line.serialsText
        .split("\n")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const replacedSerials = line.replacedSerialsText
        .split("\n")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const replacedSerialsMap: Record<string, string> = {};
      if (movementStage === 5 && conditionReceived === "Replaced — new serial") {
        for (let i = 0; i < serials.length; i++) {
          if (replacedSerials[i]) {
            replacedSerialsMap[serials[i]] = replacedSerials[i];
          }
        }
      }

      return {
        partCode: line.partCode,
        quantity: Number(line.quantity),
        serials,
        replacedSerialsMap
      };
    });

    // Check that serial counts match quantities (only for serialized parts)
    for (let i = 0; i < linesPayload.length; i++) {
      const line = linesPayload[i];
      const matchedPart = parts.find(p => p.code === line.partCode);
      const isSerialized = matchedPart ? matchedPart.serialTracked : true;

      if (isSerialized) {
        if (line.serials.length !== line.quantity) {
          setFeedbackMsg({
            type: "error",
            text: `Line ${i + 1}: Registered ${line.serials.length} serial numbers but quantity says ${line.quantity}.`
          });
          setFormSubmitting(false);
          return;
        }

        if (movementStage === 5 && conditionReceived === "Replaced — new serial" && Object.keys(line.replacedSerialsMap).length !== line.quantity) {
          setFeedbackMsg({
            type: "error",
            text: `Line ${i + 1}: Under replacement condition, every new serial must map to an original faulty serial.`
          });
          setFormSubmitting(false);
          return;
        }
      } else {
        // Clear serials for non-serialized items to keep payload clean
        line.serials = [];
        line.replacedSerialsMap = {};
      }
    }

    try {
      await api.logWmsMovement({
        warehouseId: selectedWarehouseId,
        stage: movementStage,
        partyName,
        referenceNumber,
        vehicleNumber: movementStage === 1 ? vehicleNumber : undefined,
        reportedFault: movementStage === 3 ? reportedFault : undefined,
        conditionReceived: movementStage === 5 ? conditionReceived : undefined,
        lines: linesPayload
      });

      // Reload warehouse data
      const stock = await api.getWmsStock(selectedWarehouseId);
      const movs = await api.getWmsMovements(selectedWarehouseId);
      const chls = await api.getWmsChallans(selectedWarehouseId);
      const matReqs = await api.getMaterialRequests(selectedWarehouseId);
      const pRMAs = await api.getWmsPendingRMAs(selectedWarehouseId);

      setStockData(stock);
      setMovements(movs);
      setChallans(chls);
      setMaterialRequests(matReqs);
      setPendingRMAs(pRMAs);

      setFeedbackMsg({ type: "success", text: "Inventory movement logged successfully!" });
      
      // Reset form
      setPartyName("");
      setReferenceNumber("");
      setVehicleNumber("");
      setReportedFault("");
      setFarmerSearchText("");
      setFormLines([{ partCode: parts[0]?.code || "", quantity: 1, serialsText: "", replacedSerialsText: "" }]);
      
      // Navigate to dashboard
      setTimeout(() => {
        setFeedbackMsg(null);
        setActiveTab("dashboard");
      }, 1500);

    } catch (err: any) {
      const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to log inventory movement";
      setFeedbackMsg({ type: "error", text: errMsg });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete movement handler
  const handleDeleteMovement = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this movement entry? This will revert the serial status and stock calculation.")) return;

    try {
      await api.deleteWmsMovement(id);
      
      // Reload WMS
      const stock = await api.getWmsStock(selectedWarehouseId);
      const movs = await api.getWmsMovements(selectedWarehouseId);
      const chls = await api.getWmsChallans(selectedWarehouseId);
      const pRMAs = await api.getWmsPendingRMAs(selectedWarehouseId);

      setStockData(stock);
      setMovements(movs);
      setChallans(chls);
      setPendingRMAs(pRMAs);

      alert("Ledger entry removed and stock updated.");
    } catch (err: any) {
      alert("Error deleting movement: " + err.message);
    }
  };

  // Export Movement Ledger to CSV
  const handleExportLedgerToCSV = () => {
    try {
      if (filteredMovements.length === 0) {
        alert("No movements found matching the current filters to export.");
        return;
      }

      // CSV Headers
      const headers = [
        "Timestamp",
        "Stage",
        "Associated Party",
        "Reference ID",
        "Part Code",
        "Part Description",
        "Quantity",
        "Serial Numbers",
        "Logged By"
      ];

      // Convert rows
      const rows = filteredMovements.flatMap((mov) => {
        const timestamp = new Date(mov.timestamp).toISOString().replace("T", " ").substring(0, 19);
        const stage = `Stage ${mov.type}`;
        const party = mov.partyName || "";
        const refId = mov.referenceNumber || "";
        const loggedBy = mov.user?.fullName || "System";

        return mov.lines.map((l: any) => {
          const partCode = l.part?.code || "";
          const partDesc = l.part?.description || "";
          const qty = l.quantity || 0;
          const serials = (l.serialNumbers || []).map((s: any) => s.serialNumber).join("; ");

          return [
            timestamp,
            stage,
            party,
            refId,
            partCode,
            partDesc,
            qty,
            serials,
            loggedBy
          ].map(val => {
            // Escape double quotes and wrap in quotes if contains comma or quote
            const stringVal = String(val).replace(/"/g, '""');
            return stringVal.includes(",") || stringVal.includes("\n") || stringVal.includes('"')
              ? `"${stringVal}"`
              : stringVal;
          });
        });
      });

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const whName = warehouses.find(w => w.id === selectedWarehouseId)?.name || selectedWarehouseId;
      const formattedWhName = whName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      link.setAttribute("download", `wms_ledger_export_${formattedWhName}_${new Date().toISOString().substring(0, 10)}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Error exporting ledger: " + err.message);
    }
  };

  const handleWipeAllWms = async () => {
    if (!window.confirm("🔴 WARNING: Are you sure you want to completely WIPE all logged movements, serial numbers, and generated challans from the database? This cannot be undone.")) return;

    try {
      await api.clearWmsAll();

      // Reload WMS
      const stock = await api.getWmsStock(selectedWarehouseId);
      const movs = await api.getWmsMovements(selectedWarehouseId);
      const chls = await api.getWmsChallans(selectedWarehouseId);
      const matReqs = await api.getMaterialRequests(selectedWarehouseId);
      const pRMAs = await api.getWmsPendingRMAs(selectedWarehouseId);

      setStockData(stock);
      setMovements(movs);
      setChallans(chls);
      setMaterialRequests(matReqs);
      setPendingRMAs(pRMAs);

      alert("Ledger database reset successfully!");
      setActiveTab("dashboard");
    } catch (err: any) {
      alert("Error resetting database: " + err.message);
    }
  };

  const handleSyncLiveRequests = async () => {
    setSyncing(true);
    try {
      const res = await api.syncWmsRequests();
      alert(`Sync Complete! Imported ${res.newRequestsImported} new material requests.`);
      const matReqs = await api.getMaterialRequests(selectedWarehouseId);
      setMaterialRequests(matReqs);
    } catch (err: any) {
      alert("Error syncing sheets: " + err.message);
    } finally {
      setSyncing(false);
    }
  };



  const updateRequestStatus = async (id: string, status: string) => {
    try {
      await api.updateMaterialStatus(id, status);
      const matReqs = await api.getMaterialRequests(selectedWarehouseId);
      setMaterialRequests(matReqs);
    } catch (err: any) {
      alert("Error updating request: " + err.message);
    }
  };

  // Form line helpers
  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...formLines];
    updated[index] = { ...updated[index], [field]: value };
    setFormLines(updated);
  };

  const addFormLine = () => {
    setFormLines([...formLines, { partCode: parts[0]?.code || "", quantity: 1, serialsText: "", replacedSerialsText: "" }]);
  };

  const removeFormLine = (index: number) => {
    if (formLines.length === 1) return;
    setFormLines(formLines.filter((_, i) => i !== index));
  };

  const showOriginalSerials = movementStage === 5 && conditionReceived === "Replaced — new serial";
  const gridTemplate = showOriginalSerials 
    ? "1.5fr 0.6fr 2fr 2fr 0.4fr" 
    : "2.5fr 0.8fr 3fr 0.4fr";
  // Filter movements based on user inputs
  const filteredMovements = movements.filter((mov) => {
    // 1. Search Query Filter (partyName, referenceNumber, part code, or serials)
    if (logSearchQuery.trim() !== "") {
      const q = logSearchQuery.toLowerCase();
      const partyMatch = mov.partyName?.toLowerCase().includes(q);
      const refMatch = mov.referenceNumber?.toLowerCase().includes(q);
      const partsOrSerialsMatch = mov.lines?.some((line: any) => 
        line.part?.code?.toLowerCase().includes(q) ||
        line.serialNumbers?.some((s: any) => s.serialNumber?.toLowerCase().includes(q))
      );
      if (!partyMatch && !refMatch && !partsOrSerialsMatch) {
        return false;
      }
    }

    // 2. Stage Filter
    if (logStageFilter !== "ALL") {
      if (mov.type !== Number(logStageFilter)) {
        return false;
      }
    }

    // 3. Date Filters
    if (logStartDate !== "") {
      const start = new Date(logStartDate);
      start.setHours(0, 0, 0, 0);
      const movDate = new Date(mov.timestamp);
      if (movDate < start) return false;
    }

    if (logEndDate !== "") {
      const end = new Date(logEndDate);
      end.setHours(23, 59, 59, 999);
      const movDate = new Date(mov.timestamp);
      if (movDate > end) return false;
    }

    return true;
  });
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-main)" }}>
      {/* Sidebar container */}
      <div style={styles.sidebar}>
        {/* Top: Brand Logo */}
        <div style={styles.logoContainer}>
          <div style={styles.logoCard}>
            <div style={styles.logoTopHalf}>
              <span style={styles.logoClaroText}>CLARO</span>
              <span style={styles.logoRegistered}>®</span>
            </div>
            <div style={styles.logoBottomHalf}>
              ENERGY
            </div>
          </div>
        </div>

        {/* Middle: Sidebar Menu */}
        <div style={styles.sidebarMenu}>
          <div style={styles.sidebarItemActive}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <WarehouseIcon size={22} color="#DC2626" />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: "700" }}>WMS</span>
                <span style={{ fontSize: "0.95rem", fontWeight: "700" }}>Dashboard</span>
              </div>
            </div>
            <span style={styles.sidebarBadgeActive}>ACTIVE</span>
          </div>
        </div>

        {/* Bottom: Profile & Sign Out */}
        <div style={styles.sidebarFooter}>
          <div style={styles.profileCard}>
            <div style={styles.avatarCircle}>
              {currentUser?.fullName?.charAt(0) || "U"}
            </div>
            <div style={styles.profileDetails}>
              <div style={styles.profileName} title={currentUser?.fullName || "User"}>
                {currentUser?.fullName || "User"}
              </div>
              <div style={styles.profileRole}>
                {currentUser?.role || "Warehouse"}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("claro_user");
              window.location.reload();
            }}
            style={styles.signOutBtn}
          >
            <LogOut size={16} color="#EF4444" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="animate-fade-in" style={{ flex: 1, padding: "2rem 3rem", overflowY: "auto", paddingBottom: "2rem" }}>
        {/* Header bar */}
        <div style={styles.pageHeader}>
        <div>
          <h1 className="page-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            Warehouse Ledger Management
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Dynamically tracks real-time stock balances across regional ledgers.
          </p>
        </div>

        <div style={styles.headerRight}>
          {(currentUser?.role === "Warehouse" || currentUser?.role === "Warehouse Admin") && (
            <button 
              type="button" 
              onClick={handleWipeAllWms}
              style={styles.wipeBtn}
            >
              🔴 Reset Ledger Data
            </button>
          )}

          <div style={styles.whSelectorLabel}>
            <span>Active Warehouse Ledger:</span>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              style={{
                ...styles.whSelect,
                cursor: currentUser?.warehouseId ? "not-allowed" : "pointer",
                opacity: currentUser?.warehouseId ? 0.85 : 1
              }}
              disabled={!!currentUser?.warehouseId}
            >
              {warehouses
                .filter(w => !currentUser?.warehouseId || w.id === currentUser.warehouseId)
                .map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))
              }
            </select>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabsLeft}>
          <button 
            onClick={() => { setActiveTab("dashboard"); setFeedbackMsg(null); }}
            style={activeTab === "dashboard" ? styles.tabActive : styles.tab}
          >
            📊 Live Stock
          </button>
          <button 
            onClick={() => { setActiveTab("requests"); setFeedbackMsg(null); }}
            style={activeTab === "requests" ? styles.tabActive : styles.tab}
          >
            📩 Material Requests
            {materialRequests.filter(r => r.status === "PENDING").length > 0 && (
              <span style={styles.tabBadge}>{materialRequests.filter(r => r.status === "PENDING").length}</span>
            )}
          </button>
          <button 
            onClick={() => { setActiveTab("entry"); setFeedbackMsg(null); }}
            style={activeTab === "entry" ? styles.tabActive : styles.tab}
          >
            ✏️ Log Movement
          </button>
          <button 
            onClick={() => { setActiveTab("log"); setFeedbackMsg(null); }}
            style={activeTab === "log" ? styles.tabActive : styles.tab}
          >
            📋 Movement Log
          </button>
          <button 
            onClick={() => { setActiveTab("challans"); setFeedbackMsg(null); }}
            style={activeTab === "challans" ? styles.tabActive : styles.tab}
          >
            🧾 Challans
          </button>

        </div>
        <div style={styles.liveClock}>
          <span style={styles.clockPill}></span> System live &middot; <b style={{ fontFamily: "monospace" }}>{currentTimeStr}</b>
        </div>
      </div>

      {feedbackMsg && (
        <div style={feedbackMsg.type === "success" ? styles.successAlert : styles.errorAlert}>
          {feedbackMsg.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner}></div>
          <span style={{ marginTop: "1rem", color: "var(--text-muted)", fontWeight: "600", fontSize: "1rem" }}>
            Loading Warehouse Data...
          </span>
        </div>
      )}

      {/* Tab: Dashboard */}
      {activeTab === "dashboard" && (
        <div>
          {/* Stats metrics */}
          <div style={styles.metricsRow}>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Fresh Units in Stock</span>
              <span style={styles.metricValue}>{stockData.metrics?.freshUnits.toLocaleString() || 0}</span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Faulty Units on Hand</span>
              <span style={styles.metricValue}>{stockData.metrics?.faultyUnits.toLocaleString() || 0}</span>
            </div>
            <div style={{ ...styles.metricCard, ...(stockData.metrics?.rmaPending > 0 ? styles.metricAlert : {}) }}>
              <span style={stockData.metrics?.rmaPending > 0 ? styles.metricLabelAlert : styles.metricLabel}>
                RMA Pending &gt; 15 Days
              </span>
              <span style={stockData.metrics?.rmaPending > 0 ? styles.metricValueAlert : styles.metricValue}>
                {stockData.metrics?.rmaPending || 0}
              </span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Sent to Farmers (This Week)</span>
              <span style={styles.metricValue}>{stockData.metrics?.sentToFarmersThisWeek || 0}</span>
            </div>
          </div>

          {/* SKU stock list */}
          <div className="panel-card" style={{ marginBottom: "1.5rem" }}>
            <div className="panel-card-header" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 700 }}>Stock by Part — Fresh vs Faulty</h2>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                {stockData.stockByPart?.length || 0} SKUs tracked
              </span>
            </div>
            
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Material Code</th>
                    <th>Description</th>
                    <th style={{ textAlign: "right" }}>Fresh (in stock)</th>
                    <th style={{ textAlign: "right" }}>Faulty (on hand)</th>
                    <th style={{ textAlign: "right" }}>At Manufacturer</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.stockByPart?.map((item: any) => (
                    <tr key={item.code}>
                      <td style={{ fontFamily: "monospace", fontWeight: "600", color: "var(--text-main)" }}>
                        {item.code}
                      </td>
                      <td>{item.description}</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: "700", color: "var(--color-resolved)" }}>
                        {item.fresh}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: "700", color: "var(--color-manual)" }}>
                        {item.faulty}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--color-assigned)" }}>
                        {item.atManufacturer}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                        &mdash;
                      </td>
                    </tr>
                  ))}
                  {(!stockData.stockByPart || stockData.stockByPart.length === 0) && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        No warehouse data loaded for this ledger. Log a movement to start tracking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alerts section */}
          <div className="panel-card" style={{ borderLeft: "4px solid var(--primary)" }}>
            <div className="panel-card-header" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                ⚠️ Needs Attention (Overdue Items)
              </h2>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Auto-flagged ledger alerts
              </span>
            </div>
            
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Serial Number</th>
                    <th>Part Details</th>
                    <th>Alert Status</th>
                    <th style={{ textAlign: "right" }}>Days Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.needsAttention?.map((alert: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: "monospace", fontWeight: "600", color: "var(--text-main)" }}>
                        {alert.serial}
                      </td>
                      <td>{alert.part}</td>
                      <td>
                        <span className={`status-badge status-${alert.status.toLowerCase().includes("rma") ? "reopened" : "manual"}`}>
                          {alert.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: "700", color: "var(--primary)" }}>
                        {alert.daysPending} days
                      </td>
                    </tr>
                  ))}
                  {(!stockData.needsAttention || stockData.needsAttention.length === 0) && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        ✅ All serial numbers are moving on schedule. No overdue items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Material Requests */}
      {activeTab === "requests" && (
        <div>
          <div style={styles.filterBar}>
            <div style={styles.filterTabs}>
              <button 
                onClick={() => setRequestFilter("PENDING")}
                style={requestFilter === "PENDING" ? styles.filterTabActive : styles.filterTab}
              >
                New ({materialRequests.filter(r => r.status === "PENDING").length})
              </button>
              <button 
                onClick={() => setRequestFilter("APPROVED")}
                style={requestFilter === "APPROVED" ? styles.filterTabActive : styles.filterTab}
              >
                Approved ({materialRequests.filter(r => r.status === "APPROVED").length})
              </button>
              <button 
                onClick={() => setRequestFilter("DISPATCHED")}
                style={requestFilter === "DISPATCHED" ? styles.filterTabActive : styles.filterTab}
              >
                Dispatched ({materialRequests.filter(r => r.status === "DISPATCHED").length})
              </button>
              <button 
                onClick={() => setRequestFilter("ALL")}
                style={requestFilter === "ALL" ? styles.filterTabActive : styles.filterTab}
              >
                All ({materialRequests.length})
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {currentUser?.email === "warehouse@claro.com" && (
                <button 
                  type="button"
                  disabled={syncing}
                  onClick={handleSyncLiveRequests}
                  style={syncing ? styles.syncBtnDisabled : styles.syncBtn}
                >
                  {syncing ? "🔄 Reconciling..." : "🔄 Admin Reconcile Sheets"}
                </button>
              )}
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Synced with Google Sheet registry
              </p>
            </div>
          </div>

          <div style={styles.requestsGrid}>
            {filteredRequests.slice((reqPage - 1) * reqsPerPage, reqPage * reqsPerPage).map((req) => (
              <div key={req.id} className="panel-card" style={{ borderLeft: req.status === "PENDING" ? "4px solid var(--primary)" : "4px solid var(--color-resolved)" }}>
                <div style={styles.reqCardHeader}>
                  <div>
                    <span style={styles.reqId}>REQ-{req.id.slice(0, 5).toUpperCase()}</span>
                    {req.status === "PENDING" && <span style={styles.reqBadgeNew}>NEW</span>}
                  </div>
                  <span className={`status-badge status-${req.status.toLowerCase()}`}>{req.status}</span>
                </div>

                <div style={styles.reqCardTitle}>
                  {req.items?.length > 0 ? (
                    req.items.map((item: any) => (
                      <div key={item.id} style={{ fontWeight: "700", fontSize: "1.05rem" }}>
                        {item.itemName} &mdash; <span style={{ color: "var(--primary)" }}>Qty {item.quantity}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontWeight: "700", fontSize: "1.05rem" }}>{req.remarks || "No details"}</div>
                  )}
                </div>

                <div style={styles.reqMetaGrid}>
                  <div>
                    <span style={styles.reqMetaLabel}>Submitted</span>
                    <span style={styles.reqMetaValue}>{new Date(req.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div>
                    <span style={styles.reqMetaLabel}>Engineer</span>
                    <span style={styles.reqMetaValue}>{req.engineer?.name || "N/A"}</span>
                  </div>
                  <div>
                    <span style={styles.reqMetaLabel}>Application ID</span>
                    <span style={styles.reqMetaValue}>{req.ticket?.complaint?.applicationId || "N/A"}</span>
                  </div>
                  <div>
                    <span style={styles.reqMetaLabel}>Village / Site</span>
                    <span style={styles.reqMetaValue}>{req.ticket?.complaint?.masterInstallation?.clientName || "N/A"}</span>
                  </div>
                </div>

                <div style={styles.reqCardActions}>
                  {req.status !== "DISPATCHED" ? (
                    <>
                      <select 
                        value={req.status} 
                        onChange={(e) => updateRequestStatus(req.id, e.target.value)}
                        style={styles.reqActionSelect}
                      >
                        <option value="PENDING">Pending Approval</option>
                        <option value="APPROVED">Approved - Pending Dispatch</option>
                        <option value="DISPATCHED">Dispatched</option>
                      </select>
                      <button 
                        onClick={() => handlePreFillFromRequest(req)}
                        className="custom-btn" 
                        style={styles.reqActionBtn}
                      >
                        Log as Sent to Farmer <ArrowRight size={14} />
                      </button>
                    </>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-resolved)", fontWeight: "600", fontSize: "0.9rem" }}>
                      <CheckCircle size={16} /> Dispatched &amp; logged to inventory
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredRequests.length === 0 && (
              <div style={styles.noDataBox}>
                No material requests found in this filter list.
              </div>
            )}

            {filteredRequests.length > reqsPerPage && (
              <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "1rem",
                marginTop: "2rem",
                width: "100%",
                gridColumn: "1 / -1"
              }}>
                <button
                  type="button"
                  disabled={reqPage === 1}
                  onClick={() => setReqPage(prev => Math.max(1, prev - 1))}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    backgroundColor: reqPage === 1 ? "var(--bg-secondary)" : "#FFFFFF",
                    color: reqPage === 1 ? "var(--text-muted)" : "var(--text-main)",
                    cursor: reqPage === 1 ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "0.88rem"
                  }}
                >
                  &larr; Previous
                </button>
                <span style={{ fontSize: "0.9rem", color: "var(--text-main)", fontWeight: "600" }}>
                  Page {reqPage} of {Math.ceil(filteredRequests.length / reqsPerPage)}
                </span>
                <button
                  type="button"
                  disabled={reqPage === Math.ceil(filteredRequests.length / reqsPerPage)}
                  onClick={() => setReqPage(prev => Math.min(Math.ceil(filteredRequests.length / reqsPerPage), prev + 1))}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    backgroundColor: reqPage === Math.ceil(filteredRequests.length / reqsPerPage) ? "var(--bg-secondary)" : "#FFFFFF",
                    color: reqPage === Math.ceil(filteredRequests.length / reqsPerPage) ? "var(--text-muted)" : "var(--text-main)",
                    cursor: reqPage === Math.ceil(filteredRequests.length / reqsPerPage) ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "0.88rem"
                  }}
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      )}



      {/* Tab: Log Movement */}
      {activeTab === "entry" && (
        selectedWarehouseId === "all" ? (
          <div className="panel-card" style={{ padding: "4rem 2rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <AlertTriangle size={48} color="var(--color-pending)" />
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: "700" }}>Transaction Logging is Warehouse-Specific</h3>
            <p style={{ color: "var(--text-muted)", maxWidth: "500px", margin: "0 auto", fontSize: "0.95rem", lineHeight: "1.5" }}>
              Please select a specific regional warehouse area (Jalna, Rajasthan, Haryana, or MP) from the top-right menu to log new material movements.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSaveMovement} className="panel-card" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginTop: 0, marginBottom: "1.5rem", fontWeight: "700" }}>
            Log New Material Movement
          </h2>

          {/* Movement Stages Cycle Row */}
          <div style={styles.cycleRow}>
            {[
              { num: 1, text: "Received from manufacturer" },
              { num: 2, text: "Sent to farmer" },
              { num: 3, text: "Faulty received from SE" },
              { num: 4, text: "RMA sent to manufacturer" },
              { num: 5, text: "Received back (repaired)" }
            ].map((step) => (
              <div 
                key={step.num} 
                onClick={() => { setMovementStage(step.num); setFeedbackMsg(null); }}
                style={movementStage === step.num ? styles.cycleStepSel : styles.cycleStep}
              >
                <span style={movementStage === step.num ? styles.cycleNumSel : styles.cycleNum}>{step.num}</span>
                <span>{step.text}</span>
              </div>
            ))}
          </div>

          <div style={styles.formGrid}>
            {/* Stage 1 Fields */}
            {movementStage === 1 && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Manufacturer Name * (Party Master)</label>
                  <select 
                    value={partyName} 
                    onChange={(e) => setPartyName(e.target.value)} 
                    style={styles.input}
                    required
                  >
                    {manufacturers.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Invoice / Challan No *</label>
                  <input 
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. 932029888"
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Vehicle Number</label>
                  <input 
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. MH20AB1234"
                    style={styles.input}
                  />
                </div>
              </>
            )}

            {/* Stage 2 Fields */}
            {movementStage === 2 && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Farmer Application ID * (Party Master)</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={isFarmerDropdownOpen ? farmerInputVal : (() => {
                        const selectedFarmer = farmers.find(f => f.applicationId === referenceNumber);
                        return selectedFarmer ? `${selectedFarmer.applicationId} (${selectedFarmer.clientName})` : "";
                      })()}
                      onChange={(e) => {
                        if (!isFarmerDropdownOpen) setIsFarmerDropdownOpen(true);
                        setFarmerInputVal(e.target.value);
                      }}
                      onFocus={() => {
                        setIsFarmerDropdownOpen(true);
                        setFarmerInputVal(""); // clear on focus to let them type
                      }}
                      onBlur={() => {
                        // Small timeout to allow onMouseDown on option to register first
                        setTimeout(() => {
                          if (isFarmerDropdownOpen) {
                            setReferenceNumber("");
                            setFarmerInputVal("");
                            setIsFarmerDropdownOpen(false);
                          }
                        }, 250);
                      }}
                      placeholder="Search and select farmer..."
                      style={{ ...styles.input, width: "100%" }}
                      required
                    />
                    {isFarmerDropdownOpen && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        maxHeight: "220px",
                        overflowY: "auto",
                        backgroundColor: "var(--bg-panel)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        zIndex: 1000,
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        marginTop: "4px"
                      }}>
                        {filteredFarmers.map(f => (
                          <div
                            key={f.applicationId}
                            onMouseDown={() => {
                              setReferenceNumber(f.applicationId);
                              setIsFarmerDropdownOpen(false);
                              setFarmerInputVal("");
                            }}
                            className="dropdown-item"
                            style={{
                              padding: "0.6rem 0.8rem",
                              cursor: "pointer",
                              borderBottom: "1px solid var(--border-color)",
                              fontSize: "0.85rem",
                              color: "var(--text-main)",
                              backgroundColor: referenceNumber === f.applicationId ? "var(--bg-secondary)" : "transparent"
                            }}
                          >
                            <b>{f.applicationId}</b> &mdash; {f.clientName}
                          </div>
                        ))}
                        {filteredFarmers.length === 0 && (
                          <div style={{ padding: "0.6rem 0.8rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                            No matching farmers found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Service Engineer Name * (Party Master)</label>
                  <select 
                    value={partyName} 
                    onChange={(e) => setPartyName(e.target.value)} 
                    style={styles.input}
                    required
                  >
                    {engineers.map(eng => (
                      <option key={eng.id} value={eng.name}>{eng.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Stage 3 Fields */}
            {movementStage === 3 && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Service Engineer Name * (Party Master)</label>
                  <select 
                    value={partyName} 
                    onChange={(e) => setPartyName(e.target.value)} 
                    style={styles.input}
                    required
                  >
                    {engineers.map(eng => (
                      <option key={eng.id} value={eng.name}>{eng.name}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Farmer / Site details (App ID) * (Party Master)</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={isFarmerDropdownOpen ? farmerInputVal : (() => {
                        const selectedFarmer = farmers.find(f => f.applicationId === referenceNumber);
                        return selectedFarmer ? `${selectedFarmer.applicationId} (${selectedFarmer.clientName})` : "";
                      })()}
                      onChange={(e) => {
                        if (!isFarmerDropdownOpen) setIsFarmerDropdownOpen(true);
                        setFarmerInputVal(e.target.value);
                      }}
                      onFocus={() => {
                        setIsFarmerDropdownOpen(true);
                        setFarmerInputVal(""); // clear on focus to let them type
                      }}
                      onBlur={() => {
                        // Small timeout to allow onMouseDown on option to register first
                        setTimeout(() => {
                          if (isFarmerDropdownOpen) {
                            setReferenceNumber("");
                            setFarmerInputVal("");
                            setIsFarmerDropdownOpen(false);
                          }
                        }, 250);
                      }}
                      placeholder="Search and select farmer..."
                      style={{ ...styles.input, width: "100%" }}
                      required
                    />
                    {isFarmerDropdownOpen && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        maxHeight: "220px",
                        overflowY: "auto",
                        backgroundColor: "var(--bg-panel)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        zIndex: 1000,
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        marginTop: "4px"
                      }}>
                        {filteredFarmers.map(f => (
                          <div
                            key={f.applicationId}
                            onMouseDown={() => {
                              setReferenceNumber(f.applicationId);
                              setIsFarmerDropdownOpen(false);
                              setFarmerInputVal("");
                            }}
                            className="dropdown-item"
                            style={{
                              padding: "0.6rem 0.8rem",
                              cursor: "pointer",
                              borderBottom: "1px solid var(--border-color)",
                              fontSize: "0.85rem",
                              color: "var(--text-main)",
                              backgroundColor: referenceNumber === f.applicationId ? "var(--bg-secondary)" : "transparent"
                            }}
                          >
                            <b>{f.applicationId}</b> &mdash; {f.clientName}
                          </div>
                        ))}
                        {filteredFarmers.length === 0 && (
                          <div style={{ padding: "0.6rem 0.8rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                            No matching farmers found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Reported Fault</label>
                  <input 
                    value={reportedFault}
                    onChange={(e) => setReportedFault(e.target.value)}
                    placeholder="e.g. Burnt stator coil / no display"
                    style={styles.input}
                  />
                </div>
              </>
            )}

            {/* Stage 4 Fields */}
            {movementStage === 4 && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Batch / RMA Number * (Reference)</label>
                  <input 
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. RJ-BATCH-0042"
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Manufacturer Name * (Party Master)</label>
                  <select 
                    value={partyName} 
                    onChange={(e) => setPartyName(e.target.value)} 
                    style={styles.input}
                    required
                  >
                    {manufacturers.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Stage 5 Fields */}
            {movementStage === 5 && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Batch / GRC Reference * (Must match #4)</label>
                  <select 
                    value={referenceNumber} 
                    onChange={(e) => setReferenceNumber(e.target.value)} 
                    style={styles.input}
                    required
                  >
                    {pendingRMAs.length > 0 ? (
                      pendingRMAs.map(ref => (
                        <option key={ref} value={ref}>{ref}</option>
                      ))
                    ) : (
                      <option value="">No pending RMAs available</option>
                    )}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Manufacturer Name * (Party Master)</label>
                  <select 
                    value={partyName} 
                    onChange={(e) => setPartyName(e.target.value)} 
                    style={styles.input}
                    required
                  >
                    {manufacturers.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Condition Received *</label>
                  <select 
                    value={conditionReceived} 
                    onChange={(e) => setConditionReceived(e.target.value)} 
                    style={styles.input}
                    required
                  >
                    <option value="Repaired">Repaired</option>
                    <option value="Replaced — new serial">Replaced — new serial</option>
                    <option value="Scrapped, not returned">Scrapped, not returned</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Parts lines editor */}
          <div style={{ marginTop: "2rem" }}>
            <label style={{ ...styles.label, marginBottom: "0.75rem", display: "block" }}>Line Items (SKUs &amp; Serials)</label>
            
            <div style={styles.linesContainer}>
              <div style={{ ...styles.linesHeader, gridTemplateColumns: gridTemplate }}>
                <div>Part Code / SKU</div>
                <div>Quantity</div>
                <div>Serial Numbers (One Per Line)</div>
                {showOriginalSerials && <div>Original Faulty Serials</div>}
                <div></div>
              </div>

              {formLines.map((line, index) => {
                const enteredSerials = line.serialsText.split("\n").map(s => s.trim()).filter(s => s.length > 0);
                const isMatching = enteredSerials.length === Number(line.quantity);
                const selectedPart = parts.find(p => p.code === line.partCode);
                const isSerialized = selectedPart ? selectedPart.serialTracked : true;

                return (
                  <div key={index} style={{ ...styles.lineRow, gridTemplateColumns: gridTemplate }}>
                    <div>
                      <select
                        value={line.partCode}
                        onChange={(e) => handleLineChange(index, "partCode", e.target.value)}
                        style={styles.input}
                        required
                      >
                        {parts.map(p => (
                          <option key={p.id} value={p.code}>{p.code} &mdash; {p.description}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => handleLineChange(index, "quantity", e.target.value)}
                        style={styles.input}
                        required
                      />
                    </div>
                    <div>
                      {isSerialized ? (
                        <>
                          <textarea
                            value={line.serialsText}
                            onChange={(e) => handleLineChange(index, "serialsText", e.target.value)}
                            placeholder="Paste new/repaired serial numbers here..."
                            style={styles.textarea}
                            required
                          />
                          <div style={isMatching ? styles.qtyCheckOk : styles.qtyCheckBad}>
                            {enteredSerials.length} serials parsed &middot; {isMatching ? "matches quantity" : `quantity says ${line.quantity}`}
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic", border: "1px dashed var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)" }}>
                          Non-serialized part &mdash; no serials required
                        </div>
                      )}
                    </div>
                    {showOriginalSerials && (
                      <div>
                        {isSerialized ? (
                          <>
                            <textarea
                              value={line.replacedSerialsText}
                              onChange={(e) => handleLineChange(index, "replacedSerialsText", e.target.value)}
                              placeholder="Paste original faulty serials replaced (one per line)..."
                              style={styles.textarea}
                              required
                            />
                            <div style={line.replacedSerialsText.split("\n").map(s => s.trim()).filter(s => s.length > 0).length === Number(line.quantity) ? styles.qtyCheckOk : styles.qtyCheckBad}>
                              {line.replacedSerialsText.split("\n").map(s => s.trim()).filter(s => s.length > 0).length} serials mapped
                            </div>
                          </>
                        ) : (
                          <div style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic", border: "1px dashed var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)" }}>
                            Non-serialized
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button 
                        type="button" 
                        onClick={() => removeFormLine(index)}
                        style={styles.removeLineBtn}
                        disabled={formLines.length === 1}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              <button 
                type="button" 
                onClick={addFormLine}
                style={styles.addLineBtn}
              >
                <Plus size={14} /> Add another part line
              </button>
            </div>
          </div>

          {/* Submit bar */}
          <div style={styles.formActions}>
            <button 
              type="button" 
              onClick={() => { setActiveTab("dashboard"); setFeedbackMsg(null); }}
              className="custom-btn btn-secondary" 
              style={{ padding: "0.75rem 1.5rem" }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="custom-btn" 
              style={{ padding: "0.75rem 2rem" }}
              disabled={formSubmitting}
            >
              {formSubmitting ? "Saving entry..." : "Save Entry to Ledger"}
            </button>
          </div>
          </form>
        )
      )}

      {/* Tab: Movement Log */}
      {activeTab === "log" && (
        <div className="panel-card">
          <div className="panel-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 700 }}>Movement Ledger Registry</h2>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Full audit history for warehouse ledger
              </span>
            </div>
            <button
              onClick={handleExportLedgerToCSV}
              className="custom-btn"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
            >
              📥 Export to CSV
            </button>
          </div>

          {/* Filtering Controls */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", padding: "1rem 0", borderBottom: "1px solid var(--border-color)", marginBottom: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)" }}>Search Party / Ref ID / Part / Serial</label>
              <input
                type="text"
                placeholder="Search..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-card)", color: "var(--text-main)", fontSize: "0.85rem" }}
              />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)" }}>Filter by Cycle Stage</label>
              <select
                value={logStageFilter}
                onChange={(e) => setLogStageFilter(e.target.value)}
                style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-card)", color: "var(--text-main)", fontSize: "0.85rem" }}
              >
                <option value="ALL">All Stages</option>
                <option value="1">Stage 1 - Inward from MFR</option>
                <option value="2">Stage 2 - Outward to Farmer</option>
                <option value="3">Stage 3 - Faulty Inward from SE</option>
                <option value="4">Stage 4 - RMA Sent to MFR</option>
                <option value="5">Stage 5 - Repaired/Replaced Inward</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)" }}>Start Date</label>
              <input
                type="date"
                value={logStartDate}
                onChange={(e) => setLogStartDate(e.target.value)}
                style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-card)", color: "var(--text-main)", fontSize: "0.85rem" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)" }}>End Date</label>
              <input
                type="date"
                value={logEndDate}
                onChange={(e) => setLogEndDate(e.target.value)}
                style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-card)", color: "var(--text-main)", fontSize: "0.85rem" }}
              />
            </div>
          </div>

          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Stage Cycle</th>
                  <th>Associated Party</th>
                  <th>Reference ID</th>
                  <th>Items &amp; Serials Logged</th>
                  <th>Logged By</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((mov) => (
                  <tr key={mov.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {new Date(mov.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td>
                      <span className={`status-badge status-${
                        mov.type === 1 || mov.type === 5 ? "resolved" : mov.type === 2 ? "assigned" : mov.type === 3 ? "manual" : "reopened"
                      }`}>
                        Stage {mov.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: "600" }}>{mov.partyName}</td>
                    <td style={{ fontFamily: "monospace" }}>{mov.referenceNumber}</td>
                    <td>
                      <div style={styles.logItemsList}>
                        {mov.lines.map((l: any) => (
                          <div key={l.id} style={styles.logItemRow}>
                            <b style={{ color: "var(--text-main)" }}>{l.part?.code}</b> x{l.quantity}
                            <div style={styles.logSerialsText}>
                              Serials: {l.serialNumbers.map((s: any) => s.serialNumber).join(", ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>{mov.user?.fullName || "System"}</td>
                    <td style={{ textAlign: "center" }}>
                      <button 
                        onClick={() => handleDeleteMovement(mov.id)}
                        style={styles.deleteBtn}
                        title="Delete ledger entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                      No inventory movements match the selected filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Challans */}
      {activeTab === "challans" && (
        <div style={styles.challanLayout}>
          {/* Left panel: List */}
          <div style={styles.challanListPanel}>
            <h3 style={{ fontSize: "0.95rem", margin: "0 0 1rem", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
              Delivery Challans
            </h3>
            <div style={styles.challanListContainer}>
              {challans.map(ch => (
                <div 
                  key={ch.id} 
                  onClick={() => setSelectedChallan(ch)}
                  style={selectedChallan?.id === ch.id ? styles.challanItemActive : styles.challanItem}
                >
                  <div style={styles.challanItemNo}>{ch.challanNumber}</div>
                  <div style={styles.challanItemMeta}>{ch.destinationName}</div>
                  <div style={styles.challanItemDate}>{new Date(ch.challanDate).toLocaleDateString()}</div>
                </div>
              ))}
              {challans.length === 0 && (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  No challans generated yet. Create a Stage 4 (RMA) movement to generate one.
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Invoice Viewer */}
          {selectedChallan ? (
            <div style={styles.challanDocPanel}>
              <div style={styles.docActionsHeader}>
                <button 
                  onClick={() => window.print()}
                  className="custom-btn btn-secondary" 
                  style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
                >
                  🖨️ Print / Download PDF
                </button>
              </div>

              <div style={styles.docPaper}>
                <div style={styles.docHeader}>
                  <div>
                    <div style={styles.docBrandingTitle}>CLARO ENERGY LIMITED</div>
                    <div style={styles.docBrandingSubtitle}>
                      Shop No.15, Plot No.128, High Tension Line, Savitri Vihar,<br />
                      Muhana Mandi Road, Mansarover, Jaipur 302020<br />
                      GSTIN: 08AAECC3356Q1Z6
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={styles.docTypeTitle}>DELIVERY CHALLAN</div>
                    <div style={styles.docDetailsBox}>
                      <div>Challan No: <b style={{ fontFamily: "monospace" }}>{selectedChallan.challanNumber}</b></div>
                      <div>Date: {new Date(selectedChallan.challanDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>
                    </div>
                  </div>
                </div>

                <hr style={{ border: "0", borderTop: "2px solid #000", margin: "1rem 0" }} />

                <div style={styles.docMetaGrid}>
                  <div>
                    <div style={styles.docSectionTitle}>DELIVER TO:</div>
                    <div style={styles.docSectionText}>
                      <b>{selectedChallan.destinationName}</b><br />
                      {selectedChallan.destinationAddress.split("\n").map((line: string, i: number) => (
                        <span key={i}>{line}<br /></span>
                      ))}
                      {selectedChallan.destinationGst && <span>GSTIN: {selectedChallan.destinationGst}<br /></span>}
                      {selectedChallan.destinationContact && <span>Contact: {selectedChallan.destinationContact}</span>}
                    </div>
                  </div>
                  <div>
                    <div style={styles.docSectionTitle}>DISPATCH DETAILS:</div>
                    <div style={styles.docSectionText}>
                      Mode of Dispatch: <b>{selectedChallan.dispatchMode}</b><br />
                      Purpose: <b>{selectedChallan.purpose}</b><br />
                      Reference: <b>{selectedChallan.movement?.referenceNumber || "N/A"}</b><br />
                      Remarks: <b>{selectedChallan.remarks || "For repair & replacement"}</b>
                    </div>
                  </div>
                </div>

                {/* Doc Table */}
                <table style={styles.docTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "5%" }}>Sr.</th>
                      <th style={{ width: "20%" }}>Material Code</th>
                      <th style={{ width: "35%" }}>Description</th>
                      <th style={{ width: "10%", textAlign: "center" }}>Qty</th>
                      <th style={{ width: "30%" }}>Product Serial Numbers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedChallan.movement?.lines?.map((line: any, idx: number) => (
                      <tr key={line.id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontFamily: "monospace" }}>{line.part?.code}</td>
                        <td>{line.part?.description}</td>
                        <td style={{ textAlign: "center", fontFamily: "monospace" }}>{line.quantity}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.8rem", whiteSpace: "pre-wrap" }}>
                          {line.serialNumbers.map((s: any) => s.serialNumber).join("\n")}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: "700", backgroundColor: "#f9f9f9" }}>
                      <td colSpan={3}>Total Quantity</td>
                      <td style={{ textAlign: "center", fontFamily: "monospace" }}>
                        {selectedChallan.movement?.lines?.reduce((sum: number, l: any) => sum + l.quantity, 0) || 0}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>

                {/* Valuation details */}
                <div style={styles.docFooterValuation}>
                  <div>
                    <span style={styles.docNfsBadge}>NOT FOR SALE</span><br />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Declared value for transport insurance purposes only. No commercial value.
                    </span>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "0.9rem", lineHeight: "1.6" }}>
                    <div>Value of Goods: ₹ {Number(selectedChallan.totalAmount).toLocaleString()}</div>
                    <div>GST ({selectedChallan.gstRate}%): ₹ {(Number(selectedChallan.totalAmount) * Number(selectedChallan.gstRate) / 100).toLocaleString()}</div>
                    <div style={{ fontWeight: "800", fontSize: "1.05rem", color: "var(--primary)", borderTop: "1px solid var(--border-color)", paddingTop: "4px" }}>
                      Total Valuation: ₹ {(Number(selectedChallan.totalAmount) * (1 + Number(selectedChallan.gstRate) / 100)).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={styles.docSignatureSection}>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Prepared By:</span><br />
                    <b style={{ fontSize: "0.9rem" }}>{selectedChallan.preparedBy || "Milan — Maintenance Lead"}</b>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>For Claro Energy Limited:</span><br /><br />
                    <b style={{ fontSize: "0.9rem" }}>Authorised Signatory</b>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.noChallanSelect}>
              Select a Delivery Challan from the sidebar list to inspect the proforma.
            </div>
          )}
        </div>
      )}


      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: "260px",
    backgroundColor: "#FFFFFF",
    borderRight: "1px solid var(--border-color)",
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem",
    minHeight: "100vh",
    position: "sticky",
    top: 0
  },
  logoContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "2rem"
  },
  logoCard: {
    border: "2px solid #000000",
    borderRadius: "4px",
    width: "160px",
    overflow: "hidden",
    fontFamily: "var(--font-title)",
    backgroundColor: "#FFFFFF",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  logoTopHalf: {
    backgroundColor: "#FFFFFF",
    padding: "0.25rem 0",
    width: "100%",
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  logoClaroText: {
    color: "#DC2626",
    fontWeight: "900",
    fontSize: "1.3rem",
    letterSpacing: "0.05em",
    lineHeight: "1.1"
  },
  logoRegistered: {
    color: "#DC2626",
    fontSize: "0.75rem",
    alignSelf: "flex-start",
    marginTop: "2px",
    fontWeight: "bold"
  },
  logoBottomHalf: {
    backgroundColor: "#000000",
    color: "#FFFFFF",
    padding: "0.2rem 0",
    width: "100%",
    textAlign: "center",
    fontSize: "0.65rem",
    fontWeight: "800",
    letterSpacing: "0.4em",
    textIndent: "0.4em"
  },
  sidebarMenu: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  },
  sidebarItemActive: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem 1rem",
    backgroundColor: "#FEF2F2",
    borderLeft: "4px solid #DC2626",
    borderRadius: "8px",
    color: "#DC2626",
    fontFamily: "var(--font-title)",
    cursor: "default"
  },
  sidebarBadgeActive: {
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    color: "#DC2626",
    fontSize: "0.65rem",
    fontWeight: "700",
    padding: "2px 6px",
    borderRadius: "4px"
  },
  sidebarFooter: {
    borderTop: "1px solid var(--border-color)",
    paddingTop: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  },
  profileCard: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem"
  },
  avatarCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#DC2626",
    color: "#FFFFFF",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "700",
    fontSize: "1.1rem"
  },
  profileDetails: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  profileName: {
    fontWeight: "600",
    fontSize: "0.9rem",
    color: "var(--text-main)",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden"
  },
  profileRole: {
    fontSize: "0.75rem",
    color: "var(--text-muted)"
  },
  signOutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.65rem 1rem",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    color: "#EF4444",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "700",
    transition: "all 0.2s"
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "80vh",
    fontFamily: "var(--font-title)",
    fontSize: "1.2rem",
    color: "var(--text-muted)"
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem"
  },
  headerRight: {
    display: "flex",
    gap: "1rem",
    alignItems: "center"
  },
  whSelectorLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    fontWeight: "600"
  },
  whSelect: {
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-main)",
    fontWeight: "600",
    outline: "none"
  },
  tabsContainer: {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid var(--border-color)",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "0.5rem",
    alignItems: "center"
  },
  tabsLeft: {
    display: "flex",
    gap: "0.25rem"
  },
  tab: {
    padding: "0.75rem 1.25rem",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "var(--text-muted)",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.92rem",
    transition: "all 0.2s ease-in-out",
    display: "flex",
    alignItems: "center",
    gap: "0.35rem"
  },
  tabActive: {
    padding: "0.75rem 1.25rem",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "2px solid var(--primary)",
    color: "var(--primary)",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "0.92rem",
    display: "flex",
    alignItems: "center",
    gap: "0.35rem"
  },
  tabBadge: {
    backgroundColor: "var(--primary)",
    color: "#fff",
    fontSize: "0.7rem",
    fontWeight: "700",
    borderRadius: "10px",
    padding: "1px 6px",
    marginLeft: "4px"
  },
  liveClock: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  clockPill: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#16a34a",
    boxShadow: "0 0 6px #16a34a",
    display: "inline-block"
  },
  successAlert: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    backgroundColor: "rgba(22, 163, 74, 0.08)",
    border: "1px solid rgba(22, 163, 74, 0.2)",
    color: "#16a34a",
    padding: "0.85rem 1.25rem",
    borderRadius: "8px",
    fontSize: "0.92rem",
    fontWeight: "500",
    marginBottom: "1.5rem"
  },
  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    backgroundColor: "rgba(229, 35, 32, 0.08)",
    border: "1px solid rgba(229, 35, 32, 0.2)",
    color: "var(--primary)",
    padding: "0.85rem 1.25rem",
    borderRadius: "8px",
    fontSize: "0.92rem",
    fontWeight: "500",
    marginBottom: "1.5rem"
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "1.25rem",
    marginBottom: "1.5rem"
  },
  metricCard: {
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  },
  metricAlert: {
    borderColor: "#fdba74",
    backgroundColor: "#fff7ed"
  },
  metricLabel: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: "700"
  },
  metricLabelAlert: {
    fontSize: "0.78rem",
    color: "#c2410c",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: "700"
  },
  metricValue: {
    fontSize: "2rem",
    fontWeight: "800",
    color: "var(--text-main)",
    fontFamily: "monospace"
  },
  metricValueAlert: {
    fontSize: "2rem",
    fontWeight: "800",
    color: "#ea580c",
    fontFamily: "monospace"
  },
  filterBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "1rem"
  },
  filterTabs: {
    display: "flex",
    gap: "0.5rem",
    backgroundColor: "var(--bg-secondary)",
    padding: "0.25rem",
    borderRadius: "8px",
    border: "1px solid var(--border-color)"
  },
  filterTab: {
    padding: "0.4rem 0.85rem",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    color: "var(--text-muted)",
    fontWeight: "600",
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.15s ease"
  },
  filterTabActive: {
    padding: "0.4rem 0.85rem",
    backgroundColor: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    border: "none",
    borderRadius: "6px",
    color: "var(--primary)",
    fontWeight: "700",
    fontSize: "0.85rem",
    cursor: "pointer"
  },
  requestsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "1rem"
  },
  reqCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.75rem"
  },
  reqId: {
    fontFamily: "monospace",
    fontWeight: "700",
    color: "var(--text-muted)",
    fontSize: "0.85rem"
  },
  reqBadgeNew: {
    backgroundColor: "#fee2e2",
    color: "var(--primary)",
    fontSize: "0.65rem",
    fontWeight: "800",
    padding: "2px 6px",
    borderRadius: "4px",
    marginLeft: "0.5rem",
    letterSpacing: "0.03em"
  },
  reqCardTitle: {
    marginBottom: "1rem"
  },
  reqMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1rem",
    backgroundColor: "var(--bg-secondary)",
    padding: "1rem",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    marginBottom: "1rem"
  },
  reqMetaLabel: {
    display: "block",
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: "4px"
  },
  reqMetaValue: {
    display: "block",
    fontSize: "0.88rem",
    fontWeight: "600",
    color: "var(--text-main)"
  },
  reqCardActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    alignItems: "center"
  },
  reqActionSelect: {
    padding: "0.45rem 0.85rem",
    borderRadius: "6px",
    border: "1px solid var(--border-color)",
    fontSize: "0.85rem",
    outline: "none",
    fontWeight: "500",
    backgroundColor: "var(--bg-secondary)"
  },
  reqActionBtn: {
    padding: "0.45rem 1rem",
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    gap: "0.35rem"
  },
  noDataBox: {
    textAlign: "center",
    padding: "4rem 2rem",
    color: "var(--text-muted)",
    backgroundColor: "var(--bg-secondary)",
    border: "1px dashed var(--border-color)",
    borderRadius: "10px",
    fontWeight: "500"
  },
  cycleRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "2rem",
    flexWrap: "wrap"
  },
  cycleStep: {
    flex: 1,
    minWidth: "160px",
    padding: "0.75rem 1rem",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    fontSize: "0.82rem",
    cursor: "pointer",
    color: "var(--text-muted)",
    backgroundColor: "var(--bg-secondary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s"
  },
  cycleStepSel: {
    flex: 1,
    minWidth: "160px",
    padding: "0.75rem 1rem",
    border: "1px solid var(--primary)",
    borderRadius: "8px",
    fontSize: "0.82rem",
    cursor: "pointer",
    color: "#fff",
    backgroundColor: "var(--primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 12px rgba(229,35,32,0.15)",
    fontWeight: "600"
  },
  cycleNum: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: "var(--border-color)",
    color: "var(--text-muted)",
    fontSize: "0.72rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800"
  },
  cycleNumSel: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: "#fff",
    color: "var(--primary)",
    fontSize: "0.72rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800"
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.25rem",
    marginBottom: "1.5rem"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    fontSize: "0.78rem",
    fontWeight: "700",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.03em"
  },
  input: {
    padding: "0.6rem 0.85rem",
    borderRadius: "6px",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-main)",
    outline: "none",
    fontSize: "0.92rem",
    fontFamily: "inherit"
  },
  textarea: {
    padding: "0.6rem 0.85rem",
    borderRadius: "6px",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-main)",
    outline: "none",
    fontSize: "0.9rem",
    fontFamily: "monospace",
    resize: "vertical",
    minHeight: "75px",
    width: "100%"
  },
  linesContainer: {
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    overflow: "hidden"
  },
  linesHeader: {
    display: "grid",
    gridTemplateColumns: "1.5fr 0.5fr 2fr 2fr 0.4fr",
    backgroundColor: "var(--bg-secondary)",
    padding: "0.65rem 1rem",
    borderBottom: "1px solid var(--border-color)",
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.03em"
  },
  lineRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 0.5fr 2fr 2fr 0.4fr",
    padding: "1rem",
    borderBottom: "1px solid var(--border-color)",
    alignItems: "start",
    gap: "1rem"
  },
  qtyCheckOk: {
    fontSize: "0.72rem",
    color: "#16a34a",
    fontWeight: "600",
    marginTop: "4px"
  },
  qtyCheckBad: {
    fontSize: "0.72rem",
    color: "var(--primary)",
    fontWeight: "600",
    marginTop: "4px"
  },
  addLineBtn: {
    width: "100%",
    backgroundColor: "transparent",
    border: "none",
    padding: "0.85rem",
    color: "var(--text-muted)",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.35rem",
    borderTop: "1px dashed var(--border-color)",
    transition: "color 0.2s"
  },
  removeLineBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: "1.1rem",
    padding: "0.5rem",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s"
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "1rem",
    marginTop: "2rem"
  },
  logItemsList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  },
  logItemRow: {
    borderBottom: "1px dashed var(--border-color)",
    paddingBottom: "4px",
    fontSize: "0.88rem"
  },
  logSerialsText: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    fontFamily: "monospace",
    marginTop: "2px"
  },
  deleteBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "0.4rem",
    borderRadius: "4px",
    transition: "color 0.2s"
  },
  challanLayout: {
    display: "flex",
    gap: "1.5rem",
    alignItems: "flex-start",
    minHeight: "70vh"
  },
  challanListPanel: {
    width: "280px",
    flexShrink: 0,
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    padding: "1.25rem"
  },
  challanListContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    maxHeight: "60vh",
    overflowY: "auto"
  },
  challanItem: {
    padding: "0.85rem 1rem",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    backgroundColor: "#fff",
    cursor: "pointer",
    transition: "all 0.15s ease"
  },
  challanItemActive: {
    padding: "0.85rem 1rem",
    border: "1px solid var(--primary)",
    borderRadius: "6px",
    backgroundColor: "rgba(229, 35, 32, 0.04)",
    cursor: "pointer"
  },
  challanItemNo: {
    fontFamily: "monospace",
    fontWeight: "700",
    color: "var(--text-main)",
    fontSize: "0.9rem"
  },
  challanItemMeta: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    marginTop: "4px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  challanItemDate: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    marginTop: "4px",
    textAlign: "right"
  },
  challanDocPanel: {
    flex: 1,
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    padding: "1rem"
  },
  docActionsHeader: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "1rem"
  },
  docPaper: {
    backgroundColor: "#fff",
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
    padding: "2.5rem 3rem",
    borderRadius: "6px",
    color: "#000",
    fontFamily: "sans-serif"
  },
  docPaperPrint: {
    // Styling helper for printable documents
  },
  docHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  docBrandingTitle: {
    fontFamily: "var(--font-title)",
    fontSize: "1.3rem",
    fontWeight: "800",
    letterSpacing: "-0.01em"
  },
  docBrandingSubtitle: {
    fontSize: "0.75rem",
    color: "#555",
    marginTop: "4px",
    lineHeight: "1.4"
  },
  docTypeTitle: {
    fontSize: "1.1rem",
    fontWeight: "800",
    letterSpacing: "0.05em",
    textAlign: "right"
  },
  docDetailsBox: {
    fontSize: "0.8rem",
    textAlign: "right",
    marginTop: "6px",
    lineHeight: "1.4"
  },
  docMetaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "2rem",
    fontSize: "0.82rem",
    marginBottom: "1.5rem",
    lineHeight: "1.5"
  },
  docSectionTitle: {
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "#555",
    letterSpacing: "0.04em",
    marginBottom: "4px"
  },
  docSectionText: {
    color: "#222"
  },
  docTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.8rem",
    marginTop: "1rem",
    marginBottom: "1.5rem"
  },
  docFooterValuation: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    fontSize: "0.8rem",
    borderTop: "1px solid #ddd",
    paddingTop: "1rem",
    marginTop: "1.5rem"
  },
  docNfsBadge: {
    backgroundColor: "#fee2e2",
    color: "var(--primary)",
    fontWeight: "800",
    fontSize: "0.68rem",
    padding: "2px 6px",
    borderRadius: "3px",
    letterSpacing: "0.05em",
    display: "inline-block",
    marginBottom: "4px"
  },
  docSignatureSection: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "3rem",
    paddingTop: "1rem",
    borderTop: "1px dashed #ddd"
  },
  noChallanSelect: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px dashed var(--border-color)",
    backgroundColor: "var(--bg-secondary)",
    borderRadius: "8px",
    height: "50vh",
    color: "var(--text-muted)",
    fontWeight: "500"
  },
  wipeBtn: {
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    border: "1px solid rgba(229,35,32,0.3)",
    backgroundColor: "rgba(229,35,32,0.06)",
    color: "var(--primary)",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "0.85rem",
    outline: "none",
    transition: "all 0.2s ease",
    marginRight: "0.5rem"
  },
  syncBtn: {
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-main)",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.8rem",
    outline: "none",
    transition: "all 0.2s ease"
  },
  syncBtnDisabled: {
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-muted)",
    fontWeight: "600",
    cursor: "not-allowed",
    fontSize: "0.8rem",
    outline: "none",
    opacity: 0.7
  },
  loadingOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid rgba(0, 0, 0, 0.08)",
    borderLeftColor: "var(--primary)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite"
  }
};
