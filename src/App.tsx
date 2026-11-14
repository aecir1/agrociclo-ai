import React, { useState, useEffect } from 'react';
import {
  Droplets,
  MapPin,
  Sliders,
  CloudSun,
  Camera,
  Scale,
  ClipboardCheck,
  AlertTriangle,
  Home,
  HelpCircle,
  UserPlus,
  RotateCcw,
  X,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Compass,
  Sprout,
  CloudRain,
  ShieldAlert,
  CheckCircle2,
  Smartphone,
  Monitor,
  MoreHorizontal,
  Bell,
  BellOff,
  BarChart3,
} from 'lucide-react';
import { INITIAL_PROFILES } from './data/mockProfiles';
import { PropertyProfile, RegionId } from './types';
import { DroughtSimulatorTab } from './components/DroughtSimulatorTab';
import { AutomationTab } from './components/AutomationTab';
import { RegulationCreditTab } from './components/RegulationCreditTab';
import { PropertyAndEmergencyTab } from './components/PropertyAndEmergencyTab';
import { CameraVisionTab } from './components/CameraVisionTab';
import { FarmerSetupWizard } from './components/FarmerSetupWizard';
import { InteractiveTutorialModal } from './components/InteractiveTutorialModal';
import { FarmMap2D3D } from './components/FarmMap2D3D';
import { CityWeatherForecast } from './components/CityWeatherForecast';
import { ToggleSwitch } from './components/ToggleSwitch';
import { AppTourOverlay, TourTabId } from './components/AppTourOverlay';
import { WaterReserve3DPopup } from './components/WaterReserve3DPopup';

type NavTab = TourTabId;

const TAB_TITLES: Record<NavTab, { title: string; desc: string }> = {
  overview: {
    title: 'Início',
    desc: 'Resumo rápido da sua água, tempo hoje e o que fazer agora',
  },
  mapa: {
    title: 'Mapa da Fazenda',
    desc: 'Mapa de satélite Leaflet e vista em Relevo 3D da sua lavoura',
  },
  automation: {
    title: 'Controle da Irrigação',
    desc: 'Regras de proteção e abertura dos talhões de cacau',
  },
  simulator: {
    title: 'Seca e Chuva',
    desc: 'Teste quantos dias a água aguenta e calcule captação nos telhados',
  },
  camera_ml: {
    title: 'Saúde da Folha',
    desc: 'Envie foto da planta para achar Vassoura-de-Bruxa ou sede',
  },
  regulation: {
    title: 'Outorga e Crédito',
    desc: 'Regularidade no INEMA e documento para o Banco do Nordeste',
  },
  emergency: {
    title: 'Plano de Seca & Fazenda',
    desc: 'Lista de ações na roça e edição dos dados da propriedade',
  },
};

