import React, { useState } from 'react';
import {
  ClipboardCheck,
  Settings,
  CheckSquare,
  Square,
  Save,
  RotateCcw,
  UserPlus,
  Droplets,
} from 'lucide-react';
import { PropertyProfile } from '../types';
import { INITIAL_EMERGENCY_ACTIONS, EmergencyAction } from '../data/mockProfiles';

interface PropertyAndEmergencyTabProps {
  profile: PropertyProfile;
  onUpdateProfile: (updated: PropertyProfile) => void;
  onResetProfile: () => void;
  brandName: string;
  onChangeBrandName: (name: string) => void;
  onOpenWizard: () => void;
}

const PHASES: Array<{ key: 'antes' | 'durante' | 'depois'; label: string; color: string }> = [
  { key: 'antes', label: 'Antes da Seca (Prevenção)', color: 'text-sky-700 dark:text-sky-300' },
  { key: 'durante', label: 'Durante a Seca (Economia)', color: 'text-amber-700 dark:text-amber-300' },
  { key: 'depois', label: 'Depois da Seca (Recuperação)', color: 'text-emerald-700 dark:text-emerald-300' },
];

export const PropertyAndEmergencyTab: React.FC<PropertyAndEmergencyTabProps> = ({
  profile,
  onUpdateProfile,
  onResetProfile,
  brandName,
  onChangeBrandName,
  onOpenWizard,
}) => {
  const [actions, setActions] = useState<EmergencyAction[]>(INITIAL_EMERGENCY_ACTIONS);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const totalRealM3 = profile.reservoirs.reduce((acc, r) => acc + r.currentRealVolumeM3, 0);
  const dailyDemandM3 =
    profile.sectors.reduce((acc, s) => acc + s.plantsCount * s.targetLitersPerPlantDay, 0) /
    1000;
  const currentAutonomyDays = Math.floor(totalRealM3 / Math.max(1, dailyDemandM3));
  const extraDaysFromChecklist = actions
    .filter((a) => a.completed)
    .reduce((acc, a) => acc + a.autonomyGainDays, 0);

  const toggleAction = (id: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  };

  const handlePropertyFieldChange = <K extends keyof PropertyProfile>(
    field: K,
    value: PropertyProfile[K]
  ) => {
    const updated: PropertyProfile = { ...profile, [field]: value };

    if (field === 'cacaoAreaHa' || field === 'plantingDensityPerHa') {
      updated.estimatedPlants = Math.round(
        updated.cacaoAreaHa * updated.plantingDensityPerHa
      );
      if (updated.sectors.length > 0) {
        const areaPerSector = Number(
          (updated.cacaoAreaHa / updated.sectors.length).toFixed(1)
        );
        const plantsPerSector = Math.round(
          updated.estimatedPlants / updated.sectors.length
        );
        updated.sectors = updated.sectors.map((s) => ({
          ...s,
          areaHa: areaPerSector,
          plantsCount: plantsPerSector,
        }));
      }
    }

    onUpdateProfile(updated);
    setSaveSuccess(true);
    window.setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho direto */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              <ClipboardCheck className="w-5 h-5" />
            </span>
            Plano de Seca & Dados da Fazenda
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Marque as ações que você já fez na roça para ganhar dias extras de água e edite os dados da sua propriedade.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenWizard}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Cadastrar Nova Fazenda
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Esquerda (7 cols): Lista Prática de Ações Contra a Seca */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3">
              <Droplets className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300 block">
                  Ganho com suas ações marcadas
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
                  Sua reserva passa de <strong>{currentAutonomyDays} dias</strong> para{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400 text-base">
                    {currentAutonomyDays + extraDaysFromChecklist} dias
                  </strong>
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shrink-0 self-start sm:self-center">
              +{extraDaysFromChecklist} dias extras
            </span>
          </div>

          <div className="space-y-5">
            {PHASES.map((phase) => {
              const phaseActions = actions.filter((a) => a.phase === phase.key);
              if (phaseActions.length === 0) return null;
              return (
                <div key={phase.key} className="space-y-2.5">
                  <h3 className={`text-xs font-black uppercase tracking-wider ${phase.color}`}>
                    {phase.label}
                  </h3>
                  <div className="space-y-2">
                    {phaseActions.map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => toggleAction(act.id)}
                        className={`w-full text-left p-3.5 rounded-xl border transition flex items-start gap-3 cursor-pointer ${
                          act.completed
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {act.completed ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`text-sm font-bold ${
                                act.completed
                                  ? 'text-emerald-950 dark:text-emerald-200 line-through'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {act.title}
                            </span>
                            {act.autonomyGainDays > 0 && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shrink-0">
                                +{act.autonomyGainDays} dias
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {act.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Direita (5 cols): Editor Direto da Fazenda */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Dados da Propriedade
            </h3>
            <button
              type="button"
              onClick={onResetProfile}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg cursor-pointer"
              title="Restaurar valores iniciais"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Padrão
            </button>
          </div>

          {saveSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Dados atualizados em todo o sistema!
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome no Topo do Sistema
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => onChangeBrandName(e.target.value)}
                className="w-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/30 rounded-xl px-3 py-2 font-bold text-emerald-950 dark:text-emerald-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome da Fazenda
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => handlePropertyFieldChange('name', e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 font-semibold text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Município (BA)
                </label>
                <input
                  type="text"
                  value={profile.municipality}
                  onChange={(e) => handlePropertyFieldChange('municipality', e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 font-semibold text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Idade da Lavoura (Anos)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={profile.cropAgeYears}
                  onChange={(e) =>
                    handlePropertyFieldChange('cropAgeYears', Math.max(1, Number(e.target.value)))
                  }
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 font-semibold text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Área de Cacau (ha)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={profile.cacaoAreaHa}
                  onChange={(e) =>
                    handlePropertyFieldChange('cacaoAreaHa', Math.max(1, Number(e.target.value)))
                  }
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 font-bold text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pés por Hectare
                </label>
                <input
                  type="number"
                  min={400}
                  max={2500}
                  value={profile.plantingDensityPerHa}
                  onChange={(e) =>
                    handlePropertyFieldChange(
                      'plantingDensityPerHa',
                      Math.max(100, Number(e.target.value))
                    )
                  }
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 font-bold text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Telhados / Barcaças (m²)
                </label>
                <input
                  type="number"
                  min={20}
                  max={5000}
                  value={profile.roofCatchmentAreaM2}
                  onChange={(e) =>
                    handlePropertyFieldChange(
                      'roofCatchmentAreaM2',
                      Math.max(0, Number(e.target.value))
                    )
                  }
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 font-semibold text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Total de Pés Estimado
                </label>
                <div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-extrabold text-slate-800 dark:text-slate-200">
                  {profile.estimatedPlants.toLocaleString('pt-BR')} pés
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
