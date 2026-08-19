import { prisma } from "../db";

async function runOnAllSchemas<T>(callback: () => Promise<T[]>): Promise<T[]> {
  const schemas = ["jalna", "rajasthan", "haryana", "mp"];
  const { warehouseContext } = await import("../db");
  const results = await Promise.all(
    schemas.map(schema =>
      warehouseContext.run(schema, callback)
    )
  );
  return results.flat();
}

export const wmsService = {
  async getParts() {
    const { warehouseContext } = await import("../db");
    const activeSchema = warehouseContext.getStore() || "jalna";
    if (activeSchema === "all") {
      const parts = await runOnAllSchemas(() => prisma.part.findMany({ orderBy: { code: "asc" } }));
      const unique = [];
      const seen = new Set();
      for (const p of parts) {
        if (!seen.has(p.code)) {
          seen.add(p.code);
          unique.push(p);
        }
      }
      return unique;
    }
    return prisma.part.findMany({
      orderBy: { code: "asc" }
    });
  },

  async getWarehouses() {
    // Return all static warehouses directly from getWarehouses controller layer,
    // but keep database lookup fallback if queried directly
    return prisma.warehouse.findMany({
      orderBy: { name: "asc" }
    });
  },

  async getManufacturers() {
    const { warehouseContext } = await import("../db");
    const activeSchema = warehouseContext.getStore() || "jalna";
    if (activeSchema === "all") {
      const list = await runOnAllSchemas(() => prisma.manufacturer.findMany({ orderBy: { name: "asc" } }));
      const unique = [];
      const seen = new Set();
      for (const m of list) {
        if (!seen.has(m.name)) {
          seen.add(m.name);
          unique.push(m);
        }
      }
      return unique;
    }
    return prisma.manufacturer.findMany({
      orderBy: { name: "asc" }
    });
  },

  async getFarmers() {
    const { warehouseContext } = await import("../db");
    const activeSchema = warehouseContext.getStore() || "jalna";
    if (activeSchema === "all") {
      const list = await runOnAllSchemas(() => prisma.masterInstallation.findMany({
        select: { applicationId: true, clientName: true },
        orderBy: { applicationId: "asc" }
      }));
      const unique = [];
      const seen = new Set();
      for (const f of list) {
        if (!seen.has(f.applicationId)) {
          seen.add(f.applicationId);
          unique.push(f);
        }
      }
      return unique;
    }
    return prisma.masterInstallation.findMany({
      select: {
        applicationId: true,
        clientName: true
      },
      orderBy: { applicationId: "asc" }
    });
  },

  async getEngineers() {
    const { warehouseContext } = await import("../db");
    const activeSchema = warehouseContext.getStore() || "jalna";
    if (activeSchema === "all") {
      const list = await runOnAllSchemas(() => prisma.engineer.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" }
      }));
      const unique = [];
      const seen = new Set();
      for (const e of list) {
        if (!seen.has(e.email)) {
          seen.add(e.email);
          unique.push(e);
        }
      }
      return unique;
    }
    return prisma.engineer.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });
  },

  async getChallans() {
    const { warehouseContext } = await import("../db");
    const activeSchema = warehouseContext.getStore() || "jalna";
    if (activeSchema === "all") {
      const list = await runOnAllSchemas(() => prisma.challan.findMany({
        include: {
          movement: {
            include: {
              lines: {
                include: {
                  part: true,
                  serialNumbers: true
                }
              }
            }
          }
        },
        orderBy: { challanNumber: "desc" }
      }));
      return list.sort((a, b) => b.challanNumber.localeCompare(a.challanNumber));
    }
    return prisma.challan.findMany({
      include: {
        movement: {
          include: {
            lines: {
              include: {
                part: true,
                serialNumbers: true
              }
            }
          }
        }
      },
      orderBy: { challanNumber: "desc" }
    });
  },

  // Returns all GRC references from Stage 4 movements that are not fully closed in Stage 5
  async getPendingRMAReferences(warehouseId: string): Promise<string[]> {
    const { warehouseContext } = await import("../db");
    const activeSchema = warehouseContext.getStore() || "jalna";
    if (activeSchema === "all" || warehouseId === "all") {
      const schemas = ["jalna", "rajasthan", "haryana", "mp"];
      const results = await Promise.all(
        schemas.map((schema: string) => {
          const whId = `wh-${schema}-1111`;
          return warehouseContext.run(schema, () => wmsService.getPendingRMAReferences(whId));
        })
      );
      return Array.from(new Set(results.flat()));
    }

    const stage4Movements = await prisma.inventoryMovement.findMany({
      where: { warehouseId, type: 4 },
      select: { referenceNumber: true }
    });

    const stage5Movements = await prisma.inventoryMovement.findMany({
      where: { warehouseId, type: 5 },
      select: { referenceNumber: true }
    });

    const closedRefs = new Set(stage5Movements.map(m => m.referenceNumber));
    const pendingRefs = stage4Movements
      .map(m => m.referenceNumber)
      .filter(ref => !closedRefs.has(ref));

    return Array.from(new Set(pendingRefs));
  },

  async getStock(warehouseId: string): Promise<any> {
    const { warehouseContext } = await import("../db");
    const activeSchema = warehouseContext.getStore() || "jalna";

    if (activeSchema === "all" || warehouseId === "all") {
      const schemas = ["jalna", "rajasthan", "haryana", "mp"];
      const results: any[] = [];
      for (const schema of schemas) {
        const whId = `wh-${schema}-1111`;
        const res = await warehouseContext.run(schema, () => wmsService.getStock(whId));
        results.push(res);
      }

      const freshUnits = results.reduce((sum: number, r: any) => sum + r.metrics.freshUnits, 0);
      const faultyUnits = results.reduce((sum: number, r: any) => sum + r.metrics.faultyUnits, 0);
      const rmaPending = results.reduce((sum: number, r: any) => sum + r.metrics.rmaPending, 0);
      const sentToFarmersThisWeek = results.reduce((sum: number, r: any) => sum + r.metrics.sentToFarmersThisWeek, 0);

      const partStockMap = new Map<string, any>();
      for (const r of results) {
        for (const part of r.stockByPart) {
          const existing = partStockMap.get(part.code);
          if (existing) {
            existing.fresh += part.fresh;
            existing.faulty += part.faulty;
            existing.atManufacturer += part.atManufacturer;
          } else {
            partStockMap.set(part.code, { ...part });
          }
        }
      }

      const needsAttention = results.flatMap(r => r.needsAttention || []);

      return {
        metrics: {
          freshUnits,
          faultyUnits,
          rmaPending,
          sentToFarmersThisWeek
        },
        stockByPart: Array.from(partStockMap.values()),
        needsAttention
      };
    }

    // 1. Get warehouse details to filter unit ledger
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId }
    });
    if (!warehouse) throw new Error("Warehouse not found");

    // 2. Fetch stock metric summaries directly from the UnitLedger (derived current states)
    const freshUnits = await prisma.unitLedger.count({
      where: { currentLocation: warehouseId, status: "Fresh" }
    });

    const faultyUnits = await prisma.unitLedger.count({
      where: { currentLocation: warehouseId, status: "Faulty-Received" }
    });

    const rmaPendingUnits = await prisma.unitLedger.count({
      where: { status: "At-Manufacturer" }
    });

    // 3. Sent to farmers this week (Stage 2 movements in the last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const sentMovements = await prisma.inventoryMovement.findMany({
      where: {
        warehouseId,
        type: 2,
        timestamp: { gte: oneWeekAgo }
      },
      select: {
        lines: {
          select: {
            quantity: true
          }
        }
      }
    });

    const sentToFarmersThisWeek = sentMovements.reduce((acc, mov) => {
      return acc + mov.lines.reduce((sum, line) => sum + line.quantity, 0);
    }, 0);

    // 4. Stock by part (canonical catalog parts mapped with their ledger status counts)
    const parts = await this.getParts();

    // Fetch all relevant ledger counts in a single group query
    const ledgerCounts = await prisma.unitLedger.groupBy({
      by: ['partCode', 'status', 'currentLocation'],
      where: {
        status: { in: ["Fresh", "Faulty-Received", "At-Manufacturer"] }
      },
      _count: {
        serialNo: true
      }
    });

    // Helper to extract counts from the grouped aggregation in Node memory
    const getCount = (partCode: string, status: string, locationCheck?: string) => {
      let sum = 0;
      for (const row of ledgerCounts) {
        if (row.partCode === partCode && row.status === status) {
          if (locationCheck === undefined || row.currentLocation === locationCheck) {
            sum += row._count.serialNo;
          }
        }
      }
      return sum;
    };

    const stockByPart = parts.map((part) => {
      const fresh = getCount(part.code, "Fresh", warehouseId);
      const faulty = getCount(part.code, "Faulty-Received", warehouseId);
      const atManufacturer = getCount(part.code, "At-Manufacturer");

      return {
        code: part.code,
        description: part.description,
        fresh,
        faulty,
        atManufacturer
      };
    });

    // 5. Overdue Alerts (RMA sent to manufacturer but not returned back within 15 days)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const rmaSentMovements = await prisma.inventoryMovement.findMany({
      where: {
        warehouseId,
        type: 4,
        timestamp: { lt: fifteenDaysAgo }
      },
      include: {
        lines: {
          include: {
            part: true,
            serialNumbers: true
          }
        }
      }
    });

    // Check which GRC batches are not closed yet
    const stage5Refs = await prisma.inventoryMovement.findMany({
      where: { warehouseId, type: 5 },
      select: { referenceNumber: true }
    });
    const closedBatches = new Set(stage5Refs.map(m => m.referenceNumber));

    const needsAttention: any[] = [];
    for (const mov of rmaSentMovements) {
      if (closedBatches.has(mov.referenceNumber)) continue;

      const elapsedDays = Math.floor((Date.now() - new Date(mov.timestamp).getTime()) / (1000 * 60 * 60 * 24));

      for (const line of mov.lines) {
        for (const sn of line.serialNumbers) {
          // Verify if unit is still marked at manufacturer
          const ledgerItem = await prisma.unitLedger.findUnique({
            where: { serialNo: sn.serialNumber }
          });
          if (ledgerItem && ledgerItem.status === "At-Manufacturer") {
            needsAttention.push({
              serial: sn.serialNumber,
              part: line.part.description,
              status: "RMA overdue",
              daysPending: elapsedDays
            });
          }
        }
      }
    }

    return {
      metrics: {
        freshUnits,
        faultyUnits,
        rmaPending: rmaPendingUnits,
        sentToFarmersThisWeek
      },
      stockByPart,
      needsAttention
    };
  },

  async getMovements(warehouseId: string): Promise<any[]> {
    const { warehouseContext } = await import("../db");
    const activeSchema = warehouseContext.getStore() || "jalna";
    if (activeSchema === "all" || warehouseId === "all") {
      const schemas = ["jalna", "rajasthan", "haryana", "mp"];
      const results = await Promise.all(
        schemas.map((schema: string) => {
          const whId = `wh-${schema}-1111`;
          return warehouseContext.run(schema, () => wmsService.getMovements(whId));
        })
      );
      return results.flat().sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return prisma.inventoryMovement.findMany({
      where: { warehouseId },
      include: {
        lines: {
          include: {
            part: true,
            serialNumbers: true
          }
        },
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      },
      orderBy: { timestamp: "desc" }
    });
  },

  async logMovement(data: {
    warehouseId: string;
    stage: number;
    timestamp?: Date;
    partyName: string;
    referenceNumber: string;
    vehicleNumber?: string;
    reportedFault?: string;
    conditionReceived?: string;
    userId: string;
    lines: Array<{
      partCode: string;
      quantity: number;
      serials: string[];
      replacedSerialsMap?: Record<string, string>; // Maps newSerial -> oldSerial for replacements
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Resolve Warehouse to determine sequential Challan number if needed
      const warehouse = await tx.warehouse.findUnique({
        where: { id: data.warehouseId }
      });
      if (!warehouse) throw new Error("Warehouse not found.");

      // Ensure user exists and has the correct state-based lead name/email in the active schema context
      let leadName = "Milan — Maintenance Lead";
      let leadEmail = "milan@claro.com";
      if (data.warehouseId === "wh-rajasthan-2222") {
        leadName = "Avinash — Maintenance Lead";
        leadEmail = "avinash@claro.com";
      } else if (data.warehouseId === "wh-haryana-3333") {
        leadName = "Avinash — Maintenance Lead";
        leadEmail = "avinash@claro.com";
      } else if (data.warehouseId === "wh-mp-4444") {
        leadName = "MP Maintenance Lead";
        leadEmail = "mp@claro.com";
      }

      await tx.user.upsert({
        where: { id: data.userId },
        update: {
          fullName: leadName,
          email: leadEmail
        },
        create: {
          id: data.userId,
          fullName: leadName,
          email: leadEmail,
          role: "Warehouse"
        }
      });

      // 1.5. Validate Ledger State Machine Transitions for Serial Numbers & Quantities
      for (const line of data.lines) {
        const part = await tx.part.findUnique({
          where: { code: line.partCode }
        });
        if (!part) throw new Error(`Part with code ${line.partCode} not found.`);

        if (part.serialTracked) {
          if (!line.serials || line.serials.length === 0) {
            throw new Error(`Validation Error: Serial numbers are required for serialized part ${part.code}.`);
          }
          if (line.serials.length !== line.quantity) {
            throw new Error(`Validation Error: Part ${part.code} has quantity ${line.quantity} but ${line.serials.length} serials were provided.`);
          }

          const cleanSerials = line.serials.map(sn => sn.trim());
          const existings = await tx.unitLedger.findMany({
            where: { serialNo: { in: cleanSerials } }
          });
          const existingMap = new Map(existings.map(e => [e.serialNo, e]));

          for (const sn of line.serials) {
            const cleanSn = sn.trim();
            const existing = existingMap.get(cleanSn);

            if (data.stage === 1) {
              // Received from Manufacturer: serial shouldn't already be active in stock
              if (existing && ["Fresh", "Sent-to Farmer", "Faulty-Received", "At-Manufacturer"].includes(existing.status)) {
                throw new Error(`Validation Error: Serial number '${cleanSn}' is already active in stock (status: '${existing.status}').`);
              }
            } else if (data.stage === 2) {
              // Sent to Farmer: serial must exist in Fresh status at this warehouse
              if (!existing) {
                throw new Error(`Validation Error: Serial number '${cleanSn}' does not exist in stock. You must receive it (Stage 1) before sending to farmer.`);
              }
              if (existing.status !== "Fresh" || existing.currentLocation !== data.warehouseId) {
                throw new Error(`Validation Error: Serial number '${cleanSn}' cannot be dispatched because its current status is '${existing.status}' at location '${existing.currentLocation}'.`);
              }
            } else if (data.stage === 3) {
              // Faulty received from SE: allow any legacy returns (if not exists, we'll create it),
              // but if it exists, it must not already be in a faulty/RMA state.
              if (existing && ["Faulty-Received", "At-Manufacturer"].includes(existing.status)) {
                throw new Error(`Validation Error: Serial number '${cleanSn}' is already marked as faulty or pending RMA (current status: '${existing.status}').`);
              }
            } else if (data.stage === 4) {
              // RMA sent to manufacturer: serial must exist and currently be 'Faulty-Received' (matching Stage 3!)
              if (!existing) {
                throw new Error(`Validation Error: Serial number '${cleanSn}' must be registered as faulty received from SE (Stage 3) before it can be sent for RMA.`);
              }
              if (existing.status !== "Faulty-Received" || existing.currentLocation !== data.warehouseId) {
                throw new Error(`Validation Error: Serial number '${cleanSn}' cannot be sent for RMA because it is not in faulty stock at this warehouse (current status: '${existing.status}').`);
              }
            } else if (data.stage === 5) {
              // Received back repaired / replaced: must match RMA (Stage 4)
              if (data.conditionReceived === "Replaced — new serial") {
                const oldSerial = line.replacedSerialsMap?.[cleanSn] || "";
                if (!oldSerial) {
                  throw new Error(`Validation Error: New replacement serial number '${cleanSn}' must map to an original faulty serial.`);
                }
                const oldExisting = await tx.unitLedger.findUnique({
                  where: { serialNo: oldSerial }
                });
                if (!oldExisting || oldExisting.status !== "At-Manufacturer") {
                  throw new Error(`Validation Error: Original faulty serial '${oldSerial}' is not currently pending RMA at manufacturer (status: '${oldExisting?.status || "none"}').`);
                }
                if (existing && ["Fresh", "Sent-to Farmer", "Faulty-Received", "At-Manufacturer"].includes(existing.status)) {
                  throw new Error(`Validation Error: New replacement serial '${cleanSn}' already exists in active stock.`);
                }
              } else if (data.conditionReceived === "Scrapped, not returned") {
                if (!existing || existing.status !== "At-Manufacturer") {
                  throw new Error(`Validation Error: Serial number '${cleanSn}' is not currently pending RMA at manufacturer.`);
                }
              } else {
                // Default: Repaired (must match RMA Stage 4)
                if (!existing) {
                  throw new Error(`Validation Error: Serial number '${cleanSn}' must be pending RMA (Stage 4) before it can be received back repaired.`);
                }
                if (existing.status !== "At-Manufacturer") {
                  throw new Error(`Validation Error: Serial number '${cleanSn}' cannot be received back repaired because it is not pending RMA (current status: '${existing.status}').`);
                }
              }
            }
          }
        } else {
          // For non-serialized parts: Validate that they have enough stock in the source status!
          if (data.stage === 2) {
            const freshCount = await tx.unitLedger.count({
              where: { partCode: part.code, status: "Fresh", currentLocation: data.warehouseId }
            });
            if (freshCount < line.quantity) {
              throw new Error(`Validation Error: Insufficient stock for non-serialized part ${part.code}. Available: ${freshCount}, Required: ${line.quantity}`);
            }
          } else if (data.stage === 4) {
            const faultyCount = await tx.unitLedger.count({
              where: { partCode: part.code, status: "Faulty-Received", currentLocation: data.warehouseId }
            });
            if (faultyCount < line.quantity) {
              throw new Error(`Validation Error: Insufficient faulty stock for non-serialized part ${part.code}. Available: ${faultyCount}, Required: ${line.quantity}`);
            }
          } else if (data.stage === 5) {
            const mfgCount = await tx.unitLedger.count({
              where: { partCode: part.code, status: "At-Manufacturer", currentLocation: data.partyName }
            });
            if (mfgCount < line.quantity) {
              throw new Error(`Validation Error: Insufficient pending RMA stock for non-serialized part ${part.code} at manufacturer ${data.partyName}. Available: ${mfgCount}, Required: ${line.quantity}`);
            }
          }
        }
      }

      // 2. Create the Movement Log entry
      const movement = await tx.inventoryMovement.create({
        data: {
          warehouseId: data.warehouseId,
          type: data.stage,
          timestamp: data.timestamp || new Date(),
          partyName: data.partyName,
          referenceNumber: data.referenceNumber,
          vehicleNumber: data.vehicleNumber,
          reportedFault: data.reportedFault,
          conditionReceived: data.conditionReceived,
          userId: data.userId
        }
      });

      // 3. Create lines, serial numbers, and update UnitLedger status
      for (const line of data.lines) {
        const part = await tx.part.findUnique({
          where: { code: line.partCode }
        });
        if (!part) {
          throw new Error(`Part with code ${line.partCode} not found.`);
        }

        const movementLine = await tx.inventoryMovementLine.create({
          data: {
            movementId: movement.id,
            partId: part.id,
            quantity: line.quantity
          }
        });

        let resolvedSerials: string[] = [];

        if (part.serialTracked) {
          resolvedSerials = line.serials.map(sn => sn.trim());
          await tx.movementSerialNumber.createMany({
            data: resolvedSerials.map(sn => ({
              movementLineId: movementLine.id,
              serialNumber: sn
            }))
          });

          // Update UnitLedger states based on cycle stage
          for (const sn of resolvedSerials) {
            const cleanSn = sn.trim();

            if (data.stage === 1) {
              // Received from manufacturer
              await tx.unitLedger.upsert({
                where: { serialNo: cleanSn },
                update: {
                  status: "Fresh",
                  condition: "New",
                  currentLocation: data.warehouseId
                },
                create: {
                  serialNo: cleanSn,
                  partCode: line.partCode,
                  status: "Fresh",
                  condition: "New",
                  currentLocation: data.warehouseId
                }
              });
            } else if (data.stage === 2) {
              // Sent to Farmer
              await tx.unitLedger.update({
                where: { serialNo: cleanSn },
                data: {
                  status: "Sent-to Farmer",
                  currentLocation: data.referenceNumber // Farmer App ID
                }
              });
            } else if (data.stage === 3) {
              // Faulty received from SE (using upsert to allow legacy fault registration on pickup)
              await tx.unitLedger.upsert({
                where: { serialNo: cleanSn },
                update: {
                  status: "Faulty-Received",
                  currentLocation: data.warehouseId
                },
                create: {
                  serialNo: cleanSn,
                  partCode: line.partCode,
                  status: "Faulty-Received",
                  condition: "New",
                  currentLocation: data.warehouseId
                }
              });
            } else if (data.stage === 4) {
              // RMA sent to manufacturer
              await tx.unitLedger.update({
                where: { serialNo: cleanSn },
                data: {
                  status: "At-Manufacturer",
                  currentLocation: data.partyName // Manufacturer name
                }
              });
            } else if (data.stage === 5) {
              // Received back repaired / replaced
              if (data.conditionReceived === "Replaced — new serial") {
                const oldSerial = line.replacedSerialsMap?.[cleanSn] || "";

                // Set old serial to Scrapped
                if (oldSerial) {
                  await tx.unitLedger.update({
                    where: { serialNo: oldSerial },
                    data: {
                      status: "Scrapped",
                      condition: "Scrapped",
                      currentLocation: data.partyName
                    }
                  });
                }

                // Insert the new replacement serial
                await tx.unitLedger.upsert({
                  where: { serialNo: cleanSn },
                  update: {
                    status: "Fresh",
                    condition: "New",
                    currentLocation: data.warehouseId,
                    linkedPriorSerial: oldSerial || null
                  },
                  create: {
                    serialNo: cleanSn,
                    partCode: line.partCode,
                    status: "Fresh",
                    condition: "New",
                    currentLocation: data.warehouseId,
                    linkedPriorSerial: oldSerial || null
                  }
                });
              } else if (data.conditionReceived === "Scrapped, not returned") {
                await tx.unitLedger.update({
                  where: { serialNo: cleanSn },
                  data: {
                    status: "Scrapped",
                    condition: "Scrapped",
                    currentLocation: data.partyName
                  }
                });
              } else {
                // Default: Repaired
                await tx.unitLedger.update({
                  where: { serialNo: cleanSn },
                  data: {
                    status: "Fresh",
                    condition: "Repaired",
                    currentLocation: data.warehouseId
                  }
                });
              }
            }
          }
        } else {
          // Non-serialized item: resolve dummy serials!
          if (data.stage === 1) {
            // Generate new ones
            for (let i = 0; i < line.quantity; i++) {
              resolvedSerials.push(`AUTO-${part.code}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
            }
            for (const sn of resolvedSerials) {
              await tx.unitLedger.create({
                data: {
                  serialNo: sn,
                  partCode: part.code,
                  status: "Fresh",
                  condition: "New",
                  currentLocation: data.warehouseId
                }
              });
            }
          } else if (data.stage === 2) {
            // Find existing Fresh and transition to Sent-to Farmer
            const items = await tx.unitLedger.findMany({
              where: { partCode: part.code, status: "Fresh", currentLocation: data.warehouseId },
              take: line.quantity
            });
            resolvedSerials = items.map(item => item.serialNo);
            await tx.unitLedger.updateMany({
              where: { serialNo: { in: resolvedSerials } },
              data: {
                status: "Sent-to Farmer",
                currentLocation: data.referenceNumber
              }
            });
          } else if (data.stage === 3) {
            // Find existing Sent-to Farmer and transition to Faulty-Received
            const items = await tx.unitLedger.findMany({
              where: { partCode: part.code, status: "Sent-to Farmer" },
              take: line.quantity
            });
            resolvedSerials = items.map(item => item.serialNo);
            const foundCount = resolvedSerials.length;
            
            if (foundCount > 0) {
              await tx.unitLedger.updateMany({
                where: { serialNo: { in: resolvedSerials } },
                data: {
                  status: "Faulty-Received",
                  currentLocation: data.warehouseId
                }
              });
            }

            // Create remaining legacy faulty items if quantity > foundCount
            if (line.quantity > foundCount) {
              const remaining = line.quantity - foundCount;
              const newSerials: string[] = [];
              for (let i = 0; i < remaining; i++) {
                newSerials.push(`AUTO-${part.code}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
              }
              for (const sn of newSerials) {
                await tx.unitLedger.create({
                  data: {
                    serialNo: sn,
                    partCode: part.code,
                    status: "Faulty-Received",
                    condition: "New",
                    currentLocation: data.warehouseId
                  }
                });
              }
              resolvedSerials = [...resolvedSerials, ...newSerials];
            }
          } else if (data.stage === 4) {
            // Find existing Faulty-Received and transition to At-Manufacturer
            const items = await tx.unitLedger.findMany({
              where: { partCode: part.code, status: "Faulty-Received", currentLocation: data.warehouseId },
              take: line.quantity
            });
            resolvedSerials = items.map(item => item.serialNo);
            await tx.unitLedger.updateMany({
              where: { serialNo: { in: resolvedSerials } },
              data: {
                status: "At-Manufacturer",
                currentLocation: data.partyName
              }
            });
          } else if (data.stage === 5) {
            // Find existing At-Manufacturer and transition back
            const items = await tx.unitLedger.findMany({
              where: { partCode: part.code, status: "At-Manufacturer", currentLocation: data.partyName },
              take: line.quantity
            });
            resolvedSerials = items.map(item => item.serialNo);
            
            if (data.conditionReceived === "Scrapped, not returned") {
              await tx.unitLedger.updateMany({
                where: { serialNo: { in: resolvedSerials } },
                data: {
                  status: "Scrapped",
                  condition: "Scrapped",
                  currentLocation: data.partyName
                }
              });
            } else {
              // Repaired or replaced
              const cond = data.conditionReceived === "Replaced — new serial" ? "New" : "Repaired";
              await tx.unitLedger.updateMany({
                where: { serialNo: { in: resolvedSerials } },
                data: {
                  status: "Fresh",
                  condition: cond,
                  currentLocation: data.warehouseId
                }
              });
            }
          }

          // Link the resolved/dummy serials to the movement line!
          await tx.movementSerialNumber.createMany({
            data: resolvedSerials.map(sn => ({
              movementLineId: movementLine.id,
              serialNumber: sn
            }))
          });
        }
      }

      // 4. Challan Auto-generation per Rajasthan sequence specs for Stage 4 (RMA dispatches)
      if (data.stage === 4) {
        let totalValuation = 0;
        for (const line of data.lines) {
          const part = await tx.part.findUnique({
            where: { code: line.partCode }
          });
          if (part) {
            totalValuation += Number(part.valuationAmount) * line.quantity;
          }
        }

        // Find existing GRC challans for this warehouse to increment sequence correctly without collisions
        const lastChallan = await tx.challan.findFirst({
          where: {
            movement: {
              warehouseId: data.warehouseId,
              type: 4
            }
          },
          orderBy: {
            challanNumber: "desc"
          }
        });

        let nextNum = 1;
        if (lastChallan) {
          const parts = lastChallan.challanNumber.split("-");
          const lastNumStr = parts[parts.length - 1];
          const lastNum = parseInt(lastNumStr, 10);
          if (!isNaN(lastNum)) {
            nextNum = lastNum + 1;
          }
        }

        const paddedNum = String(nextNum).padStart(4, "0");
        const challanNumber = `${warehouse.stateCode}-${warehouse.code}-GRC-${paddedNum}`;

        const user = await tx.user.findUnique({
          where: { id: data.userId }
        });

        await tx.challan.create({
          data: {
            challanNumber,
            movementId: movement.id,
            destinationName: data.partyName,
            destinationAddress: data.partyName.toLowerCase().includes("crompton")
              ? "Crompton Greaves Consumer Electricals Ltd.\nCGCEL – Jaipur, MS Baghwati Hotels and Resorts Ltd\n792/1 – Khasra No. 795, 796, Bad Pipli Bus Stand,\nVillage Nindar, NH–11, Jaipur, Rajasthan – 302013"
              : "Main Branch Address, Jaipur, Rajasthan",
            destinationGst: data.partyName.toLowerCase().includes("crompton")
              ? "08AAFCC9473R1ZP"
              : "08XXXXXXXXXXXXX",
            destinationContact: "9001163111",
            dispatchMode: "Transport",
            purpose: "Repair & Replacement",
            preparedBy: user ? `${user.fullName} — Warehouse Manager` : "Milan — Maintenance Lead",
            totalAmount: totalValuation,
            gstRate: 5.0
          }
        });
      }

      // 5. Update google sheet MaterialRequest status on Stage 2 dispatch
      if (data.stage === 2) {
        const ticket = await tx.ticket.findFirst({
          where: {
            complaint: {
              applicationId: data.referenceNumber
            }
          }
        });

        if (ticket) {
          const materialRequest = await tx.materialRequest.findFirst({
            where: { ticketId: ticket.id, status: "PENDING" }
          });

          if (materialRequest) {
            await tx.materialRequest.update({
              where: { id: materialRequest.id },
              data: { status: "DISPATCHED" }
            });

            // Associate the material request ID to our movement log to keep them in one sync
            await tx.inventoryMovement.update({
              where: { id: movement.id },
              data: { materialRequestId: materialRequest.id }
            });
          }
        }
      }

      return movement;
    }, {
      maxWait: 15000,
      timeout: 60000
    });
  },

  async deleteMovement(id: string) {
    const movement = await prisma.inventoryMovement.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            serialNumbers: true
          }
        }
      }
    });
    if (!movement) return null;

    return prisma.$transaction(async (tx) => {
      // Revert UnitLedger statuses to their prior status before this movement!
      for (const line of movement.lines) {
        for (const sn of line.serialNumbers) {
          // Find the PREVIOUS movement for this serial number (excluding the current one we are deleting)
          const priorMovement = await tx.inventoryMovement.findFirst({
            where: {
              id: { not: id },
              warehouseId: movement.warehouseId,
              lines: {
                some: {
                  partId: line.partId,
                  serialNumbers: {
                    some: {
                      serialNumber: sn.serialNumber
                    }
                  }
                }
              }
            },
            orderBy: { timestamp: "desc" }
          });

          if (priorMovement) {
            // Revert status based on prior movement type
            let prevStatus = "Fresh";
            let prevLoc: string | null = movement.warehouseId;

            if (priorMovement.type === 2) {
              prevStatus = "Sent-to Farmer";
              prevLoc = priorMovement.referenceNumber;
            } else if (priorMovement.type === 3) {
              prevStatus = "Faulty-Received";
              prevLoc = movement.warehouseId;
            } else if (priorMovement.type === 4) {
              prevStatus = "At-Manufacturer";
              prevLoc = priorMovement.partyName;
            }

            await tx.unitLedger.update({
              where: { serialNo: sn.serialNumber },
              data: {
                status: prevStatus,
                currentLocation: prevLoc
              }
            });
          } else {
            // If there are no prior movements and this was Stage 1 (received), delete from ledger
            if (movement.type === 1) {
              await tx.unitLedger.delete({
                where: { serialNo: sn.serialNumber }
              });
            } else {
              // Revert to default status prior to this stage (e.g., if it was adjusted/seeded)
              let defaultStatus = "Fresh";
              let defaultLoc: string | null = movement.warehouseId;

              if (movement.type === 3) {
                defaultStatus = "Sent-to Farmer";
                defaultLoc = movement.referenceNumber;
              } else if (movement.type === 4) {
                defaultStatus = "Faulty-Received";
                defaultLoc = movement.warehouseId;
              } else if (movement.type === 5) {
                defaultStatus = "At-Manufacturer";
                defaultLoc = movement.partyName;
              }

              await tx.unitLedger.update({
                where: { serialNo: sn.serialNumber },
                data: {
                  status: defaultStatus,
                  currentLocation: defaultLoc
                }
              });
            }
          }
        }
      }

      // If Stage 2 linked back to materialRequest, restore it to PENDING
      if (movement.materialRequestId) {
        await tx.materialRequest.update({
          where: { id: movement.materialRequestId },
          data: { status: "PENDING" }
        });
      }

      // Delete Challans
      await tx.challan.deleteMany({
        where: { movementId: id }
      });

      // Delete Movement
      return tx.inventoryMovement.delete({
        where: { id }
      });
    }, {
      maxWait: 15000,
      timeout: 60000
    });
  },

  async clearAll() {
    const { warehouseContext } = await import("../db");
    const activeSchema = warehouseContext.getStore() || "jalna";
    if (activeSchema === "all") {
      const schemas = ["jalna", "rajasthan", "haryana", "mp"];
      for (const schema of schemas) {
        await warehouseContext.run(schema, () => wmsService.clearAll());
      }
      return;
    }

    return prisma.$transaction(async (tx) => {
      await tx.movementSerialNumber.deleteMany({});
      await tx.inventoryMovementLine.deleteMany({});
      await tx.challan.deleteMany({});
      await tx.inventoryMovement.deleteMany({});
      await tx.unitLedger.deleteMany({});
      await tx.materialRequest.deleteMany({});
      await tx.complaint.deleteMany({});
      await tx.ticket.deleteMany({});
    }, {
      maxWait: 15000,
      timeout: 60000
    });
  },

  async getMaterialRequests(): Promise<any[]> {
    const { warehouseContext } = await import("../db");
    const activeSchema = warehouseContext.getStore() || "jalna";
    if (activeSchema === "all") {
      const schemas = ["jalna", "rajasthan", "haryana", "mp"];
      const results = await Promise.all(
        schemas.map((schema: string) =>
          warehouseContext.run(schema, () => wmsService.getMaterialRequests())
        )
      );
      return results.flat().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return prisma.materialRequest.findMany({
      include: {
        engineer: {
          select: { name: true }
        },
        ticket: {
          include: {
            complaint: {
              include: {
                masterInstallation: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  },

  async updateMaterialStatus(id: string, status: string) {
    const { warehouseContext } = await import("../db");
    const activeSchema = warehouseContext.getStore() || "jalna";

    const tryUpdateInSchema = async (schema: string) => {
      return warehouseContext.run(schema, async () => {
        const exists = await prisma.materialRequest.findUnique({
          where: { id }
        });
        if (exists) {
          return prisma.materialRequest.update({
            where: { id },
            data: { status }
          });
        }
        return null;
      });
    };

    if (activeSchema === "all") {
      const schemas = ["jalna", "rajasthan", "haryana", "mp"];
      for (const s of schemas) {
        try {
          const result = await tryUpdateInSchema(s);
          if (result) return result;
        } catch (e) {
          console.error(`Error updating request in schema ${s}:`, e);
        }
      }
      throw new Error(`Material Request with ID ${id} not found in any schema.`);
    }

    try {
      const result = await tryUpdateInSchema(activeSchema);
      if (result) return result;
    } catch (e) {
      console.error(`Error updating request in active schema ${activeSchema}:`, e);
    }

    // Fallback search in all other schemas
    const schemas = ["jalna", "rajasthan", "haryana", "mp"].filter(s => s !== activeSchema);
    for (const s of schemas) {
      try {
        const result = await tryUpdateInSchema(s);
        if (result) return result;
      } catch (e) {
        console.error(`Error updating request in schema ${s} during fallback:`, e);
      }
    }

    throw new Error(`Material Request with ID ${id} not found in any schema.`);
  },
  async syncRequests(): Promise<{ newRequestsImported: number }> {
    const { warehouseContext } = await import("../db");
    const activeSchema = warehouseContext.getStore() || "jalna";

    // If "all" is selected, sync all schemas in parallel
    if (activeSchema === "all") {
      const schemas = ["jalna", "rajasthan", "haryana", "mp"];

      const results = [];

      for (const schema of schemas) {
        console.log(`🏭 [Sync] Starting schema: ${schema}`);

        const result = await warehouseContext.run(
          schema,
          () => wmsService.syncRequests()
        );

        results.push(result);

        console.log(`✅ [Sync] Finished schema: ${schema}`);
      }

      const sum = results.reduce(
        (acc: number, r: any) => acc + (r.newRequestsImported || 0),
        0
      );

      return { newRequestsImported: sum };
    }

    const sheetUrl =
      "https://docs.google.com/spreadsheets/d/1kQkVIhbOgg3n4FHSia2Ow7Scm0AZLWHuMAwA-1cOsZY/export?format=csv&gid=193399218";

    console.log(
      `🔄 [Sync] Fetching material requests for schema context: "${activeSchema}"`
    );

    try {
      console.log(`📥 [Sync] Sending fetch request to Google Sheets...`);

      const response = await fetch(sheetUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();

      console.log(
        `📥 [Sync] Sheet fetched successfully. Size: ${csvText.length} characters.`
      );

      // Parse CSV
      const rows = parseCSV(csvText);

      console.log(`📊 [Sync] Parsed ${rows.length} rows from CSV.`);

      if (rows.length < 2) {
        return { newRequestsImported: 0 };
      }

      const headers = rows[0].map(h => h.trim());
      const dataRows = rows.slice(1);

      const timestampIdx = headers.indexOf("Timestamp");
      const warehouseCellIdx = headers.findIndex(h => h.includes("Warehouse") || h.includes("Requesting to"));
      const appIdIdx = headers.findIndex(h => h.includes("Application ID") || h.includes("Saral ID"));
      const pumpCapacityIdx = headers.indexOf("Pump Capacity");
      const materialRequiredIdx = headers.findIndex(h => h.includes("Material Required") || h.includes("Material"));
      const otherDetailIdx = headers.indexOf("Other");
      const engineerNameIdx = headers.findIndex(h => h.includes("Service Engineer") || h.includes("Engineer"));
      const quantityIdx = headers.indexOf("Quantity");
      const dispatchCellIdx = headers.findIndex(h => h.includes("Dispatch Status"));
      const syncIdIdx = headers.indexOf("Sync ID");

      // ============================================================
      // STEP 1: FILTER + PREPARE ROWS IN MEMORY
      // ============================================================

      type PreparedRow = {
        timestamp: string;
        cleanAppId: string;
        cleanMaterial: string;
        cleanEngName: string;
        qty: number;
        pumpCapacity: string;
        otherDetail: string;
        dispatchCell: string;
        syncId: string;
      };

      const preparedRows: PreparedRow[] = [];

      for (const row of dataRows) {
        const appId = appIdIdx !== -1 ? row[appIdIdx] : "";
        const materialRequired = materialRequiredIdx !== -1 ? row[materialRequiredIdx] : "";
        const warehouseCell = warehouseCellIdx !== -1 ? row[warehouseCellIdx] : "";

        if (!appId || !materialRequired) continue;

        if (!matchesSchema(warehouseCell, activeSchema)) continue;

        const timestamp = timestampIdx !== -1 ? row[timestampIdx] : "";
        const pumpCapacity = pumpCapacityIdx !== -1 ? row[pumpCapacityIdx] : "";
        const otherDetail = otherDetailIdx !== -1 ? row[otherDetailIdx] : "";
        const engineerName = engineerNameIdx !== -1 ? row[engineerNameIdx] : "";
        const quantityCell = quantityIdx !== -1 ? row[quantityIdx] : "";
        const dispatchCell = dispatchCellIdx !== -1 ? row[dispatchCellIdx] : "";
        const syncId = syncIdIdx !== -1 ? row[syncIdIdx] : "";

        preparedRows.push({
          timestamp,
          cleanAppId: appId.trim(),
          cleanMaterial: materialRequired.trim(),
          cleanEngName: (engineerName || "Field Engineer").trim(),
          qty: parseInt(quantityCell) || 1,
          pumpCapacity: pumpCapacity || "",
          otherDetail: otherDetail || "",
          dispatchCell,
          syncId: syncId || ""
        });
      }

      console.log(
        `📦 [Sync] Found ${preparedRows.length} matching rows for "${activeSchema}".`
      );

      if (preparedRows.length === 0) {
        return { newRequestsImported: 0 };
      }

      // ============================================================
      // STEP 2: COLLECT UNIQUE ENGINEERS + APP IDS
      // ============================================================

      const uniqueEngineerNames = Array.from(
        new Set(preparedRows.map(row => row.cleanEngName))
      );

      const uniqueAppIds = Array.from(
        new Set(preparedRows.map(row => row.cleanAppId))
      );

      console.log(
        `🔎 [Sync] Unique engineers: ${uniqueEngineerNames.length} | Unique App IDs: ${uniqueAppIds.length}`
      );

      // ============================================================
      // STEP 3: BULK LOAD ENGINEERS
      // ============================================================

      const existingEngineers = await prisma.engineer.findMany({
        where: {
          name: {
            in: uniqueEngineerNames,
            mode: "insensitive"
          }
        }
      });

      const engineerCache = new Map<string, string>();

      for (const engineer of existingEngineers) {
        engineerCache.set(
          engineer.name.trim().toLowerCase(),
          engineer.id
        );
      }

      console.log(
        `👷 [Sync] Loaded ${existingEngineers.length} existing engineers.`
      );

      // ============================================================
      // STEP 4: CREATE MISSING ENGINEERS
      // ============================================================

      const missingEngineerNames = uniqueEngineerNames.filter(
        name => !engineerCache.has(name.trim().toLowerCase())
      );

      if (missingEngineerNames.length > 0) {
        console.log(
          `👷 [Sync] Creating ${missingEngineerNames.length} missing engineers...`
        );

        // Small batches to avoid too many DB connections
        const ENGINEER_BATCH_SIZE = 10;

        for (
          let i = 0;
          i < missingEngineerNames.length;
          i += ENGINEER_BATCH_SIZE
        ) {
          const batch = missingEngineerNames.slice(
            i,
            i + ENGINEER_BATCH_SIZE
          );

          const createdEngineers = await Promise.all(
            batch.map(async engineerName => {
              const cleanKey = engineerName
                .trim()
                .toLowerCase();

              // Double-check to avoid duplicates
              const existing = await prisma.engineer.findFirst({
                where: {
                  name: {
                    equals: engineerName,
                    mode: "insensitive"
                  }
                }
              });

              if (existing) {
                return existing;
              }

              const email =
                `${engineerName
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, "")}@claro.com`;

              return prisma.engineer.create({
                data: {
                  name: engineerName,
                  email,
                  phone: "9999999999",
                  isActive: true
                }
              });
            })
          );

          for (const engineer of createdEngineers) {
            engineerCache.set(
              engineer.name.trim().toLowerCase(),
              engineer.id
            );
          }
        }
      }

      // ============================================================
      // STEP 5: BULK LOAD COMPLAINTS / TICKETS
      // ============================================================

      const existingComplaints = await prisma.complaint.findMany({
        where: {
          applicationId: {
            in: uniqueAppIds
          }
        },
        select: {
          applicationId: true,
          ticketId: true
        }
      });

      const ticketCache = new Map<string, string>();

      for (const complaint of existingComplaints) {
        ticketCache.set(
          complaint.applicationId.trim(),
          complaint.ticketId
        );
      }

      console.log(
        `🎫 [Sync] Loaded ${existingComplaints.length} existing tickets.`
      );

      // ============================================================
      // STEP 7: ENSURE MASTER INSTALLATION RECORDS EXIST
      // ============================================================

      console.log(
        `🌾 [Sync] Ensuring farmer/application records exist...`
      );

      await prisma.masterInstallation.createMany({
        data: uniqueAppIds.map(applicationId => ({
          applicationId,
          clientName: `Farmer (${applicationId})`
        })),
        skipDuplicates: true
      });

      console.log(
        `✅ [Sync] Farmer/application records ready.`
      );

      // ============================================================
      // STEP 6: CREATE MISSING TICKETS / COMPLAINTS
      // ============================================================

      const missingAppIds = uniqueAppIds.filter(
        appId => !ticketCache.has(appId)
      );

      if (missingAppIds.length > 0) {
        console.log(
          `🎫 [Sync] Creating ${missingAppIds.length} missing tickets...`
        );

        const TICKET_BATCH_SIZE = 10;

        for (
          let i = 0;
          i < missingAppIds.length;
          i += TICKET_BATCH_SIZE
        ) {
          const batch = missingAppIds.slice(
            i,
            i + TICKET_BATCH_SIZE
          );

          const createdItems = [];
          for (const cleanAppId of batch) {
            const existingComplaint =
              await prisma.complaint.findUnique({
                where: {
                  applicationId: cleanAppId
                }
              });

            if (existingComplaint) {
              createdItems.push({
                applicationId: cleanAppId,
                ticketId: existingComplaint.ticketId
              });
              continue;
            }

            const ticket = await prisma.ticket.create({
              data: {}
            });

            try {
              const complaint =
                await prisma.complaint.create({
                  data: {
                    applicationId: cleanAppId,
                    ticketId: ticket.id
                  }
                });

              createdItems.push({
                applicationId: complaint.applicationId,
                ticketId: ticket.id
              });
            } catch (error) {
              const existingAfterConflict =
                await prisma.complaint.findUnique({
                  where: {
                    applicationId: cleanAppId
                  }
                });

              if (existingAfterConflict) {
                try {
                  await prisma.ticket.delete({
                    where: {
                      id: ticket.id
                    }
                  });
                } catch {
                  // Ignore cleanup failure
                }

                createdItems.push({
                  applicationId: cleanAppId,
                  ticketId: existingAfterConflict.ticketId
                });
              } else {
                throw error;
              }
            }
          }

          for (const item of createdItems) {
            ticketCache.set(
              item.applicationId,
              item.ticketId
            );
          }

          console.log(
            `✅ [Sync] Ticket batch ${Math.floor(i / TICKET_BATCH_SIZE) + 1
            } complete.`
          );
        }
      }



      // ============================================================
      // STEP 8: PREPARE MATERIAL REQUESTS
      // ============================================================

      const preparedRequests = preparedRows.map(row => {
        const engineerId = engineerCache.get(
          row.cleanEngName.trim().toLowerCase()
        );

        const ticketId = ticketCache.get(
          row.cleanAppId
        );

        if (!engineerId) {
          throw new Error(
            `Engineer ID missing for "${row.cleanEngName}"`
          );
        }

        if (!ticketId) {
          throw new Error(
            `Ticket ID missing for Application ID "${row.cleanAppId}"`
          );
        }

        let parsedTimestamp = new Date();

        if (row.timestamp) {
          const candidate = new Date(row.timestamp);

          if (!isNaN(candidate.getTime())) {
            parsedTimestamp = candidate;
          }
        }

        const cleanedTime = row.timestamp
          ? parsedTimestamp.getTime()
          : "no-time";

        const requestUniqueId =
          `req-${row.cleanAppId}-${row.cleanMaterial.replace(
            /[^a-zA-Z0-9]/g,
            ""
          )}-${cleanedTime}`.substring(0, 80);

        const partNames = row.cleanMaterial
          .split(",")
          .map(part => part.trim())
          .filter(Boolean);

        const itemsJson = partNames.map(
          (name, index) => ({
            id: `item-${index}`,
            itemName: name,
            quantity: row.qty
          })
        );

        const status =
          row.dispatchCell.trim() !== ""
            ? "DISPATCHED"
            : "PENDING";

        const remarks =
          `${row.pumpCapacity || ""} - ${row.otherDetail || ""
            }`.trim();

        return {
          requestUniqueId,
          ticketId,
          engineerId,
          status,
          remarks,
          itemsJson,
          createdAt: parsedTimestamp,
          syncId: row.syncId
        };
      });

      // ============================================================
      // STEP 9: PROCESS MATERIAL REQUESTS IN PARALLEL BATCHES
      // ============================================================

      const MATERIAL_BATCH_SIZE = 15;

      const totalBatches = Math.ceil(
        preparedRequests.length /
        MATERIAL_BATCH_SIZE
      );

      let count = 0;

      console.log(
        `🚀 [Sync] Starting ${totalBatches} material request batches...`
      );

      for (
        let i = 0;
        i < preparedRequests.length;
        i += MATERIAL_BATCH_SIZE
      ) {
        const batch = preparedRequests.slice(
          i,
          i + MATERIAL_BATCH_SIZE
        );

        const batchNumber =
          Math.floor(
            i / MATERIAL_BATCH_SIZE
          ) + 1;

        console.log(
          `📦 [Sync] Batch ${batchNumber}/${totalBatches} — processing ${batch.length} requests`
        );

        for (const request of batch) {
          // Find existing request by Sync ID or fallback to legacy composite ID (id)
          let existingRequest = null;
          if (request.syncId) {
            existingRequest = await prisma.materialRequest.findUnique({
              where: { sourceRowId: request.syncId }
            });
          }
          if (!existingRequest) {
            existingRequest = await prisma.materialRequest.findUnique({
              where: { id: request.requestUniqueId }
            });
          }

          if (existingRequest) {
            // Edit flow: Update the same physical record
            await prisma.materialRequest.update({
              where: { id: existingRequest.id },
              data: {
                sourceRowId: request.syncId || existingRequest.sourceRowId, // Backfill Sync ID
                status: request.status,
                remarks: request.remarks,
                items: request.itemsJson,
                engineerId: request.engineerId
              }
            });
          } else {
            // Creation flow: Inserts a new request
            await prisma.materialRequest.create({
              data: {
                id: request.requestUniqueId,
                sourceRowId: request.syncId || null,
                ticketId: request.ticketId,
                status: request.status,
                remarks: request.remarks,
                items: request.itemsJson,
                engineerId: request.engineerId,
                createdAt: request.createdAt
              }
            });
          }
        }

        count += batch.length;

        console.log(
          `✅ [Sync] Batch ${batchNumber}/${totalBatches} complete — ${count}/${preparedRequests.length}`
        );
      }

      console.log(
        `🎉 [Sync] Successfully synced ${count} material request entries for "${activeSchema}"`
      );

      return {
        newRequestsImported: count
      };
    } catch (err: any) {
      console.error(
        "❌ [Sync] Error syncing Google Sheets:",
        err.message
      );

      throw err;
    }
  },
  async syncSingleRequest(data: any) {
    const warehouseCell = data["Requesting to - Warehouse"] || "";
    let targetSchema = "";
    if (matchesSchema(warehouseCell, "jalna")) targetSchema = "jalna";
    else if (matchesSchema(warehouseCell, "rajasthan")) targetSchema = "rajasthan";
    else if (matchesSchema(warehouseCell, "haryana")) targetSchema = "haryana";
    else if (matchesSchema(warehouseCell, "mp")) targetSchema = "mp";

    if (!targetSchema) {
      return { success: false, reason: `Unrecognized warehouse: "${warehouseCell}"` };
    }

    const { warehouseContext } = await import("../db");

    return warehouseContext.run(targetSchema, async () => {
      const timestamp = data["Timestamp"];
      const appId = data["Application ID/ / Saral ID"] || data["Application ID"] || data["Saral ID"];
      const pumpCapacity = data["Pump Capacity"];
      const materialRequired = data["Material Required"] || data["Material"];
      const otherDetail = data["Other"] || "";
      const engineerName = data["Service Engineer"] || data["Engineer"];
      const quantityCell = data["Quantity"];
      const dispatchCell = data["Dispatch Status (by Milan)"] || data["Dispatch Status"] || "";
      const syncId = data["Sync ID"] || data["sourceRowId"] || data["syncId"];

      if (!appId || !materialRequired) {
        return { success: false, reason: "Missing Application ID or Material Required." };
      }

      const qty = parseInt(quantityCell) || 1;
      const cleanAppId = appId.trim();
      const cleanMaterial = materialRequired.trim();
      const cleanEngName = (engineerName || "Field Engineer").trim();

      // 1. Resolve Engineer
      let engineer = await prisma.engineer.findFirst({
        where: { name: { equals: cleanEngName, mode: "insensitive" } }
      });
      if (!engineer) {
        const email = `${cleanEngName.toLowerCase().replace(/[^a-z0-9]/g, "")}@claro.com`;
        engineer = await prisma.engineer.create({
          data: {
            name: cleanEngName,
            email,
            phone: "9999999999",
            isActive: true
          }
        });
      }

      // 2. Resolve MasterInstallation (Farmer) - CRITICAL: Resolving first satisfies FK constraints!
      await prisma.masterInstallation.upsert({
        where: { applicationId: cleanAppId },
        update: {},
        create: {
          applicationId: cleanAppId,
          clientName: `Farmer (${cleanAppId})`
        }
      });

      // 3. Resolve Complaint & Ticket
      let complaint = await prisma.complaint.findUnique({
        where: { applicationId: cleanAppId }
      });
      let ticketId = complaint?.ticketId;
      if (!complaint) {
        const ticket = await prisma.ticket.create({ data: {} });
        ticketId = ticket.id;
        complaint = await prisma.complaint.create({
          data: {
            applicationId: cleanAppId,
            ticketId: ticket.id
          }
        });
      }

      // 4. Resolve Material Request
      const cleanedTime = timestamp ? new Date(timestamp).getTime() : "no-time";
      const legacyUniqueId = `req-${cleanAppId}-${cleanMaterial.replace(/[^a-zA-Z0-9]/g, "")}-${cleanedTime}`.substring(0, 80);
      const partNames = cleanMaterial.split(",").map((p: string) => p.trim());
      const itemsJson = partNames.map((name: string, index: number) => ({
        id: `item-${index}`,
        itemName: name,
        quantity: qty
      }));

      const status = dispatchCell.trim() !== "" ? "DISPATCHED" : "PENDING";
      const remarks = `${pumpCapacity || ""} - ${otherDetail || ""}`.trim();

      // Find existing request by Sync ID or fallback to legacy composite ID (id)
      let existingRequest = null;
      if (syncId) {
        existingRequest = await prisma.materialRequest.findUnique({
          where: { sourceRowId: syncId }
        });
      }
      if (!existingRequest) {
        existingRequest = await prisma.materialRequest.findUnique({
          where: { id: legacyUniqueId }
        });
      }

      let result;
      if (existingRequest) {
        // Edit flow: Update the same physical record
        result = await prisma.materialRequest.update({
          where: { id: existingRequest.id },
          data: {
            sourceRowId: syncId || existingRequest.sourceRowId, // Backfill Sync ID on legacy match
            status,
            remarks,
            items: itemsJson,
            engineerId: engineer.id
          }
        });
      } else {
        // Creation flow: Inserts a new request
        result = await prisma.materialRequest.create({
          data: {
            id: legacyUniqueId,
            sourceRowId: syncId || null,
            ticketId: ticketId!,
            status,
            remarks,
            items: itemsJson,
            engineerId: engineer.id,
            createdAt: timestamp ? new Date(timestamp) : new Date()
          }
        });
      }

      return { success: true, id: result.id, targetSchema };
    });
  },

  async adjustStock(data: {
    partCode: string;
    serialNo?: string;
    actionType: string;
    field: string;
    quantity: number;
    reason: string;
    userId: string;
    warehouseId: string;
  }): Promise<any> {
    const part = await prisma.part.findUnique({
      where: { code: data.partCode }
    });
    if (!part) throw new Error(`Part with code ${data.partCode} not found.`);

    const statusMap: Record<string, string> = {
      fresh: "Fresh",
      faulty: "Faulty-Received",
      crompton: "At-Manufacturer"
    };

    const targetStatus = statusMap[data.field];
    if (!targetStatus) throw new Error(`Invalid stock field ${data.field}`);

    const qty = data.quantity;

    if (part.serialTracked) {
      if (!data.serialNo) {
        throw new Error(`Serial number is required for serialized part ${part.code}.`);
      }
      const cleanSerial = data.serialNo.trim();

      if (data.actionType === "ADD") {
        const existing = await prisma.unitLedger.findUnique({
          where: { serialNo: cleanSerial }
        });
        if (existing) {
          throw new Error(`Serial number ${cleanSerial} already exists in database with status '${existing.status}'.`);
        }

        await prisma.unitLedger.create({
          data: {
            serialNo: cleanSerial,
            partCode: part.code,
            status: targetStatus,
            condition: data.field === "fresh" ? "New" : undefined,
            currentLocation: data.warehouseId
          }
        });
      } else {
        const existing = await prisma.unitLedger.findUnique({
          where: { serialNo: cleanSerial }
        });
        if (!existing) {
          throw new Error(`Serial number ${cleanSerial} not found in database.`);
        }
        if (existing.partCode !== part.code) {
          throw new Error(`Serial number ${cleanSerial} belongs to part code ${existing.partCode}, not ${part.code}.`);
        }

        if (data.actionType === "WRITE_OFF" || data.actionType === "REMOVE") {
          await prisma.unitLedger.update({
            where: { serialNo: cleanSerial },
            data: {
              status: "Scrapped",
              condition: "Scrapped",
              currentLocation: "Written-off / Adjusted Out"
            }
          });
        } else if (data.actionType === "CORRECT") {
          await prisma.unitLedger.delete({
            where: { serialNo: cleanSerial }
          });
        }
      }

      return prisma.inventoryAdjustment.create({
        data: {
          partCode: part.code,
          serialNo: cleanSerial,
          actionType: data.actionType,
          field: data.field,
          quantity: data.actionType === "ADD" ? 1 : -1,
          reason: data.reason,
          userId: data.userId
        },
        include: { user: true }
      });

    } else {
      if (data.actionType === "ADD") {
        const placeholders = [];
        for (let i = 0; i < qty; i++) {
          const dummySerial = `ADJ-${part.code}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
          placeholders.push({
            serialNo: dummySerial,
            partCode: part.code,
            status: targetStatus,
            condition: "New",
            currentLocation: data.warehouseId
          });
        }

        await prisma.unitLedger.createMany({
          data: placeholders
        });

      } else {
        const existingPlaceholders = await prisma.unitLedger.findMany({
          where: {
            partCode: part.code,
            status: targetStatus,
            currentLocation: data.warehouseId
          },
          take: qty
        });

        if (existingPlaceholders.length < qty) {
          throw new Error(`Insufficient stock of non-serialized part ${part.code} in ${targetStatus}. Available: ${existingPlaceholders.length}, Requested: ${qty}.`);
        }

        const serialsToUpdate = existingPlaceholders.map(p => p.serialNo);

        if (data.actionType === "WRITE_OFF" || data.actionType === "REMOVE") {
          await prisma.unitLedger.updateMany({
            where: { serialNo: { in: serialsToUpdate } },
            data: {
              status: "Scrapped",
              condition: "Scrapped",
              currentLocation: "Written-off / Adjusted Out"
            }
          });
        } else {
          await prisma.unitLedger.deleteMany({
            where: { serialNo: { in: serialsToUpdate } }
          });
        }
      }

      return prisma.inventoryAdjustment.create({
        data: {
          partCode: part.code,
          serialNo: null,
          actionType: data.actionType,
          field: data.field,
          quantity: data.actionType === "ADD" ? qty : -qty,
          reason: data.reason,
          userId: data.userId
        },
        include: { user: true }
      });
    }
  },

  async getPartSerials(partCode: string): Promise<any> {
    return prisma.unitLedger.findMany({
      where: {
        partCode,
        status: { in: ["Fresh", "Faulty-Received", "At-Manufacturer"] }
      },
      orderBy: { serialNo: "asc" }
    });
  },

  async getAdjustments(): Promise<any> {
    return prisma.inventoryAdjustment.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });
  }
};

// Helper parsing functions
function parseCSV(text: string): string[][] {
  const lines = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentField = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim());
      currentField = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentField.trim());
      if (row.length > 1 || row[0] !== "") {
        lines.push(row);
      }
      row = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }
  if (currentField !== "" || row.length > 0) {
    row.push(currentField.trim());
    lines.push(row);
  }
  return lines;
}

function matchesSchema(warehouseCell: string, schema: string): boolean {
  const cell = (warehouseCell || "").toLowerCase();
  if (schema === "jalna") return cell.includes("jalna") || cell.includes("mh");
  if (schema === "rajasthan") return cell.includes("rajasthan") || cell.includes("rj");
  if (schema === "haryana") return cell.includes("haryana") || cell.includes("hariyana") || cell.includes("hr") || cell.includes("fatehbad") || cell.includes("fatehabad");
  if (schema === "mp") return cell.includes("mp") || cell.includes("vidisha");
  return false;
}
