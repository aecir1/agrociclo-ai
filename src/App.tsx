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
  ThermometerSun,
  CloudRain,
  ArrowUpRight,
  Compass,
  Layers,
  Camera,
  HelpCircle,
  UserPlus,
  Home,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  WifiOff,
  Landmark
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
import { FarmMap2D3D } from './components/FarmMap2D3D';

type NavTab =
  | 'overview'
  | 'mapa'
  | 'automation'
  | 'simulator'
  | 'camera_ml'
  | 'property_ai'
  | 'regulation';

type ExtraPanelKey = 'weather' | 'agronomy' | 'technical' | null;

const TAB_TITLES: Record<NavTab, { title: string; desc: string }> = {
  overview: {
    title: 'Início da Fazenda',
    desc: 'Resumo simples da água, clima e ações principais do dia'
  },
  mapa: {
    title: 'Mapa 2D / 3D da Fazenda',
    desc: 'Marque os limites, ajuste o raio e meça seus hectares'
  },
  automation: {
    title: 'Irrigação e Válvulas',
    desc: 'Controle o gotejamento por talhão e evite desperdícios'
  },
  simulator: {
    title: 'Seca e Água da Chuva',
    desc: 'Veja quantos dias sua água dura e quanto captar nos telhados'
  },
  camera_ml: {
    title: 'Foto da Folha (Câmera IA)',
    desc: 'Identifique sede no cacau ou risco de Vassoura-de-Bruxa'
  },
  property_ai: {
    title: 'Emergência, Cadastro e Ajuda IA',
    desc: 'Checklist da estiagem, edição da fazenda e chat AgroAssist'
  },
  regulation: {
    title: 'Outorga (INEMA) e Crédito Rural',
    desc: 'Limites legais de captação e relatório para financiamento'
  }
};

