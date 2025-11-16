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

// Couleurs pour les légendes et barres (couleurs vives)
const COLORS = ['#0066FF', '#00D9A5', '#FFB800', '#FF6B35'];
const DUO_COLORS: Record<string, string> = {
  'Duo 1': '#0066FF', // Bleu vif
  'Duo 2': '#00D9A5', // Vert vif
  'Duo 3': '#FFB800', // Jaune/Orange vif
};

// Fonction helper pour formater les nombres avec espace comme séparateur de milliers
const formatNumber = (num: number): string => {
  return num.toLocaleString('fr-FR');
};

// Composant Label adaptatif pour le camembert (responsive) - Labels à l'intérieur avec texte blanc
const ResponsivePieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, label, windowWidth = 1024 }: any) => {
  const RADIAN = Math.PI / 180;
  
  // Ajuster le rayon selon la taille de l'écran
  const isSmallScreen = windowWidth < 640; // sm breakpoint
  const isMediumScreen = windowWidth < 1024; // lg breakpoint
  
  // Réduire le rayon pour éviter les débordements
  const radius = isSmallScreen 
    ? innerRadius + (outerRadius - innerRadius) * 0.3
    : isMediumScreen
    ? innerRadius + (outerRadius - innerRadius) * 0.4
    : innerRadius + (outerRadius - innerRadius) * 0.5;
  
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  const percentage = (percent * 100).toFixed(1);
  
  // Taille de police adaptative
  const fontSize = isSmallScreen ? '10px' : isMediumScreen ? '12px' : '14px';
  
  return (
    <text 
      x={x} 
      y={y} 
      fill="#ffffff" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      style={{ 
        fontWeight: 'bold', 
        fontSize: fontSize,
        filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.9))',
        textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
      }}
    >
      {`${label}: ${percentage}%`}
    </text>
  );
};

