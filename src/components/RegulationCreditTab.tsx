import React, { useState } from 'react';
import {
  Scale,
  Landmark,
  FileCheck2,
  CheckCircle2,
  Sprout,
  Recycle,
  ArrowRight,
  Printer,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { PropertyProfile } from '../types';
import { SOIL_PRACTICES } from '../data/mockProfiles';
import { ToggleSwitch } from './ToggleSwitch';

interface RegulationCreditTabProps {
  profile: PropertyProfile;
}

export const RegulationCreditTab: React.FC<RegulationCreditTabProps> = ({ profile }) => {
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [cacaoPricePerArrobaBrl, setCacaoPricePerArrobaBrl] = useState(650);

  const withdrawalPct = Math.round(
    (profile.regulation.currentWithdrawalM3Day /
      Math.max(1, profile.regulation.authorizedFlowM3Day)) *
      100
  );

  // Produtividade por metro cúbico e economia frente à aspersão
  const totalSeasonYieldKg = profile.cacaoAreaHa * profile.agronomicThesis.expectedYieldKgHa;
  const totalSeasonWaterM3 = Math.max(
    1,
    profile.cacaoAreaHa * profile.agronomicThesis.waterConsumptionDripMmSeason * 10
  );
  const kgPerM3Drip = (totalSeasonYieldKg / totalSeasonWaterM3).toFixed(2);

  const sprinklerSeasonWaterM3 =
    profile.cacaoAreaHa * profile.agronomicThesis.waterConsumptionSprinklerMmSeason * 10;
  const seasonSavedWaterM3 = Math.max(0, sprinklerSeasonWaterM3 - totalSeasonWaterM3);

  // Retorno financeiro para financiamento FNE Verde / FNE Água (Banco do Nordeste)
  const extraYieldPerHaKg = Math.max(
    0,
    profile.agronomicThesis.expectedYieldKgHa -
      profile.agronomicThesis.baselineYieldWithoutDripKgHa
  );
  const totalExtraArrobas = Math.round((extraYieldPerHaKg * profile.cacaoAreaHa) / 15);
  const grossExtraRevenueBrl = totalExtraArrobas * cacaoPricePerArrobaBrl;
  const estimatedKitInvestmentBrl = profile.cacaoAreaHa * 8500;
  const paybackSafras =
    grossExtraRevenueBrl > 0
      ? (estimatedKitInvestmentBrl / grossExtraRevenueBrl).toFixed(1)
      : '—';

  return (
    <div className="space-y-6">
      {/* Cabeçalho direto + Switch de extras */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <Landmark className="w-5 h-5" />
            </span>
            Outorga (INEMA) & Crédito Banco do Nordeste
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Entenda como o controle da água mantém sua fazenda dentro da lei e facilita financiamento rural com juros baixos.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/70 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
          <ToggleSwitch
            checked={showExtraDetails}
            onChange={setShowExtraDetails}
            label="Ver Reúso e Manejo do Solo"
            size="sm"
            activeColor="emerald"
          />
        </div>
      </div>

      {/* Explicação Simples em 3 Passos (Sem complicação!) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-black text-sm flex items-center justify-center shrink-0">
            1
          </span>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Economiza Água na Roça
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              O gotejamento na raiz usa menos da metade da água de um aspersor comum, sem desperdício.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-sm flex items-center justify-center shrink-0">
            2
          </span>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Prova que Está Regular no INEMA
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Mostra quantos litros por dia você puxa, garantindo que está abaixo do limite da Outorga ou Dispensa.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-black text-sm flex items-center justify-center shrink-0">
            3
          </span>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Destrava Crédito no Banco
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Com água controlada + CEFIR em dia, o Banco do Nordeste aprova linhas verdes (FNE Verde / Água).
            </p>
          </div>
        </div>
      </div>

      {/* Dois Cards Principais Limpos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Esquerda (7 cols): Situação no INEMA */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <Scale className="w-4 h-4" />
                  Licença Ambiental e Água (INEMA)
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  Situação da Sua Captação de Água
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold border border-emerald-300 dark:border-emerald-700 shrink-0 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                EM DIA
              </span>
            </div>

            {/* Medidor Visual de Outorga */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Uso Diário vs. Limite Permitido ({profile.regulation.legalInstrument})
                </span>
                <span className="font-black text-emerald-700 dark:text-emerald-400">
                  {profile.regulation.currentWithdrawalM3Day} / {profile.regulation.authorizedFlowM3Day} m³/dia ({withdrawalPct}%)
                </span>
              </div>

              <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, withdrawalPct)}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    withdrawalPct > 90 ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                />
              </div>

              <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Registro: <strong className="text-slate-700 dark:text-slate-200">{profile.regulation.processNumber}</strong></span>
                <span>Bomba trava sozinha ao atingir 95% do limite</span>
              </div>
            </div>

            {/* 3 Itens Simples de Regularidade */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1" />
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">Uso Sem Desperdício</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Rega só na raiz (0–20 cm) e capta água de {profile.roofCatchmentAreaM2} m² de telhado.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1" />
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">CEFIR e Nascentes</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Mata ciliar e áreas de reserva protegidas no cadastro rural estadual.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1" />
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">Economia na Seca</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  {seasonSavedWaterM3.toLocaleString('pt-BR')} m³ poupados por safra contra aspersão.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-950 dark:text-sky-200">
            <strong>Resumo fácil:</strong> Quem puxa pouca água por gotejamento muitas vezes se enquadra em{' '}
            <em>Dispensa de Outorga</em> ou evita multas ambientais do INEMA por usar mais água do que o rio comporta.
          </div>
        </div>

        {/* Direita (5 cols): Passaporte de Crédito Rural (Banco do Nordeste) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-800/60 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" />
                  Banco do Nordeste (FNE Verde / Água)
                </span>
                <h3 className="text-xl font-extrabold mt-1">
                  Passaporte de Financiamento Rural
                </h3>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="arroba-price" className="font-bold text-emerald-100">
                  Preço estimado da arroba (15 kg):
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-emerald-200">R$</span>
                  <input
                    id="arroba-price"
                    type="number"
                    min={150}
                    max={2500}
                    step={25}
                    value={cacaoPricePerArrobaBrl}
                    onChange={(e) =>
                      setCacaoPricePerArrobaBrl(Math.max(100, Number(e.target.value)))
                    }
                    className="w-20 rounded-lg bg-slate-950/70 border border-emerald-400/50 px-2 py-1 text-right font-black text-white text-sm"
                  />
                </div>
              </div>
              <p className="text-[11px] text-emerald-100/80">
                O gerente do banco quer ver que o kit de irrigação se paga com o aumento da colheita de cacau.
              </p>
            </div>

            {/* Números de Ouro para o Banco */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-white/10 border border-white/10">
                <span className="block text-[11px] text-emerald-200 font-semibold">
                  Ganho Extra na Safra
                </span>
                <span className="text-xl font-black text-white block mt-0.5">
                  +R$ {grossExtraRevenueBrl.toLocaleString('pt-BR')}
                </span>
                <span className="text-[11px] text-emerald-300">
                  +{totalExtraArrobas} arrobas estimadas
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/10 border border-white/10">
                <span className="block text-[11px] text-emerald-200 font-semibold">
                  Retorno do Kit (Payback)
                </span>
                <span className="text-xl font-black text-amber-300 block mt-0.5">
                  ~{paybackSafras} safras
                </span>
                <span className="text-[11px] text-emerald-300">
                  {kgPerM3Drip} kg de cacau por m³
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDossierModal(true)}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
          >
            <FileCheck2 className="w-5 h-5" />
            Gerar Comprovante PDF para o Banco
          </button>
        </div>
      </div>

      {/* Seção Opcional (Escondida por padrão no Switch): Reúso + Práticas de Solo */}
      {showExtraDetails && (
        <div className="space-y-6 animate-fadeIn">
          {/* Fluxo Simples de Reúso */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Recycle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              Caminho Seguro da Água na Propriedade (Sem Entupir o Gotejo)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                <div className="text-xs font-extrabold text-sky-800 dark:text-sky-300 flex items-center justify-between">
                  <span>1. CAPTAÇÃO</span>
                  <ArrowRight className="w-3.5 h-3.5 hidden md:block" />
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5">
                  Telhados das barcaças e água filtrada do açude antes de bombear.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>2. FILTRAGEM</span>
                  <ArrowRight className="w-3.5 h-3.5 hidden md:block" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">
                  Filtro de areia e disco no cabeçal segura sujeira para os furos não entupirem.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>3. USO NA RAIZ</span>
                  <ArrowRight className="w-3.5 h-3.5 hidden md:block" />
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5">
                  Gotejamento direto na raiz com palha seca cobrindo o pé da árvore.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <div className="text-xs font-extrabold text-amber-800 dark:text-amber-300">
                  4. ÁGUA DE LAVAGEM
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5">
                  Água de lavagem nunca vai no gotejador; vai para bananeiras/capim em filtro natural.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>Importante:</strong> Nunca jogue água suja ou mel de cacau direto dentro dos canos de gotejamento — isso entope todos os emissores na hora.
              </span>
            </div>
          </div>

          {/* Práticas de Baixo Custo no Solo */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Como Segurar a Água no Solo Gastando Pouco
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SOIL_PRACTICES.map((prac) => (
                <div
                  key={prac.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {prac.targetRegion}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                      Poupa ~{prac.waterSavingPct}% de água
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {prac.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {prac.expectedBenefit}
                  </p>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>Custo: <strong>{prac.costRange}</strong></span>
                    <span>Dificuldade: <strong>{prac.difficulty}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal para Impressão / PDF do Dossiê Técnico */}
      {showDossierModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 text-slate-800">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase text-emerald-700">
                  RELATÓRIO TÉCNICO DE EFICIÊNCIA HÍDRICA E CONFORMIDADE LEGAL
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  Comprovante — FNE Verde / Água (Banco do Nordeste) & INEMA
                </h3>
                <p className="text-xs text-slate-500">
                  Propriedade: {profile.name} • {profile.municipality}/{profile.state}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDossierModal(false)}
                className="text-sm font-bold text-slate-500 hover:text-slate-900 px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <strong>Bacia Hidrográfica:</strong> {profile.hydrographicBasin}
                </div>
                <div>
                  <strong>Enquadramento Legal:</strong> {profile.regulation.legalInstrument}
                </div>
                <div>
                  <strong>Registro INEMA/CEFIR:</strong> {profile.regulation.processNumber}
                </div>
                <div>
                  <strong>Sistema de Cultivo:</strong> {profile.cultivationSystem} ({profile.cacaoAreaHa} ha)
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 uppercase">
                  1. Economia de Água e Produção
                </h4>
                <p>
                  • <strong>Tecnologia:</strong> {profile.irrigationType} com controle de cabeçal.<br />
                  • <strong>Água Economizada na Estação Seca:</strong>{' '}
                  {seasonSavedWaterM3.toLocaleString('pt-BR')} m³/safra (menos desperdício frente à aspersão).<br />
                  • <strong>Eficiência:</strong> {kgPerM3Drip} kg de cacau seco por m³ aplicado.<br />
                  • <strong>Captação de Chuva:</strong> {profile.roofCatchmentAreaM2} m² de telhados ajudando na reserva.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 uppercase">
                  2. Conformidade Legal (INEMA / CEFIR)
                </h4>
                <p>
                  • Captação diária ({profile.regulation.currentWithdrawalM3Day} m³/dia) abaixo do limite autorizado ({profile.regulation.authorizedFlowM3Day} m³/dia).<br />
                  • Nascentes e APP preservadas no cadastro estadual (CEFIR/BA).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir / Salvar PDF para o Banco
              </button>
              <button
                type="button"
                onClick={() => setShowDossierModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
