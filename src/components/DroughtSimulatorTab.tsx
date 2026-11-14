import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  CloudRain,
  ShieldCheck,
  Mountain,
  Droplets,
  AlertTriangle
} from 'lucide-react';
import { PropertyProfile } from '../types';
import { calculateReliefRainImpact } from '../utils/geoMap';
import { ToggleSwitch } from './ToggleSwitch';

interface DroughtSimulatorTabProps {
  profile: PropertyProfile;
  onUpdateProfile?: (updated: PropertyProfile) => void;
}

export const DroughtSimulatorTab: React.FC<DroughtSimulatorTabProps> = ({
  profile,
  onUpdateProfile
}) => {
  const [subTab, setSubTab] = useState<'drought' | 'rain_relief'>('drought');

  // Drought settings
  const [simulatedDays, setSimulatedDays] = useState<15 | 30 | 60 | 90>(60);
  const [tempAnomalyC, setTempAnomalyC] = useState<number>(1.5);
  const [useMulching, setUseMulching] = useState<boolean>(true);
  const [useNightPulse, setUseNightPulse] = useState<boolean>(true);
  const [useOsmoticDeficit, setUseOsmoticDeficit] = useState<boolean>(profile.id === 'oeste');

  // Rain & Terrain settings (simplified without confusing ceramic/metallic tile material selector)
  const [catchmentAreaM2, setCatchmentAreaM2] = useState<number>(profile.roofCatchmentAreaM2);
  const [rainEventMm, setRainEventMm] = useState<number>(45);
  const [autoRedistributeRain, setAutoRedistributeRain] = useState<boolean>(true);
  const [hasContourDitches, setHasContourDitches] = useState<boolean>(false);
  const [localSlopePct, setLocalSlopePct] = useState<number>(
    profile.terrainSlopePct ?? (profile.id === 'oeste' ? 4 : 16)
  );

  useEffect(() => {
    setCatchmentAreaM2(profile.roofCatchmentAreaM2);
    setUseOsmoticDeficit(profile.id === 'oeste');
    setLocalSlopePct(profile.terrainSlopePct ?? (profile.id === 'oeste' ? 4 : 16));
  }, [profile.id, profile.roofCatchmentAreaM2, profile.terrainSlopePct]);

  const activeSlopePct = profile.terrainSlopePct ?? localSlopePct;
  const handleSlopeChange = (nextSlope: number) => {
    setLocalSlopePct(nextSlope);
    if (onUpdateProfile) {
      const profileType =
        nextSlope <= 5 ? 'plano' : nextSlope <= 12 ? 'ondulado' : nextSlope <= 22 ? 'morro' : 'escarpado';
      onUpdateProfile({ ...profile, terrainSlopePct: nextSlope, terrainProfileType: profileType });
    }
  };

  // Calculations
  const totalApparentM3 = profile.reservoirs.reduce((acc, r) => acc + r.currentApparentVolumeM3, 0);
  const totalRealM3 = profile.reservoirs.reduce((acc, r) => acc + r.currentRealVolumeM3, 0);
  const hiddenSiltationM3 = totalApparentM3 - totalRealM3;

  const baseDailyDripM3 =
    profile.sectors.reduce((acc, s) => acc + s.plantsCount * s.targetLitersPerPlantDay, 0) / 1000;
  const climateMultiplier = 1 + tempAnomalyC * 0.06;

  const dailyEvapLossM3 = profile.reservoirs.reduce((acc, r) => {
    const surfaceFactor = r.hasCoverOrGeomembrane ? 0.8 : 4.2;
    return acc + (r.evaporationLossMmDay * surfaceFactor * climateMultiplier) / 10;
  }, 0);

  const dailyConventionalM3 = baseDailyDripM3 * 2.15 * climateMultiplier + dailyEvapLossM3 * 1.3;
  const savingFactor =
    (useMulching ? 0.84 : 1.0) * (useNightPulse ? 0.88 : 1.0) * (useOsmoticDeficit ? 0.85 : 1.0);
  const dailySmartM3 = baseDailyDripM3 * climateMultiplier * savingFactor + dailyEvapLossM3 * 0.75;

  const autonomyConventionalDays = Math.floor(totalRealM3 / Math.max(1, dailyConventionalM3));
  const autonomySmartDays = Math.floor(totalRealM3 / Math.max(1, dailySmartM3));
  const gainedDays = Math.max(0, autonomySmartDays - autonomyConventionalDays);

  const balanceSmartM3 = Math.round(totalRealM3 - dailySmartM3 * simulatedDays);
  const waterSavedPeriodM3 = Math.max(
    0,
    Math.round((dailyConventionalM3 - dailySmartM3) * simulatedDays)
  );

  // Rain catchment (clean fixed agronomic utilization rate ~85% discarding first flush)
  const potentialRainLiters = Math.round(catchmentAreaM2 * rainEventMm * 0.85);
  const potentialRainM3 = Math.round((potentialRainLiters / 1000) * 10) / 10;
  const extraDaysFromRain = Math.round((potentialRainM3 / Math.max(1, dailySmartM3)) * 10) / 10;

  const mainCistern =
    profile.reservoirs.find((r) => r.type === 'cisterna_barcaca') || profile.reservoirs[0];
  const freeCisternM3 = Math.max(0, mainCistern.nominalCapacityM3 - mainCistern.currentRealVolumeM3);
  const overflowM3 = Math.max(0, potentialRainM3 - freeCisternM3);

  const reliefImpact = calculateReliefRainImpact({
    slopePct: activeSlopePct,
    rainMm: rainEventMm,
    cacaoAreaHa: profile.cacaoAreaHa,
    hasMulchingOrCabruca: useMulching,
    hasContourDitches,
    dailyDemandM3: dailySmartM3
  });

  const maxAutonomyBar = Math.max(simulatedDays, autonomySmartDays, 30);

  return (
    <div className="space-y-5">
      {/* Segmented Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            Simulador de Seca &amp; Água da Chuva
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Veja quantos dias sua reserva aguenta e quanto pode captar na próxima chuva
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSubTab('drought')}
            className={`px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition-all ${
              subTab === 'drought'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <CloudSun className="w-4 h-4" />
            1. Teste de Seca
          </button>
          <button
            type="button"
            onClick={() => setSubTab('rain_relief')}
            className={`px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition-all ${
              subTab === 'rain_relief'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <CloudRain className="w-4 h-4" />
            2. Chuva &amp; Relevo
          </button>
        </div>
      </div>

      {/* TAB 1: DROUGHT AUTONOMY */}
      {subTab === 'drought' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Controls (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Testar quantos dias sem chuva?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([15, 30, 60, 90] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSimulatedDays(d)}
                    className={`py-2.5 rounded-xl text-xs font-black border transition-all ${
                      simulatedDays === d
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {d} dias
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span>Calor acima do normal (Veranico):</span>
                <span className="text-amber-600 dark:text-amber-400">+{tempAnomalyC.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={0.5}
                value={tempAnomalyC}
                onChange={(e) => setTempAnomalyC(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Economias ligadas no campo:
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Cobertura Morta / Palhada
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Segura umidade no pé (-16% perda)
                  </div>
                </div>
                <ToggleSwitch checked={useMulching} onChange={setUseMulching} size="sm" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Regar Só à Noite
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Evita evaporação pelo sol (-12%)
                  </div>
                </div>
                <ToggleSwitch checked={useNightPulse} onChange={setUseNightPulse} size="sm" activeColor="sky" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Economia na Seca (-15%)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Diminui água nos pés adultos
                  </div>
                </div>
                <ToggleSwitch checked={useOsmoticDeficit} onChange={setUseOsmoticDeficit} size="sm" activeColor="amber" />
              </div>
            </div>
          </div>

          {/* Right Results (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Hero Visual Autonomy Comparison */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Resultado para sua reserva útil real
                  </span>
                  <div className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                    {autonomySmartDays} dias de água{' '}
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      (+{gainedDays} dias extras)
                    </span>
                  </div>
                </div>

                <span
                  className={`px-3.5 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 ${
                    balanceSmartM3 >= 0
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  {balanceSmartM3 >= 0 ? (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Passa dos {simulatedDays} dias com folga!
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Faltará água no dia {autonomySmartDays + 1}
                    </>
                  )}
                </span>
              </div>

              {/* Simple Visual Comparison Bars */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Com Gotejamento AgroCiclo ({dailySmartM3.toFixed(1)} m³/dia)
                    </span>
                    <span className="text-slate-900 dark:text-white">{autonomySmartDays} dias</span>
                  </div>
                  <div className="w-full h-5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                    <div
                      style={{
                        width: `${Math.min(100, Math.round((autonomySmartDays / maxAutonomyBar) * 100))}%`
                      }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">
                      Rega Comum / Aspersão ({dailyConventionalM3.toFixed(1)} m³/dia)
                    </span>
                    <span className="text-rose-600 dark:text-rose-400">{autonomyConventionalDays} dias</span>
                  </div>
                  <div className="w-full h-5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                    <div
                      style={{
                        width: `${Math.min(100, Math.round((autonomyConventionalDays / maxAutonomyBar) * 100))}%`
                      }}
                      className="h-full rounded-full bg-rose-400 dark:bg-rose-500/80 transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                <span>Economia em {simulatedDays} dias sem chuva:</span>
                <strong className="text-sm">{waterSavedPeriodM3.toLocaleString('pt-BR')} m³ salvos</strong>
              </div>
            </div>

            {/* Simplified Reservoirs & Siltation Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-sky-600" />
                  Seus Reservatórios (Água Real vs. Lodo no Fundo)
                </h3>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  -{hiddenSiltationM3.toLocaleString('pt-BR')} m³ de lodo descontados
                </span>
              </div>

              <div className="space-y-2.5">
                {profile.reservoirs.map((res) => {
                  const siltM3 = res.currentApparentVolumeM3 - res.currentRealVolumeM3;
                  const fillPct = Math.round((res.currentRealVolumeM3 / Math.max(1, res.nominalCapacityM3)) * 100);
                  return (
                    <div key={res.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-100">{res.name}</span>
                        <span className="font-black text-sky-700 dark:text-sky-400">
                          {res.currentRealVolumeM3.toLocaleString('pt-BR')} m³ reais
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                        <div style={{ width: `${fillPct}%` }} className="bg-sky-500 h-full" />
                        <div style={{ width: `${res.siltationLossPct}%` }} className="bg-amber-500 h-full" />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Capacidade: {res.nominalCapacityM3.toLocaleString('pt-BR')} m³</span>
                        {siltM3 > 0 && <span className="text-amber-700 dark:text-amber-400">Lodo no fundo: {siltM3} m³</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: RAIN CATCHMENT & TERRAIN RELIEF */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Rain Catchment (Clean — no ceramic tiles dropdown!) */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 flex items-center justify-center">
                <CloudRain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Captação de Chuva nos Telhados e Barcaças
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calcule quantos litros você guarda aproveitando os telhados da propriedade
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Área de Telhados e Barcaças (m²)
                </span>
                <input
                  type="number"
                  min={20}
                  max={5000}
                  value={catchmentAreaM2}
                  onChange={(e) => setCatchmentAreaM2(Math.max(0, Number(e.target.value)))}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-black bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </label>

              <label className="space-y-1 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Tamanho da Chuva (mm)
                </span>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={rainEventMm}
                  onChange={(e) => setRainEventMm(Math.max(0, Number(e.target.value)))}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-black bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Chuva Leve (20 mm)', val: 20 },
                { label: 'Chuva Média (45 mm)', val: 45 },
                { label: 'Chuva Forte (80 mm)', val: 80 }
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setRainEventMm(preset.val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    rainEventMm === preset.val
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Água limpa captada nesta chuva:
              </div>
              <div className="text-3xl font-black text-emerald-900 dark:text-white">
                +{potentialRainLiters.toLocaleString('pt-BR')} Litros{' '}
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                  ({potentialRainM3} m³)
                </span>
              </div>
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Garante +{extraDaysFromRain} dias extras de irrigação!
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  Desvio Automático de Sobra p/ Açude
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  {overflowM3 > 0
                    ? autoRedistributeRain
                      ? `Cisterna enche e +${overflowM3.toFixed(1)} m³ vão para o açude`
                      : `Sem desvio, ${overflowM3.toFixed(1)} m³ transbordam`
                    : 'A cisterna comporta 100% dessa chuva'}
                </div>
              </div>
              <ToggleSwitch
                checked={autoRedistributeRain}
                onChange={setAutoRedistributeRain}
                size="sm"
                activeColor="sky"
              />
            </div>
          </div>

          {/* Right: Relief & Slope Runoff Impact */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Mountain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Chuva no Relevo da Roça ({activeSlopePct}% declive)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Quanto da chuva entra na raiz vs. escorre morro abaixo
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  reliefImpact.erosionRisk === 'Alto'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200'
                    : reliefImpact.erosionRisk === 'Moderado'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                Risco Erosão: {reliefImpact.erosionRisk}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Plano (3%)', val: 3 },
                { label: 'Leve (10%)', val: 10 },
                { label: 'Morro (18%)', val: 18 },
                { label: 'Forte (28%)', val: 28 }
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => handleSlopeChange(p.val)}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    Math.abs(activeSlopePct - p.val) <= 3
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-700 dark:text-emerald-400">
                  Entra na Raiz: {reliefImpact.infiltrationPct}% ({reliefImpact.totalFarmInfiltratedM3.toLocaleString('pt-BR')} m³)
                </span>
                <span className="text-amber-700 dark:text-amber-400">
                  Escorre: {reliefImpact.runoffPct}% ({reliefImpact.totalFarmRunoffM3.toLocaleString('pt-BR')} m³)
                </span>
              </div>
              <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-700">
                <div style={{ width: `${reliefImpact.infiltrationPct}%` }} className="bg-emerald-500 h-full" />
                <div style={{ width: `${reliefImpact.runoffPct}%` }} className="bg-amber-500 h-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200">Cobertura Morta / Sombra</span>
                <ToggleSwitch checked={useMulching} onChange={setUseMulching} size="sm" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200">Caixas Secas na Encosta</span>
                <ToggleSwitch checked={hasContourDitches} onChange={setHasContourDitches} size="sm" activeColor="sky" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200">
              Com caixas secas na baixada, você recupera até{' '}
              <strong>+{reliefImpact.collectibleRunoffM3.toLocaleString('pt-BR')} m³</strong> (+{reliefImpact.extraIrrigationDaysPossible} dias extras sem gastar energia bombeando!).
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
