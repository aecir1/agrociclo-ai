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
  Sliders,
  Activity,
  Sprout,
  Wrench,
  Flame
} from 'lucide-react';
import { PropertyProfile, PhenologicalStage, IrrigationSector } from '../types';

interface AutomationTabProps {
  profile: PropertyProfile;
  onUpdateProfile: (updated: PropertyProfile) => void;
}

const STAGE_LITERS_MAP: Record<'ilheus' | 'oeste', Record<PhenologicalStage, { liters: number; label: string; kc: string }>> = {
  ilheus: {
    mudas: { liters: 6, label: 'Mudas / Enxertia (< 2 anos)', kc: 'Kc 0.65 — Bulbo superficial' },
    vegetativo: { liters: 8, label: 'Vegetativo / Lançamento Foliar', kc: 'Kc 0.80 — Manutenção' },
    floracao: { liters: 12, label: 'Floração e Peco de Bilros', kc: 'Kc 1.05 — Fase crítica de queda' },
    frutificacao: { liters: 15, label: 'Enchimento de Frutos', kc: 'Kc 1.15 — Demanda máxima Cabruca' }
  },
  oeste: {
    mudas: { liters: 9, label: 'Mudas a Pleno Sol (< 2 anos)', kc: 'Kc 0.75 — Quebra-vento + Mulch' },
    vegetativo: { liters: 13, label: 'Vegetativo / Formação de Copa', kc: 'Kc 0.95 — Ajuste osmótico' },
    floracao: { liters: 16, label: 'Floração Intensa (Indução)', kc: 'Kc 1.10 — +30% flores (Hutcheon)' },
    frutificacao: { liters: 20, label: 'Frutificação Alta Performance (3.000 kg/ha)', kc: 'Kc 1.25 — 20 L/planta/dia (CPCRI)' }
  }
};

