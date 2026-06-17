import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminGate';
import { getModel, humanizeModel, isWritable, modelSchema } from '@/lib/dbAdminServer';

export async function GET(_req: Request, props: { params: Promise<{ table: string }> }) {
  const params = await props.params;
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const { table } = params;

  if (!getModel(table)) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const fields = modelSchema(table);
  if (!fields) {
    return NextResponse.json({ error: 'Schema not available' }, { status: 404 });
  }

  return NextResponse.json({
    table,
    displayName: humanizeModel(table),
    writable: isWritable(table),
    fields,
  });
}
