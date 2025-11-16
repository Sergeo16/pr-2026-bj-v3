'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

interface Option {
  id: number;
  name: string;
}

interface Duo {
  id: number;
  label: string;
}

export default function HomePage() {
  const [fullName, setFullName] = useState('');
  const [duos, setDuos] = useState<Duo[]>([]);
  const [selectedDuo, setSelectedDuo] = useState<number | null>(null);
  const [departements, setDepartements] = useState<Option[]>([]);
  const [selectedDepartement, setSelectedDepartement] = useState<number | null>(null);
  const [communes, setCommunes] = useState<Option[]>([]);
  const [selectedCommune, setSelectedCommune] = useState<number | null>(null);
  const [arrondissements, setArrondissements] = useState<Option[]>([]);
  const [selectedArrondissement, setSelectedArrondissement] = useState<number | null>(null);
  const [villages, setVillages] = useState<Option[]>([]);
  const [selectedVillage, setSelectedVillage] = useState<number | null>(null);
  const [centres, setCentres] = useState<Option[]>([]);
  const [selectedCentre, setSelectedCentre] = useState<number | null>(null);
  const [count, setCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollPositionRef = useRef<number>(0);

  // Charger les duos
  useEffect(() => {
    fetch('/api/duos')
      .then((res) => res.json())
      .then((data) => {
        if (data.duos) {
          setDuos(data.duos);
        }
      })
      .catch(console.error);
  }, []);

  // Charger les départements
  useEffect(() => {
    fetch('/api/regions/departements')
      .then((res) => res.json())
      .then((data) => {
        if (data.departements) {
          setDepartements(data.departements);
        }
      })
      .catch(console.error);
  }, []);

  // Sauvegarder la position du scroll avant les changements
  useEffect(() => {
    const handleScroll = () => {
      scrollPositionRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Charger les communes quand un département est sélectionné
  useEffect(() => {
    if (selectedDepartement) {
      scrollPositionRef.current = window.scrollY;
      
      fetch(`/api/regions/communes?departementId=${selectedDepartement}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.communes) {
            setCommunes(data.communes);
          }
          // Restaurer la position du scroll après le re-render
          setTimeout(() => {
            window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
          }, 0);
        })
        .catch(console.error);
      // Réinitialiser les sélections dépendantes
      setSelectedCommune(null);
      setSelectedArrondissement(null);
      setSelectedVillage(null);
      setSelectedCentre(null);
      setArrondissements([]);
      setVillages([]);
      setCentres([]);
    }
  }, [selectedDepartement]);

  // Charger les arrondissements quand une commune est sélectionnée
  useEffect(() => {
    if (selectedCommune) {
      scrollPositionRef.current = window.scrollY;
      
      fetch(`/api/regions/arrondissements?communeId=${selectedCommune}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.arrondissements) {
            setArrondissements(data.arrondissements);
          }
          setTimeout(() => {
            window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
          }, 0);
        })
        .catch(console.error);
      setSelectedArrondissement(null);
      setSelectedVillage(null);
      setSelectedCentre(null);
      setVillages([]);
      setCentres([]);
    }
  }, [selectedCommune]);

  // Charger les villages quand un arrondissement est sélectionné
  useEffect(() => {
    if (selectedArrondissement) {
      scrollPositionRef.current = window.scrollY;
      
      fetch(`/api/regions/villages?arrondissementId=${selectedArrondissement}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.villages) {
            setVillages(data.villages);
          }
          setTimeout(() => {
            window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
          }, 0);
        })
        .catch(console.error);
      setSelectedVillage(null);
      setSelectedCentre(null);
      setCentres([]);
    }
  }, [selectedArrondissement]);

  // Charger les centres quand un village est sélectionné
  useEffect(() => {
    if (selectedVillage) {
      scrollPositionRef.current = window.scrollY;
      
      fetch(`/api/regions/centres?villageId=${selectedVillage}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.centres) {
            setCentres(data.centres);
          }
          setTimeout(() => {
            window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
          }, 0);
        })
        .catch(console.error);
      setSelectedCentre(null);
    }
  }, [selectedVillage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !fullName ||
      !selectedDuo ||
      !selectedDepartement ||
      !selectedCommune ||
      !selectedArrondissement ||
      !selectedVillage ||
      !selectedCentre ||
      count < 0
    ) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          duoId: selectedDuo,
          departementId: selectedDepartement,
          communeId: selectedCommune,
          arrondissementId: selectedArrondissement,
          villageId: selectedVillage,
          centreId: selectedCentre,
          count,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Vote enregistré avec succès!');
        // Réinitialiser le formulaire
        setFullName('');
        setSelectedDuo(null);
        setSelectedDepartement(null);
        setSelectedCommune(null);
        setSelectedArrondissement(null);
        setSelectedVillage(null);
        setSelectedCentre(null);
        setCount(0);
      } else {
        toast.error(data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFullName('');
    setSelectedDuo(null);
    setSelectedDepartement(null);
    setSelectedCommune(null);
    setSelectedArrondissement(null);
    setSelectedVillage(null);
    setSelectedCentre(null);
    setCount(0);
    toast.error('Formulaire annulé');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0 pb-8 sm:pb-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">Présidentielle 2026 au Bénin</h1>

      <form 
        onSubmit={handleSubmit} 
        className="card bg-base-100 shadow-xl transition-all duration-300 hover:outline hover:outline-[4px] hover:outline-accent hover:outline-offset-2"
      >
        <div className="card-body p-4 sm:p-6 pb-8">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Votre nom et prénoms *</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Choisir un duo *</span>
            </label>
            <select
              className="select select-bordered"
              value={selectedDuo || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedDuo(value ? parseInt(value, 10) : null);
              }}
              required
            >
              <option value="">Sélectionner un duo</option>
              {duos.map((duo) => (
                <option key={duo.id} value={duo.id}>
                  {duo.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Choisir un département *</span>
            </label>
            <select
              className="select select-bordered"
              value={selectedDepartement || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedDepartement(value ? parseInt(value, 10) : null);
              }}
              required
            >
              <option value="">Sélectionner un département</option>
              {departements.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Choisir une commune *</span>
            </label>
            <select
              className="select select-bordered"
              value={selectedCommune || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedCommune(value ? parseInt(value, 10) : null);
              }}
              required
              disabled={!selectedDepartement}
            >
              <option value="">Sélectionner une commune</option>
              {communes.map((commune) => (
                <option key={commune.id} value={commune.id}>
                  {commune.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Choisir un arrondissement *</span>
            </label>
            <select
              className="select select-bordered"
              value={selectedArrondissement || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedArrondissement(value ? parseInt(value, 10) : null);
              }}
              required
              disabled={!selectedCommune}
            >
              <option value="">Sélectionner un arrondissement</option>
              {arrondissements.map((arr) => (
                <option key={arr.id} value={arr.id}>
                  {arr.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Choisir un village *</span>
            </label>
            <select
              className="select select-bordered"
              value={selectedVillage || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedVillage(value ? parseInt(value, 10) : null);
              }}
              required
              disabled={!selectedArrondissement}
            >
              <option value="">Sélectionner un village</option>
              {villages.map((village) => (
                <option key={village.id} value={village.id}>
                  {village.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Choisir un centre de vote *</span>
            </label>
            <select
              className="select select-bordered"
              value={selectedCentre || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedCentre(value ? parseInt(value, 10) : null);
              }}
              required
              disabled={!selectedVillage}
            >
              <option value="">Sélectionner un centre</option>
              {centres.map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Nombre de votants *</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={count}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setCount(0);
                } else {
                  const numValue = parseInt(value, 10);
                  setCount(isNaN(numValue) ? 0 : Math.max(0, numValue));
                }
              }}
              onFocus={(e) => {
                // Sélectionner tout le texte pour faciliter la saisie
                e.target.select();
              }}
              onClick={(e) => {
                // Sélectionner tout le texte au clic aussi
                (e.target as HTMLInputElement).select();
              }}
              min="0"
              required
            />
          </div>

          <div className="form-control mt-6">
            <div className="flex gap-4">
              <button
                type="button"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg 
                          transition-all duration-300 transform hover:scale-105 hover:shadow-lg 
                          active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg 
                          transition-all duration-300 transform hover:scale-105 hover:shadow-lg 
                          active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Envoi...' : 'Soumettre'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

