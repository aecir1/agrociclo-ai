import React, { useState } from 'react';
import {
  Droplets,
  ShieldAlert,
  Zap,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Sprout,
  Plus,
  Scissors,
  Trash2,
  Minus,
  Mountain
} from 'lucide-react';
import { PropertyProfile, PhenologicalStage, IrrigationSector } from '../types';
import { ToggleSwitch } from './ToggleSwitch';

interface AutomationTabProps {
  profile: PropertyProfile;
  onUpdateProfile: (updated: PropertyProfile) => void;
}

const STAGE_LITERS_MAP: Record<'ilheus' | 'oeste', Record<PhenologicalStage, { liters: number; label: string }>> = {
  ilheus: {
    mudas: { liters: 6, label: 'Mudas (< 2 anos)' },
    vegetativo: { liters: 8, label: 'Folha / Vegetativo' },
    floracao: { liters: 12, label: 'Floração e Peco' },
    frutificacao: { liters: 15, label: 'Frutos Enchendo' }
  },
  oeste: {
    mudas: { liters: 9, label: 'Mudas (< 2 anos)' },
    vegetativo: { liters: 13, label: 'Folha / Vegetativo' },
    floracao: { liters: 16, label: 'Floração Intensa' },
    frutificacao: { liters: 20, label: 'Frutificação Alta' }
  }
};

