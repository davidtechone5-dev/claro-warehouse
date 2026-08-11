import axios from "axios";

const metaEnv = (import.meta as any).env || {};
const API_BASE = metaEnv.VITE_API_URL 
  ? `${metaEnv.VITE_API_URL}/wms` 
  : "http://localhost:5000/api/v1/wms";

const client = axios.create({
  baseURL: API_BASE,
});

// Axios interceptor to automatically inject the selected warehouse context header
client.interceptors.request.use((config) => {
  const selectedWhId = localStorage.getItem("claro_selected_warehouse") || "";
  if (selectedWhId) {
    config.headers["x-warehouse-id"] = selectedWhId;
  }
  return config;
});

export const api = {
  async getWmsWarehouses() {
    const res = await client.get("/warehouses");
    return res.data;
  },

  async getWmsParts() {
    const res = await client.get("/parts");
    return res.data;
  },

  async getWmsManufacturers() {
    const res = await client.get("/manufacturers");
    return res.data;
  },

  async getWmsFarmers() {
    const res = await client.get("/farmers");
    return res.data;
  },

  async getWmsEngineers() {
    const res = await client.get("/engineers");
    return res.data;
  },

  async getWmsPendingRMAs(warehouseId: string) {
    const res = await client.get("/pending-rmas", { params: { warehouseId } });
    return res.data;
  },

  async getWmsChallans(warehouseId?: string) {
    const res = await client.get("/challans", { params: { warehouseId } });
    return res.data;
  },

  async getWmsStock(warehouseId: string) {
    const res = await client.get("/stock", { params: { warehouseId } });
    return res.data;
  },

  async getWmsMovements(warehouseId: string) {
    const res = await client.get("/movements", { params: { warehouseId } });
    return res.data;
  },

  async logWmsMovement(data: any) {
    const res = await client.post("/movements", data);
    return res.data;
  },

  async deleteWmsMovement(id: string) {
    const res = await client.delete(`/movements/${id}`);
    return res.data;
  },

  async clearWmsAll() {
    const res = await client.post("/clear-all");
    return res.data;
  },

  async syncWmsRequests() {
    const res = await client.post("/sync-requests");
    return res.data;
  },

  async getMaterialRequests(warehouseId?: string) {
    const res = await client.get("/material-requests", { params: { warehouseId } });
    return res.data;
  },

  async updateMaterialStatus(id: string, status: string) {
    const res = await client.patch(`/material-requests/${id}`, { status });
    return res.data;
  },

  async getPartSerials(code: string) {
    const res = await client.get(`/parts/${code}/serials`);
    return res.data;
  },

  async adjustWmsStock(data: {
    partCode: string;
    serialNo?: string;
    actionType: string;
    field: string;
    quantity: number;
    reason: string;
  }) {
    const res = await client.post("/stock/adjust", data);
    return res.data;
  },

  async getWmsAdjustments() {
    const res = await client.get("/stock/adjustments");
    return res.data;
  }
};
export default api;
