import { PrismaClient } from "@prisma/client";
import { runSeed } from "../lib/seedData";

const prisma = new PrismaClient();

async function main() {
  const result = await runSeed(prisma);
  console.log(`Seeded Calgary (id=${result.teamId}).`, result.curveAlreadyPresent
    ? "Pick-value curve already present, left untouched."
    : `Wrote ${result.curveRowsWritten} pick-value rows.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