export function App() {
  const [activeRegion, setActiveRegion] = useState<RegionId>('ilheus');
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [isWater3DPopupOpen, setIsWater3DPopupOpen] = useState(false);

  // Botão Switch no card do clima no topo do Início (abre/fecha previsão por turnos e semana)
  const [showHomeForecast, setShowHomeForecast] = useState(false);
  const [showRegionCompare, setShowRegionCompare] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('agrociclo_alerts_enabled');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('agrociclo_alerts_enabled', String(alertsEnabled));
  }, [alertsEnabled]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 120);
    return () => window.clearTimeout(t);
  }, [isMobilePreview]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('agrociclo_theme') === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('agrociclo_theme', theme);
  }, [theme]);

  const [brandName, setBrandName] = useState<string>(() => {
    const stored = localStorage.getItem('agrociclo_brand_name');
    if (!stored || stored.trim() === 'AgroCiclo AI') return 'AgroCiclo';
    return stored;
  });

  const [profiles, setProfiles] = useState<Record<RegionId, PropertyProfile>>(() => {
    const saved = localStorage.getItem('agrociclo_profiles_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ilheus: { ...INITIAL_PROFILES.ilheus, ...parsed.ilheus },
          oeste: { ...INITIAL_PROFILES.oeste, ...parsed.oeste },
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
      [activeRegion]: updated,
    }));
  };

  // Ao finalizar o cadastro da fazenda, salva tudo e dispara o Tour Guiado na tela automaticamente!
  const handleApplyNewFarmFromWizard = (region: RegionId, newProfile: PropertyProfile) => {
    setProfiles((prev) => ({
      ...prev,
      [region]: newProfile,
    }));
    setActiveRegion(region);
    setActiveTab('overview');
    window.setTimeout(() => {
      setIsTourOpen(true);
    }, 280);
  };

  const handleResetProfiles = () => {
    setProfiles(INITIAL_PROFILES);
    localStorage.removeItem('agrociclo_profiles_v1');
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setIsMobileMoreOpen(false);
  };

  // KPIs hídricos principais
  const totalNominalM3 = currentProfile.reservoirs.reduce(
    (acc, r) => acc + r.nominalCapacityM3,
    0
  );
  const totalApparentM3 = currentProfile.reservoirs.reduce(
    (acc, r) => acc + r.currentApparentVolumeM3,
    0
  );
  const totalRealM3 = currentProfile.reservoirs.reduce(
    (acc, r) => acc + r.currentRealVolumeM3,
    0
  );
  const siltationHiddenM3 = Math.max(0, Math.round(totalApparentM3 - totalRealM3));

  const dailyDemandLiters = currentProfile.sectors.reduce(
    (acc, s) => acc + s.plantsCount * s.targetLitersPerPlantDay,
    0
  );
  const dailyDemandM3 = Math.round((dailyDemandLiters / 1000) * 10) / 10;
  const sprinklerDailyM3 = Math.round(dailyDemandM3 * (535 / 224) * 10) / 10;
  const realAutonomyDays = Math.floor(totalRealM3 / Math.max(1, dailyDemandM3));
  const sprinklerAutonomyDays = Math.floor(totalRealM3 / Math.max(1, sprinklerDailyM3));
  const autonomyGainDays = Math.max(0, realAutonomyDays - sprinklerAutonomyDays);

  const tankRealPct = Math.min(
    94,
    Math.max(8, Math.round((totalRealM3 / Math.max(1, totalNominalM3)) * 100))
  );
  const tankSiltPct = Math.min(
    28,
    Math.max(
      siltationHiddenM3 > 0 ? 7 : 0,
      Math.round((siltationHiddenM3 / Math.max(1, totalNominalM3)) * 100)
    )
  );

  const autonomyTone =
    realAutonomyDays >= 25
      ? {
          badge: 'Reserva Tranquila',
          badgeClass:
            'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          numberClass: 'text-emerald-700 dark:text-emerald-400',
          waterFill: '#10b981',
        }
      : realAutonomyDays >= 12
        ? {
            badge: 'Atenção Moderada',
            badgeClass:
              'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
            numberClass: 'text-amber-600 dark:text-amber-400',
            waterFill: '#f59e0b',
          }
        : {
            badge: 'Reserva Crítica',
            badgeClass:
              'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
            numberClass: 'text-rose-600 dark:text-rose-400',
            waterFill: '#ef4444',
          };

  const hasHydraulicAlert = currentProfile.sectors.some((s) => s.diagnosticStatus !== 'ok');
  const fungalRiskHigh = currentProfile.weather.airHumidityPct >= 82;
  const rain40mmLiters = Math.round(
    currentProfile.roofCatchmentAreaM2 * 40 * currentProfile.catchmentEfficiency
  );

  // Problemas urgentes detectados automaticamente para destaque colorido na Tela Inicial
  const urgentAlerts: Array<{
    id: string;
    severity: 'critical' | 'warning';
    title: string;
    detail: string;
    actionLabel: string;
    targetTab: NavTab;
  }> = [];

  const leakSector = currentProfile.sectors.find((s) => s.diagnosticStatus === 'leak_alert');
  const cloggedSector = currentProfile.sectors.find((s) => s.diagnosticStatus === 'clogged_alert');

  if (leakSector) {
    urgentAlerts.push({
      id: 'leak',
      severity: 'critical',
      title: `Vazamento detectado no ${leakSector.name}`,
      detail: 'Pressão caiu na rede. Bomba travada para evitar perda de água.',
      actionLabel: 'Ver Mangueira',
      targetTab: 'automation',
    });
  }

  if (realAutonomyDays < 12) {
    urgentAlerts.push({
      id: 'water-low',
      severity: 'critical',
      title: `Água crítica: reserva dura apenas ${realAutonomyDays} dias`,
      detail: 'Ative economia de emergência e aproveite captação de telhados.',
      actionLabel: 'Simular Seca',
      targetTab: 'simulator',
    });
  }

  if (cloggedSector) {
    urgentAlerts.push({
      id: 'clog',
      severity: 'warning',
      title: `Gotejador entupido no ${cloggedSector.name}`,
      detail: `Pressão subiu para ${cloggedSector.pressureBar} bar. Vale abrir o final da linha hoje.`,
      actionLabel: 'Desentupir',
      targetTab: 'automation',
    });
  }

  if (currentProfile.weather.airHumidityPct >= 85) {
    urgentAlerts.push({
      id: 'fungal',
      severity: 'critical',
      title: `Risco alto de Vassoura-de-Bruxa (${currentProfile.weather.airHumidityPct}% umidade)`,
      detail: 'Evite molhar folhas: mantenha a Trava Anti-Vassoura ligada e inspecione ramos.',
      actionLabel: 'Checar Folha',
      targetTab: 'camera_ml',
    });
  }

  const withdrawalPct = Math.round(
    (currentProfile.regulation.currentWithdrawalM3Day /
      Math.max(1, currentProfile.regulation.authorizedFlowM3Day)) *
      100
  );
  if (withdrawalPct >= 90) {
    urgentAlerts.push({
      id: 'outorga',
      severity: 'warning',
      title: `Captação em ${withdrawalPct}% do limite da Outorga`,
      detail: 'Aproxime-se com cuidado do teto diário permitido pelo INEMA.',
      actionLabel: 'Ver Outorga',
      targetTab: 'regulation',
    });
  }

  const topUrgentAlert = urgentAlerts[0] || null;
  const hasCriticalAlert = urgentAlerts.some((a) => a.severity === 'critical');

  const primaryNavItems: Array<{
    id: NavTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: boolean;
  }> = [
    { id: 'overview', label: 'Início', icon: Home },
    { id: 'mapa', label: 'Mapa da Fazenda', icon: MapPin },
    { id: 'automation', label: 'Irrigação', icon: Sliders, badge: hasHydraulicAlert },
    { id: 'simulator', label: 'Seca e Chuva', icon: CloudSun },
  ];

  const secondaryNavItems: Array<{
    id: NavTab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'camera_ml', label: 'Saúde da Folha', icon: Camera },
    { id: 'regulation', label: 'Outorga e Crédito', icon: Scale },
    { id: 'emergency', label: 'Seca & Fazenda', icon: ClipboardCheck },
  ];

  const ilheusCompare = profiles.ilheus;
  const oesteCompare = profiles.oeste;
  const isMoreTabActive = ['simulator', 'regulation', 'emergency'].includes(activeTab);

  const shellContent = (
    <div
      className={
        isMobilePreview
          ? 'w-[404px] max-w-full h-[800px] max-h-[84vh] rounded-[2.25rem] border-[6px] border-slate-800 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col relative transform-gpu mobile-force bg-[#EDF3EE] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100'
          : 'min-h-screen bg-[#EDF3EE] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-200'
      }
    >
      {/* BARRA LATERAL ESQUERDA (APENAS DESKTOP) */}
      {!isMobilePreview && (
        <aside className="hidden lg:flex w-64 bg-white dark:bg-[#111827] border-r border-slate-200/80 dark:border-slate-800 flex-col justify-between shrink-0">
          <div className="p-4 space-y-5 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center justify-between px-1 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-tight">
                    {brandName}
                  </h1>
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Cacau & Água na Bahia
                  </p>
                </div>
              </div>
            </div>

            {/* Seletor de Região */}
            <div
              data-tour="sidebar-region"
              className="bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2"
            >
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between">
                <span>Sua Região</span>
                <span className="text-emerald-700 dark:text-emerald-400 truncate max-w-[110px]">
                  {currentProfile.municipality}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveRegion('ilheus')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeRegion === 'ilheus'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Ilhéus (Sul)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRegion('oeste')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeRegion === 'oeste'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Oeste Baiano
                </button>
              </div>
            </div>

            {/* Menu Principal */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 pb-1">
                Principal
              </div>
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {item.badge && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Menu Ferramentas */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 pb-1">
                Saúde & Crédito
              </div>
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rodapé da Sidebar */}
          <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
            <button
              type="button"
              onClick={() => setIsTourOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              Tour Guiado na Tela
            </button>

            <button
              type="button"
              onClick={() => setIsTutorialOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              Tutorial & Dicionário
            </button>

            <button
              type="button"
              onClick={handleResetProfiles}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Padrão
            </button>
          </div>
        </aside>
      )}

      {/* ÁREA DE CONTEÚDO */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          isMobilePreview ? 'min-h-0 overflow-y-auto overflow-x-hidden' : ''
        }`}
      >
        {/* Topbar Limpa */}
        <header
          className={`sticky top-0 z-30 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 ${
            isMobilePreview ? 'px-3.5 py-2.5' : 'px-4 sm:px-6 lg:px-8 py-3 lg:py-3.5'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`${
                  isMobilePreview ? 'flex' : 'flex lg:hidden'
                } w-9 h-9 rounded-xl bg-emerald-600 text-white items-center justify-center shadow-sm shrink-0`}
              >
                <Droplets className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2
                  className={`${
                    isMobilePreview ? 'text-base' : 'text-base sm:text-xl'
                  } font-extrabold text-slate-900 dark:text-white leading-tight truncate`}
                >
                  {TAB_TITLES[activeTab].title}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  {currentProfile.name} • {currentProfile.municipality}/{currentProfile.state} •{' '}
                  <strong>{currentProfile.cacaoAreaHa} ha</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Botão Modo Celular (apenas Desktop quando fora da prévia) */}
              {!isMobilePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMoreOpen(false);
                    setIsMobilePreview(true);
                  }}
                  aria-label="Visualizar em Modo Celular"
                  className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Modo Celular</span>
                </button>
              )}

              {/* Toggle Dark / Light Mode */}
              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                aria-label="Alternar tema claro e escuro"
                className={`${
                  isMobilePreview ? 'p-2' : 'px-2.5 sm:px-3 py-2'
                } rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer`}
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="w-4 h-4 text-slate-600" />
                    {!isMobilePreview && <span className="hidden lg:inline">Modo Escuro</span>}
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    {!isMobilePreview && <span className="hidden lg:inline">Modo Claro</span>}
                  </>
                )}
              </button>

              {!isMobilePreview && (
                <button
                  type="button"
                  onClick={() => setIsTutorialOpen(true)}
                  className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-xs cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  Como Usar
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                className={`${
                  isMobilePreview ? 'px-2.5 py-2 text-[11px]' : 'px-3 sm:px-3.5 py-2 text-xs'
                } rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold inline-flex items-center gap-1 shadow-sm cursor-pointer`}
              >
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {isMobilePreview ? (
                  <span>+ Fazenda</span>
                ) : (
                  <>
                    <span className="sm:hidden">+ Fazenda</span>
                    <span className="hidden sm:inline">+ Cadastrar Fazenda</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Barra Rápida de Região no Celular (troca Ilhéus <-> Oeste com 1 toque sem abrir menu) */}
          <div
            data-tour="sidebar-region"
            className={`${
              isMobilePreview ? 'flex' : 'flex lg:hidden'
            } items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800`}
          >
            <div className="grid grid-cols-2 gap-1.5 flex-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveRegion('ilheus')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeRegion === 'ilheus'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Ilhéus (Sul)
              </button>
              <button
                type="button"
                onClick={() => setActiveRegion('oeste')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeRegion === 'oeste'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Oeste Baiano
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsTourOpen(true)}
              aria-label="Iniciar tour na tela"
              className="px-2.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Tour</span>
            </button>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL */}
        <main
          className={`flex-1 ${
            isMobilePreview ? 'px-3.5 py-4 pb-24' : 'px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 lg:pb-8'
          }`}
        >
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && (
              <div className="space-y-5 sm:space-y-6">
                {/* ALERTA DE PROBLEMA NO TOPO DA TELA INICIAL (EQUILIBRADO + OPÇÃO DE DESLIGAR) */}
                {topUrgentAlert && !alertsEnabled && (
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 text-xs">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <BellOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Alertas na tela inicial desligados ({urgentAlerts.length}{' '}
                        {urgentAlerts.length === 1 ? 'aviso' : 'avisos'})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAlertsEnabled(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1 cursor-pointer transition shrink-0"
                    >
                      <Bell className="w-3 h-3" />
                      <span>Ligar alertas</span>
                    </button>
                  </div>
                )}

                {topUrgentAlert && alertsEnabled && (
                  <div
                    role="alert"
                    className={`rounded-2xl p-3.5 sm:p-4 border border-l-4 shadow-sm flex flex-col gap-2.5 ${
                      hasCriticalAlert
                        ? 'bg-rose-50/90 dark:bg-rose-950/35 border-rose-200 dark:border-rose-800/70 border-l-rose-600 text-rose-950 dark:text-rose-100'
                        : 'bg-amber-50/90 dark:bg-amber-950/35 border-amber-200 dark:border-amber-800/70 border-l-amber-500 text-amber-950 dark:text-amber-100'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-xl text-white shrink-0 ${
                            hasCriticalAlert ? 'bg-rose-600' : 'bg-amber-500'
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span
                              className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${
                                hasCriticalAlert ? 'bg-rose-600' : 'bg-amber-600'
                              }`}
                            >
                              {hasCriticalAlert ? 'Urgente' : 'Atenção'}
                            </span>
                            <h3 className="text-sm sm:text-base font-extrabold leading-snug">
                              {topUrgentAlert.title}
                            </h3>
                          </div>
                          <p
                            className={`text-xs font-medium ${
                              hasCriticalAlert
                                ? 'text-rose-800/90 dark:text-rose-200/80'
                                : 'text-amber-800/90 dark:text-amber-200/80'
                            }`}
                          >
                            {topUrgentAlert.detail}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleSelectTab(topUrgentAlert.targetTab)}
                          className={`px-3.5 py-2 rounded-xl text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition ${
                            hasCriticalAlert
                              ? 'bg-rose-600 hover:bg-rose-700'
                              : 'bg-amber-600 hover:bg-amber-700'
                          }`}
                        >
                          <span>{topUrgentAlert.actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAlertsEnabled(false)}
                          title="Desligar alertas na tela inicial"
                          className={`px-2.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                            hasCriticalAlert
                              ? 'border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 hover:bg-rose-100/80 dark:hover:bg-rose-900/40'
                              : 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-200 hover:bg-amber-100/80 dark:hover:bg-amber-900/40'
                          }`}
                        >
                          <BellOff className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Desligar</span>
                        </button>
                      </div>
                    </div>

                    {urgentAlerts.length > 1 && (
                      <div
                        className={`pt-2 border-t flex flex-wrap items-center gap-1.5 ${
                          hasCriticalAlert
                            ? 'border-rose-200/80 dark:border-rose-800/50'
                            : 'border-amber-200/80 dark:border-amber-800/50'
                        }`}
                      >
                        <span className="text-[11px] font-bold opacity-80">
                          Outros ({urgentAlerts.length - 1}):
                        </span>
                        {urgentAlerts.slice(1).map((extra) => (
                          <button
                            key={extra.id}
                            type="button"
                            onClick={() => handleSelectTab(extra.targetTab)}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition border ${
                              extra.severity === 'critical'
                                ? 'bg-rose-100/80 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 hover:bg-rose-200/70'
                                : 'bg-amber-100/80 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-200/70'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                extra.severity === 'critical' ? 'bg-rose-600' : 'bg-amber-500'
                              }`}
                            />
                            <span>{extra.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* LINHA 1 HERO: CAIXA D'ÁGUA VISUAL (7 COLS) + CARTÃO CLIMA COM SWITCH DE PREVISÃO (5 COLS) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  {/* Esquerda (7 cols): Tanque de Água + Duração Direta */}
                  <div
                    data-tour="home-water-tank"
                    className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Sua Reserva de Água Hoje
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-extrabold border ${autonomyTone.badgeClass}`}
                      >
                        {autonomyTone.badge}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                      {/* Tanque Visual (4 cols) */}
                      <div className="sm:col-span-4 flex flex-col items-center">
                        <div className="relative w-32 h-40 rounded-2xl border-4 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner flex flex-col justify-end">
                          {/* Água Real Útil */}
                          <div
                            className="w-full transition-all duration-700 relative"
                            style={{
                              height: `${Math.max(12, tankRealPct)}%`,
                              backgroundColor: autonomyTone.waterFill,
                              opacity: 0.88,
                            }}
                          >
                            <div className="w-full h-1.5 bg-white/35" />
                          </div>
                          {/* Lodo / Assoreamento no fundo */}
                          {tankSiltPct > 0 && (
                            <div
                              className="w-full bg-amber-900/75 dark:bg-amber-950 flex items-center justify-center text-[9px] font-bold text-amber-100 border-t border-amber-700/60"
                              style={{ height: `${tankSiltPct}%` }}
                            >
                              Lodo (-{siltationHiddenM3} m³)
                            </div>
                          )}

                          {/* Porcentagem Centralizada */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="px-2.5 py-1 rounded-xl bg-slate-950/55 backdrop-blur-xs text-white text-lg font-black shadow">
                              {Math.round((totalRealM3 / Math.max(1, totalNominalM3)) * 100)}%
                            </span>
                            <span className="text-[11px] font-extrabold text-slate-800 dark:text-white mt-1 bg-white/85 dark:bg-slate-900/80 px-2 py-0.5 rounded-full">
                              {Math.round(totalRealM3)} m³ úteis
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Headline de Dopamina + Comparação Simples (8 cols) */}
                      <div className="sm:col-span-8 space-y-4">
                        <div>
                          <div className="flex items-start justify-between gap-2.5">
                            <div
                              className={`text-3xl sm:text-4xl font-black tracking-tight leading-none ${autonomyTone.numberClass}`}
                            >
                              Sua água dura {realAutonomyDays} dias
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsWater3DPopupOpen(true)}
                              title="Ver gráficos detalhados e modelo 3D da água"
                              aria-label="Ver gráficos detalhados e modelo 3D da água"
                              className="w-10 h-10 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/70 text-sky-700 dark:text-sky-300 flex flex-col items-center justify-center shrink-0 shadow-xs transition cursor-pointer group"
                            >
                              <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              <span className="text-[8px] font-black leading-none tracking-tight mt-0.5">
                                3D
                              </span>
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1.5">
                            No gotejamento você ganha{' '}
                            <strong className="text-emerald-700 dark:text-emerald-400">
                              +{autonomyGainDays} dias extras
                            </strong>{' '}
                            em comparação à irrigação comum.
                          </p>
                        </div>

                        {/* Barrinhas Comparativas Limpas */}
                        <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                          <div>
                            <div className="flex justify-between items-center gap-2 text-xs font-bold mb-1">
                              <span className="text-emerald-700 dark:text-emerald-400">
                                Com Gotejamento na Raiz ({dailyDemandM3} m³/dia)
                              </span>
                              <span className="text-slate-900 dark:text-white font-black shrink-0 whitespace-nowrap">
                                {realAutonomyDays} dias
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (realAutonomyDays / Math.max(30, realAutonomyDays)) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center gap-2 text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">
                              <span>Com Rega Comum / Aspersão ({sprinklerDailyM3} m³/dia)</span>
                              <span className="shrink-0 whitespace-nowrap">{sprinklerAutonomyDays} dias</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-slate-400 dark:bg-slate-500 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (sprinklerAutonomyDays / Math.max(30, realAutonomyDays)) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Métricas Rápidas + Botão de Ação */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                              <Sprout className="w-4 h-4 text-emerald-600" />
                              {currentProfile.estimatedPlants.toLocaleString('pt-BR')} pés
                            </span>
                            <span>•</span>
                            <span>{currentProfile.cacaoAreaHa} ha</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectTab('simulator')}
                            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            Testar Cenário de Seca
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Direita (5 cols): Cartão Verde Clima Agora + Switch Direto no Topo */}
                  <div
                    data-tour="home-weather-switch"
                    className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 dark:from-emerald-900 dark:via-emerald-950 dark:to-slate-950 text-white p-5 sm:p-6 shadow-md border border-emerald-600/40 flex flex-col justify-between gap-5"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                            Tempo Agora em {currentProfile.municipality}
                          </span>
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-1">
                            <span className="text-4xl sm:text-5xl font-black">
                              {currentProfile.weather.tempC}°C
                            </span>
                            <span className="text-sm font-semibold text-emerald-100 whitespace-nowrap">
                              • {currentProfile.weather.airHumidityPct}% umidade
                            </span>
                          </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/15">
                          <CloudSun className="w-7 h-7 text-amber-300" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="bg-white/10 rounded-xl p-3">
                          <span className="text-emerald-200 block">Dias sem chuva</span>
                          <span className="font-black text-base text-white">
                            {currentProfile.weather.daysWithoutRain} dias
                          </span>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3">
                          <span className="text-emerald-200 block">Chuva em 7 dias</span>
                          <span className="font-black text-base text-white">
                            {currentProfile.weather.forecastRain7DaysMm} mm
                          </span>
                        </div>
                      </div>

                      {fungalRiskHigh ? (
                        <div className="p-3 rounded-xl bg-rose-500/25 border border-rose-300/40 text-xs font-bold flex items-center gap-2 text-rose-50">
                          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-200" />
                          <span>Ar muito úmido: cuidado com Vassoura-de-Bruxa! Trava ativa.</span>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-emerald-500/25 border border-emerald-300/40 text-xs font-bold flex items-center gap-2 text-emerald-50">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
                          <span>Tempo favorável na copa • Irrigação protegida na raiz.</span>
                        </div>
                      )}
                    </div>

                    {/* Botão Switch na cara do usuário para abrir previsão sem precisar rolar */}
                    <div className="bg-black/25 rounded-xl p-3.5 border border-white/15 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-extrabold text-white block">
                          Ver Previsão do Tempo
                        </span>
                        <span className="text-[11px] text-emerald-200">
                          Turnos de 3h + Previsão da Semana
                        </span>
                      </div>
                      <ToggleSwitch
                        checked={showHomeForecast}
                        onChange={setShowHomeForecast}
                        ariaLabel="Abrir previsão do tempo na tela inicial"
                        size="md"
                        activeColor="amber"
                      />
                    </div>
                  </div>
                </div>

                {/* EXPANSÃO IMEDIATA DA PREVISÃO QUANDO O SWITCH ESTÁ LIGADO */}
                {showHomeForecast && <CityWeatherForecast profile={currentProfile} />}

                {/* LINHA 2: AÇÕES RÁPIDAS GRANDES */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      O que você quer acessar agora?
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <button
                      type="button"
                      onClick={() => handleSelectTab('mapa')}
                      className="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-600 shadow-sm transition group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Mapa da Fazenda
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Satélite Leaflet e Relevo 3D
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTab('automation')}
                      className="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-sm transition group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <Sliders className="w-5 h-5" />
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Controlar Rega
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Ligar válvulas e ver talhões
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTab('simulator')}
                      className="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 shadow-sm transition group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <CloudSun className="w-5 h-5" />
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Seca & Telhados
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Simular dias sem chuva e chuva
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTab('camera_ml')}
                      className="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 shadow-sm transition group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Foto da Folha
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Checar Vassoura-de-Bruxa
                      </p>
                    </button>
                  </div>
                </div>

                {/* LINHA 3: NO MÁXIMO 2 AVISOS CLAROS DO DIA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hasHydraulicAlert ? (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-extrabold text-sm text-amber-950 dark:text-amber-200">
                            Pressão alterada em um talhão
                          </h4>
                          <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                            Confira se há gotejador entupido ou furo na mangueira.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectTab('automation')}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 cursor-pointer"
                      >
                        Ver Talhão
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            Rede de Gotejamento Normal
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Todos os talhões com pressão e vazão estáveis hoje.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectTab('automation')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer"
                      >
                        Abrir Rega
                      </button>
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <CloudRain className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          Potencial de Chuva no Telhado
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Seus {currentProfile.roofCatchmentAreaM2} m² juntam{' '}
                          <strong>{rain40mmLiters.toLocaleString('pt-BR')} L</strong> em chuva de 40 mm.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('simulator')}
                      className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shrink-0 cursor-pointer"
                    >
                      Calcular
                    </button>
                  </div>
                </div>

                {/* EXTRA OPCIONAL RECOLHIDO: COMPARATIVO SUL vs OESTE */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => setShowRegionCompare((v) => !v)}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                  >
                    <span>Quer comparar Sul da Bahia (Ilhéus) vs. Oeste Baiano?</span>
                    {showRegionCompare ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showRegionCompare && (
                    <div className="p-5 pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                        <div className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300">
                          Sul da Bahia ({ilheusCompare.municipality} — Cabruca)
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          Clima mais úmido ({ilheusCompare.weather.airHumidityPct}% UR) e morros ({ilheusCompare.terrainSlopePct ?? 16}%). Foco em travar a Vassoura-de-Bruxa molhando só a raiz e segurar água de enxurrada.
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1.5">
                        <div className="font-extrabold text-sm text-amber-900 dark:text-amber-300">
                          Oeste Baiano ({oesteCompare.municipality} — Pleno Sol)
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          Ar seco ({oesteCompare.weather.airHumidityPct}% UR) evita fungos naturalmente e áreas planas ({oesteCompare.terrainSlopePct ?? 4}%). Foco em rega noturna (-38% energia) e limite de Outorga.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'mapa' && (
              <div data-tour="map-panel">
                <FarmMap2D3D
                  profile={currentProfile}
                  onUpdateProfile={handleUpdateCurrentProfile}
                  onOpenSimulator={() => handleSelectTab('simulator')}
                />
              </div>
            )}

            {activeTab === 'automation' && (
              <div data-tour="automation-panel">
                <AutomationTab
                  profile={currentProfile}
                  onUpdateProfile={handleUpdateCurrentProfile}
                />
              </div>
            )}

            {activeTab === 'simulator' && (
              <DroughtSimulatorTab
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

            {activeTab === 'regulation' && (
              <div data-tour="regulation-panel">
                <RegulationCreditTab profile={currentProfile} />
              </div>
            )}

            {activeTab === 'emergency' && (
              <PropertyAndEmergencyTab
                profile={currentProfile}
                onUpdateProfile={handleUpdateCurrentProfile}
                onResetProfile={handleResetProfiles}
                brandName={brandName}
                onChangeBrandName={setBrandName}
                onOpenWizard={() => setIsWizardOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* BARRA INFERIOR ESTILO APP NO CELULAR */}
      <nav
        aria-label="Navegação rápida no celular"
        className={`${
          isMobilePreview ? 'grid' : 'grid lg:hidden'
        } fixed bottom-0 inset-x-0 z-40 grid-cols-5 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe`}
      >
        {(
          [
            { id: 'overview', label: 'Início', icon: Home },
            { id: 'mapa', label: 'Mapa', icon: MapPin },
            { id: 'automation', label: 'Rega', icon: Sliders, alert: hasHydraulicAlert },
            { id: 'camera_ml', label: 'Folha', icon: Camera },
          ] as Array<{
            id: NavTab;
            label: string;
            icon: React.FC<{ className?: string }>;
            alert?: boolean;
          }>
        ).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && !isMobileMoreOpen;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-1 min-h-[56px] text-[11px] font-bold transition-colors cursor-pointer ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl mb-0.5 relative ${
                  isActive ? 'bg-emerald-100 dark:bg-emerald-950/70' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.alert && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsMobileMoreOpen((v) => !v)}
          className={`relative flex flex-col items-center justify-center py-2 px-1 min-h-[56px] text-[11px] font-bold transition-colors cursor-pointer ${
            isMobileMoreOpen || isMoreTabActive
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl mb-0.5 relative ${
              isMobileMoreOpen || isMoreTabActive
                ? 'bg-emerald-100 dark:bg-emerald-950/70'
                : ''
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </div>
          <span>Mais</span>
        </button>
      </nav>

      {/* BOTTOM SHEET MOBILE ("Mais") */}
      {isMobileMoreOpen && (
        <div className={isMobilePreview ? '' : 'lg:hidden'}>
          <div
            className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[1px]"
            onClick={() => setIsMobileMoreOpen(false)}
          />
          <div className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 pb-safe shadow-2xl space-y-4">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Mais Ferramentas
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Simulador, INEMA/BNB, guia e ajustes rápidos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMoreOpen(false)}
                aria-label="Fechar menu"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {(
                [
                  { id: 'simulator', label: 'Seca e Chuva', desc: 'Dias de água e chuva no telhado', icon: CloudSun },
                  { id: 'regulation', label: 'Outorga e Crédito', desc: 'INEMA e Banco do Nordeste (PDF)', icon: Scale },
                  { id: 'emergency', label: 'Seca & Fazenda', desc: 'Lista da seca e editar dados', icon: ClipboardCheck },
                ] as Array<{
                  id: NavTab;
                  label: string;
                  desc: string;
                  icon: React.FC<{ className?: string }>;
                }>
              ).map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition cursor-pointer ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold">{item.label}</div>
                        <div
                          className={`text-xs ${
                            active ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMoreOpen(false);
                  setIsTourOpen(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                Tour na Tela
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMoreOpen(false);
                  setIsTutorialOpen(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                Tutorial & Guia
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMoreOpen(false);
                  setIsWizardOpen(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                + Cadastrar Fazenda
              </button>

              <button
                type="button"
                onClick={() => {
                  handleResetProfiles();
                  setIsMobileMoreOpen(false);
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar Padrão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAIS E TOUR INTERATIVO */}
      <FarmerSetupWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onApplyNewFarm={handleApplyNewFarmFromWizard}
      />

      <InteractiveTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onNavigateTab={handleSelectTab}
        onOpenWizard={() => {
          setIsTutorialOpen(false);
          setIsWizardOpen(true);
        }}
        onStartTour={() => {
          setIsTutorialOpen(false);
          setIsTourOpen(true);
        }}
      />

      <AppTourOverlay
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigateTab={handleSelectTab}
      />

      <WaterReserve3DPopup
        isOpen={isWater3DPopupOpen}
        onClose={() => setIsWater3DPopupOpen(false)}
        profile={currentProfile}
        totalNominalM3={totalNominalM3}
        totalApparentM3={totalApparentM3}
        totalRealM3={totalRealM3}
        siltationHiddenM3={siltationHiddenM3}
        dailyDemandM3={dailyDemandM3}
        sprinklerDailyM3={sprinklerDailyM3}
        realAutonomyDays={realAutonomyDays}
        sprinklerAutonomyDays={sprinklerAutonomyDays}
        autonomyGainDays={autonomyGainDays}
        rain40mmLiters={rain40mmLiters}
      />
    </div>
  );

  if (isMobilePreview) {
    return (
      <div className="min-h-screen bg-slate-900 dark:bg-black flex flex-col items-center justify-center p-3 sm:p-5 gap-3">
        <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-800/95 text-white px-4 py-2 rounded-2xl border border-slate-700 shadow-lg text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
            <Smartphone className="w-4 h-4" />
            Modo Celular (Prévia 404 px)
          </span>
          <button
            type="button"
            onClick={() => {
              setIsMobileMoreOpen(false);
              setIsMobilePreview(false);
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Monitor className="w-3.5 h-3.5" />
            Voltar para Modo PC
          </button>
        </div>
        {shellContent}
      </div>
    );
  }

  return shellContent;
}

export default App;
