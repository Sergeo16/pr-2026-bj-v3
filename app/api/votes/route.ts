import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { voteSchema, sanitizeString } from '@/lib/validation';

// Empêcher le pré-rendu de cette route (nécessite DB)
export const dynamic = 'force-dynamic';

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    const body = await req.json();
    
    // Validation avec Zod
    const validatedData = voteSchema.parse({
      fullName: sanitizeString(body.fullName || ''),
      duoId: Number(body.duoId),
      departementId: Number(body.departementId),
      communeId: Number(body.communeId),
      arrondissementId: Number(body.arrondissementId),
      villageId: Number(body.villageId),
      centreId: Number(body.centreId),
      count: Number(body.count),
    });

    await client.query('BEGIN');

    // Vérifier que les IDs existent (intégrité référentielle)
    const checks = await Promise.all([
      client.query('SELECT id FROM duo WHERE id = $1', [validatedData.duoId]),
      client.query('SELECT id FROM departement WHERE id = $1', [validatedData.departementId]),
      client.query('SELECT id FROM commune WHERE id = $1', [validatedData.communeId]),
      client.query('SELECT id FROM arrondissement WHERE id = $1', [validatedData.arrondissementId]),
      client.query('SELECT id FROM village WHERE id = $1', [validatedData.villageId]),
      client.query('SELECT id FROM centre WHERE id = $1', [validatedData.centreId]),
    ]);

    if (checks.some(result => result.rows.length === 0)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Invalid reference IDs' },
        { status: 400 }
      );
    }

    // Insertion du vote
    const result = await client.query(
      `INSERT INTO vote (
        full_name, duo_id, departement_id, commune_id, 
        arrondissement_id, village_id, centre_id, count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at`,
      [
        validatedData.fullName,
        validatedData.duoId,
        validatedData.departementId,
        validatedData.communeId,
        validatedData.arrondissementId,
        validatedData.villageId,
        validatedData.centreId,
        validatedData.count,
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      vote: result.rows[0],
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating vote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const POST = rateLimitMiddleware(handler);

