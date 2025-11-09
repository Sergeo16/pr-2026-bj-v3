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

      // Fonction pour récupérer les stats
      const fetchStats = async () => {
        try {
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

          const byDuo = duoStats.rows.map((row) => ({
            id: row.id,
            label: row.label,
            total: parseInt(row.total_votes, 10),
            percentage:
              totalNational > 0
                ? ((parseInt(row.total_votes, 10) / totalNational) * 100).toFixed(2)
                : '0.00',
          }));

          send({
            type: 'stats',
            data: {
              national: {
                total: totalNational,
                byDuo,
              },
              timestamp: new Date().toISOString(),
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

