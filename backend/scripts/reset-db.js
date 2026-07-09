import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  await prisma.$transaction([
    prisma.voiceCommandLog.deleteMany(),
    prisma.calendarEvent.deleteMany(),
    prisma.weatherCache.deleteMany(),
    prisma.mirrorState.deleteMany(),
    prisma.user.deleteMany()
  ]);

  console.log("Reset local mirror data.");
} finally {
  await prisma.$disconnect();
}
