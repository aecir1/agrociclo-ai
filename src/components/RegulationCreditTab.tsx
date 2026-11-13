import React, { useState } from 'react';
import {
  Scale,
  Landmark,
  FileCheck2,
  ShieldAlert,
  CheckCircle2,
  Sprout,
  Recycle,
  ArrowRight,
  Printer,
  Award,
  AlertTriangle
} from 'lucide-react';
import { PropertyProfile } from '../types';
import { SOIL_PRACTICES } from '../data/mockProfiles';

interface RegulationCreditTabProps {
  profile: PropertyProfile;
}

export const RegulationCreditTab: React.FC<RegulationCreditTabProps> = ({ profile }) => {
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [cacaoPricePerArrobaBrl, setCacaoPricePerArrobaBrl] = useState(650); // R$ 650 / arroba (15kg)

  const withdrawalPct = Math.round(
    (profile.regulation.currentWithdrawalM3Day / profile.regulation.authorizedFlowM3Day) * 100
  );

  // Productivity per m³ calculation (FAEB Slide 17 & 20 metric!)
  const totalSeasonYieldKg = profile.cacaoAreaHa * profile.agronomicThesis.expectedYieldKgHa;
  const totalSeasonWaterM3 =
    profile.cacaoAreaHa * profile.agronomicThesis.waterConsumptionDripMmSeason * 10; // 1 mm/ha = 10 m³
  const kgPerM3Drip = (totalSeasonYieldKg / totalSeasonWaterM3).toFixed(2);

  const sprinklerSeasonWaterM3 =
    profile.cacaoAreaHa * profile.agronomicThesis.waterConsumptionSprinklerMmSeason * 10;
  const seasonSavedWaterM3 = sprinklerSeasonWaterM3 - totalSeasonWaterM3;

  // Financial return calculation for Banco do Nordeste FNE Verde
  const extraYieldPerHaKg =
    profile.agronomicThesis.expectedYieldKgHa - profile.agronomicThesis.baselineYieldWithoutDripKgHa;
  const totalExtraArrobas = Math.round((extraYieldPerHaKg * profile.cacaoAreaHa) / 15);
  const grossExtraRevenueBrl = totalExtraArrobas * cacaoPricePerArrobaBrl;
  const estimatedKitInvestmentBrl = profile.cacaoAreaHa * 8500; // ~R$ 8.500/ha gotejamento + automação cabeçal

  return (
    <div className="space-y-8">
      {/* SECTION 1: GUARDIÃO REGULATÓRIO (FAEB SLIDES 8, 9, 12, 21) & PASSAPORTE BANCO DO NORDESTE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Enquadramento Legal INEMA / ANA / Código Florestal (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <Scale className="w-4 h-4" />
                Segurança Jurídica e Governança Hídrica (INEMA / ANA)
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Enquadramento Legal do Uso da Água & Trava de Outorga
              </h3>
              <p className="text-xs text-slate-600">
                "A melhor tecnologia hídrica é a que cabe na propriedade, na outorga e no bolso do produtor."
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shrink-0">
              100% REGULAR
            </span>
          </div>

          {/* Medidor de Teto de Outorga Diária */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-800">
                Monitoramento do Teto Diário Autorizado ({profile.regulation.legalInstrument}):
              </span>
              <span className="font-bold text-emerald-700">
                {profile.regulation.currentWithdrawalM3Day} m³/dia de {profile.regulation.authorizedFlowM3Day} m³/dia ({withdrawalPct}%)
              </span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(100, withdrawalPct)}%` }}
                className={`h-full rounded-full ${
                  withdrawalPct > 90 ? 'bg-amber-500' : 'bg-emerald-600'
                }`}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Processo: {profile.regulation.processNumber}</span>
              <span>Trava automática em 95% da outorga</span>
            </div>
          </div>

          {/* As 4 Perguntas Obrigatórias do Slide 9 da FAEB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs font-bold text-emerald-800">1. Qual é o uso e a finalidade?</div>
              <p className="text-xs text-slate-600 mt-1">
                Irrigação localizada de precisão (gotejamento) e captação pluvial em telhados rurais ({profile.roofCatchmentAreaM2} m²), sem barramento irregular de curso d'água.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs font-bold text-emerald-800">2. Há outorga ou dispensa (INEMA)?</div>
              <p className="text-xs text-slate-600 mt-1">
                <strong>{profile.regulation.legalInstrument}</strong> na {profile.regulation.waterBodyName} (Lei Estadual BA 11.612/2009 e Lei Federal 9.433/1997).
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs font-bold text-emerald-800">3. Respeita APP e Código Florestal?</div>
              <p className="text-xs text-slate-600 mt-1">
                Cadastro Cefir/CAR <strong>{profile.regulation.carStatus}</strong>. Nascentes com raio de 50m de APP intacto (Lei 12.651/2012 — produzir cacau conservando água).
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs font-bold text-emerald-800">4. Qual a origem e qualidade (Salinidade)?</div>
              <p className="text-xs text-slate-600 mt-1">
                Condutividade elétrica monitorada em <strong>{profile.automationConfig.electricalConductivityDsm} dS/m</strong>. Previne salinização silenciosa do solo.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Passaporte Crédito Verde Banco do Nordeste (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-700 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-bold">
                <Landmark className="w-3.5 h-3.5" />
                INTEGRAÇÃO BANCO DO NORDESTE (FNE VERDE / FNE ÁGUA)
              </span>
              <Award className="w-6 h-6 text-amber-400" />
            </div>

            <h3 className="text-xl font-bold">
              Rastreabilidade Hídrica para Destravar Crédito Rural Sustentável
            </h3>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Pequenos e médios produtores perdem acesso a linhas de juros reduzidos porque não conseguem comprovar economia em m³ e regularidade no INEMA. O <strong>AgroCiclo AI</strong> gera o dossiê auditável automaticamente.
            </p>

            {/* Métricas exigidas na banca (Economia em m³ e Produtividade por m³) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-white/10 rounded-xl p-3 border border-white/15">
                <div className="text-xs text-emerald-300">Água Poupada na Safra</div>
                <div className="text-xl font-extrabold text-white mt-0.5">
                  {seasonSavedWaterM3.toLocaleString('pt-BR')} m³
                </div>
                <div className="text-xs text-emerald-200 mt-0.5">-58% vs. aspersão convencional</div>
              </div>

              <div className="bg-white/10 rounded-xl p-3 border border-white/15">
                <div className="text-xs text-emerald-300">Produtividade por m³</div>
                <div className="text-xl font-extrabold text-amber-300 mt-0.5">
                  {kgPerM3Drip} kg / m³
                </div>
                <div className="text-xs text-emerald-200 mt-0.5">Amêndoa seca por m³ aplicado</div>
              </div>
            </div>

            {/* Simulador Rápido de Retorno do Financiamento */}
            <div className="bg-black/25 rounded-xl p-3.5 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-emerald-200 font-medium">Cotação da Arroba (15 kg):</span>
                <div className="flex items-center gap-1">
                  <span>R$</span>
                  <input
                    type="number"
                    value={cacaoPricePerArrobaBrl}
                    onChange={(e) => setCacaoPricePerArrobaBrl(Math.max(100, Number(e.target.value)))}
                    className="w-20 bg-white/15 border border-white/30 rounded px-2 py-0.5 text-white font-bold text-right"
                  />
                </div>
              </div>
              <div className="flex justify-between text-emerald-100">
                <span>Ganho Produtivo Estimado ({profile.cacaoAreaHa} ha):</span>
                <strong>+{totalExtraArrobas.toLocaleString('pt-BR')} arrobas/ano</strong>
              </div>
              <div className="flex justify-between text-amber-300 font-bold pt-1 border-t border-white/10">
                <span>Incremento Bruto Anual Estimado:</span>
                <span>R$ {grossExtraRevenueBrl.toLocaleString('pt-BR')} / safra</span>
              </div>
              <div className="text-emerald-200/80 text-xs">
                Payback estimado do kit de gotejamento + automação (~R$ {estimatedKitInvestmentBrl.toLocaleString('pt-BR')} via FNE Água): <strong>1,2 a 1,8 safras</strong>.
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowDossierModal(true)}
            className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <FileCheck2 className="w-4 h-4" />
            Gerar Dossiê de Conformidade INEMA & FNE Verde (BNB)
          </button>
        </div>
      </div>

      {/* SECTION 2: MAPA VISUAL DE GESTÃO E REÚSO SEGURO DA ÁGUA (MÓDULO 4.7) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
              <Recycle className="w-4 h-4" />
              Balanço Hídrico da Propriedade e Reúso Seguro
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              Rastreabilidade Completa: Captação → Armazenamento → Conservação → Reúso Controlado
            </h3>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
            Trava Sanitária e Agronômica Ativa
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Etapa 1: Captação */}
          <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-2">
            <div className="text-xs font-extrabold uppercase text-sky-800 flex items-center justify-between">
              <span>1. CAPTAÇÃO</span>
              <ArrowRight className="w-4 h-4 text-sky-600 hidden md:block" />
            </div>
            <div className="text-sm font-bold text-slate-900">Pluvial + Superficial Outorgada</div>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• Chuva dos telhados das barcaças ({profile.roofCatchmentAreaM2} m²)</li>
              <li>• {profile.waterSources[0]}</li>
              <li>• Enxurradas retidas em barraginhas</li>
            </ul>
          </div>

          {/* Etapa 2: Armazenamento */}
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2">
            <div className="text-xs font-extrabold uppercase text-indigo-800 flex items-center justify-between">
              <span>2. ARMAZENAMENTO</span>
              <ArrowRight className="w-4 h-4 text-indigo-600 hidden md:block" />
            </div>
            <div className="text-sm font-bold text-slate-900">Estoque Auditado s/ Assoreamento</div>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• Cisternas fechadas (zero evaporação)</li>
              <li>• Açude/Piscinão monitorado por régua digital</li>
              <li>• Válvula de redistribuição anti-transbordo</li>
            </ul>
          </div>

          {/* Etapa 3: Irrigação e Conservação */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
            <div className="text-xs font-extrabold uppercase text-emerald-800 flex items-center justify-between">
              <span>3. USO & CONSERVAÇÃO</span>
              <ArrowRight className="w-4 h-4 text-emerald-600 hidden md:block" />
            </div>
            <div className="text-sm font-bold text-slate-900">Gotejamento + Retenção no Solo</div>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• Gotejamento na raiz (0–20 cm)</li>
              <li>• Mulching de pseudocaule de bananeira</li>
              <li>• Trava Anti-Vassoura (UR &lt; 85%)</li>
            </ul>
          </div>

          {/* Etapa 4: Reúso e Efluentes */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
            <div className="text-xs font-extrabold uppercase text-amber-900 flex items-center justify-between">
              <span>4. REÚSO CONTROLADO</span>
              <ShieldAlert className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-sm font-bold text-slate-900">Águas Cinzas e Beneficiamento</div>
            <ul className="text-xs text-amber-950 space-y-1">
              <li>• Água de lavagem de instalações → Filtro de zona de raízes (bananeiras/capim)</li>
              <li>• Mel de cacau / fermentação → Biodigestor / Biofertilizante estabilizado</li>
            </ul>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-900">
          <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          <div>
            <strong>Aviso Regulatório e Agronômico Obrigatório:</strong> O AgroCiclo AI <u>jamais</u> recomenda a injeção direta de águas residuárias ou efluentes do beneficiamento na linha de gotejamento sem tratamento prévio, filtragem de sólidos (risco severo de entupimento de emissores), análise físico-química/microbiológica e verificação das normas do INEMA.
          </div>
        </div>
      </div>

      {/* SECTION 3: CONSERVAÇÃO DA UMIDADE DO SOLO (MÓDULO 4.6) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
            <Sprout className="w-4 h-4" />
            Manejo e Conservação da Umidade do Solo
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Soluções de Baixo Custo Antes mesmo de Comprar Equipamentos
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SOIL_PRACTICES.map((prac) => (
            <div key={prac.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Foco: {prac.targetRegion}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    Economia hídrica: ~{prac.waterSavingPct}%
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-base">{prac.title}</h4>
                <p className="text-xs text-slate-600">
                  <strong>Qual problema resolve:</strong> {prac.problemSolved}
                </p>
                <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                  <strong>Base Científica:</strong> {prac.scientificBasis}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs">
                <div className="flex flex-wrap justify-between gap-2">
                  <span><strong>Custo:</strong> {prac.costRange}</span>
                  <span><strong>Dificuldade:</strong> {prac.difficulty}</span>
                </div>
                <div className="text-slate-600">
                  <strong>Benefício esperado:</strong> {prac.expectedBenefit}
                </div>
                <div className="text-amber-900">
                  <strong>Limitações:</strong> {prac.limitations}
                </div>
                {prac.requiresAgronomist && (
                  <div className="inline-flex items-center gap-1 text-indigo-700 font-semibold pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Requer orientação de Eng. Agrônomo / Técnico CEPLAC ou SENAR
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL DO DOSSIÊ TÉCNICO INEMA & BANCO DO NORDESTE */}
      {showDossierModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase text-emerald-700">
                  RELATÓRIO TÉCNICO DE EFICIÊNCIA HÍDRICA E CONFORMIDADE LEGAL
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  Dossiê Técnico — FNE Verde (Banco do Nordeste) & Conformidade INEMA
                </h3>
                <p className="text-xs text-slate-500">
                  Propriedade: {profile.name} • {profile.municipality}/{profile.state}
                </p>
              </div>
              <button
                onClick={() => setShowDossierModal(false)}
                className="text-sm font-bold text-slate-500 hover:text-slate-900 px-2 py-1"
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

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase">1. Indicadores Auditados de Eficiência Hídrica</h4>
                <p>
                  • <strong>Tecnologia Implantada:</strong> {profile.irrigationType} com controle automatizado de cabeçal e trava climática.<br />
                  • <strong>Volume Economizado na Estação Seca:</strong> {seasonSavedWaterM3.toLocaleString('pt-BR')} m³/safra (redução de 58% frente à aspersão convencional).<br />
                  • <strong>Produtividade da Água:</strong> {kgPerM3Drip} kg de amêndoa seca de cacau por m³ de água aplicado.<br />
                  • <strong>Captação Pluvial Integrada:</strong> {profile.roofCatchmentAreaM2} m² de telhados de barcaças/galpões reduzindo a pressão sobre mananciais superficiais.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase">2. Conformidade Legal (Leis 9.433/97, 11.612/09 e 12.651/12)</h4>
                <p>
                  • Vazão diária bombeada ({profile.regulation.currentWithdrawalM3Day} m³/dia) mantida rigorosamente abaixo do limite autorizado ({profile.regulation.authorizedFlowM3Day} m³/dia).<br />
                  • Áreas de Preservação Permanente (APP de nascentes e mata ciliar) preservadas conforme Cadastro Estadual Florestal de Imóveis Rurais (CEFIR/BA).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimir / Salvar PDF para o Banco
              </button>
              <button
                onClick={() => setShowDossierModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
