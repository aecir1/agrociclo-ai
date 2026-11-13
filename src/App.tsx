import React, { useState, useEffect } from 'react';
import {
  Droplets,
  Sprout,
  CloudSun,
  Scale,
  Sliders,
  ClipboardCheck,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ThermometerSun,
  CloudRain,
  ArrowUpRight,
  Landmark,
  WifiOff,
  Compass,
  TrendingUp,
  Layers,
  Camera,
  HelpCircle,
  UserPlus
} from 'lucide-react';
import { RegionId, PropertyProfile } from './types';
import { INITIAL_PROFILES } from './data/mockProfiles';
import { AutomationTab } from './components/AutomationTab';
import { DroughtSimulatorTab } from './components/DroughtSimulatorTab';
import { RegulationCreditTab } from './components/RegulationCreditTab';
import { PropertyAndAiTab } from './components/PropertyAndAiTab';
import { CameraVisionTab } from './components/CameraVisionTab';
import { FarmerSetupWizard } from './components/FarmerSetupWizard';
import { InteractiveTutorialModal } from './components/InteractiveTutorialModal';
import { CityWeatherForecast } from './components/CityWeatherForecast';

type NavTab = 'overview' | 'automation' | 'camera_ml' | 'simulator' | 'regulation' | 'property_ai';

