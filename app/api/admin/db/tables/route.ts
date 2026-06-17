import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminGate';
import { getModel, listModels } from '@/lib/dbAdminServer';

export async function GET() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const models = listModels();

  const counts = await Promise.all(
    models.map(async (m) => {
      const model = getModel(m.name) as { count?: () => Promise<number> } | null;
      if (!model || typeof model.count !== 'function') return 0;
      try {
        return await model.count();
      } catch {
        return 0;
      }
    }),
  );

  const tables = models.map((m, i) => ({
    name: m.name,
    displayName: m.displayName,
    count: counts[i] ?? 0,
    writable: m.writable,
  }));

  const totalRecords = counts.reduce((a, b) => a + b, 0);

  return NextResponse.json({
    tables,
    stats: {
      tables: tables.length,
      totalRecords,
      writableTables: tables.filter((t) => t.writable).length,
    },
  });
}
