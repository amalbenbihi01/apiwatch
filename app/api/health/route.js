import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Non-blocking query to check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return Response.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
      },
      { status: 200 }
    );
  } catch (error) {
    // Do not leak error details, credentials, or stack traces
    return Response.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
