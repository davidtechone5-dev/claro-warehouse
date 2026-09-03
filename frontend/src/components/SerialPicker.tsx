import React, { useState, useEffect, useRef, useMemo } from "react";
import { api } from "../utils/api";
import { Check, X, Search, Zap, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, FileText, Sparkles } from "lucide-react";

export interface SerialPickerProps {
  partCode: string;
  partDescription?: string;
  warehouseId: string;
  movementStage: number; // 1: MFR Inward, 2: Farmer Outward, 3: SE Faulty Inward, 4: MFR RMA Outward, 5: MFR Repaired Inward
  conditionReceived?: string; // For Stage 5
  isOriginalReplaced?: boolean; // For Stage 5 replaced original faulty serials
  value: string; // Newline-delimited serials
  onChange: (val: string) => void;
  targetQuantity: number;
  onQuantityChange?: (qty: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Global in-memory cache to avoid duplicate network calls when switching or rendering lines
const serialsCache: Record<string, { timestamp: number; data: any[] }> = {};
const CACHE_TTL_MS = 15000; // 15 seconds cache

export function invalidateSerialsCache() {
  for (const key of Object.keys(serialsCache)) {
    delete serialsCache[key];
  }
}

export const SerialPicker: React.FC<SerialPickerProps> = ({
  partCode,
  warehouseId,
  movementStage,
  conditionReceived,
  isOriginalReplaced = false,
  value = "",
  onChange,
  targetQuantity = 1,
  onQuantityChange,
  placeholder,
  disabled = false
}) => {
  const [availableSerials, setAvailableSerials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isRawMode, setIsRawMode] = useState(false);
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse current serials into a clean array
  const selectedSerials = useMemo(() => {
    return value
      .split("\n")
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }, [value]);

  const selectedSet = useMemo(() => new Set(selectedSerials), [selectedSerials]);

  // Fetch available serial numbers when partCode, warehouseId, or movementStage changes
  useEffect(() => {
    if (!partCode) {
      setAvailableSerials([]);
      return;
    }

    let isMounted = true;
    const cacheKey = `${partCode}_${warehouseId || "all"}`;
    const cached = serialsCache[cacheKey];

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setAvailableSerials(cached.data);
    } else {
      setLoading(true);
      api
        .getPartSerials(partCode, warehouseId)
        .then((data: any[]) => {
          if (isMounted) {
            serialsCache[cacheKey] = { timestamp: Date.now(), data: data || [] };
            setAvailableSerials(data || []);
          }
        })
        .catch((err) => {
          console.error("Error fetching serials for part:", partCode, err);
          if (isMounted) setAvailableSerials([]);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [partCode, warehouseId]);

  // Filter available serial numbers based on movement stage logic
  const stageFilteredSerials = useMemo(() => {
    if (!availableSerials || availableSerials.length === 0) return [];

    if (isOriginalReplaced) {
      // Stage 5 Replacement: Original faulty serials are those pending at manufacturer
      return availableSerials.filter(s => s.status === "At-Manufacturer");
    }

    switch (movementStage) {
      case 2:
        // Outward to Farmer: working stock (Fresh status: New or Repaired)
        return availableSerials.filter(s => s.status === "Fresh");
      case 4:
        // Outward to Manufacturer / Crompton: defective stock waiting for RMA
        return availableSerials.filter(s => s.status === "Faulty-Received");
      case 5:
        // Inward Repaired from Manufacturer: serials currently at manufacturer
        if (conditionReceived === "Replaced — new serial") {
          return [];
        }
        return availableSerials.filter(s => s.status === "At-Manufacturer");
      case 3:
        // Inward Faulty from SE: suggest serials currently in field with farmers
        return availableSerials.filter(s => s.status === "Sent-to Farmer");
      case 1:
      default:
        // Stage 1: Brand new inward from manufacturer
        return [];
    }
  }, [availableSerials, movementStage, conditionReceived, isOriginalReplaced]);

  // Breakdown metrics for Stage 2 / Stage 4
  const stockSummary = useMemo(() => {
    if (movementStage === 2) {
      const freshNew = stageFilteredSerials.filter(s => (s.condition || "New").toLowerCase() !== "repaired").length;
      const repaired = stageFilteredSerials.filter(s => (s.condition || "").toLowerCase() === "repaired").length;
      return { total: stageFilteredSerials.length, freshNew, repaired, label: "Fresh & Repaired" };
    } else if (movementStage === 4) {
      return { total: stageFilteredSerials.length, label: "Faulty in Stock" };
    } else if (movementStage === 5 || isOriginalReplaced) {
      return { total: stageFilteredSerials.length, label: "Pending at MFR" };
    } else if (movementStage === 3) {
      return { total: stageFilteredSerials.length, label: "Active with Farmers" };
    }
    return { total: 0, label: "" };
  }, [stageFilteredSerials, movementStage, isOriginalReplaced]);

  // Search filtered items
  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return stageFilteredSerials;
    }
    return stageFilteredSerials.filter(s => s.serialNo.toLowerCase().includes(q));
  }, [stageFilteredSerials, searchTerm]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update serials helper
  const updateSerialsList = (newList: string[]) => {
    const uniqueList = Array.from(new Set(newList.map(s => s.trim().toUpperCase()).filter(Boolean)));
    onChange(uniqueList.join("\n"));
  };

  const addSerial = (serialInput: string) => {
    if (!serialInput) return;
    const items = serialInput
      .split(/[\r\n,\t\s]+/)
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    if (items.length === 0) return;

    const newSerials = [...selectedSerials];
    for (const item of items) {
      if (!newSerials.includes(item)) {
        newSerials.push(item);
      }
    }
    updateSerialsList(newSerials);
    setSearchTerm("");
  };

  const removeSerial = (serial: string) => {
    updateSerialsList(selectedSerials.filter(s => s !== serial));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    if (pasted) {
      addSerial(pasted);
    }
  };

  const handleBlur = () => {
    if (searchTerm.trim()) {
      addSerial(searchTerm.trim());
    }
  };

  const handleAutoFill = () => {
    const unselectedAvailable = stageFilteredSerials
      .map(s => s.serialNo)
      .filter(sn => !selectedSet.has(sn));

    const needed = Math.max(0, targetQuantity - selectedSerials.length);
    const toAdd = unselectedAvailable.slice(0, needed > 0 ? needed : targetQuantity);

    if (toAdd.length > 0) {
      if (needed > 0) {
        updateSerialsList([...selectedSerials, ...toAdd]);
      } else {
        updateSerialsList(toAdd);
      }
    }
  };

  // Keyboard navigation inside input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsDropdownOpen(true);
      setHighlightedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsDropdownOpen(true);
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (e.key !== "Tab" || searchTerm.trim()) {
        if (e.key === "Enter" || e.key === ",") e.preventDefault();
        if (isDropdownOpen && searchResults.length > 0 && highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
          addSerial(searchResults[highlightedIndex].serialNo);
        } else if (searchTerm.trim()) {
          addSerial(searchTerm);
        }
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    } else if (e.key === "Backspace" && !searchTerm && selectedSerials.length > 0) {
      removeSerial(selectedSerials[selectedSerials.length - 1]);
    }
  };

  // Condition Badge Helper
  const getBadgeForSerial = (serialNo: string) => {
    const found = availableSerials.find(s => s.serialNo === serialNo);
    if (!found) {
      return null;
    }
    if (found.status === "Fresh") {
      const isRepaired = (found.condition || "").toLowerCase() === "repaired";
      return isRepaired ? (
        <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", backgroundColor: "#EFF6FF", color: "#1D4ED8", fontWeight: 600, border: "1px solid #BFDBFE" }}>
          🔵 Repaired
        </span>
      ) : (
        <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", backgroundColor: "#ECFDF5", color: "#047857", fontWeight: 600, border: "1px solid #A7F3D0" }}>
          🟢 Fresh (New)
        </span>
      );
    }
    if (found.status === "Faulty-Received") {
      return (
        <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", backgroundColor: "#FEF2F2", color: "#B91C1C", fontWeight: 600, border: "1px solid #FECACA" }}>
          🔴 Faulty
        </span>
      );
    }
    if (found.status === "At-Manufacturer") {
      return (
        <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", backgroundColor: "#FFFBEB", color: "#B45309", fontWeight: 600, border: "1px solid #FDE68A" }}>
          🟠 At MFR
        </span>
      );
    }
    if (found.status === "Sent-to Farmer") {
      return (
        <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", backgroundColor: "#F5F3FF", color: "#6D28D9", fontWeight: 600, border: "1px solid #DDD6FE" }}>
          🌾 With Farmer
        </span>
      );
    }
    return null;
  };

  const isCountMatching = selectedSerials.length === Number(targetQuantity);

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "0.4rem", width: "100%", position: "relative" }}>
      {/* Top Header: Stock Information & Action Helpers */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem", fontSize: "0.75rem" }}>
        {/* Availability Badge */}
        {stageFilteredSerials.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-muted)" }}>
            <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
              {stageFilteredSerials.length} Available in Stock:
            </span>
            {movementStage === 2 && (
              <div style={{ display: "flex", gap: "0.25rem" }}>
                {stockSummary.freshNew! > 0 && (
                  <span style={{ backgroundColor: "#ECFDF5", color: "#065F46", padding: "1px 5px", borderRadius: "3px", fontWeight: 600, fontSize: "0.7rem", border: "1px solid #A7F3D0" }}>
                    🟢 {stockSummary.freshNew} Fresh
                  </span>
                )}
                {stockSummary.repaired! > 0 && (
                  <span style={{ backgroundColor: "#EFF6FF", color: "#1E40AF", padding: "1px 5px", borderRadius: "3px", fontWeight: 600, fontSize: "0.7rem", border: "1px solid #BFDBFE" }}>
                    🔵 {stockSummary.repaired} Repaired
                  </span>
                )}
              </div>
            )}
            {movementStage === 4 && (
              <span style={{ backgroundColor: "#FEF2F2", color: "#991B1B", padding: "1px 5px", borderRadius: "3px", fontWeight: 600, fontSize: "0.7rem", border: "1px solid #FECACA" }}>
                🔴 {stockSummary.total} Faulty
              </span>
            )}
            {(movementStage === 5 || isOriginalReplaced) && (
              <span style={{ backgroundColor: "#FFFBEB", color: "#92400E", padding: "1px 5px", borderRadius: "3px", fontWeight: 600, fontSize: "0.7rem", border: "1px solid #FDE68A" }}>
                🟠 {stockSummary.total} Pending RMA
              </span>
            )}
          </div>
        ) : movementStage !== 1 && !loading ? (
          <div style={{ color: "#DC2626", fontSize: "0.72rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "3px" }}>
            <AlertCircle size={12} />
            {movementStage === 2 ? "No fresh/repaired serials in stock for this part." : movementStage === 4 ? "No faulty serials found in stock." : ""}
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
            {movementStage === 1 ? "Enter new received serial numbers" : "Loading stock..."}
          </div>
        )}

        {/* Action Buttons: Auto-fill & Raw Text Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "auto" }}>
          {stageFilteredSerials.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={disabled}
                title={`Auto-select ${targetQuantity} serials in FIFO order`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.2rem",
                  padding: "2px 7px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  backgroundColor: "#F3F4F6",
                  color: "#1F2937",
                  border: "1px solid #D1D5DB",
                  borderRadius: "4px",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                <Zap size={11} color="#D97706" />
                Auto-fill ({Math.min(targetQuantity, stageFilteredSerials.length)})
              </button>

              <button
                type="button"
                onClick={() => setIsBrowseOpen(!isBrowseOpen)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.2rem",
                  padding: "2px 7px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  backgroundColor: isBrowseOpen ? "#E0E7FF" : "#F3F4F6",
                  color: isBrowseOpen ? "#3730A3" : "#4B5563",
                  border: "1px solid #D1D5DB",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Browse All ({stageFilteredSerials.length}) {isBrowseOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsRawMode(!isRawMode)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.2rem",
              padding: "2px 6px",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline"
            }}
          >
            <FileText size={10} />
            {isRawMode ? "Chip Mode" : "Raw Paste"}
          </button>
        </div>
      </div>

      {/* Quick Browse Strip (Collapsible) */}
      {isBrowseOpen && stageFilteredSerials.length > 0 && (
        <div
          style={{
            maxHeight: "95px",
            overflowY: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.3rem",
            padding: "0.45rem",
            backgroundColor: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: "6px",
            marginBottom: "0.2rem"
          }}
        >
          {stageFilteredSerials.map((s) => {
            const isSelected = selectedSet.has(s.serialNo);
            const isRepaired = (s.condition || "").toLowerCase() === "repaired";
            return (
              <button
                key={s.serialNo}
                type="button"
                onClick={() => (isSelected ? removeSerial(s.serialNo) : addSerial(s.serialNo))}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "2px 6px",
                  fontSize: "0.72rem",
                  fontFamily: "monospace",
                  fontWeight: 600,
                  borderRadius: "4px",
                  cursor: "pointer",
                  border: isSelected ? "1px solid #2563EB" : "1px solid #D1D5DB",
                  backgroundColor: isSelected ? "#EFF6FF" : "#FFFFFF",
                  color: isSelected ? "#1E40AF" : "#374151"
                }}
              >
                {isSelected && <Check size={10} color="#2563EB" />}
                {s.serialNo}
                {movementStage === 2 && (
                  <span style={{ fontSize: "0.65rem", color: isRepaired ? "#2563EB" : "#059669" }}>
                    {isRepaired ? "(Repaired)" : "(Fresh)"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Input Area: Raw Textarea OR Interactive Chip Typeahead */}
      {isRawMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Paste or type serial numbers (one per line)..."}
          style={{
            width: "100%",
            minHeight: "75px",
            padding: "0.6rem 0.85rem",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-input)",
            color: "var(--text-main)",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            lineHeight: "1.4",
            outline: "none"
          }}
          disabled={disabled}
        />
      ) : (
        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            minHeight: "65px",
            padding: "0.4rem 0.5rem",
            backgroundColor: disabled ? "var(--bg-secondary)" : "var(--bg-input)",
            border: isDropdownOpen ? "1px solid var(--primary)" : "1px solid var(--border-color)",
            borderRadius: "6px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.35rem",
            cursor: "text",
            boxShadow: isDropdownOpen ? "0 0 0 2px rgba(220, 38, 38, 0.1)" : "none",
            transition: "border-color 0.15s, box-shadow 0.15s"
          }}
        >
          {/* Selected Chips */}
          {selectedSerials.map((sn) => (
            <div
              key={sn}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "2px 6px",
                backgroundColor: "#F3F4F6",
                border: "1px solid #D1D5DB",
                borderRadius: "4px",
                fontSize: "0.78rem",
                fontFamily: "monospace",
                color: "var(--text-main)"
              }}
            >
              <span>{sn}</span>
              {getBadgeForSerial(sn)}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSerial(sn);
                }}
                disabled={disabled}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 1px"
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {/* Typeahead Search Input */}
          <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: "140px" }}>
            <Search size={13} color="var(--text-muted)" style={{ marginRight: "4px", flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                const val = e.target.value;
                if (val.includes(",") || val.includes(" ") || val.includes("\n") || val.includes("\t")) {
                  addSerial(val);
                } else {
                  setSearchTerm(val);
                  setIsDropdownOpen(true);
                  setHighlightedIndex(0);
                }
              }}
              onPaste={handlePaste}
              onBlur={handleBlur}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedSerials.length === 0
                  ? stageFilteredSerials.length > 0
                    ? `Type to search ${stageFilteredSerials.length} in stock or enter serial...`
                    : placeholder || "Type or paste serial number..."
                  : "Add more serials..."
              }
              disabled={disabled}
              style={{
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                color: "var(--text-main)",
                fontSize: "0.82rem",
                width: "100%",
                padding: "2px 0"
              }}
            />
          </div>
        </div>
      )}

      {/* Autocomplete Dropdown List */}
      {!isRawMode && isDropdownOpen && (stageFilteredSerials.length > 0 || searchTerm.trim().length > 0) && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            marginTop: "4px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #D1D5DB",
            borderRadius: "6px",
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.12)",
            maxHeight: "190px",
            overflowY: "auto"
          }}
        >
          {searchResults.length > 0 ? (
            searchResults.map((item, idx) => {
              const isSelected = selectedSet.has(item.serialNo);
              const isHighlighted = idx === highlightedIndex;
              const isRepaired = (item.condition || "").toLowerCase() === "repaired";

              // Highlight matched query substring
              const query = searchTerm.trim().toLowerCase();
              const serialStr = item.serialNo;
              const matchIdx = serialStr.toLowerCase().indexOf(query);

              let displayParts = <span>{serialStr}</span>;
              if (query && matchIdx >= 0) {
                const before = serialStr.slice(0, matchIdx);
                const matched = serialStr.slice(matchIdx, matchIdx + query.length);
                const after = serialStr.slice(matchIdx + query.length);
                displayParts = (
                  <span>
                    {before}
                    <strong style={{ backgroundColor: "#FEF08A", color: "#854D0E", borderRadius: "2px" }}>{matched}</strong>
                    {after}
                  </span>
                );
              }

              return (
                <div
                  key={item.serialNo}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (isSelected) {
                      removeSerial(item.serialNo);
                    } else {
                      addSerial(item.serialNo);
                    }
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0.75rem",
                    borderBottom: "1px solid #F3F4F6",
                    cursor: "pointer",
                    backgroundColor: isHighlighted ? "#F3F4F6" : isSelected ? "#F9FAFB" : "#FFFFFF",
                    fontSize: "0.82rem",
                    fontFamily: "monospace"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "3px",
                        border: isSelected ? "1px solid #2563EB" : "1px solid #D1D5DB",
                        backgroundColor: isSelected ? "#2563EB" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {isSelected && <Check size={10} color="#FFFFFF" />}
                    </div>
                    <span>{displayParts}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {movementStage === 2 && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontWeight: 600,
                          backgroundColor: isRepaired ? "#EFF6FF" : "#ECFDF5",
                          color: isRepaired ? "#1D4ED8" : "#047857",
                          border: isRepaired ? "1px solid #BFDBFE" : "1px solid #A7F3D0"
                        }}
                      >
                        {isRepaired ? "🔵 Repaired" : "🟢 Fresh (New)"}
                      </span>
                    )}
                    {movementStage === 4 && (
                      <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", fontWeight: 600, backgroundColor: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA" }}>
                        🔴 Faulty
                      </span>
                    )}
                    {(movementStage === 5 || isOriginalReplaced) && (
                      <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", fontWeight: 600, backgroundColor: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A" }}>
                        🟠 At MFR
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : searchTerm.trim() ? (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                addSerial(searchTerm);
              }}
              style={{
                padding: "0.6rem 0.75rem",
                cursor: "pointer",
                backgroundColor: "#EFF6FF",
                color: "#1E40AF",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <Sparkles size={14} color="#2563EB" />
              <span>
                Add custom serial: <strong style={{ fontFamily: "monospace" }}>"{searchTerm.trim()}"</strong> (Press Enter)
              </span>
            </div>
          ) : (
            <div style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center" }}>
              No matching stock serial numbers found
            </div>
          )}
        </div>
      )}

      {/* Bottom Status & Count Helper */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", marginTop: "1px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {isCountMatching ? (
            <span style={{ color: "#16A34A", fontWeight: 600, display: "flex", alignItems: "center", gap: "2px" }}>
              <CheckCircle2 size={12} />
              {selectedSerials.length} serials selected &middot; matches quantity ({targetQuantity})
            </span>
          ) : (
            <span style={{ color: "#DC2626", fontWeight: 600, display: "flex", alignItems: "center", gap: "2px" }}>
              <AlertCircle size={12} />
              {selectedSerials.length} serials selected &middot; line quantity says {targetQuantity}
            </span>
          )}
        </div>

        {onQuantityChange && selectedSerials.length > 0 && selectedSerials.length !== Number(targetQuantity) && (
          <button
            type="button"
            onClick={() => onQuantityChange(selectedSerials.length)}
            style={{
              background: "none",
              border: "none",
              color: "#2563EB",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.7rem",
              textDecoration: "underline"
            }}
          >
            Set quantity to {selectedSerials.length}
          </button>
        )}
      </div>
    </div>
  );
};
export default SerialPicker;
