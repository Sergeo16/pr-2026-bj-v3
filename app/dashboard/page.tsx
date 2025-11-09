'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DuoStat {
  id: number;
  label: string;
  total: number;
  percentage: string;
}

interface DashboardData {
  national: {
    total: number;
    byDuo: DuoStat[];
  };
  byDepartement: any[];
  byCommune: any[];
  byArrondissement: any[];
  byVillage: any[];
  byCentre: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filter, setFilter] = useState<'departement' | 'commune' | 'arrondissement' | 'village' | 'centre'>('departement');
  const [filterValue, setFilterValue] = useState<string>('');
  const [filteredData, setFilteredData] = useState<any[]>([]);

  useEffect(() => {
    // Charger les stats initiales complètes (une seule fois)
    fetchStats();
    
    // SSE pour les mises à jour en temps réel des totaux nationaux uniquement
    const eventSource = new EventSource('/api/dashboard/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'stats' && parsed.data) {
          // Mettre à jour seulement les totaux nationaux depuis le stream SSE
          // Cela évite de faire des requêtes répétées à /api/dashboard/stats
          setData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              national: parsed.data.national,
            };
          });
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      // En cas d'erreur, fermer la connexion
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (data) {
      applyFilter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, filterValue, data]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const stats = await response.json();
      setData(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const applyFilter = () => {
    if (!data) return;

    let sourceData: any[] = [];
    switch (filter) {
      case 'departement':
        sourceData = data.byDepartement;
        break;
      case 'commune':
        sourceData = data.byCommune;
        break;
      case 'arrondissement':
        sourceData = data.byArrondissement;
        break;
      case 'village':
        sourceData = data.byVillage;
        break;
      case 'centre':
        sourceData = data.byCentre;
        break;
    }

    if (filterValue) {
      const filtered = sourceData.filter((item) => {
        const nameField = filter === 'departement' ? 'name' : 
                          filter === 'commune' ? 'commune_name' :
                          filter === 'arrondissement' ? 'arrondissement_name' :
                          filter === 'village' ? 'village_name' : 'centre_name';
        return item[nameField]?.toLowerCase().includes(filterValue.toLowerCase());
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(sourceData);
    }
  };

  const exportToCSV = () => {
    if (!filteredData.length) return;

    const headers = Object.keys(filteredData[0]).join(',');
    const rows = filteredData.map((row) => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pr2026_${filter}_${new Date().toISOString()}.csv`;
    a.click();
  };

  if (!data) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8 px-2 sm:px-0">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center">Dashboard - Synthèse en Temps Réel</h1>

      {/* Nombre total de votes */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-4 sm:p-6">
          <h2 className="card-title text-xl sm:text-2xl">Nombre total de votes</h2>
          <p className="text-2xl sm:text-3xl font-bold">{data.national.total.toLocaleString()} votes</p>

          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={400} minHeight={300}>
              <BarChart data={data.national.byDuo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {data.national.byDuo.map((duo) => (
              <div key={duo.id} className="stat bg-base-200 rounded-lg p-4">
                <div className="stat-title text-sm sm:text-base">{duo.label}</div>
                <div className="stat-value text-xl sm:text-2xl">{duo.total.toLocaleString()}</div>
                <div className="stat-desc text-sm">{duo.percentage}%</div>
              </div>
            ))}
          </div>

          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minHeight={250}>
              <PieChart>
                <Pie
                  data={data.national.byDuo}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ label, percentage }) => `${label}: ${percentage}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {data.national.byDuo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filtres et Tableau */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-4 sm:p-6">
          <div className="flex flex-wrap gap-2 sm:gap-4 mb-4">
            <select
              className="select select-bordered w-full sm:w-auto"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="departement">Par Département</option>
              <option value="commune">Par Commune</option>
              <option value="arrondissement">Par Arrondissement</option>
              <option value="village">Par Village</option>
              <option value="centre">Par Centre</option>
            </select>

            <input
              type="text"
              placeholder="Rechercher..."
              className="input input-bordered flex-1 min-w-0"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            />

            <button className="btn btn-primary w-full sm:w-auto" onClick={exportToCSV}>
              Exporter CSV
            </button>
          </div>

          <div className="overflow-x-auto -mx-2 sm:-mx-4 sm:mx-0">
            <table className="table table-zebra w-full text-xs sm:text-sm md:text-base">
              <thead>
                <tr className="whitespace-nowrap">
                  {filter === 'departement' && (
                    <>
                      <th>Département</th>
                      <th>Duo</th>
                      <th>Total Votes</th>
                    </>
                  )}
                  {filter === 'commune' && (
                    <>
                      <th>Département</th>
                      <th>Commune</th>
                      <th>Duo</th>
                      <th>Total Votes</th>
                    </>
                  )}
                  {filter === 'arrondissement' && (
                    <>
                      <th>Département</th>
                      <th>Commune</th>
                      <th>Arrondissement</th>
                      <th>Duo</th>
                      <th>Total Votes</th>
                    </>
                  )}
                  {filter === 'village' && (
                    <>
                      <th>Département</th>
                      <th>Commune</th>
                      <th>Arrondissement</th>
                      <th>Village</th>
                      <th>Duo</th>
                      <th>Total Votes</th>
                    </>
                  )}
                  {filter === 'centre' && (
                    <>
                      <th>Département</th>
                      <th>Commune</th>
                      <th>Arrondissement</th>
                      <th>Village</th>
                      <th>Centre</th>
                      <th>Duo</th>
                      <th>Total Votes</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 100).map((row, idx) => (
                  <tr key={idx}>
                    {filter === 'departement' && (
                      <>
                        <td>{row.name}</td>
                        <td>{row.duo_label}</td>
                        <td>{parseInt(row.total_votes, 10).toLocaleString()}</td>
                      </>
                    )}
                    {filter === 'commune' && (
                      <>
                        <td>{row.departement_name}</td>
                        <td>{row.commune_name}</td>
                        <td>{row.duo_label}</td>
                        <td>{parseInt(row.total_votes, 10).toLocaleString()}</td>
                      </>
                    )}
                    {filter === 'arrondissement' && (
                      <>
                        <td>{row.departement_name}</td>
                        <td>{row.commune_name}</td>
                        <td>{row.arrondissement_name}</td>
                        <td>{row.duo_label}</td>
                        <td>{parseInt(row.total_votes, 10).toLocaleString()}</td>
                      </>
                    )}
                    {filter === 'village' && (
                      <>
                        <td>{row.departement_name}</td>
                        <td>{row.commune_name}</td>
                        <td>{row.arrondissement_name}</td>
                        <td>{row.village_name}</td>
                        <td>{row.duo_label}</td>
                        <td>{parseInt(row.total_votes, 10).toLocaleString()}</td>
                      </>
                    )}
                    {filter === 'centre' && (
                      <>
                        <td>{row.departement_name}</td>
                        <td>{row.commune_name}</td>
                        <td>{row.arrondissement_name}</td>
                        <td>{row.village_name}</td>
                        <td>{row.centre_name}</td>
                        <td>{row.duo_label}</td>
                        <td>{parseInt(row.total_votes, 10).toLocaleString()}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length > 100 && (
              <div className="text-center mt-4 text-sm text-gray-500">
                Affichage des 100 premiers résultats sur {filteredData.length}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

