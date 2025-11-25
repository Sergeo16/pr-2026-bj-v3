import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';

// Empêcher le pré-rendu de cette route (nécessite DB)
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const pool = getPool();

      // Fonction pour récupérer toutes les stats (comme stats/route.ts)
      const fetchStats = async () => {
        try {
          // Statistiques nationales totales
          const nationalStats = await pool.query(`
            SELECT 
              COALESCE(SUM(inscrits), 0) as total_inscrits,
              COALESCE(SUM(votants), 0) as total_votants,
              COALESCE(SUM(bulletins_nuls), 0) as total_bulletins_nuls,
              COALESCE(SUM(bulletins_blancs), 0) as total_bulletins_blancs,
              COALESCE(SUM(suffrages_exprimes), 0) as total_suffrages_exprimes,
              COALESCE(SUM(voix_wadagni_talata), 0) as total_wadagni_talata,
              COALESCE(SUM(voix_hounkpe_hounwanou), 0) as total_hounkpe_hounwanou
            FROM vote
          `);

          const stats = nationalStats.rows[0];
          const totalInscrits = parseInt(stats.total_inscrits, 10);
          const totalVotants = parseInt(stats.total_votants, 10);
          const tauxParticipation = totalInscrits > 0 
            ? ((totalVotants / totalInscrits) * 100).toFixed(2)
            : '0.00';
          const totalVoix = parseInt(stats.total_wadagni_talata, 10) + parseInt(stats.total_hounkpe_hounwanou, 10);

          const byDuo = [
            {
              id: 1,
              label: 'WADAGNI - TALATA',
              total: parseInt(stats.total_wadagni_talata, 10),
              percentage: totalVoix > 0 
                ? ((parseInt(stats.total_wadagni_talata, 10) / totalVoix) * 100).toFixed(2)
                : '0.00',
            },
            {
              id: 2,
              label: 'HOUNKPE - HOUNWANOU',
              total: parseInt(stats.total_hounkpe_hounwanou, 10),
              percentage: totalVoix > 0
                ? ((parseInt(stats.total_hounkpe_hounwanou, 10) / totalVoix) * 100).toFixed(2)
                : '0.00',
            },
          ];

          // Stats par département
          const deptStats = await pool.query(`
            SELECT 
              dept.id,
              dept.name,
              COALESCE(SUM(v.inscrits), 0) as total_inscrits,
              COALESCE(SUM(v.votants), 0) as total_votants,
              COALESCE(SUM(v.bulletins_nuls), 0) as total_bulletins_nuls,
              COALESCE(SUM(v.bulletins_blancs), 0) as total_bulletins_blancs,
              COALESCE(SUM(v.suffrages_exprimes), 0) as total_suffrages_exprimes,
              COALESCE(SUM(v.voix_wadagni_talata), 0) as total_wadagni_talata,
              COALESCE(SUM(v.voix_hounkpe_hounwanou), 0) as total_hounkpe_hounwanou
            FROM departement dept
            LEFT JOIN vote v ON v.departement_id = dept.id
            GROUP BY dept.id, dept.name
            ORDER BY dept.name
          `);

          // Stats par commune
          const communeStats = await pool.query(`
            SELECT 
              c.id,
              c.name as commune_name,
              dept.name as departement_name,
              COALESCE(SUM(v.inscrits), 0) as total_inscrits,
              COALESCE(SUM(v.votants), 0) as total_votants,
              COALESCE(SUM(v.bulletins_nuls), 0) as total_bulletins_nuls,
              COALESCE(SUM(v.bulletins_blancs), 0) as total_bulletins_blancs,
              COALESCE(SUM(v.suffrages_exprimes), 0) as total_suffrages_exprimes,
              COALESCE(SUM(v.voix_wadagni_talata), 0) as total_wadagni_talata,
              COALESCE(SUM(v.voix_hounkpe_hounwanou), 0) as total_hounkpe_hounwanou
            FROM commune c
            JOIN departement dept ON c.departement_id = dept.id
            LEFT JOIN vote v ON v.commune_id = c.id
            GROUP BY c.id, c.name, dept.name
            ORDER BY dept.name, c.name
          `);

          // Stats par arrondissement
          const arrStats = await pool.query(`
            SELECT 
              a.id,
              a.name as arrondissement_name,
              c.name as commune_name,
              dept.name as departement_name,
              COALESCE(SUM(v.inscrits), 0) as total_inscrits,
              COALESCE(SUM(v.votants), 0) as total_votants,
              COALESCE(SUM(v.bulletins_nuls), 0) as total_bulletins_nuls,
              COALESCE(SUM(v.bulletins_blancs), 0) as total_bulletins_blancs,
              COALESCE(SUM(v.suffrages_exprimes), 0) as total_suffrages_exprimes,
              COALESCE(SUM(v.voix_wadagni_talata), 0) as total_wadagni_talata,
              COALESCE(SUM(v.voix_hounkpe_hounwanou), 0) as total_hounkpe_hounwanou
            FROM arrondissement a
            JOIN commune c ON a.commune_id = c.id
            JOIN departement dept ON c.departement_id = dept.id
            LEFT JOIN vote v ON v.arrondissement_id = a.id
            GROUP BY a.id, a.name, c.name, dept.name
            ORDER BY dept.name, c.name, a.name
          `);

          // Stats par village
          const villageStats = await pool.query(`
            SELECT 
              v.id,
              v.name as village_name,
              a.name as arrondissement_name,
              c.name as commune_name,
              dept.name as departement_name,
              COALESCE(SUM(vote.inscrits), 0) as total_inscrits,
              COALESCE(SUM(vote.votants), 0) as total_votants,
              COALESCE(SUM(vote.bulletins_nuls), 0) as total_bulletins_nuls,
              COALESCE(SUM(vote.bulletins_blancs), 0) as total_bulletins_blancs,
              COALESCE(SUM(vote.suffrages_exprimes), 0) as total_suffrages_exprimes,
              COALESCE(SUM(vote.voix_wadagni_talata), 0) as total_wadagni_talata,
              COALESCE(SUM(vote.voix_hounkpe_hounwanou), 0) as total_hounkpe_hounwanou
            FROM village v
            JOIN arrondissement a ON v.arrondissement_id = a.id
            JOIN commune c ON a.commune_id = c.id
            JOIN departement dept ON c.departement_id = dept.id
            LEFT JOIN vote vote ON vote.village_id = v.id
            GROUP BY v.id, v.name, a.name, c.name, dept.name
            ORDER BY dept.name, c.name, a.name, v.name
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
              COALESCE(SUM(vote.inscrits), 0) as total_inscrits,
              COALESCE(SUM(vote.votants), 0) as total_votants,
              COALESCE(SUM(vote.bulletins_nuls), 0) as total_bulletins_nuls,
              COALESCE(SUM(vote.bulletins_blancs), 0) as total_bulletins_blancs,
              COALESCE(SUM(vote.suffrages_exprimes), 0) as total_suffrages_exprimes,
              COALESCE(SUM(vote.voix_wadagni_talata), 0) as total_wadagni_talata,
              COALESCE(SUM(vote.voix_hounkpe_hounwanou), 0) as total_hounkpe_hounwanou
            FROM centre c
            JOIN village v ON c.village_id = v.id
            JOIN arrondissement a ON v.arrondissement_id = a.id
            JOIN commune com ON a.commune_id = com.id
            JOIN departement dept ON com.departement_id = dept.id
            LEFT JOIN vote vote ON vote.centre_id = c.id
            GROUP BY c.id, c.name, v.name, a.name, com.name, dept.name
            ORDER BY dept.name, com.name, a.name, v.name, c.name
          `);

          // Stats par bureau de vote
          const bureauStats = await pool.query(`
            SELECT 
              bv.id,
              bv.name as bureau_name,
              c.name as centre_name,
              v.name as village_name,
              a.name as arrondissement_name,
              com.name as commune_name,
              dept.name as departement_name,
              COALESCE(SUM(vote.inscrits), 0) as total_inscrits,
              COALESCE(SUM(vote.votants), 0) as total_votants,
              COALESCE(SUM(vote.bulletins_nuls), 0) as total_bulletins_nuls,
              COALESCE(SUM(vote.bulletins_blancs), 0) as total_bulletins_blancs,
              COALESCE(SUM(vote.suffrages_exprimes), 0) as total_suffrages_exprimes,
              COALESCE(SUM(vote.voix_wadagni_talata), 0) as total_wadagni_talata,
              COALESCE(SUM(vote.voix_hounkpe_hounwanou), 0) as total_hounkpe_hounwanou
            FROM bureau_vote bv
            JOIN centre c ON bv.centre_id = c.id
            JOIN village v ON c.village_id = v.id
            JOIN arrondissement a ON v.arrondissement_id = a.id
            JOIN commune com ON a.commune_id = com.id
            JOIN departement dept ON com.departement_id = dept.id
            LEFT JOIN vote vote ON vote.bureau_vote_id = bv.id
            GROUP BY bv.id, bv.name, c.name, v.name, a.name, com.name, dept.name
            ORDER BY dept.name, com.name, a.name, v.name, c.name, bv.name
          `);

          // Stats par agent (limité pour éviter de surcharger)
          const agentStats = await pool.query(`
            SELECT 
              vote.full_name,
              vote.id,
              vote.created_at,
              dept.name as departement_name,
              com.name as commune_name,
              a.name as arrondissement_name,
              v.name as village_name,
              c.name as centre_name,
              bv.name as bureau_name,
              vote.inscrits,
              vote.votants,
              vote.voix_wadagni_talata,
              vote.voix_hounkpe_hounwanou
            FROM vote
            JOIN departement dept ON vote.departement_id = dept.id
            JOIN commune com ON vote.commune_id = com.id
            JOIN arrondissement a ON vote.arrondissement_id = a.id
            JOIN village v ON vote.village_id = v.id
            JOIN centre c ON vote.centre_id = c.id
            LEFT JOIN bureau_vote bv ON vote.bureau_vote_id = bv.id
            ORDER BY vote.created_at DESC
            LIMIT 1000
          `);

          send({
            type: 'stats',
            data: {
              national: {
                totalInscrits,
                totalVotants,
                tauxParticipation,
                totalBulletinsNuls: parseInt(stats.total_bulletins_nuls, 10),
                totalBulletinsBlancs: parseInt(stats.total_bulletins_blancs, 10),
                totalSuffragesExprimes: parseInt(stats.total_suffrages_exprimes, 10),
                totalVoix,
                byDuo,
              },
              byDepartement: deptStats.rows,
              byCommune: communeStats.rows,
              byArrondissement: arrStats.rows,
              byVillage: villageStats.rows,
              byCentre: centreStats.rows,
              byBureau: bureauStats.rows,
              byAgent: agentStats.rows,
            },
          });
        } catch (error) {
          console.error('Error fetching stats:', error);
          send({
            type: 'error',
            message: 'Error fetching statistics',
          });
        }
      };

      // Envoyer les stats immédiatement
      await fetchStats();

      // Envoyer les stats toutes les 2 secondes
      const interval = setInterval(async () => {
        await fetchStats();
      }, 2000);

      // Nettoyer à la fermeture
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

