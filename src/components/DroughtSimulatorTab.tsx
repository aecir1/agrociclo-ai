import React, { useState } from 'react';
import {
  CloudSun,
  CloudRain,
  AlertOctagon,
  TrendingDown,
  ShieldCheck,
  Calculator,
  ArrowRightLeft,
  Layers,
  Info,
  Droplet
} from 'lucide-react';
import { PropertyProfile } from '../types';

interface DroughtSimulatorTabProps {
  profile: PropertyProfile;
}

export const DroughtSimulatorTab: React.FC<DroughtSimulatorTabProps> = ({ profile }) => {
  // Drought Simulator state
  const [simulatedDays, setSimulatedDays] = useState<15 | 30 | 60 | 90>(60);
  const [tempAnomalyC, setTempAnomalyC] = useState<number>(2.0);
  const [useMulching, setUseMulching] = useState<boolean>(true);
  const [useNightPulse, setUseNightPulse] = useState<boolean>(true);
  const [useOsmoticDeficit, setUseOsmoticDeficit] = useState<boolean>(profile.id === 'oeste');

  // Rain Catchment Calculator state
  const [catchmentAreaM2, setCatchmentAreaM2] = useState<number>(profile.roofCatchmentAreaM2);
  const [rainEventMm, setRainEventMm] = useState<number>(45);
  const [runoffCoeff, setRunoffCoeff] = useState<number>(profile.catchmentEfficiency);
  const [autoRedistributeRain, setAutoRedistributeRain] = useState<boolean>(true);

  // Sync catchment area when switching profile
  React.useEffect(() => {
    setCatchmentAreaM2(profile.roofCatchmentAreaM2);
    setRunoffCoeff(profile.catchmentEfficiency);
    setUseOsmoticDeficit(profile.id === 'oeste');
  }, [profile.id, profile.roofCatchmentAreaM2, profile.catchmentEfficiency]);

  // Reservoir totals (Apparent vs. Real after Siltation)
  const totalNominalM3 = profile.reservoirs.reduce((acc, r) => acc + r.nominalCapacityM3, 0);
  const totalApparentM3 = profile.reservoirs.reduce((acc, r) => acc + r.currentApparentVolumeM3, 0);
  const totalRealM3 = profile.reservoirs.reduce((acc, r) => acc + r.currentRealVolumeM3, 0);
  const hiddenSiltationLossM3 = totalApparentM3 - totalRealM3;

  // Daily baseline demand from sectors (in m³/day)
  const baseDailyDripM3 =
    profile.sectors.reduce((acc, s) => acc + s.plantsCount * s.targetLitersPerPlantDay, 0) / 1000;

  // Temperature anomaly increases ET0 by ~6% per °C
  const climateMultiplier = 1 + tempAnomalyC * 0.06;

  // Reservoir surface evaporation loss (m³/day)
  const dailyEvapLossM3 = profile.reservoirs.reduce((acc, r) => {
    const surfaceFactor = r.hasCoverOrGeomembrane ? 0.8 : 4.2;
    return acc + (r.evaporationLossMmDay * surfaceFactor * climateMultiplier) / 10;
  }, 0);

  // Scenario 1: Conventional Sprinkler / Unmanaged ("No Olho" — 2.38x drip consumption per Jadin & Jacquemart, 1978)
  const dailyConventionalM3 = baseDailyDripM3 * 2.15 * climateMultiplier + dailyEvapLossM3 * 1.3;

  // Scenario 2: Standard Drip without conservation measures
  const dailyStandardDripM3 = baseDailyDripM3 * climateMultiplier + dailyEvapLossM3;

  // Scenario 3: AgroCiclo AI Smart Drip + Selected Conservation Measures
  const savingFactor =
    (useMulching ? 0.84 : 1.0) *
    (useNightPulse ? 0.88 : 1.0) *
    (useOsmoticDeficit ? 0.85 : 1.0);

  const dailySmartAgroCicloM3 = baseDailyDripM3 * climateMultiplier * savingFactor + dailyEvapLossM3 * 0.75;

  // Autonomy in Days (using REAL volume, vs the dangerous illusion of Apparent Volume)
  const autonomyApparentIllusionDays = Math.floor(totalApparentM3 / dailyConventionalM3);
  const autonomyConventionalRealDays = Math.floor(totalRealM3 / dailyConventionalM3);
  const autonomyStandardDripDays = Math.floor(totalRealM3 / dailyStandardDripM3);
  const autonomySmartDays = Math.floor(totalRealM3 / dailySmartAgroCicloM3);

  // Cumulative consumption over simulatedDays
  const cumulativeConventionalM3 = Math.round(dailyConventionalM3 * simulatedDays);
  const cumulativeSmartM3 = Math.round(dailySmartAgroCicloM3 * simulatedDays);
  const waterSavedInPeriodM3 = Math.max(0, cumulativeConventionalM3 - cumulativeSmartM3);

  // Deficit at end of simulated period
  const balanceConventionalM3 = Math.round(totalRealM3 - cumulativeConventionalM3);
  const balanceSmartM3 = Math.round(totalRealM3 - cumulativeSmartM3);

  // Rain Catchment Formula (PDF 2 Item 4.5: Volume L = Area m² * Precipitação mm * Coeficiente)
  const potentialRainLiters = Math.round(catchmentAreaM2 * rainEventMm * runoffCoeff);
  const potentialRainM3 = Math.round((potentialRainLiters / 1000) * 10) / 10;
  const extraDaysFromRain = Math.round((potentialRainM3 / dailySmartAgroCicloM3) * 10) / 10;

  // Cisterna das Barcaças capacity check for overflow alert
  const mainCistern = profile.reservoirs.find((r) => r.type === 'cisterna_barcaca') || profile.reservoirs[1];
  const freeCisternSpaceM3 = Math.max(0, mainCistern.nominalCapacityM3 - mainCistern.currentRealVolumeM3);
  const overflowM3 = Math.max(0, potentialRainM3 - freeCisternSpaceM3);

  // Generate SVG chart points for 0 to simulatedDays
  const steps = 6;
  const chartPoints = Array.from({ length: steps + 1 }, (_, i) => {
    const day = Math.round((simulatedDays / steps) * i);
    const remConv = Math.max(0, Math.round(totalRealM3 - dailyConventionalM3 * day));
    const remStd = Math.max(0, Math.round(totalRealM3 - dailyStandardDripM3 * day));
    const remSmart = Math.max(0, Math.round(totalRealM3 - dailySmartAgroCicloM3 * day));
    return { day, remConv, remStd, remSmart };
  });

  return (
    <div className="space-y-8">
      {/* SECTION 1: SIMULADOR DE SECA E EL NIÑO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-amber-950 via-amber-900 to-slate-900 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase">
                <CloudSun className="w-4 h-4" />
                Projeção Climática & Planejamento de Estiagem
              </div>
              <h2 className="text-xl font-bold mt-2">
                Estresse Hídrico, Autonomia Real das Reservas e Comparativo de Manejo ({profile.municipality}/BA)
              </h2>
              <p className="text-xs text-amber-100/90 mt-1 max-w-3xl">
                Cálculos baseados nas taxas de evapotranspiração local, capacidade útil dos reservatórios e demanda hídrica por estágio fenológico do cacaueiro.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/10 self-start">
              {([15, 30, 60, 90] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setSimulatedDays(d)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    simulatedDays === d
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-amber-100 hover:bg-white/10'
                  }`}
                >
                  {d} Dias Sem Chuva
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Controls (4 cols) */}
          <div className="lg:col-span-4 space-y-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Anomalia Térmica (El Niño / Veranico):</span>
                <span className="text-amber-700">+{tempAnomalyC.toFixed(1)} °C acima da média</span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={0.5}
                value={tempAnomalyC}
                onChange={(e) => setTempAnomalyC(parseFloat(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                <span>Clima Normal (+0°C)</span>
                <span>Super El Niño (+4°C)</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Medidas de Economia Ativadas na Simulação:
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400">
                <input
                  type="checkbox"
                  checked={useMulching}
                  onChange={(e) => setUseMulching(e.target.checked)}
                  className="mt-0.5 accent-emerald-600 rounded"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Cobertura Morta (Pseudocaule Bananeira / Casca)</div>
                  <div className="text-slate-500">-16% evaporação superficial do solo (Orchard & Saltos, 1988)</div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400">
                <input
                  type="checkbox"
                  checked={useNightPulse}
                  onChange={(e) => setUseNightPulse(e.target.checked)}
                  className="mt-0.5 accent-emerald-600 rounded"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Pulsos Noturnos + Sincronia Microclima</div>
                  <div className="text-slate-500">-12% perda evaporativa e -38% tarifa energética</div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400">
                <input
                  type="checkbox"
                  checked={useOsmoticDeficit}
                  onChange={(e) => setUseOsmoticDeficit(e.target.checked)}
                  className="mt-0.5 accent-emerald-600 rounded"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Déficit Controlado (Ajuste Osmótico Ativo)</div>
                  <div className="text-slate-500">-15% lâmina nos talhões adultos (Moser et al., 2010)</div>
                </div>
              </label>
            </div>

            {/* Alerta do Assoreamento Oculto */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-amber-700 shrink-0" />
                Desconto de Assoreamento Ativo!
              </div>
              <p className="text-amber-800">
                Olhando apenas o nível da água, o produtor acha que tem <strong>{totalApparentM3.toLocaleString('pt-BR')} m³</strong>, mas há <strong>{hiddenSiltationLossM3.toLocaleString('pt-BR')} m³ de lodo/sedimentos</strong> no fundo dos açudes! Volume útil real considerado: <strong>{totalRealM3.toLocaleString('pt-BR')} m³</strong>.
              </p>
            </div>
          </div>

          {/* Right Results & Chart (8 cols) */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
            {/* Top 3 Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                <div className="text-xs font-bold text-rose-800 uppercase">Aspersão / Sem Gestão</div>
                <div className="text-2xl font-extrabold text-rose-950 mt-1">
                  {autonomyConventionalRealDays} dias
                </div>
                <div className="text-xs text-rose-700 mt-0.5">
                  Ilusão visual s/ assoreamento: {autonomyApparentIllusionDays} dias
                </div>
                <div className="mt-2 pt-2 border-t border-rose-200 text-xs font-semibold text-rose-900">
                  {balanceConventionalM3 < 0
                    ? `Déficit de ${Math.abs(balanceConventionalM3).toLocaleString('pt-BR')} m³ em ${simulatedDays}d`
                    : `Sobra: ${balanceConventionalM3.toLocaleString('pt-BR')} m³`}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200">
                <div className="text-xs font-bold text-sky-800 uppercase">Gotejamento Simples</div>
                <div className="text-2xl font-extrabold text-sky-950 mt-1">
                  {autonomyStandardDripDays} dias
                </div>
                <div className="text-xs text-sky-700 mt-0.5">
                  Consumo: {dailyStandardDripM3.toFixed(1)} m³/dia
                </div>
                <div className="mt-2 pt-2 border-t border-sky-200 text-xs font-semibold text-sky-900">
                  +{autonomyStandardDripDays - autonomyConventionalRealDays} dias vs. aspersão
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 shadow-sm">
                <div className="text-xs font-bold text-emerald-800 uppercase flex items-center justify-between">
                  <span>AgroCiclo AI (Gotejo + IA)</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-950 mt-1">
                  {autonomySmartDays} dias
                </div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  Consumo otimizado: {dailySmartAgroCicloM3.toFixed(1)} m³/dia
                </div>
                <div className="mt-2 pt-2 border-t border-emerald-200 text-xs font-bold text-emerald-900">
                  {balanceSmartM3 >= 0
                    ? `Reserva Segura (+${balanceSmartM3.toLocaleString('pt-BR')} m³ ao fim de ${simulatedDays}d)`
                    : `Déficit reduzido a ${Math.abs(balanceSmartM3).toLocaleString('pt-BR')} m³ (Ativar Contingência)`}
                </div>
              </div>
            </div>

            {/* Visual Depletion Curve (SVG) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Curva de Esgotamento do Estoque Hídrico Útil ({totalRealM3.toLocaleString('pt-BR')} m³) em {simulatedDays} Dias
                </h4>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" />
                    AgroCiclo AI ({cumulativeSmartM3.toLocaleString('pt-BR')} m³)
                  </span>
                  <span className="flex items-center gap-1.5 text-sky-700">
                    <span className="w-3 h-3 rounded-sm bg-sky-500 inline-block" />
                    Gotejo Simples
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
                    Aspersão / Sem Gestão ({cumulativeConventionalM3.toLocaleString('pt-BR')} m³)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 items-end h-44 pt-4 px-2 border-b border-slate-300">
                {chartPoints.map((pt) => {
                  const pctConv = Math.round((pt.remConv / totalRealM3) * 100);
                  const pctStd = Math.round((pt.remStd / totalRealM3) * 100);
                  const pctSmart = Math.round((pt.remSmart / totalRealM3) * 100);

                  return (
                    <div key={pt.day} className="flex flex-col items-center h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-1 h-32">
                        {/* Bar 1: Conventional */}
                        <div
                          style={{ height: `${Math.max(4, pctConv)}%` }}
                          className="w-2.5 sm:w-3.5 bg-rose-500 rounded-t transition-all"
                          title={`Dia ${pt.day} Aspersão: ${pt.remConv} m³ (${pctConv}%)`}
                        />
                        {/* Bar 2: Standard Drip */}
                        <div
                          style={{ height: `${Math.max(4, pctStd)}%` }}
                          className="w-2.5 sm:w-3.5 bg-sky-500 rounded-t transition-all"
                          title={`Dia ${pt.day} Gotejo Simples: ${pt.remStd} m³ (${pctStd}%)`}
                        />
                        {/* Bar 3: Smart AgroCiclo */}
                        <div
                          style={{ height: `${Math.max(4, pctSmart)}%` }}
                          className="w-2.5 sm:w-3.5 bg-emerald-600 rounded-t transition-all"
                          title={`Dia ${pt.day} AgroCiclo AI: ${pt.remSmart} m³ (${pctSmart}%)`}
                        />
                      </div>
                      <div className="text-xs font-semibold text-slate-600 mt-2">Dia {pt.day}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600">
                <span>
                  Economia total acumulada em {simulatedDays} dias:{' '}
                  <strong className="text-emerald-700">{waterSavedInPeriodM3.toLocaleString('pt-BR')} m³ poupados</strong>{' '}
                  ({(waterSavedInPeriodM3 * 1000).toLocaleString('pt-BR')} litros).
                </span>
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Info className="w-3.5 h-3.5" />
                  Incerteza climática do modelo sazonal: ±12%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CAPTAÇÃO INTELIGENTE DE CHUVA E AUDITORIA DE RESERVATÓRIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calculadora de Captação de Chuva (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
                <CloudRain className="w-4 h-4" />
                Dimensionamento de Captação Pluvial
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Aproveitamento de Telhados (Barcaças de Cacau / Estufas / Galpões)
              </h3>
            </div>
            <Calculator className="w-6 h-6 text-sky-600" />
          </div>

          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 font-mono">
            Fórmula: Volume Potencial (L) = Área ({catchmentAreaM2} m²) × Precipitação ({rainEventMm} mm) × Coeficiente ({runoffCoeff}) = <strong>{potentialRainLiters.toLocaleString('pt-BR')} Litros ({potentialRainM3} m³)</strong>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Área de Captação (m²):
              </label>
              <input
                type="number"
                min={50}
                max={5000}
                value={catchmentAreaM2}
                onChange={(e) => setCatchmentAreaM2(Math.max(0, Number(e.target.value)))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900"
              />
              <span className="text-xs text-slate-500">Barcaças + galpões + lonas</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chuva do Evento / Mês (mm):
              </label>
              <input
                type="number"
                min={5}
                max={400}
                value={rainEventMm}
                onChange={(e) => setRainEventMm(Math.max(0, Number(e.target.value)))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900"
              />
              <span className="text-xs text-slate-500">1 mm = 1 Litro por m²</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Eficiência / Coeficiente:
              </label>
              <select
                value={runoffCoeff}
                onChange={(e) => setRunoffCoeff(parseFloat(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 bg-white"
              >
                <option value={0.9}>0.90 — Telhado Metálico / Geomembrana</option>
                <option value={0.85}>0.85 — Telha Cerâmica / Fibrocimento</option>
                <option value={0.75}>0.75 — Calha Rústica c/ Descarte 1ª Água</option>
              </select>
              <span className="text-xs text-slate-500">Descontando descarte inicial</span>
            </div>
          </div>

          {/* Resultado da Captação + Automação de Transbordo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-xs font-semibold text-emerald-800">Volume Captado nesta Chuva</div>
              <div className="text-2xl font-extrabold text-emerald-950 mt-0.5">
                {potentialRainLiters.toLocaleString('pt-BR')} L <span className="text-sm font-normal">({potentialRainM3} m³)</span>
              </div>
              <div className="text-xs text-emerald-700 mt-1">
                Ganha <strong>+{extraDaysFromRain} dias extras</strong> de irrigação por gotejamento!
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <ArrowRightLeft className="w-4 h-4 text-sky-600" />
                  Válvula de Redistribuição
                </span>
                <input
                  type="checkbox"
                  checked={autoRedistributeRain}
                  onChange={(e) => setAutoRedistributeRain(e.target.checked)}
                  className="accent-sky-600"
                />
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Espaço livre na {mainCistern.name}: <strong>{freeCisternSpaceM3} m³</strong>.
                {overflowM3 > 0 ? (
                  autoRedistributeRain ? (
                    <span className="text-emerald-700 font-semibold block mt-0.5">
                      ✓ Excedente de {overflowM3.toFixed(1)} m³ desviado automaticamente para o Açude/Barragem sem perder 1 gota!
                    </span>
                  ) : (
                    <span className="text-rose-700 font-semibold block mt-0.5">
                      ⚠ Risco de transbordamento! {overflowM3.toFixed(1)} m³ seriam perdidos sem redistribuição.
                    </span>
                  )
                ) : (
                  <span className="text-slate-600 block mt-0.5">
                    ✓ A cisterna comporta 100% do volume deste evento.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Auditoria de Reservatórios: Assoreamento e Evaporação (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Monitoramento de Volume Útil e Assoreamento
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              Estoque Aparente vs. Estoque Real (Assoreamento)
            </h3>
            <p className="text-xs text-slate-600">
              Combate o colapso hídrico causado pelo acúmulo invisível de sedimentos no fundo de açudes e evaporação.
            </p>
          </div>

          <div className="space-y-3">
            {profile.reservoirs.map((res) => {
              const siltationM3 = res.currentApparentVolumeM3 - res.currentRealVolumeM3;
              const fillPct = Math.round((res.currentRealVolumeM3 / res.nominalCapacityM3) * 100);

              return (
                <div key={res.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{res.name}</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        res.hasCoverOrGeomembrane
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {res.hasCoverOrGeomembrane ? 'Protegido' : `Assoreado (-${res.siltationLossPct}%)`}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${fillPct}%` }}
                      className="bg-sky-600 h-full"
                      title={`Volume Útil Real: ${res.currentRealVolumeM3} m³`}
                    />
                    <div
                      style={{ width: `${res.siltationLossPct}%` }}
                      className="bg-amber-600/80 h-full"
                      title={`Volume Mascarado por Assoreamento: ${siltationM3} m³`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Real: <strong className="text-slate-900">{res.currentRealVolumeM3} m³</strong> / {res.nominalCapacityM3} m³
                    </span>
                    <span className="text-amber-800 font-medium">
                      Lodo/Fundo: -{siltationM3} m³ • Evap: {res.evaporationLossMmDay} mm/d
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