export const AutomationTab: React.FC<AutomationTabProps> = ({ profile, onUpdateProfile }) => {
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const toggleAutomationConfig = (key: keyof PropertyProfile['automationConfig']) => {
    if (key === 'electricalConductivityDsm') return;
    const updated = {
      ...profile,
      automationConfig: {
        ...profile.automationConfig,
        [key]: !profile.automationConfig[key]
      }
    };
    onUpdateProfile(updated);
    showToast(`Regra de automação atualizada com sucesso no controlador de borda!`);
  };

  const handleStageChange = (sectorId: string, newStage: PhenologicalStage) => {
    const stageConfig = STAGE_LITERS_MAP[profile.id][newStage];
    const deficitFactor = profile.automationConfig.osmoticDeficitMode ? 0.85 : 1.0;
    const adjustedLiters = Math.round(stageConfig.liters * deficitFactor * 10) / 10;

    const updatedSectors = profile.sectors.map((sec) => {
      if (sec.id !== sectorId) return sec;
      return {
        ...sec,
        stage: newStage,
        targetLitersPerPlantDay: adjustedLiters
      };
    });

    onUpdateProfile({ ...profile, sectors: updatedSectors });
    showToast(`Lâmina do ${sectorId.toUpperCase()} recalculada automaticamente para ${adjustedLiters} L/planta/dia (${stageConfig.label}).`);
  };

  const toggleValve = (sector: IrrigationSector) => {
    // Check if Anti-Witches' Broom Lock prevents opening in Ilhéus when RH > 85%
    if (
      sector.valveStatus !== 'open' &&
      profile.automationConfig.antiWitchesBroomLock &&
      profile.weather.airHumidityPct >= 85
    ) {
      const updatedSectors = profile.sectors.map((s) =>
        s.id === sector.id
          ? {
              ...s,
              valveStatus: 'auto_blocked' as const,
              diagnosticMessage: `BLOQUEIO FITOSSANITÁRIO: Umidade do ar em ${profile.weather.airHumidityPct}% (>85%). Irrigação suspensa para impedir germinação de esporos da Vassoura-de-Bruxa!`
            }
          : s
      );
      onUpdateProfile({ ...profile, sectors: updatedSectors });
      showToast(`Trava Anti-Vassoura impediu abertura imediata (UR ${profile.weather.airHumidityPct}%). Agendado para janela segura!`);
      return;
    }

    const nextStatus = sector.valveStatus === 'open' ? 'closed' : 'open';
    const updatedSectors = profile.sectors.map((s) =>
      s.id === sector.id
        ? {
            ...s,
            valveStatus: nextStatus as 'open' | 'closed',
            diagnosticMessage:
              nextStatus === 'open'
                ? 'Válvula solenoide aberta via comando local LoRa. Entregando água e nutrientes direto na zona radicular.'
                : 'Válvula fechada manualmente pelo operador.'
          }
        : s
    );
    onUpdateProfile({ ...profile, sectors: updatedSectors });
    showToast(`Válvula do ${sector.name} ${nextStatus === 'open' ? 'ABERTA' : 'FECHADA'}.`);
  };

  const handleFlushCloggedLine = (sectorId: string) => {
    const updatedSectors = profile.sectors.map((s) => {
      if (s.id !== sectorId) return s;
      return {
        ...s,
        measuredFlowLh: Math.round(s.nominalFlowLh * 0.99),
        pressureBar: s.nominalPressureBar,
        diagnosticStatus: 'ok' as const,
        diagnosticMessage: 'Retrolavagem (Flushing) concluída! Pressão normalizada e vazão dos gotejadores restaurada em 99%.'
      };
    });
    onUpdateProfile({ ...profile, sectors: updatedSectors });
    showToast('Válvula de fim de linha aberta por 3 min: sedimentos expulsos e vazão normalizada!');
  };

  const handleSimulateLeak = (sectorId: string) => {
    const updatedSectors = profile.sectors.map((s) => {
      if (s.id !== sectorId) return s;
      return {
        ...s,
        measuredFlowLh: Math.round(s.nominalFlowLh * 1.32), // +32% flow spike!
        pressureBar: Number((s.nominalPressureBar * 0.65).toFixed(2)), // Pressure drop!
        valveStatus: 'auto_blocked' as const,
        diagnosticStatus: 'leak_alert' as const,
        diagnosticMessage: 'EMERGÊNCIA HIDRÁULICA: Vazão disparou +32% e pressão caiu para 65%. Mangueira secundária rompida! Válvula solenoide FECHADA AUTOMATICAMENTE para salvar o reservatório.'
      };
    });
    onUpdateProfile({ ...profile, sectors: updatedSectors });
    showToast('Simulação de rompimento: O sistema detectou pico de vazão (+32%) e fechou a válvula automaticamente!');
  };

  const handleRepairLeak = (sectorId: string) => {
    const updatedSectors = profile.sectors.map((s) => {
      if (s.id !== sectorId) return s;
      return {
        ...s,
        measuredFlowLh: Math.round(s.nominalFlowLh * 0.99),
        pressureBar: s.nominalPressureBar,
        valveStatus: 'scheduled' as const,
        diagnosticStatus: 'ok' as const,
        diagnosticMessage: 'Reparo de mangueira confirmado. Curva de pressão e vazão estável no cabeçal.'
      };
    });
    onUpdateProfile({ ...profile, sectors: updatedSectors });
    showToast('Reparo registrado e setor reabilitado para operação!');
  };

  const totalDailyLiters = profile.sectors.reduce(
    (acc, s) => acc + s.plantsCount * s.targetLitersPerPlantDay,
    0
  );
  const totalDailyM3 = Math.round((totalDailyLiters / 1000) * 10) / 10;
  const sprinklerEquivalentM3 = Math.round(totalDailyM3 * (535 / 224) * 10) / 10;
  const dailySavedM3 = Math.round((sprinklerEquivalentM3 - totalDailyM3) * 10) / 10;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionFeedback && (
        <div className="bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between border border-emerald-600 animate-pulse">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-xs text-emerald-200 hover:text-white">
            Fechar
          </button>
        </div>
      )}

      {/* Top Architecture Banner: Why "Sensor-Lite" Automation solves FAEB Slides 20-21 */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-800/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <Wrench className="w-3.5 h-3.5" />
              ARQUITETURA "SENSOR-LITE" DE BAIXO CUSTO (SEM MALHA CARA NO SOLO)
            </div>
            <h2 className="text-xl font-bold">
              Automação de Gotejamento no Cabeçal + Balanço Hídrico Evapotranspirativo
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Pequenos e médios produtores não conseguem pagar nem manter dezenas de sensores enterrados na roça (que quebram ou perdem sinal). O <strong>AgroCiclo AI</strong> concentra o hardware em <strong>1 único nó no cabeçal da bomba/reservatório</strong> (Hidrômetro de pulso + Sensor de pressão + Válvulas solenoides via LoRa Offline), cruzando a vazão medida com o clima e estágio fenológico do cacau.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/15 shrink-0 min-w-[240px]">
            <div className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Economia Hoje vs. Aspersão</div>
            <div className="text-3xl font-extrabold text-white mt-1">+{dailySavedM3} m³/dia</div>
            <div className="text-xs text-slate-300 mt-1">
              Demanda Gotejo: <strong>{totalDailyM3} m³/dia</strong> (vs. {sprinklerEquivalentM3} m³ aspersão)
            </div>
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5 text-xs text-amber-300">
              <Zap className="w-3.5 h-3.5" />
              <span>Custo estimado do kit cabeçal: ~R$ 680</span>
            </div>
          </div>
        </div>
      </div>

      {/* Regras Inteligentes de Automação (Toggles) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rule 1: Anti-Vassoura */}
        <div
          onClick={() => toggleAutomationConfig('antiWitchesBroomLock')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            profile.automationConfig.antiWitchesBroomLock
              ? 'bg-emerald-50 border-emerald-500 shadow-sm'
              : 'bg-white border-slate-200 opacity-75 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-emerald-600 text-white">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                profile.automationConfig.antiWitchesBroomLock
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {profile.automationConfig.antiWitchesBroomLock ? 'ATIVA' : 'DESATIVADA'}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Trava Fitossanitária Anti-Vassoura</h3>
          <p className="text-xs text-slate-600 mt-1">
            Suspende pulsos se a Umidade Relativa passar de 85% (Atual: <strong>{profile.weather.airHumidityPct}%</strong>), mantendo a copa seca contra <em>Moniliophthora</em>.
          </p>
        </div>

        {/* Rule 2: Tarifa Verde */}
        <div
          onClick={() => toggleAutomationConfig('greenTariffSync')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            profile.automationConfig.greenTariffSync
              ? 'bg-sky-50 border-sky-500 shadow-sm'
              : 'bg-white border-slate-200 opacity-75 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-sky-600 text-white">
              <Zap className="w-4 h-4" />
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                profile.automationConfig.greenTariffSync
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {profile.automationConfig.greenTariffSync ? 'ATIVA (-38% R$)' : 'DESATIVADA'}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Sincronia Tarifa Verde (Noturna)</h3>
          <p className="text-xs text-slate-600 mt-1">
            Prioriza bombeamento entre 21h30 e 06h00 (Horário Fora de Ponta Coelba), cortando 38% do custo elétrico e a evaporação solar.
          </p>
        </div>

        {/* Rule 3: Ajuste Osmótico */}
        <div
          onClick={() => toggleAutomationConfig('osmoticDeficitMode')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            profile.automationConfig.osmoticDeficitMode
              ? 'bg-amber-50 border-amber-500 shadow-sm'
              : 'bg-white border-slate-200 opacity-75 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-amber-600 text-white">
              <Sprout className="w-4 h-4" />
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                profile.automationConfig.osmoticDeficitMode
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {profile.automationConfig.osmoticDeficitMode ? 'ATIVO (-15% Água)' : 'PADRÃO 100%'}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Estímulo de Ajuste Osmótico Radicular</h3>
          <p className="text-xs text-slate-600 mt-1">
            Aplica déficit controlado de 15% (Moser et al., 2010), estimulando as raízes finas a concentrar solutos e buscar água sem perder produção.
          </p>
        </div>

        {/* Rule 4: Modo Offline LoRa */}
        <div
          onClick={() => toggleAutomationConfig('offlineLoRaMode')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            profile.automationConfig.offlineLoRaMode
              ? 'bg-indigo-50 border-indigo-500 shadow-sm'
              : 'bg-white border-slate-200 opacity-75 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-indigo-600 text-white">
              <WifiOff className="w-4 h-4" />
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                profile.automationConfig.offlineLoRaMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {profile.automationConfig.offlineLoRaMode ? 'OFFLINE-FIRST' : 'ONLINE ONLY'}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Operação Autônoma Sem Internet</h3>
          <p className="text-xs text-slate-600 mt-1">
            O microcontrolador executa o calendário de rega e fecha válvulas em caso de vazamento mesmo se a fazenda ficar 100% sem sinal de internet.
          </p>
        </div>
      </div>

      {/*Controle por Talhão + Diagnóstico de Vazamentos e Entupimentos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              Controle de Setores de Gotejamento & Diagnóstico Hidráulico de Perdas Ocultas
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Altere o estágio da planta para ajustar a lâmina d'água ou simule falhas hidráulicas (entupimento de gotejador vs. mangueira rompida).
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <Activity className="w-4 h-4 text-sky-600" />
            <span>Pressão Nominal no Cabeçal: <strong>{profile.id === 'ilheus' ? '1,8 bar' : '2,0 bar'}</strong></span>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {profile.sectors.map((sec) => {
            const flowRatioPct = Math.round((sec.measuredFlowLh / sec.nominalFlowLh) * 100);
            const isClogged = sec.diagnosticStatus === 'clogged_alert';
            const isLeak = sec.diagnosticStatus === 'leak_alert';
            const sectorDailyM3 = Math.round(((sec.plantsCount * sec.targetLitersPerPlantDay) / 1000) * 10) / 10;

            return (
              <div
                key={sec.id}
                className={`p-5 transition-colors ${
                  isLeak
                    ? 'bg-red-50/70'
                    : isClogged
                    ? 'bg-amber-50/60'
                    : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left: Sector info & stage selector */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{sec.name}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
                        {sec.areaHa} ha • {sec.plantsCount.toLocaleString('pt-BR')} pés ({sec.cloneType})
                      </span>
                      {sec.valveStatus === 'open' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          IRRIGANDO POR PULSOS
                        </span>
                      )}
                      {sec.valveStatus === 'scheduled' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                          AGENDADO (21h30 TARIFA VERDE)
                        </span>
                      )}
                      {sec.valveStatus === 'auto_blocked' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          TRAVA AUTOMÁTICA ATIVA
                        </span>
                      )}
                      {sec.valveStatus === 'closed' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          VÁLVULA FECHADA
                        </span>
                      )}
                    </div>

                    {/* Stage selector + Lâmina */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600">Estágio da Planta:</label>
                        <select
                          value={sec.stage}
                          onChange={(e) => handleStageChange(sec.id, e.target.value as PhenologicalStage)}
                          className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="mudas">🌱 Mudas / Implantação</option>
                          <option value="vegetativo">🌿 Vegetativo / Folha</option>
                          <option value="floracao">🌸 Floração e Peco</option>
                          <option value="frutificacao">🍫 Frutificação / Enchimento</option>
                        </select>
                      </div>

                      <div className="text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-lg font-medium">
                        Meta: <strong>{sec.targetLitersPerPlantDay} L/árvore/dia</strong> ({sectorDailyM3} m³/dia no talhão)
                      </div>

                      <div className="text-xs text-slate-600">
                        Umidade na Raiz (0–20cm): <strong>{sec.soilMoisturePct}% CC</strong>
                      </div>
                    </div>

                    {/* Diagnostic Box */}
                    <div
                      className={`mt-2 p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                        isLeak
                          ? 'bg-red-100/90 border-red-300 text-red-900'
                          : isClogged
                          ? 'bg-amber-100/90 border-amber-300 text-amber-900'
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isLeak || isClogged ? (
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                        )}
                        <span>{sec.diagnosticMessage}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isClogged && (
                          <button
                            onClick={() => handleFlushCloggedLine(sec.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center gap-1 shadow-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Executar Flushing (Desentupir)
                          </button>
                        )}
                        {isLeak && (
                          <button
                            onClick={() => handleRepairLeak(sec.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-xs flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmar Reparo da Mangueira
                          </button>
                        )}
                        {!isLeak && !isClogged && (
                          <button
                            onClick={() => handleSimulateLeak(sec.id)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-medium text-xs"
                            title="Testar como o sistema reage se uma mangueira arrebentar na roça"
                          >
                            Simular Mangueira Rompida
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Hydraulic Telemetry & Valve Action */}
                  <div className="flex sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-right min-w-[210px]">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Vazão Lida / Nominal:</span>
                        <span
                          className={`font-bold ${
                            isLeak ? 'text-red-600' : isClogged ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {flowRatioPct}%
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">
                        {(sec.measuredFlowLh / 1000).toFixed(1)} m³/h{' '}
                        <span className="text-xs font-normal text-slate-500">
                          / {(sec.nominalFlowLh / 1000).toFixed(1)} m³/h
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        Pressão: <strong>{sec.pressureBar} bar</strong> (Nom: {sec.nominalPressureBar} bar)
                      </div>
                    </div>

                    <button
                      onClick={() => toggleValve(sec)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                        sec.valveStatus === 'open'
                          ? 'bg-slate-800 hover:bg-slate-900 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {sec.valveStatus === 'open' ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Pausar Válvula Solenoide
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Acionar Pulso de Gotejamento
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

      {/* Comparativo Técnico: Gotejamento vs. Microaspersão vs. Aspersão Convencional */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-emerald-900 text-white rounded-2xl p-5 border border-emerald-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Tecnologia Escolhida</span>
            <Droplets className="w-5 h-5 text-emerald-300" />
          </div>
          <h4 className="text-lg font-bold mt-1">Gotejamento + Fertirrigação (Delivery System)</h4>
          <ul className="mt-3 space-y-2 text-xs text-emerald-100">
            <li>• <strong>Eficiência de aplicação (92–95%):</strong> Água e nutrientes direto na zona radicular (0–20 cm).</li>
            <li>• <strong>Em Ilhéus (Cabruca):</strong> Não molha tronco nem frutos, bloqueando o microclima da Vassoura-de-Bruxa.</li>
            <li>• <strong>No Oeste Baiano (Pleno Sol):</strong> Entrega 20 L/planta/dia no pico sem perda por vento ou evaporação (224 mm vs. 535 mm na aspersão — Jadin & Jacquemart).</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Alternativa Intermediária</span>
            <Sprout className="w-5 h-5 text-sky-600" />
          </div>
          <h4 className="text-lg font-bold text-slate-900 mt-1">Microaspersão Sub-Copa</h4>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            <li>• <strong>Faixa molhada ampla:</strong> Útil quando se deseja acelerar a decomposição da matéria orgânica (serrapilheira) no solo.</li>
            <li>• <strong>Atenção em Ilhéus:</strong> Eleva a umidade do ar sob a copa; exige trava rigorosa se houver foco ativo de Podridão-Parda ou Vassoura.</li>
            <li>• <strong>Consumo hídrico:</strong> ~25% a 35% maior que o gotejamento localizado.</li>
          </ul>
        </div>

        <div className="bg-rose-50 rounded-2xl p-5 border border-rose-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Prática de Alto Risco</span>
            <Flame className="w-5 h-5 text-rose-600" />
          </div>
          <h4 className="text-lg font-bold text-rose-950 mt-1">Aspersão Sobre a Copa / "Rega no Olho"</h4>
          <ul className="mt-3 space-y-2 text-xs text-rose-900">
            <li>• <strong>Desperdício hídrico (+138%):</strong> Aplicou 535 mm contra 224 mm do gotejo nos experimentos clássicos na Costa do Marfim.</li>
            <li>• <strong>Sem benefício fisiológico:</strong> Hutcheon (1981) provou que molhar por cima das árvores não reduz estresse interno frente à rega sob a copa.</li>
            <li>• <strong>Risco fitossanitário extremo:</strong> Cria água livre nas folhas e frutos, disparando infecções fúngicas na Bahia.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