export function App() {
  const [activeRegion, setActiveRegion] = useState<RegionId>('ilheus');
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const [brandName, setBrandName] = useState<string>(() => {
    return localStorage.getItem('agrociclo_brand_name') || 'AgroCiclo AI';
  });

  const [profiles, setProfiles] = useState<Record<RegionId, PropertyProfile>>(() => {
    const saved = localStorage.getItem('agrociclo_profiles_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_PROFILES;
      }
    }
    return INITIAL_PROFILES;
  });

  useEffect(() => {
    localStorage.setItem('agrociclo_profiles_v1', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('agrociclo_brand_name', brandName);
  }, [brandName]);

  const currentProfile = profiles[activeRegion];

  const handleUpdateCurrentProfile = (updated: PropertyProfile) => {
    setProfiles((prev) => ({
      ...prev,
      [activeRegion]: updated
    }));
  };

  const handleApplyNewFarmFromWizard = (region: RegionId, newProfile: PropertyProfile) => {
    setProfiles((prev) => ({
      ...prev,
      [region]: newProfile
    }));
    setActiveRegion(region);
    setActiveTab('overview');
  };

  const handleResetProfiles = () => {
    setProfiles(INITIAL_PROFILES);
    localStorage.removeItem('agrociclo_profiles_v1');
  };

  // Core KPIs for Overview Dashboard
  const totalNominalM3 = currentProfile.reservoirs.reduce((acc, r) => acc + r.nominalCapacityM3, 0);
  const totalApparentM3 = currentProfile.reservoirs.reduce((acc, r) => acc + r.currentApparentVolumeM3, 0);
  const totalRealM3 = currentProfile.reservoirs.reduce((acc, r) => acc + r.currentRealVolumeM3, 0);
  const siltationHiddenM3 = totalApparentM3 - totalRealM3;

  const dailyDemandLiters = currentProfile.sectors.reduce(
    (acc, s) => acc + s.plantsCount * s.targetLitersPerPlantDay,
    0
  );
  const dailyDemandM3 = Math.round((dailyDemandLiters / 1000) * 10) / 10;
  const sprinklerDailyM3 = Math.round(dailyDemandM3 * (535 / 224) * 10) / 10;
  const realAutonomyDays = Math.floor(totalRealM3 / Math.max(1, dailyDemandM3));
  const sprinklerAutonomyDays = Math.floor(totalRealM3 / Math.max(1, sprinklerDailyM3));

  const hasHydraulicAlert = currentProfile.sectors.some((s) => s.diagnosticStatus !== 'ok');

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* MODALS: TUTORIAL & FARMER SETUP WIZARD */}
      <InteractiveTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onNavigateTab={(t) => setActiveTab(t)}
        onOpenWizard={() => setIsWizardOpen(true)}
      />

      <FarmerSetupWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onApplyNewFarm={handleApplyNewFarmFromWizard}
      />

      {/* TOP BAR: HACKATHON BANCO DO NORDESTE / FAEB */}
      <header className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white shadow-lg border-b border-emerald-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          {/* Brand & Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center shadow-md text-slate-950 font-black">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    {brandName}
                  </h1>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 font-bold">
                    Gestão Hídrica • Cacau BA
                  </span>
                </div>
                <p className="text-xs text-emerald-200">
                  Inteligência e Automação Hídrica para a Cacauicultura Baiana
                </p>
              </div>
            </div>

            {/* Botões de Ajuda Rápida: Tutorial + Cadastrar do Zero */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTutorialOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-all"
              >
                <HelpCircle className="w-4 h-4 text-amber-300" />
                <span>Como Usar (Tutorial)</span>
              </button>
              <button
                onClick={() => setIsWizardOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Cadastrar Fazenda do Zero</span>
              </button>
            </div>
          </div>

          {/* LIVE TERRITORY SWITCHER (ILHÉUS vs. OESTE BAIANO) */}
          <div className="flex flex-wrap items-center gap-2 bg-black/30 p-1.5 rounded-xl border border-white/15 self-start xl:self-auto">
            <span className="text-xs font-bold text-emerald-300 px-2 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" />
              Alternar Região:
            </span>
            <button
              onClick={() => setActiveRegion('ilheus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeRegion === 'ilheus'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <span>🌳 Sul da Bahia (Ilhéus • Cabruca)</span>
            </button>
            <button
              onClick={() => setActiveRegion('oeste')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeRegion === 'oeste'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <span>☀️ Oeste Baiano (Cerrado • Pleno Sol)</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="bg-slate-900/90 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto py-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTab === 'overview'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Sprout className="w-4 h-4" />
              1. Visão Geral Hídrica
            </button>

            <button
              onClick={() => setActiveTab('automation')}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTab === 'automation'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              2. Automação de Gotejamento
              {hasHydraulicAlert && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('camera_ml')}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTab === 'camera_ml'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-amber-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              3. Câmera IA (Sede & Vassoura)
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <CloudSun className="w-4 h-4" />
              4. Simulador de Seca & Chuva
            </button>

            <button
              onClick={() => setActiveTab('regulation')}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTab === 'regulation'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Scale className="w-4 h-4" />
              5. Outorga (INEMA) & Crédito BNB
            </button>

            <button
              onClick={() => setActiveTab('property_ai')}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTab === 'property_ai'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              6. Emergência, Cadastro & Chat IA
            </button>
          </div>
        </div>
      </header>

      {/* SUB-HEADER STATUS STRIP */}
      <div className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-emerald-600" />
              {currentProfile.name} — {currentProfile.municipality}/{currentProfile.state}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
              {currentProfile.cultivationSystem} • {currentProfile.cacaoAreaHa} ha ({currentProfile.estimatedPlants.toLocaleString('pt-BR')} pés)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold">
              <WifiOff className="w-3.5 h-3.5" />
              LoRa Offline-First Ativo
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {currentProfile.regulation.legalInstrument}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* HERO BANNER: TESE TERRITORIAL DA BAHIA (ILHÉUS vs. OESTE BAIANO) */}
            <div
              className={`rounded-2xl p-6 text-white shadow-md border ${
                activeRegion === 'ilheus'
                  ? 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 border-emerald-700'
                  : 'bg-gradient-to-r from-amber-950 via-amber-900 to-slate-900 border-amber-700'
              }`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-bold uppercase tracking-wider">
                      {currentProfile.biome}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-black/30 text-amber-300 text-xs font-bold">
                      Estágio Atual: {currentProfile.currentStage.toUpperCase()} ({currentProfile.cropAgeYears} anos)
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black leading-tight">
                    {currentProfile.agronomicThesis.headline}
                  </h2>
                  <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                    {currentProfile.agronomicThesis.whyDripHere}
                  </p>
                  <div className="p-3.5 rounded-xl bg-black/25 border border-white/15 text-xs text-emerald-200 leading-relaxed">
                    <strong className="text-white">Segredo Fisiológico & Automação Aplicada:</strong>{' '}
                    {currentProfile.agronomicThesis.physiologicalSecret}
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/15 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Impacto Produtivo & Hídrico na Propriedade
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-black/25 p-3 rounded-lg">
                      <div className="text-xs text-white/75">Produtividade Esperada</div>
                      <div className="text-lg font-black text-white">
                        {currentProfile.agronomicThesis.expectedYieldKgHa.toLocaleString('pt-BR')} kg/ha
                      </div>
                      <div className="text-xs text-emerald-300">
                        Sem irrigação: {currentProfile.agronomicThesis.baselineYieldWithoutDripKgHa} kg/ha
                      </div>
                    </div>
                    <div className="bg-black/25 p-3 rounded-lg">
                      <div className="text-xs text-white/75">Lâmina Sazonal</div>
                      <div className="text-lg font-black text-emerald-300">
                        {currentProfile.agronomicThesis.waterConsumptionDripMmSeason} mm
                      </div>
                      <div className="text-xs text-rose-300">
                        Aspersão: {currentProfile.agronomicThesis.waterConsumptionSprinklerMmSeason} mm
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => setActiveTab('automation')}
                      className="w-full py-2 px-3 rounded-lg bg-white text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-50 transition-all"
                    >
                      <span>Controle de Gotejamento</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveTab('camera_ml')}
                      className="w-full py-2 px-3 rounded-lg bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-amber-300 transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Abrir Câmera IA (Sede & Vassoura)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 MAIN DASHBOARD KPI CARDS (MÓDULO 4.1) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Reserva Real vs Aparente */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-sky-700 uppercase">
                  <span>Reserva Útil Real (Hoje)</span>
                  <Layers className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {totalRealM3.toLocaleString('pt-BR')} m³
                </div>
                <div className="text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  Aparente na régua: {totalApparentM3.toLocaleString('pt-BR')} m³ (<strong>-{siltationHiddenM3} m³ assoreados</strong>)
                </div>
                <div className="text-xs text-slate-500">
                  Capacidade nominal total: {totalNominalM3.toLocaleString('pt-BR')} m³
                </div>
              </div>

              {/* Card 2: Autonomia Real & Consumo */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-700 uppercase">
                  <span>Autonomia das Reservas</span>
                  <Droplets className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-emerald-900">
                  {realAutonomyDays} dias <span className="text-xs font-semibold text-emerald-700">(No Gotejo)</span>
                </div>
                <div className="text-xs text-rose-800 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                  Na aspersão duraria só <strong>{sprinklerAutonomyDays} dias</strong>!
                </div>
                <div className="text-xs text-slate-500">
                  Consumo Gotejo: <strong>{dailyDemandM3} m³/dia</strong> ({dailyDemandLiters.toLocaleString('pt-BR')} L)
                </div>
              </div>

              {/* Card 3: Clima & Risco Fitossanitário */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-700 uppercase">
                  <span>Clima & Risco Fúngico</span>
                  <ThermometerSun className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {currentProfile.weather.tempC} °C <span className="text-sm font-semibold text-slate-500">• UR {currentProfile.weather.airHumidityPct}%</span>
                </div>
                <div
                  className={`text-xs px-2.5 py-1 rounded-md border font-semibold ${
                    currentProfile.weather.airHumidityPct >= 85
                      ? 'bg-rose-50 text-rose-900 border-rose-200'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  }`}
                >
                  Fungo: {currentProfile.weather.fungalRiskLevel}
                </div>
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Sem chuva há: <strong>{currentProfile.weather.daysWithoutRain} dias</strong></span>
                  <span>Prev. 7d: <strong>{currentProfile.weather.forecastRain7DaysMm} mm</strong></span>
                </div>
              </div>

              {/* Card 4: Segurança Jurídica & Outorga */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-700 uppercase">
                  <span>Segurança Jurídica (INEMA)</span>
                  <Landmark className="w-4 h-4" />
                </div>
                <div className="text-lg font-black text-slate-900 leading-snug">
                  {currentProfile.regulation.currentWithdrawalM3Day} / {currentProfile.regulation.authorizedFlowM3Day} m³/dia
                </div>
                <div className="text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-semibold">
                  ✓ Dentro da Vazão Autorizada + APP Preservada
                </div>
                <div className="text-xs text-slate-500">
                  CEFIR/CAR: {currentProfile.regulation.carStatus}
                </div>
              </div>
            </div>

            {/* PREVISÃO DO TEMPO EM TODOS OS HORÁRIOS DO DIA (24H) E PARA OS 7 DIAS DA SEMANA NA CIDADE */}
            <CityWeatherForecast profile={currentProfile} />

            {/* ALERTAS INTELIGENTES E AÇÕES IMEDIATAS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                    Alertas Ativos & Decisões Automatizadas Hoje
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    Dado bom é dado que vira decisão
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Alert 1: Hydraulic / Clogging */}
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-amber-950 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                        Perda Oculta Detectada no Cabeçal (Gotejadores Entupidos)
                      </div>
                      <p className="text-amber-900">
                        O hidrômetro acusou queda de ~19% na vazão e subida de pressão para {activeRegion === 'ilheus' ? '2,35 bar no Talhão 02' : '2,48 bar no Setor Gotejo C'}. Sem sensores no solo, o sistema diagnosticou incrustação nas linhas.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('automation')}
                      className="px-3 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shrink-0"
                    >
                      Resolver na Automação
                    </button>
                  </div>

                  {/* Alert 2: Fungal Lock or Osmotic Adjustment */}
                  {activeRegion === 'ilheus' ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          Trava Fitossanitária Anti-Vassoura Protegendo a Lavoura
                        </div>
                        <p className="text-emerald-900">
                          Umidade relativa atual em Ilhéus está em 86%. O pulso de rega do Talhão 01 foi adiado automaticamente para 21h30, hidratando apenas a raiz sem dar chance ao fungo <em>Moniliophthora perniciosa</em>.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('camera_ml')}
                        className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shrink-0"
                      >
                        Diagnosticar p/ Câmera
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-sky-950 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-sky-700 shrink-0" />
                          Modo Pleno Sol + Ajuste Osmótico Ativo (3.000 kg/ha)
                        </div>
                        <p className="text-sky-900">
                          Com umidade atmosférica em 38% (escape natural contra Vassoura-de-Bruxa), o sistema entrega 20 L/árvore/dia via fertirrigação noturna no Setor A, maximizando a abertura estomática sob sol pleno.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('automation')}
                        className="px-3 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs shrink-0"
                      >
                        Ver Fertirrigação
                      </button>
                    </div>
                  )}

                  {/* Alert 3: Rain Catchment & Siltation */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CloudRain className="w-4 h-4 text-sky-600 shrink-0" />
                        Auditoria de Assoreamento & Potencial de Captação Pluvial
                      </div>
                      <p className="text-slate-600">
                        Seus {currentProfile.roofCatchmentAreaM2} m² de telhados (barcaças e galpões) captam{' '}
                        <strong>
                          {Math.round(currentProfile.roofCatchmentAreaM2 * 40 * currentProfile.catchmentEfficiency).toLocaleString('pt-BR')} litros
                        </strong>{' '}
                        a cada chuva de 40 mm. Veja como evitar transbordamento.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('simulator')}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shrink-0"
                    >
                      Simular Chuva e Seca
                    </button>
                  </div>
                </div>
              </div>

              {/* Comparativo Direto Lado a Lado: Ilhéus vs. Oeste Baiano (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Manejo Regionalizado na Bahia
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Perfis Produtivos: Cabruca (Sul) e Pleno Sol (Oeste)
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div
                    onClick={() => setActiveRegion('ilheus')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      activeRegion === 'ilheus'
                        ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-emerald-950">
                      <span>🌳 1. Ilhéus / Sul da Bahia (Cabruca)</span>
                      {activeRegion === 'ilheus' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-600 text-white">Selecionado</span>
                      )}
                    </div>
                    <ul className="mt-2 space-y-1 text-slate-700">
                      <li>• <strong>A Dor:</strong> Veranicos de El Niño secam raízes superficiais, mas a alta umidade favorece a <strong>Vassoura-de-Bruxa</strong>.</li>
                      <li>• <strong>Por que Gotejamento:</strong> Molha apenas a raiz embaixo da serrapilheira; nunca molha a copa ou frutos.</li>
                      <li>• <strong>Foco Hídrico:</strong> Captação em telhados de barcaças + açudes desassoreados + Dispensa de Outorga INEMA.</li>
                    </ul>
                  </div>

                  <div
                    onClick={() => setActiveRegion('oeste')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      activeRegion === 'oeste'
                        ? 'bg-amber-50 border-amber-500 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-amber-950">
                      <span>☀️ 2. Oeste Baiano / Cerrado (Pleno Sol)</span>
                      {activeRegion === 'oeste' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500 text-slate-950">Selecionado</span>
                      )}
                    </div>
                    <ul className="mt-2 space-y-1 text-slate-700">
                      <li>• <strong>Por que Resiste à Seca e Produz 10x Mais:</strong> Clima seco elimina fungos + <strong>Ajuste Osmótico Ativo</strong> nas raízes (Moser et al., 2010) + fotossíntese máxima a pleno sol.</li>
                      <li>• <strong>Por que Gotejamento:</strong> <em>Delivery System</em> (fertirrigação de 20 L/planta/dia direto no bulbo radicular).</li>
                      <li>• <strong>Foco Hídrico:</strong> Tarifa Verde noturna (-38% energia) + Controle rígido do teto de Outorga INEMA.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'automation' && (
          <AutomationTab
            profile={currentProfile}
            onUpdateProfile={handleUpdateCurrentProfile}
          />
        )}

        {activeTab === 'camera_ml' && (
          <CameraVisionTab
            profile={currentProfile}
            onUpdateProfile={handleUpdateCurrentProfile}
          />
        )}

        {activeTab === 'simulator' && (
          <DroughtSimulatorTab profile={currentProfile} />
        )}

        {activeTab === 'regulation' && (
          <RegulationCreditTab profile={currentProfile} />
        )}

        {activeTab === 'property_ai' && (
          <PropertyAndAiTab
            profile={currentProfile}
            onUpdateProfile={handleUpdateCurrentProfile}
            onResetProfile={handleResetProfiles}
            brandName={brandName}
            onChangeBrandName={setBrandName}
            onOpenWizard={() => setIsWizardOpen(true)}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-5 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong>{brandName}</strong> — Sistema de Inteligência Hídrica, Irrigação de Precisão e Conformidade Ambiental para a Cacauicultura Baiana.
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200">Monitoramento Hidrométrico</span>
            <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200">Conformidade INEMA / CEFIR</span>
            <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200">Relatórios de Crédito Rural</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default App;
