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
    const sentToFarmersThisWeek = await prisma.inventoryMovement.count({
      where: {
        warehouseId,
        type: 2,
        timestamp: { gte: oneWeekAgo }
      }
    });

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

      // 1.5. Validate Ledger State Machine Transitions for Serial Numbers
      for (const line of data.lines) {
        if (line.serials && line.serials.length > 0) {
          for (const sn of line.serials) {
            const cleanSn = sn.trim();
            const existing = await tx.unitLedger.findUnique({
              where: { serialNo: cleanSn }
            });

            if (data.stage === 1) {
              // Received from Manufacturer: serial shouldn't already be active in stock
              if (existing && ["Fresh", "Sent-to Farmer", "Faulty-Received", "At-Manufacturer"].includes(existing.status)) {
                throw new Error(`Validation Error: Serial number '${cleanSn}' is already active in stock (status: '${existing.status}').`);
              }
            } else if (data.stage === 2) {
              // Sent to Farmer: allows new serials to be logged directly (same as Stage 1),
              // but if it already exists, it must be Fresh at this warehouse.
              if (existing) {
                if (existing.status !== "Fresh" || existing.currentLocation !== data.warehouseId) {
                  throw new Error(`Validation Error: Serial number '${cleanSn}' cannot be dispatched because its current status is '${existing.status}' at location '${existing.currentLocation}'.`);
                }
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

        if (line.serials && line.serials.length > 0) {
          await tx.movementSerialNumber.createMany({
            data: line.serials.map(sn => ({
              movementLineId: movementLine.id,
              serialNumber: sn.trim()
            }))
          });

          // Update UnitLedger states based on cycle stage
          for (const sn of line.serials) {
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
              // Sent to Farmer (using upsert to allow new serial registration on dispatch)
              await tx.unitLedger.upsert({
                where: { serialNo: cleanSn },
                update: {
                  status: "Sent-to Farmer",
                  currentLocation: data.referenceNumber // Farmer App ID
                },
                create: {
                  serialNo: cleanSn,
                  partCode: line.partCode,
                  status: "Sent-to Farmer",
                  condition: "New",
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

        // Count existing GRC challans for this warehouse to increment sequence correctly
        const challanCount = await tx.challan.count({
          where: {
            movement: {
              warehouseId: data.warehouseId,
              type: 4
            }
          }
        });

        const paddedNum = String(challanCount + 1).padStart(4, "0");
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
            // If there are no prior movements, this was Stage 1 (received), so we delete from ledger
            await tx.unitLedger.delete({
              where: { serialNo: sn.serialNumber }
            });
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
      await tx.materialRequest.updateMany({
        where: { status: "DISPATCHED" },
        data: { status: "PENDING" }
      });
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
            complaint: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  },

  async updateMaterialStatus(id: string, status: string) {
    return prisma.materialRequest.update({
      where: { id },
      data: { status }
    });
  },

  async syncRequests(): Promise<{ newRequestsImported: number }> {
    const { warehouseContext } = await import("../db");
    const activeSchema = warehouseContext.getStore() || "jalna";
    if (activeSchema === "all") {
      const schemas = ["jalna", "rajasthan", "haryana", "mp"];
      const results = await Promise.all(
        schemas.map((schema: string) =>
          warehouseContext.run(schema, () => wmsService.syncRequests())
        )
      );
      const sum = results.reduce((acc: number, r: any) => acc + (r.newRequestsImported || 0), 0);
      return { newRequestsImported: sum };
    }

    const sheetUrl = "https://docs.google.com/spreadsheets/d/1kQkVIhbOgg3n4FHSia2Ow7Scm0AZLWHuMAwA-1cOsZY/export?format=csv&gid=193399218";

    console.log(`🔄 [Sync] Fetching material requests for schema context: "${activeSchema}"`);

    try {
      console.log(`📥 [Sync] Sending fetch request to Google Sheets...`);
      const response = await fetch(sheetUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const csvText = await response.text();
      console.log(`📥 [Sync] Sheet fetched successfully. Size: ${csvText.length} characters.`);

      // Custom line parser to correctly process quoted strings with internal commas
      const rows = parseCSV(csvText);
      console.log(`📊 [Sync] Parsed ${rows.length} rows from CSV.`);
      if (rows.length < 2) return { newRequestsImported: 0 };

      // Header row mapping checks
      const dataRows = rows.slice(1);
      let count = 0;

      // In-memory caches to minimize duplicate database network roundtrips
      const engineerCache = new Map<string, string>(); // name.toLowerCase() -> engineerId
      const ticketCache = new Map<string, string>();   // appId -> ticketId

      for (const row of dataRows) {
        if (row.length < 9) continue;

        const timestamp = row[0];
        const warehouseCell = row[1];
        const appId = row[2];
        const pumpCapacity = row[3];
        const materialRequired = row[4];
        const otherDetail = row[5];
        const engineerName = row[6];
        const quantityCell = row[8];
        const dispatchCell = row[12] || "";

        if (!appId || !materialRequired) continue;

        // Skip rows that do not match the active schema context
        if (!matchesSchema(warehouseCell, activeSchema)) continue;

        const qty = parseInt(quantityCell) || 1;
        const cleanAppId = appId.trim();
        const cleanMaterial = materialRequired.trim();
        const cleanEngName = (engineerName || "Field Engineer").trim();

        console.log(`🔎 [Sync] Found matching row for "${activeSchema}": AppId=${cleanAppId}, Eng=${cleanEngName}`);

        // 1. Resolve Engineer via cache/database
        let engineerId = engineerCache.get(cleanEngName.toLowerCase());
        if (!engineerId) {
          console.log(`   [Sync] Cache miss. Querying engineer "${cleanEngName}"...`);
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
            console.log(`   [Sync] Created new engineer: ${engineer.id}`);
          }
          engineerId = engineer.id;
          engineerCache.set(cleanEngName.toLowerCase(), engineerId);
        }

        // 2. Resolve Complaint & Ticket via cache/database
        let ticketId = ticketCache.get(cleanAppId);
        if (!ticketId) {
          let complaint = await prisma.complaint.findUnique({
            where: { applicationId: cleanAppId }
          });
          if (!complaint) {
            const ticket = await prisma.ticket.create({ data: {} });
            ticketId = ticket.id;
            await prisma.complaint.create({
              data: {
                applicationId: cleanAppId,
                ticketId: ticket.id
              }
            });
          } else {
            ticketId = complaint.ticketId;
          }
          ticketCache.set(cleanAppId, ticketId);
        }

        // 3. Resolve MasterInstallation (Farmer) if it doesn't exist
        await prisma.masterInstallation.upsert({
          where: { applicationId: cleanAppId },
          update: {},
          create: {
            applicationId: cleanAppId,
            clientName: `Farmer (${cleanAppId})`
          }
        });

        // 4. Resolve Material Request unique ID and pre-populate JSON items array
        const cleanedTime = timestamp ? new Date(timestamp).getTime() : "no-time";
        const requestUniqueId = `req-${cleanAppId}-${cleanMaterial.replace(/[^a-zA-Z0-9]/g, "")}-${cleanedTime}`.substring(0, 80);
        
        const partNames = cleanMaterial.split(",").map(p => p.trim());
        const itemsJson = partNames.map((name, index) => ({
          id: `item-${index}`,
          itemName: name,
          quantity: qty
        }));

        const status = dispatchCell.trim() !== "" ? "DISPATCHED" : "PENDING";
        const remarks = `${pumpCapacity || ""} - ${otherDetail || ""}`.trim();

        await prisma.materialRequest.upsert({
          where: { id: requestUniqueId },
          update: {
            status,
            remarks,
            items: itemsJson,
            engineerId: engineerId
          },
          create: {
            id: requestUniqueId,
            ticketId: ticketId!,
            status,
            remarks,
            items: itemsJson,
            engineerId: engineerId,
            createdAt: timestamp ? new Date(timestamp) : new Date()
          }
        });

        count++;
      }

      console.log(`✅ [Sync] Successfully synced ${count} material request entries for "${activeSchema}"`);
      return { newRequestsImported: count };
    } catch (err: any) {
      console.error("❌ [Sync] Error syncing Google Sheets:", err.message);
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

      // 2. Resolve Complaint & Ticket
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

      // 3. Resolve MasterInstallation (Farmer)
      await prisma.masterInstallation.upsert({
        where: { applicationId: cleanAppId },
        update: {},
        create: {
          applicationId: cleanAppId,
          clientName: `Farmer (${cleanAppId})`
        }
      });

      // 4. Resolve Material Request
      const cleanedTime = timestamp ? new Date(timestamp).getTime() : "no-time";
      const requestUniqueId = `req-${cleanAppId}-${cleanMaterial.replace(/[^a-zA-Z0-9]/g, "")}-${cleanedTime}`.substring(0, 80);
      const partNames = cleanMaterial.split(",").map((p: string) => p.trim());
      const itemsJson = partNames.map((name: string, index: number) => ({
        id: `item-${index}`,
        itemName: name,
        quantity: qty
      }));

      const status = dispatchCell.trim() !== "" ? "DISPATCHED" : "PENDING";
      const remarks = `${pumpCapacity || ""} - ${otherDetail || ""}`.trim();

      const result = await prisma.materialRequest.upsert({
        where: { id: requestUniqueId },
        update: {
          status,
          remarks,
          items: itemsJson,
          engineerId: engineer.id
        },
        create: {
          id: requestUniqueId,
          ticketId: ticketId!,
          status,
          remarks,
          items: itemsJson,
          engineerId: engineer.id,
          createdAt: timestamp ? new Date(timestamp) : new Date()
        }
      });

      return { success: true, id: result.id, targetSchema };
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
  if (schema === "haryana") return cell.includes("haryana") || cell.includes("hr") || cell.includes("fatehbad");
  if (schema === "mp") return cell.includes("mp") || cell.includes("vidisha");
  return false;
}
