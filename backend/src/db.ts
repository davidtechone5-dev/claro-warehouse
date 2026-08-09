import { PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "async_hooks";

// Context to store the active warehouse schema (e.g. "jalna", "rajasthan", "haryana", "mp")
export const warehouseContext = new AsyncLocalStorage<string>();

const clients: Record<string, PrismaClient> = {};

function getClient(): PrismaClient {
  // Fallback to "jalna" if context is not set
  const schema = warehouseContext.getStore() || "jalna";
  const normalizedSchema = schema.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (!clients[normalizedSchema]) {
    const baseUrl = process.env.DATABASE_URL || "";
    let connectionUrl = baseUrl;
    try {
      if (baseUrl.includes("?")) {
        const urlObj = new URL(baseUrl);
        urlObj.searchParams.set("schema", normalizedSchema);
        connectionUrl = urlObj.toString();
      } else {
        connectionUrl = `${baseUrl}?schema=${normalizedSchema}`;
      }
    } catch (e) {
      connectionUrl = `${baseUrl}?schema=${normalizedSchema}`;
    }

    console.log(`🔌 [DB] Instantiating PrismaClient for schema: "${normalizedSchema}"`);
    clients[normalizedSchema] = new PrismaClient({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
    });
  }

  return clients[normalizedSchema];
}

// Export a Proxy that behaves exactly like PrismaClient,
// but dynamically switches schema context for every query/transaction.
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  }
});