export const AutomationTab: React.FC<AutomationTabProps> = ({ profile, onUpdateProfile }) => {
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [showNewSectorForm, setShowNewSectorForm] = useState<boolean>(false);
  const [newSectorName, setNewSectorName] = useState<string>('');
  const [newSectorHa, setNewSectorHa] = useState<number>(3);
  const [newSectorStage, setNewSectorStage] = useState<PhenologicalStage>('floracao');
  const [newSectorTerrain, setNewSectorTerrain] = useState<'baixada' | 'meia_encosta' | 'topo'>('meia_encosta');
  const [subtractFromLargest, setSubtractFromLargest] = useState<boolean>(true);

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const commitSectorsUpdate = (nextSectors: IrrigationSector[], feedback: string) => {
    const sumHa = Number(nextSectors.reduce((acc, s) => acc + s.areaHa, 0).toFixed(2));
    const sumPlants = nextSectors.reduce((acc, s) => acc + s.plantsCount, 0);
    onUpdateProfile({
      ...profile,
      cacaoAreaHa: sumHa,
      totalAreaHa: Math.max(profile.totalAreaHa, sumHa),
      estimatedPlants: sumPlants,
      sectors: nextSectors
    });
    showToast(feedback);
  };

  const handleAddSectorPartition = (e: React.FormEvent) => {
    e.preventDefault();
    const ha = Math.max(0.5, Number(newSectorHa) || 1);
    const deficitFactor = profile.automationConfig.osmoticDeficitMode ? 0.85 : 1.0;
    const baseLiters = STAGE_LITERS_MAP[profile.id][newSectorStage].liters;
    const litersPerPlant = Math.round(baseLiters * deficitFactor * 10) / 10;

    const updatedSectors = [...profile.sectors];
    let finalHa = ha;

    if (subtractFromLargest && updatedSectors.length > 0) {
      let maxIdx = 0;
      for (let i = 1; i < updatedSectors.length; i++) {
        if (updatedSectors[i].areaHa > updatedSectors[maxIdx].areaHa) maxIdx = i;
      }
      const donor = updatedSectors[maxIdx];
      const maxSplit = Math.max(0.5, Number((donor.areaHa - 0.5).toFixed(2)));
      finalHa = Math.min(ha, maxSplit);
      const remainingDonorHa = Math.max(0.5, Number((donor.areaHa - finalHa).toFixed(2)));
      const donorPlants = Math.round(remainingDonorHa * profile.plantingDensityPerHa);
      const donorNomFlow = Math.max(1000, donorPlants * 2);

      updatedSectors[maxIdx] = {
        ...donor,
        areaHa: remainingDonorHa,
        plantsCount: donorPlants,
        nominalFlowLh: donorNomFlow,
        measuredFlowLh: Math.round(donorNomFlow * 0.99)
      };
    }

    const newPlants = Math.round(finalHa * profile.plantingDensityPerHa);
    const newNomFlow = Math.max(1000, newPlants * 2);
    const nextNum = updatedSectors.length + 1;
    const labelName =
      newSectorName.trim() ||
      `Talhão ${String(nextNum).padStart(2, '0')} — ${
        newSectorTerrain === 'baixada'
          ? 'Baixada'
          : newSectorTerrain === 'topo'
          ? 'Topo de Morro'
          : 'Meia Encosta'
      }`;

    updatedSectors.push({
      id: `sec-custom-${Date.now()}`,
      name: labelName,
      areaHa: finalHa,
      plantsCount: newPlants,
      cloneType: 'Cacaueiro',
      stage: newSectorStage,
      targetLitersPerPlantDay: litersPerPlant,
      nominalFlowLh: newNomFlow,
      measuredFlowLh: Math.round(newNomFlow * 0.99),
      pressureBar: profile.id === 'ilheus' ? 1.8 : 2.0,
      nominalPressureBar: profile.id === 'ilheus' ? 1.8 : 2.0,
      valveStatus: 'scheduled',
      diagnosticStatus: 'ok',
      diagnosticMessage: 'Pronto para regar automaticamente.',
      soilMoisturePct: 70,
      osmoticAdjustmentActive: profile.automationConfig.osmoticDeficitMode,
      terrainZone: newSectorTerrain
    });

    setShowNewSectorForm(false);
    setNewSectorName('');
    commitSectorsUpdate(updatedSectors, `Talhão "${labelName}" (${finalHa} ha) criado!`);
  };

  const handleSplitSectorInTwo = (sector: IrrigationSector) => {
    if (sector.areaHa < 1) return;
    const halfA = Number((sector.areaHa / 2).toFixed(2));
    const halfB = Number((sector.areaHa - halfA).toFixed(2));
    const plantsA = Math.round(sector.plantsCount * (halfA / sector.areaHa));
    const plantsB = Math.max(1, sector.plantsCount - plantsA);
    const nomFlowA = Math.max(500, Math.round(sector.nominalFlowLh * (halfA / sector.areaHa)));
    const nomFlowB = Math.max(500, sector.nominalFlowLh - nomFlowA);
    const ratio = sector.nominalFlowLh > 0 ? sector.measuredFlowLh / sector.nominalFlowLh : 0.99;

    const idx = profile.sectors.findIndex((s) => s.id === sector.id);
    const nextSectors = [...profile.sectors];
    nextSectors.splice(
      idx,
      1,
      {
        ...sector,
        name: `${sector.name.replace(/\s*\(Parte [AB]\)$/i, '')} (Parte A)`,
        areaHa: halfA,
        plantsCount: plantsA,
        nominalFlowLh: nomFlowA,
        measuredFlowLh: Math.round(nomFlowA * ratio)
      },
      {
        ...sector,
        id: `${sector.id}-b-${Date.now().toString().slice(-4)}`,
        name: `${sector.name.replace(/\s*\(Parte [AB]\)$/i, '')} (Parte B)`,
        areaHa: halfB,
        plantsCount: plantsB,
        nominalFlowLh: nomFlowB,
        measuredFlowLh: Math.round(nomFlowB * 0.99),
        diagnosticStatus: 'ok',
        diagnosticMessage: 'Funcionando normal.'
      }
    );

    commitSectorsUpdate(nextSectors, `Dividido em ${halfA} ha + ${halfB} ha!`);
  };

  const handleResizeSectorHa = (sectorId: string, deltaHa: number) => {
    const nextSectors = profile.sectors.map((s) => {
      if (s.id !== sectorId) return s;
      const nextHa = Math.max(0.5, Number((s.areaHa + deltaHa).toFixed(2)));
      const nextPlants = Math.round(nextHa * profile.plantingDensityPerHa);
      const nextNomFlow = Math.max(500, nextPlants * 2);
      const ratio = s.nominalFlowLh > 0 ? s.measuredFlowLh / s.nominalFlowLh : 0.99;
      return {
        ...s,
        areaHa: nextHa,
        plantsCount: nextPlants,
        nominalFlowLh: nextNomFlow,
        measuredFlowLh: Math.round(nextNomFlow * ratio)
      };
    });
    commitSectorsUpdate(nextSectors, 'Tamanho do talhão atualizado.');
  };

  const handleDeleteSector = (sectorId: string) => {
    if (profile.sectors.length <= 1) return;
    commitSectorsUpdate(
      profile.sectors.filter((s) => s.id !== sectorId),
      'Talhão removido.'
    );
  };

  const setAutomationRule = (key: keyof PropertyProfile['automationConfig'], value: boolean) => {
    if (key === 'electricalConductivityDsm') return;
    onUpdateProfile({
      ...profile,
      automationConfig: {
        ...profile.automationConfig,
        [key]: value
      }
    });
    showToast('Regra salva com sucesso!');
  };

  const handleStageChange = (sectorId: string, newStage: PhenologicalStage) => {
    const stageConfig = STAGE_LITERS_MAP[profile.id][newStage];
    const deficitFactor = profile.automationConfig.osmoticDeficitMode ? 0.85 : 1.0;
    const adjustedLiters = Math.round(stageConfig.liters * deficitFactor * 10) / 10;

    onUpdateProfile({
      ...profile,
      sectors: profile.sectors.map((sec) =>
        sec.id === sectorId ? { ...sec, stage: newStage, targetLitersPerPlantDay: adjustedLiters } : sec
      )
    });
    showToast(`Lâmina ajustada para ${adjustedLiters} L/pé/dia (${stageConfig.label}).`);
  };

  const toggleValve = (sector: IrrigationSector) => {
    if (
      sector.valveStatus !== 'open' &&
      profile.automationConfig.antiWitchesBroomLock &&
      profile.weather.airHumidityPct >= 85
    ) {
      onUpdateProfile({
        ...profile,
        sectors: profile.sectors.map((s) =>
          s.id === sector.id
            ? {
                ...s,
                valveStatus: 'auto_blocked',
                diagnosticMessage: `Bloqueada: umidade em ${profile.weather.airHumidityPct}% (risco de Vassoura). Abre à noite.`
              }
            : s
        )
      });
      showToast(`Trava Anti-Vassoura impediu ligar agora (UR ${profile.weather.airHumidityPct}%).`);
      return;
    }

    const nextStatus = sector.valveStatus === 'open' ? 'closed' : 'open';
    onUpdateProfile({
      ...profile,
      sectors: profile.sectors.map((s) =>
        s.id === sector.id
          ? {
              ...s,
              valveStatus: nextStatus,
              diagnosticMessage:
                nextStatus === 'open' ? 'Irrigando na raiz.' : 'Válvula desligada pelo operador.'
            }
          : s
      )
    });
    showToast(`${sector.name}: ${nextStatus === 'open' ? 'Rega LIGADA' : 'Rega PAUSADA'}.`);
  };

  const handleFlushCloggedLine = (sectorId: string) => {
    onUpdateProfile({
      ...profile,
      sectors: profile.sectors.map((s) =>
        s.id === sectorId
          ? {
              ...s,
              measuredFlowLh: Math.round(s.nominalFlowLh * 0.99),
              pressureBar: s.nominalPressureBar,
              diagnosticStatus: 'ok',
              diagnosticMessage: 'Mangueiras desentupidas! Vazão normalizada.'
            }
          : s
      )
    });
    showToast('Limpeza (Flushing) feita com sucesso!');
  };

  const handleRepairLeak = (sectorId: string) => {
    onUpdateProfile({
      ...profile,
      sectors: profile.sectors.map((s) =>
        s.id === sectorId
          ? {
              ...s,
              measuredFlowLh: Math.round(s.nominalFlowLh * 0.99),
              pressureBar: s.nominalPressureBar,
              valveStatus: 'scheduled',
              diagnosticStatus: 'ok',
              diagnosticMessage: 'Mangueira consertada e válvula liberada.'
            }
          : s
      )
    });
    showToast('Reparo confirmado!');
  };

  const handleSimulateLeak = (sectorId: string) => {
    onUpdateProfile({
      ...profile,
      sectors: profile.sectors.map((s) =>
        s.id === sectorId
          ? {
              ...s,
              measuredFlowLh: Math.round(s.nominalFlowLh * 1.32),
              pressureBar: Number((s.nominalPressureBar * 0.65).toFixed(2)),
              valveStatus: 'auto_blocked',
              diagnosticStatus: 'leak_alert',
              diagnosticMessage: 'Mangueira furada detectada! Bomba travada para não perder água.'
            }
          : s
      )
    });
    showToast('Vazamento detectado e válvula travada automaticamente!');
  };

  const totalDailyM3 =
    Math.round(
      (profile.sectors.reduce((acc, s) => acc + s.plantsCount * s.targetLitersPerPlantDay, 0) / 1000) * 10
    ) / 10;
  const sprinklerM3 = Math.round(totalDailyM3 * (535 / 224) * 10) / 10;
  const savedM3 = Math.round((sprinklerM3 - totalDailyM3) * 10) / 10;
  const openCount = profile.sectors.filter((s) => s.valveStatus === 'open').length;

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {actionFeedback && (
        <div className="bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {actionFeedback}
          </span>
          <button type="button" onClick={() => setActionFeedback(null)} className="underline">
            Fechar
          </button>
        </div>
      )}

      {/* Compact Top Summary KPI Strip (Zero wall of text!) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Economia Hoje</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              +{savedM3} m³/dia
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">vs. rega por aspersão</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Droplets className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Gasto no Gotejo</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {totalDailyM3} m³/dia
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {profile.cacaoAreaHa} ha • {profile.estimatedPlants.toLocaleString('pt-BR')} pés
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Sprout className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Válvulas Ligadas</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {openCount} de {profile.sectors.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Setores no sistema</div>
          </div>
          <button
            type="button"
            onClick={() => setShowNewSectorForm((v) => !v)}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Talhão
          </button>
        </div>
      </div>

      {/* 4 Clear Interactive Switch Cards (Unmistakably Switches!) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setAutomationRule('antiWitchesBroomLock', !profile.automationConfig.antiWitchesBroomLock)}
          className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
            profile.automationConfig.antiWitchesBroomLock
              ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-400 dark:border-emerald-700 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <ToggleSwitch
              checked={profile.automationConfig.antiWitchesBroomLock}
              onChange={(v) => setAutomationRule('antiWitchesBroomLock', v)}
              activeColor="emerald"
              ariaLabel="Trava Anti-Vassoura"
            />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              Trava Anti-Vassoura
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Pausa a rega se o ar passar de 85% de umidade.
            </p>
          </div>
        </div>

        <div
          onClick={() => setAutomationRule('greenTariffSync', !profile.automationConfig.greenTariffSync)}
          className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
            profile.automationConfig.greenTariffSync
              ? 'bg-sky-50/80 dark:bg-sky-950/35 border-sky-400 dark:border-sky-700 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <ToggleSwitch
              checked={profile.automationConfig.greenTariffSync}
              onChange={(v) => setAutomationRule('greenTariffSync', v)}
              activeColor="sky"
              ariaLabel="Regar à Noite Tarifa Verde"
            />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              Regar à Noite (Tarifa Verde)
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Liga após as 21h30 e corta 38% da energia.
            </p>
          </div>
        </div>

        <div
          onClick={() => setAutomationRule('osmoticDeficitMode', !profile.automationConfig.osmoticDeficitMode)}
          className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
            profile.automationConfig.osmoticDeficitMode
              ? 'bg-amber-50/80 dark:bg-amber-950/35 border-amber-400 dark:border-amber-700 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center">
              <Sprout className="w-4 h-4" />
            </div>
            <ToggleSwitch
              checked={profile.automationConfig.osmoticDeficitMode}
              onChange={(v) => setAutomationRule('osmoticDeficitMode', v)}
              activeColor="amber"
              ariaLabel="Modo Economia na Seca"
            />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              Modo Economia (-15%)
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Reduz 15% da água nos pés adultos na estiagem.
            </p>
          </div>
        </div>

        <div
          onClick={() => setAutomationRule('offlineLoRaMode', !profile.automationConfig.offlineLoRaMode)}
          className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
            profile.automationConfig.offlineLoRaMode
              ? 'bg-indigo-50/80 dark:bg-indigo-950/35 border-indigo-400 dark:border-indigo-700 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <WifiOff className="w-4 h-4" />
            </div>
            <ToggleSwitch
              checked={profile.automationConfig.offlineLoRaMode}
              onChange={(v) => setAutomationRule('offlineLoRaMode', v)}
              activeColor="indigo"
              ariaLabel="Funcionar Sem Internet"
            />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              Funcionar Sem Internet
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Relógio e travas seguem direto na bomba.
            </p>
          </div>
        </div>
      </div>

      {/* New Sector Form Drawer */}
      {showNewSectorForm && (
        <form
          onSubmit={handleAddSectorPartition}
          className="bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Criar Novo Talhão
            </div>
            <button
              type="button"
              onClick={() => setShowNewSectorForm(false)}
              className="text-slate-600 dark:text-slate-400 font-bold"
            >
              Cancelar ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="space-y-1 sm:col-span-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">Nome do Talhão</span>
              <input
                type="text"
                placeholder={`Ex: Talhão ${String(profile.sectors.length + 1).padStart(2, '0')} — Encosta`}
                value={newSectorName}
                onChange={(e) => setNewSectorName(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">Hectares (ha)</span>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={newSectorHa}
                onChange={(e) => setNewSectorHa(Math.max(0.5, Number(e.target.value)))}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">Onde Fica</span>
              <select
                value={newSectorTerrain}
                onChange={(e) => setNewSectorTerrain(e.target.value as 'baixada' | 'meia_encosta' | 'topo')}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="baixada">Baixada</option>
                <option value="meia_encosta">Meia Encosta</option>
                <option value="topo">Topo de Morro</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subtractFromLargest}
                  onChange={(e) => setSubtractFromLargest(e.target.checked)}
                  className="accent-emerald-600 w-4 h-4"
                />
                Descontar do maior talhão existente
              </label>

              <select
                value={newSectorStage}
                onChange={(e) => setNewSectorStage(e.target.value as PhenologicalStage)}
                className="border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-white"
              >
                <option value="mudas">Mudas</option>
                <option value="vegetativo">Vegetativo</option>
                <option value="floracao">Floração</option>
                <option value="frutificacao">Frutificação</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Criar Talhão
            </button>
          </div>
        </form>
      )}

      {/* Clean Sector List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Seus Talhões de Cacau
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha a fase do cacau e ligue ou pause a válvula de cada área
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {profile.sectors.length} setores
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {profile.sectors.map((sec) => {
            const isClogged = sec.diagnosticStatus === 'clogged_alert';
            const isLeak = sec.diagnosticStatus === 'leak_alert';
            const flowPct = Math.round((sec.measuredFlowLh / Math.max(1, sec.nominalFlowLh)) * 100);
            const sectorDailyM3 = Math.round(((sec.plantsCount * sec.targetLitersPerPlantDay) / 1000) * 10) / 10;

            return (
              <div
                key={sec.id}
                className={`p-5 transition-colors ${
                  isLeak
                    ? 'bg-rose-50/70 dark:bg-rose-950/20'
                    : isClogged
                    ? 'bg-amber-50/60 dark:bg-amber-950/20'
                    : ''
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info & Controls */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white text-base">
                        {sec.name}
                      </span>

                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-0.5 rounded-full">
                        <button
                          type="button"
                          onClick={() => handleResizeSectorHa(sec.id, -0.5)}
                          disabled={sec.areaHa <= 0.5}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full disabled:opacity-30"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        {sec.areaHa} ha • {sec.plantsCount.toLocaleString('pt-BR')} pés
                        <button
                          type="button"
                          onClick={() => handleResizeSectorHa(sec.id, 0.5)}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </span>

                      {sec.terrainZone && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                          <Mountain className="w-3 h-3" />
                          {sec.terrainZone === 'baixada'
                            ? 'Baixada'
                            : sec.terrainZone === 'topo'
                            ? 'Topo'
                            : 'Meia Encosta'}
                        </span>
                      )}

                      {sec.valveStatus === 'open' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          Irrigando
                        </span>
                      )}
                      {sec.valveStatus === 'scheduled' && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200">
                          Agendado 21h30
                        </span>
                      )}
                      {sec.valveStatus === 'auto_blocked' && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                          Trava Ativa
                        </span>
                      )}
                      {sec.valveStatus === 'closed' && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Desligada
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <select
                        value={sec.stage}
                        onChange={(e) => handleStageChange(sec.id, e.target.value as PhenologicalStage)}
                        className="font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="mudas">Mudas Jovens</option>
                        <option value="vegetativo">Folha (Vegetativo)</option>
                        <option value="floracao">Floração e Peco</option>
                        <option value="frutificacao">Frutificação</option>
                      </select>

                      <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold">
                        {sec.targetLitersPerPlantDay} L/pé/dia ({sectorDailyM3} m³/dia)
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSplitSectorInTwo(sec)}
                        disabled={sec.areaHa < 1}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40"
                      >
                        <Scissors className="w-3 h-3" />
                        Dividir em 2
                      </button>

                      {profile.sectors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSector(sec.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Excluir talhão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Alert / Health Message Bar */}
                    <div
                      className={`p-3 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 ${
                        isLeak
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                          : isClogged
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        {isLeak || isClogged ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                        {sec.diagnosticMessage}
                      </span>

                      {isClogged && (
                        <button
                          type="button"
                          onClick={() => handleFlushCloggedLine(sec.id)}
                          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Desentupir Agora
                        </button>
                      )}
                      {isLeak && (
                        <button
                          type="button"
                          onClick={() => handleRepairLeak(sec.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmar Reparo
                        </button>
                      )}
                      {!isLeak && !isClogged && (
                        <button
                          type="button"
                          onClick={() => handleSimulateLeak(sec.id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 font-semibold"
                        >
                          Testar vazamento
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: Telemetry & Obvious Big Valve Button */}
                  <div className="flex sm:flex-row lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0">
                    <div className="text-left lg:text-right text-xs">
                      <div className="text-slate-500 dark:text-slate-400 font-semibold">
                        Saúde da mangueira:{' '}
                        <strong
                          className={
                            isLeak
                              ? 'text-rose-600'
                              : isClogged
                              ? 'text-amber-600'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }
                        >
                          {flowPct}% vazão • {sec.pressureBar} bar
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleValve(sec)}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all ${
                        sec.valveStatus === 'open'
                          ? 'bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {sec.valveStatus === 'open' ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Pausar Rega
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Ligar Rega Agora
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