export function App() {
  const [activeRegion, setActiveRegion] = useState<RegionId>('ilheus');
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openExtraPanel, setOpenExtraPanel] = useState<ExtraPanelKey>(null);

  const [brandName, setBrandName] = useState<string>(() => {
    return localStorage.getItem('agrociclo_brand_name') || 'AgroCiclo AI';
  });

  const [profiles, setProfiles] = useState<Record<RegionId, PropertyProfile>>(() => {
    const saved = localStorage.getItem('agrociclo_profiles_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ilheus: { ...INITIAL_PROFILES.ilheus, ...parsed.ilheus },
          oeste: { ...INITIAL_PROFILES.oeste, ...parsed.oeste }
        };
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

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  // KPIs principais
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
  const autonomyGainDays = Math.max(0, realAutonomyDays - sprinklerAutonomyDays);

  const hasHydraulicAlert = currentProfile.sectors.some((s) => s.diagnosticStatus !== 'ok');

  // Dados simples para o gráfico limpo de 30 dias estilo Figma
  const chartDays = [0, 5, 10, 15, 20, 25, 30];
  const smartSeries = chartDays.map((d) => Math.max(0, Math.round(totalRealM3 - dailyDemandM3 * d)));
  const sprinklerSeries = chartDays.map((d) => Math.max(0, Math.round(totalRealM3 - sprinklerDailyM3 * d)));
  const maxChartM3 = Math.max(100, totalRealM3);

  const buildSvgPoints = (series: number[], w: number, h: number, pad: number) => {
    const usableW = w - pad * 2;
    const usableH = h - pad * 2;
    return series.map((val, idx) => {
      const x = pad + (idx / (series.length - 1)) * usableW;
      const y = h - pad - (val / maxChartM3) * usableH;
      return { x, y };
    });
  };

  const smartPts = buildSvgPoints(smartSeries, 520, 180, 18);
  const sprinklerPts = buildSvgPoints(sprinklerSeries, 520, 180, 18);
  const smartPath = smartPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const smartAreaPath = `${smartPath} L ${smartPts[smartPts.length - 1].x.toFixed(1)} 162 L ${smartPts[0].x.toFixed(1)} 162 Z`;
  const sprinklerPath = sprinklerPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const primaryNavItems: Array<{ id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: boolean }> = [
    { id: 'overview', label: 'Início (Resumo)', icon: Home },
    { id: 'mapa', label: 'Mapa 2D / 3D', icon: MapPin },
    { id: 'automation', label: 'Irrigação', icon: Sliders, badge: hasHydraulicAlert },
    { id: 'simulator', label: 'Seca e Chuva', icon: CloudSun }
  ];

  const extraNavItems: Array<{ id: NavTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'camera_ml', label: 'Foto da Folha (IA)', icon: Camera },
    { id: 'property_ai', label: 'Emergência & Chat IA', icon: ClipboardCheck },
    { id: 'regulation', label: 'Outorga e Crédito', icon: Scale }
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="space-y-6">
        {/* Marca */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-base text-slate-900 leading-tight">{brandName}</div>
              <div className="text-[11px] font-medium text-slate-500">Água e Cacau • Bahia</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cartão da Fazenda Atual */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Fazenda Selecionada
          </div>
          <div className="text-xs font-bold text-slate-900 leading-snug truncate">
            {currentProfile.name}
          </div>
          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveRegion('ilheus')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                activeRegion === 'ilheus'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              🌳 Ilhéus
            </button>
            <button
              type="button"
              onClick={() => setActiveRegion('oeste')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                activeRegion === 'oeste'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              ☀️ Oeste
            </button>
          </div>
        </div>

        {/* Menu Dia a Dia */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            O que você mais usa
          </div>
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </span>
                {item.badge && (
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-amber-300' : 'bg-amber-500'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Menu Extras */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Ferramentas Extras
          </div>
          {extraNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Caixa de Ajuda / Tutorial fixa no rodapé da barra */}
      <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-2.5">
        <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-emerald-700" />
          Precisa de ajuda?
        </div>
        <p className="text-[11px] text-emerald-900 leading-snug">
          Veja o guia passo a passo com palavras simples para usar tudo sem dificuldade.
        </p>
        <button
          type="button"
          onClick={() => {
            setIsTutorialOpen(true);
            setIsMobileMenuOpen(false);
          }}
          className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
        >
          Abrir Tutorial Fácil
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F5F7F6] text-slate-900">
      {/* MODAIS */}
      <InteractiveTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onNavigateTab={(t) => handleSelectTab(t)}
        onOpenWizard={() => setIsWizardOpen(true)}
      />

      <FarmerSetupWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onApplyNewFarm={handleApplyNewFarmFromWizard}
      />

      {/* SIDEBAR DESKTOP (ESTILO FIGMA) */}
      <aside className="hidden lg:block w-64 shrink-0 bg-white border-r border-slate-200/80 sticky top-0 h-screen overflow-y-auto">
        {renderSidebarContent()}
      </aside>

      {/* DRAWER MOBILE */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/40" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 overflow-y-auto">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR BRANCA LIMPA */}
        <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/80 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  {TAB_TITLES[activeTab].title}
                </h1>
                <p className="text-xs text-slate-500 truncate">
                  {currentProfile.name} • {currentProfile.municipality}/{currentProfile.state}
                </p>
              </div>
            </div>

            {/* BOTÕES PRINCIPAIS SEMPRE BEM VISÍVEIS */}
            <div className="flex flex-wrap items-center gap-2">
              {activeTab !== 'mapa' && (
                <button
                  type="button"
                  onClick={() => handleSelectTab('mapa')}
                  className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                >
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>Abrir Mapa 2D/3D</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsTutorialOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
              >
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span>Como Usar (Tutorial)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 shadow-sm transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Cadastrar Fazenda</span>
              </button>
            </div>
          </div>
        </header>

        {/* CONTEÚDO DA PÁGINA ATIVA */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 1. BOTÕES GRANDES E BEM VISÍVEIS (O QUE ELE MAIS USA) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800">
                    Ações Rápidas — O que você quer fazer agora?
                  </h2>
                  <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                    Toque em um botão grande abaixo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectTab('mapa')}
                    className="group text-left p-4 rounded-2xl border border-sky-200 bg-sky-50/70 hover:bg-sky-600 hover:border-sky-600 transition-all flex items-center gap-3.5"
                  >
                    <div className="w-11 h-11 rounded-xl bg-sky-600 group-hover:bg-white text-white group-hover:text-sky-700 flex items-center justify-center shrink-0 transition-colors">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 group-hover:text-white">
                        Mapa da Fazenda
                      </div>
                      <div className="text-xs text-slate-600 group-hover:text-sky-100">
                        Ver em 2D/3D, GPS e raio
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTab('automation')}
                    className="group text-left p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-600 hover:border-emerald-600 transition-all flex items-center gap-3.5"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 group-hover:bg-white text-white group-hover:text-emerald-700 flex items-center justify-center shrink-0 transition-colors">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 group-hover:text-white">
                        Controlar Rega
                      </div>
                      <div className="text-xs text-slate-600 group-hover:text-emerald-100">
                        Abrir/pausar gotejamento
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTab('simulator')}
                    className="group text-left p-4 rounded-2xl border border-amber-200 bg-amber-50/70 hover:bg-amber-500 hover:border-amber-500 transition-all flex items-center gap-3.5"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-500 group-hover:bg-white text-slate-950 flex items-center justify-center shrink-0 transition-colors">
                      <CloudSun className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 group-hover:text-slate-950">
                        Testar Seca / Chuva
                      </div>
                      <div className="text-xs text-slate-600 group-hover:text-slate-900">
                        Ver quantos dias a água dura
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsTutorialOpen(true)}
                    className="group text-left p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-800 hover:border-slate-800 transition-all flex items-center gap-3.5"
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-800 group-hover:bg-white text-white group-hover:text-slate-900 flex items-center justify-center shrink-0 transition-colors">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 group-hover:text-white">
                        Como Usar (Guia)
                      </div>
                      <div className="text-xs text-slate-600 group-hover:text-slate-200">
                        Tutorial fácil passo a passo
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. TRÊS CARTÕES LIMPOS ESTILO FIGMA (SEM POLUIÇÃO VISUAL) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Card 1: Água Guardada */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Água Guardada (Real)
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                      <Droplets className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-black text-slate-900">
                      {totalRealM3.toLocaleString('pt-BR')} m³
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Suporta cerca de <strong className="text-emerald-700">{realAutonomyDays} dias</strong> de rega no gotejo.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold">
                      -{siltationHiddenM3} m³ de lodo descontados
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('simulator')}
                      className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                    >
                      Detalhes <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card 2: Clima Hoje */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Tempo e Risco Hoje
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <ThermometerSun className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-black text-slate-900">
                      {currentProfile.weather.tempC} °C
                      <span className="text-sm font-semibold text-slate-500 ml-2">
                        • {currentProfile.weather.airHumidityPct}% umidade
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Sem chuva há <strong>{currentProfile.weather.daysWithoutRain} dias</strong> • Prev. 7d: <strong>{currentProfile.weather.forecastRain7DaysMm} mm</strong>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold ${
                        currentProfile.weather.airHumidityPct >= 85
                          ? 'bg-rose-50 text-rose-800'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {currentProfile.weather.airHumidityPct >= 85
                        ? 'Cuidado: ar úmido (Vassoura)'
                        : 'Baixo risco de fungo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenExtraPanel(openExtraPanel === 'weather' ? null : 'weather')}
                      className="font-bold text-emerald-700 hover:underline"
                    >
                      Previsão 24h ↓
                    </button>
                  </div>
                </div>

                {/* Card 3: Sua Lavoura */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Sua Lavoura de Cacau
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Sprout className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-black text-slate-900">
                      {currentProfile.cacaoAreaHa} ha
                      <span className="text-sm font-semibold text-slate-500 ml-2">
                        • {currentProfile.estimatedPlants.toLocaleString('pt-BR')} pés
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Gasto atual na irrigação: <strong>{dailyDemandM3} m³/dia</strong>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold ${
                        hasHydraulicAlert ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {hasHydraulicAlert ? '1 aviso nas mangueiras' : 'Tudo funcionando bem'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('automation')}
                      className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                    >
                      Ver setores <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. PAINEL CENTRAL ESTILO FIGMA: GRÁFICO LIMPO + AÇÕES DO DIA */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Gráfico de Área Limpo (7 Cols) */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Duração da Sua Água nos Próximos 30 Dias
                      </h3>
                      <p className="text-xs text-slate-500">
                        Com gotejamento você ganha <strong className="text-emerald-700">+{autonomyGainDays} dias extras</strong> de água em relação à rega comum.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-bold">
                      <span className="inline-flex items-center gap-1.5 text-emerald-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        Gotejamento
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        Rega comum
                      </span>
                    </div>
                  </div>

                  <div className="w-full overflow-hidden">
                    <svg viewBox="0 0 520 185" className="w-full h-44">
                      <defs>
                        <linearGradient id="emeraldArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {[0.25, 0.5, 0.75, 1].map((f) => {
                        const y = 162 - f * 144;
                        return (
                          <line
                            key={f}
                            x1="18"
                            y1={y}
                            x2="502"
                            y2={y}
                            stroke="#e2e8f0"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                        );
                      })}
                      <path d={smartAreaPath} fill="url(#emeraldArea)" />
                      <path
                        d={sprinklerPath}
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="2.5"
                        strokeDasharray="6 4"
                      />
                      <path d={smartPath} fill="none" stroke="#10b981" strokeWidth="3" />
                      {smartPts.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                          <text x={p.x} y="179" textAnchor="middle" className="fill-slate-400 text-[10px] font-semibold">
                            Dia {chartDays[idx]}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Avisos Práticos de Hoje (5 Cols - Máximo 2 cartões diretos) */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      O que checar hoje na roça
                    </h3>

                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                      <div className="flex items-start gap-2 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-amber-950">Checar gotejadores entupidos</div>
                          <p className="text-amber-900 mt-0.5">
                            A pressão subiu no {activeRegion === 'ilheus' ? 'Talhão 02' : 'Setor C'}. Vale conferir o filtro hoje.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectTab('automation')}
                        className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all"
                      >
                        Abrir Controle de Rega →
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <div className="flex items-start gap-2 text-xs">
                        <CloudRain className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-emerald-950">Aproveitar água de telhados</div>
                          <p className="text-emerald-900 mt-0.5">
                            Seus {currentProfile.roofCatchmentAreaM2} m² de telhado captam{' '}
                            <strong>
                              {Math.round(currentProfile.roofCatchmentAreaM2 * 40 * currentProfile.catchmentEfficiency).toLocaleString('pt-BR')} L
                            </strong>{' '}
                            em uma chuva de 40 mm.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectTab('simulator')}
                        className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all"
                      >
                        Calcular Água da Chuva →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. BOTÕES PARA ACESSAR COISAS EXTRAS CASO NECESSÁRIO (RECOLHIDOS POR PADRÃO!) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Quer ver informações extras ou dados técnicos?
                    </h3>
                    <p className="text-xs text-slate-500">
                      Deixamos escondido para manter a tela limpa. Clique abaixo só se precisar:
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenExtraPanel(openExtraPanel === 'weather' ? null : 'weather')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all ${
                        openExtraPanel === 'weather'
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CloudSun className="w-4 h-4" />
                      Previsão 24h e 7 Dias
                      {openExtraPanel === 'weather' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpenExtraPanel(openExtraPanel === 'agronomy' ? null : 'agronomy')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all ${
                        openExtraPanel === 'agronomy'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Compass className="w-4 h-4" />
                      Comparar Sul vs. Oeste e Agronomia
                      {openExtraPanel === 'agronomy' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpenExtraPanel(openExtraPanel === 'technical' ? null : 'technical')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all ${
                        openExtraPanel === 'technical'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      Dados Técnicos & INEMA
                      {openExtraPanel === 'technical' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Conteúdo Extra 1: Previsão Completa */}
                {openExtraPanel === 'weather' && (
                  <div className="pt-3 border-t border-slate-100">
                    <CityWeatherForecast profile={currentProfile} />
                  </div>
                )}

                {/* Conteúdo Extra 2: Tese Agronômica & Comparação */}
                {openExtraPanel === 'agronomy' && (
                  <div className="pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <div className="font-bold text-sm text-emerald-950">
                        {currentProfile.agronomicThesis.headline}
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {currentProfile.agronomicThesis.whyDripHere}
                      </p>
                      <p className="text-emerald-900 bg-white p-3 rounded-lg border border-emerald-200">
                        <strong>Base Técnica:</strong> {currentProfile.agronomicThesis.physiologicalSecret}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="font-bold text-sm text-slate-900">
                        Comparativo Regional: Sul da Bahia vs. Oeste
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <div className="text-slate-500">Produtividade Estimada</div>
                          <div className="text-lg font-black text-emerald-700">
                            {currentProfile.agronomicThesis.expectedYieldKgHa.toLocaleString('pt-BR')} kg/ha
                          </div>
                          <div className="text-slate-400">
                            Sem irrigação: {currentProfile.agronomicThesis.baselineYieldWithoutDripKgHa} kg/ha
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <div className="text-slate-500">Lâmina Sazonal</div>
                          <div className="text-lg font-black text-sky-700">
                            {currentProfile.agronomicThesis.waterConsumptionDripMmSeason} mm
                          </div>
                          <div className="text-rose-600">
                            Aspersão: {currentProfile.agronomicThesis.waterConsumptionSprinklerMmSeason} mm
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveRegion('ilheus')}
                          className={`flex-1 py-2 rounded-lg font-bold border ${
                            activeRegion === 'ilheus' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          Ver Ilhéus (Cabruca)
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveRegion('oeste')}
                          className={`flex-1 py-2 rounded-lg font-bold border ${
                            activeRegion === 'oeste' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          Ver Oeste (Pleno Sol)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conteúdo Extra 3: Técnico, LoRa & Outorga */}
                {openExtraPanel === 'technical' && (
                  <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Landmark className="w-4 h-4 text-indigo-600" />
                        Regularidade INEMA
                      </div>
                      <div>Instrumento: <strong>{currentProfile.regulation.legalInstrument}</strong></div>
                      <div>Uso vs. Limite: <strong>{currentProfile.regulation.currentWithdrawalM3Day} / {currentProfile.regulation.authorizedFlowM3Day} m³/dia</strong></div>
                      <div>CAR/CEFIR: <strong>{currentProfile.regulation.carStatus}</strong></div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-sky-600" />
                        Auditoria de Reservatórios
                      </div>
                      <div>Capacidade Nominal: <strong>{totalNominalM3.toLocaleString('pt-BR')} m³</strong></div>
                      <div>Volume Aparente na Régua: <strong>{totalApparentM3.toLocaleString('pt-BR')} m³</strong></div>
                      <div>Volume Útil Real: <strong className="text-emerald-700">{totalRealM3.toLocaleString('pt-BR')} m³</strong></div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <WifiOff className="w-4 h-4 text-emerald-600" />
                        Operação de Campo
                      </div>
                      <div>Conectividade: <strong>LoRa Offline-First Ativo</strong></div>
                      <div>Sistema: <strong>{currentProfile.cultivationSystem}</strong></div>
                      <div>Solo: <strong>{currentProfile.soilType}</strong></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'mapa' && (
            <FarmMap2D3D
              profile={currentProfile}
              onUpdateProfile={handleUpdateCurrentProfile}
              onOpenSimulator={() => handleSelectTab('simulator')}
            />
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
            <DroughtSimulatorTab
              profile={currentProfile}
              onUpdateProfile={handleUpdateCurrentProfile}
            />
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
      </div>
    </div>
  );
}

export default App;
