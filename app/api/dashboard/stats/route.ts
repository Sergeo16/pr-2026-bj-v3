import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { rateLimitMiddleware } from '@/lib/rate-limit';

// Empêcher le pré-rendu de cette route (nécessite DB)
export const dynamic = 'force-dynamic';

async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const pool = getPool();

    // Totaux par Duo (national)
    const duoStats = await pool.query(`
      SELECT 
        d.id,
        d.label,
        COALESCE(SUM(v.count), 0) as total_votes
      FROM duo d
      LEFT JOIN vote v ON d.id = v.duo_id
      GROUP BY d.id, d.label
      ORDER BY d.id
    `);

    const totalNational = duoStats.rows.reduce(
      (sum, row) => sum + parseInt(row.total_votes, 10),
      0
    );

    const duoStatsWithPercent = duoStats.rows.map((row) => ({
      id: row.id,
      label: row.label,
      total: parseInt(row.total_votes, 10),
      percentage:
        totalNational > 0
          ? ((parseInt(row.total_votes, 10) / totalNational) * 100).toFixed(2)
          : '0.00',
    }));

    // Stats par département
    const deptStats = await pool.query(`
      SELECT 
        dept.id,
        dept.name,
        d.label as duo_label,
        COALESCE(SUM(v.count), 0) as total_votes
      FROM departement dept
      CROSS JOIN duo d
      LEFT JOIN vote v ON v.departement_id = dept.id AND v.duo_id = d.id
      GROUP BY dept.id, dept.name, d.id, d.label
      ORDER BY dept.name, d.id
    `);

    // Stats par commune
    const communeStats = await pool.query(`
      SELECT 
        c.id,
        c.name as commune_name,
        dept.name as departement_name,
        d.label as duo_label,
        COALESCE(SUM(v.count), 0) as total_votes
      FROM commune c
      JOIN departement dept ON c.departement_id = dept.id
      CROSS JOIN duo d
      LEFT JOIN vote v ON v.commune_id = c.id AND v.duo_id = d.id
      GROUP BY c.id, c.name, dept.name, d.id, d.label
      ORDER BY dept.name, c.name, d.id
    `);

    // Stats par arrondissement
    const arrStats = await pool.query(`
      SELECT 
        a.id,
        a.name as arrondissement_name,
        c.name as commune_name,
        dept.name as departement_name,
        d.label as duo_label,
        COALESCE(SUM(v.count), 0) as total_votes
      FROM arrondissement a
      JOIN commune c ON a.commune_id = c.id
      JOIN departement dept ON c.departement_id = dept.id
      CROSS JOIN duo d
      LEFT JOIN vote v ON v.arrondissement_id = a.id AND v.duo_id = d.id
      GROUP BY a.id, a.name, c.name, dept.name, d.id, d.label
      ORDER BY dept.name, c.name, a.name, d.id
    `);

    // Stats par village
    const villageStats = await pool.query(`
      SELECT 
        v.id,
        v.name as village_name,
        a.name as arrondissement_name,
        c.name as commune_name,
        dept.name as departement_name,
        d.label as duo_label,
        COALESCE(SUM(vote.count), 0) as total_votes
      FROM village v
      JOIN arrondissement a ON v.arrondissement_id = a.id
      JOIN commune c ON a.commune_id = c.id
      JOIN departement dept ON c.departement_id = dept.id
      CROSS JOIN duo d
      LEFT JOIN vote vote ON vote.village_id = v.id AND vote.duo_id = d.id
      GROUP BY v.id, v.name, a.name, c.name, dept.name, d.id, d.label
      ORDER BY dept.name, c.name, a.name, v.name, d.id
    `);

    // Stats par centre
    const centreStats = await pool.query(`
      SELECT 
        c.id,
        c.name as centre_name,
        v.name as village_name,
        a.name as arrondissement_name,
        com.name as commune_name,
        dept.name as departement_name,
        d.label as duo_label,
        COALESCE(SUM(vote.count), 0) as total_votes
      FROM centre c
      JOIN village v ON c.village_id = v.id
      JOIN arrondissement a ON v.arrondissement_id = a.id
      JOIN commune com ON a.commune_id = com.id
      JOIN departement dept ON com.departement_id = dept.id
      CROSS JOIN duo d
      LEFT JOIN vote vote ON vote.centre_id = c.id AND vote.duo_id = d.id
      GROUP BY c.id, c.name, v.name, a.name, com.name, dept.name, d.id, d.label
      ORDER BY dept.name, com.name, a.name, v.name, c.name, d.id
    `);

    return NextResponse.json({
      national: {
        total: totalNational,
        byDuo: duoStatsWithPercent,
      },
      byDepartement: deptStats.rows,
      byCommune: communeStats.rows,
      byArrondissement: arrStats.rows,
      byVillage: villageStats.rows,
      byCentre: centreStats.rows,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = rateLimitMiddleware(handler);