// Formatter personnalisé pour la légende avec couleurs vives
const renderLegend = (props: any) => {
  const { payload } = props;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '20px', fontWeight: 'bold', fontSize: '15px' }}>
      {payload.map((entry: any, index: number) => {
        const duoColor = DUO_COLORS[entry.value] || COLORS[index % COLORS.length];
        return (
          <li key={`legend-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={{ 
                display: 'inline-block', 
                width: '16px', 
                height: '16px', 
                backgroundColor: duoColor,
                border: '2px solid #333',
                borderRadius: '2px'
              }} 
            />
            <span style={{ color: duoColor, fontWeight: 'bold' }}>{entry.value}</span>
          </li>
        );
      })}
    </ul>
  );
};


export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filter, setFilter] = useState<'departement' | 'commune' | 'arrondissement' | 'village' | 'centre'>('departement');
  const [filterValue, setFilterValue] = useState<string>('');
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Détecter le thème au montage et lors des changements
  useEffect(() => {
    const checkTheme = () => {
      const html = document.documentElement;
      const isDark = html.classList.contains('dark') || 
                     window.matchMedia('(prefers-color-scheme: dark)').matches ||
                     html.getAttribute('data-theme') === 'dark';
      setIsDarkMode(isDark);
    };
    
    checkTheme();
    
    // Observer les changements de thème
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });
    
    // Écouter les changements de préférence système
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  // Détecter la largeur de la fenêtre pour le responsive
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    // Initialiser la largeur
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          <p className="text-2xl sm:text-3xl font-bold">{formatNumber(data.national.total)} votes</p>

          {/* Graphique en barres - Conteneur centré avec largeur limitée sur grands écrans */}
          <div className="w-full flex justify-center">
            <div className="w-full max-w-4xl">
              <ResponsiveContainer width="100%" height={400} minHeight={300}>
                <BarChart 
                  data={data.national.byDuo}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  {/* Quadrillé retiré pour un look plus épuré */}
                  <XAxis 
                    dataKey="label" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ 
                      fill: isDarkMode ? '#ffffff' : '#1a1a1a', 
                      fontWeight: 'bold', 
                      fontSize: 13,
                      fontStyle: 'italic'
                    }}
                    axisLine={{ stroke: isDarkMode ? '#4b5563' : '#e5e7eb', strokeWidth: 1 }}
                  />
                  <YAxis 
                    tick={{ 
                      fill: isDarkMode ? '#ffffff' : '#1a1a1a', 
                      fontWeight: 'bold', 
                      fontSize: 13,
                      fontStyle: 'italic'
                    }}
                    axisLine={{ stroke: isDarkMode ? '#4b5563' : '#e5e7eb', strokeWidth: 1 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                      border: '2px solid #333',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  />
                  <Legend 
                    content={renderLegend}
                    wrapperStyle={{ 
                      paddingTop: '20px'
                    }}
                  />
                  <Bar 
                    dataKey="total"
                    radius={[8, 8, 0, 0]}
                  >
                    {data.national.byDuo.map((entry, index) => {
                      const duoColor = DUO_COLORS[entry.label] || COLORS[index % COLORS.length];
                      return <Cell key={`bar-cell-${index}`} fill={duoColor} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {data.national.byDuo.map((duo) => {
              const duoColor = DUO_COLORS[duo.label] || COLORS[duo.id - 1] || '#666';
              return (
                <div key={duo.id} className="stat bg-base-200 rounded-lg p-4 border-2 flex flex-col items-center justify-center text-center" style={{ borderColor: duoColor }}>
                  <div 
                    className="stat-title text-sm sm:text-base font-bold" 
                    style={{ color: duoColor }}
                  >
                    {duo.label}
                  </div>
                  <div className="stat-value text-xl sm:text-2xl">{formatNumber(duo.total)}</div>
                  <div 
                    className="stat-desc text-sm font-bold" 
                    style={{ color: duoColor, fontSize: '1.1rem' }}
                  >
                    {duo.percentage}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Graphique en camembert - Responsive avec marges adaptatives */}
          <div className="w-full flex justify-center px-2 sm:px-4">
            <div className="w-full max-w-full sm:max-w-2xl">
              <ResponsiveContainer width="100%" height={windowWidth && windowWidth < 640 ? 250 : windowWidth && windowWidth < 1024 ? 300 : 350}>
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={data.national.byDuo}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props) => <ResponsivePieLabel {...props} windowWidth={windowWidth || 1024} />}
                    outerRadius={windowWidth && windowWidth < 640 ? 60 : windowWidth && windowWidth < 1024 ? 70 : 80}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {data.national.byDuo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                      border: '2px solid #333',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
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

            <button 
              className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg 
                        transition-all duration-300 transform hover:scale-105 hover:shadow-lg 
                        active:scale-95 w-full sm:w-auto"
              onClick={exportToCSV}
            >
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
                        <td>{formatNumber(parseInt(row.total_votes, 10))}</td>
                      </>
                    )}
                    {filter === 'commune' && (
                      <>
                        <td>{row.departement_name}</td>
                        <td>{row.commune_name}</td>
                        <td>{row.duo_label}</td>
                        <td>{formatNumber(parseInt(row.total_votes, 10))}</td>
                      </>
                    )}
                    {filter === 'arrondissement' && (
                      <>
                        <td>{row.departement_name}</td>
                        <td>{row.commune_name}</td>
                        <td>{row.arrondissement_name}</td>
                        <td>{row.duo_label}</td>
                        <td>{formatNumber(parseInt(row.total_votes, 10))}</td>
                      </>
                    )}
                    {filter === 'village' && (
                      <>
                        <td>{row.departement_name}</td>
                        <td>{row.commune_name}</td>
                        <td>{row.arrondissement_name}</td>
                        <td>{row.village_name}</td>
                        <td>{row.duo_label}</td>
                        <td>{formatNumber(parseInt(row.total_votes, 10))}</td>
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
                        <td>{formatNumber(parseInt(row.total_votes, 10))}</td>
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

