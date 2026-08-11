masterInstallation is being included from Complaint, but Prisma does not know a relation by that name.
sourceRowId is being used on MaterialRequest, but it is not defined in schema.prisma.
inventoryAdjustment is being used, but there is no InventoryAdjustment model in the Prisma schema/client.

That’s why TypeScript is failing before Render can deploy.

What to do first

Open:

backend/prisma/schema.prisma

and check your MaterialRequest model.

You need something like:

model MaterialRequest {
  id          String   @id
  ticketId    String
  status      String
  remarks     String?
  items       Json
  engineerId  String?
  createdAt   DateTime @default(now())

  sourceRowId String?  @unique

  ticket      Ticket   @relation(fields: [ticketId], references: [id])
  engineer    Engineer? @relation(fields: [engineerId], references: [id])
}

The important new field is:

sourceRowId String? @unique

Then the TypeScript errors around sourceRowId should disappear after regenerating Prisma Client.

Next: inventoryAdjustment

Your code is calling:

prisma.inventoryAdjustment...

but Prisma has no such model.

You therefore need a model in schema.prisma, for example:

model InventoryAdjustment {
  id            String   @id @default(cuid())
  warehouseId   String
  partCode      String
  serialNo      String?
  adjustmentType String
  stockCategory  String
  quantity       Int
  reason         String
  userId         String?
  createdAt      DateTime @default(now())

  oldStatus      String?
  newStatus      String?
}

The exact fields should match what your new adjustment code expects. I would not blindly add this exact model until we compare it with the code at lines ~1724, 1787, and 1813.

Next: masterInstallation

This error:

'masterInstallation' does not exist in type 'ComplaintInclude'

means somewhere you have code like:

include: {
  masterInstallation: true
}

but the Prisma Complaint model has no relation with that exact name.

So either:

remove that include, or
add the correct relation in Prisma, or
use the relation name that already exists in your schema.

This is the one I would not guess on.

Then run these locally

From:

C:\claro-warehouse\backend

run:

npx.cmd prisma generate

then:

npx.cmd tsc

If schema changes are intended to modify the database too, then after reviewing them:

npx.cmd prisma db push

But do not run prisma db push yet if it warns about dropping existing tables/data. Your earlier environment already showed destructive schema warnings, so inspect the schema diff first.

What this tells us

The coding agent changed wms.service.ts, but it did not fully update Prisma schema + generated client + DB structure to match the new code.

So the implementation is incomplete, not fundamentally broken.

If you send me your current:

backend/prisma/schema.prisma

I can tell you the exact Prisma changes required for:

sourceRowId
InventoryAdjustment
the correct Complaint relation

and then give you the safest exact commands to rebuild without risking your existing data.



error i got

 Downloading cache...
==> Cloning from https://github.com/davidtechone5-dev/claro-warehouse
==> Checking out commit 062e820887724f27aa26633fa667bd73c9fe6bbb in branch main
==> Downloaded 74MB in 1s. Extraction took 1s.
==> Using Node.js version 24.14.1 (default)
==> Docs on specifying a Node.js version: https://render.com/docs/node-version
==> Running build command 'npm install; npm run build'...
up to date, audited 139 packages in 392ms
22 packages are looking for funding
  run `npm fund` for details
found 0 vulnerabilities
> wms-backend@1.0.0 build
> tsc
src/services/wms.service.ts(872,17): error TS2353: Object literal may only specify known properties, and 'masterInstallation' does not exist in type 'ComplaintInclude<DefaultArgs>'.
src/services/wms.service.ts(1452,24): error TS2353: Object literal may only specify known properties, and 'sourceRowId' does not exist in type 'MaterialRequestWhereUniqueInput'.
src/services/wms.service.ts(1466,17): error TS2353: Object literal may only specify known properties, and 'sourceRowId' does not exist in type 'Without<MaterialRequestUpdateInput, MaterialRequestUncheckedUpdateInput> & MaterialRequestUncheckedUpdateInput'.
src/services/wms.service.ts(1466,64): error TS2339: Property 'sourceRowId' does not exist on type '{ id: string; createdAt: Date; remarks: string | null; status: string; ticketId: string; items: JsonValue; engineerId: string | null; }'.
src/services/wms.service.ts(1478,17): error TS2353: Object literal may only specify known properties, and 'sourceRowId' does not exist in type 'Without<MaterialRequestCreateInput, MaterialRequestUncheckedCreateInput> & MaterialRequestUncheckedCreateInput'.
src/services/wms.service.ts(1606,20): error TS2353: Object literal may only specify known properties, and 'sourceRowId' does not exist in type 'MaterialRequestWhereUniqueInput'.
src/services/wms.service.ts(1621,13): error TS2353: Object literal may only specify known properties, and 'sourceRowId' does not exist in type 'Without<MaterialRequestUpdateInput, MaterialRequestUncheckedUpdateInput> & MaterialRequestUncheckedUpdateInput'.
src/services/wms.service.ts(1621,52): error TS2339: Property 'sourceRowId' does not exist on type '{ id: string; createdAt: Date; remarks: string | null; status: string; ticketId: string; items: JsonValue; engineerId: string | null; }'.
src/services/wms.service.ts(1633,13): error TS2353: Object literal may only specify known properties, and 'sourceRowId' does not exist in type 'Without<MaterialRequestCreateInput, MaterialRequestUncheckedCreateInput> & MaterialRequestUncheckedCreateInput'.
src/services/wms.service.ts(1724,21): error TS2339: Property 'inventoryAdjustment' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/services/wms.service.ts(1787,21): error TS2339: Property 'inventoryAdjustment' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/services/wms.service.ts(1813,19): error TS2339: Property 'inventoryAdjustment' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
==> Build failed 😞
==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys