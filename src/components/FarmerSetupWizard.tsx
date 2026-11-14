import React, { useState } from 'react';
import {
  Sprout,
  Droplets,
  CloudSun,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Calculator,
  Sparkles,
  Scale
} from 'lucide-react';
import { PropertyProfile, PhenologicalStage, RegionId } from '../types';

interface FarmerSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyNewFarm: (region: RegionId, newProfile: PropertyProfile) => void;
}

export const FarmerSetupWizard: React.FC<FarmerSetupWizardProps> = ({
  isOpen,
  onClose,
  onApplyNewFarm
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Farm & Cocoa
  const [farmName, setFarmName] = useState('Sítio Boa Esperança do Cacau');
  const [municipality, setMunicipality] = useState('Ilhéus');
  const [regionType, setRegionType] = useState<RegionId>('ilheus');
  const [cacaoAreaHa, setCacaoAreaHa] = useState(12);
  const [densityPerHa, setDensityPerHa] = useState(1111); // 1111 cabruca, 1600 pleno sol
  const [cropAgeYears, setCropAgeYears] = useState(6);
  const [currentStage, setCurrentStage] = useState<PhenologicalStage>('floracao');

  // Step 2: Water & Reservoirs
  const [acudeNominalM3, setAcudeNominalM3] = useState(1000);
  const [acudeApparentFillPct, setAcudeApparentFillPct] = useState(80);
  const [siltationLevel, setSiltationLevel] = useState<'baixo' | 'medio' | 'alto'>('medio');
  const [roofAreaM2, setRoofAreaM2] = useState(320);
  const [cisternNominalM3, setCisternNominalM3] = useState(150);

  // Step 3: Weather & Legal
  const [daysWithoutRain, setDaysWithoutRain] = useState(25);
  const [tempC, setTempC] = useState(32);
  const [airHumidityPct, setAirHumidityPct] = useState(86);
  const [hasOutorgaOrDispensa, setHasOutorgaOrDispensa] = useState<
    'Dispensa de Outorga (Uso Insignificante - INEMA)' | 'Outorga de Direito de Uso (Portaria INEMA/ANA)'
  >('Dispensa de Outorga (Uso Insignificante - INEMA)');

  if (!isOpen) return null;

  const handleRegionSelect = (reg: RegionId) => {
    setRegionType(reg);
    if (reg === 'ilheus') {
      setMunicipality('Ilhéus');
      setDensityPerHa(1111);
      setAirHumidityPct(86);
      setTempC(31.5);
      setHasOutorgaOrDispensa('Dispensa de Outorga (Uso Insignificante - INEMA)');
    } else {
      setMunicipality('Barreiras / Riachão das Neves');
      setDensityPerHa(1600);
      setAirHumidityPct(38);
      setTempC(35.0);
      setHasOutorgaOrDispensa('Outorga de Direito de Uso (Portaria INEMA/ANA)');
    }
  };

  // Real-time calculations for Step 4 preview
  const totalPlants = Math.round(cacaoAreaHa * densityPerHa);
  const siltationPct = siltationLevel === 'baixo' ? 5 : siltationLevel === 'medio' ? 18 : 30;
  const apparentAcudeM3 = Math.round(acudeNominalM3 * (acudeApparentFillPct / 100));
  const realAcudeM3 = Math.round(apparentAcudeM3 * (1 - siltationPct / 100));
  const realCisternM3 = Math.round(cisternNominalM3 * 0.75);
  const totalRealWaterM3 = realAcudeM3 + realCisternM3;

  const baseLitersPerPlant =
    regionType === 'ilheus'
      ? currentStage === 'mudas'
        ? 6
        : currentStage === 'vegetativo'
        ? 8
        : currentStage === 'floracao'
        ? 12
        : 15
      : currentStage === 'mudas'
      ? 9
      : currentStage === 'vegetativo'
      ? 13
      : currentStage === 'floracao'
      ? 16
      : 20;

  const dailyWaterM3 = Math.round(((totalPlants * baseLitersPerPlant) / 1000) * 10) / 10;
  const realAutonomyDays = Math.floor(totalRealWaterM3 / Math.max(1, dailyWaterM3));
  const rain40mmLiters = Math.round(roofAreaM2 * 40 * 0.85);

  const handleFinishWizard = () => {
    // Divide the farm into 3 practical sectors
    const area1 = Math.max(1, Math.round(cacaoAreaHa * 0.45));
    const area2 = Math.max(1, Math.round(cacaoAreaHa * 0.35));
    const area3 = Math.max(1, cacaoAreaHa - area1 - area2);

    const p1 = area1 * densityPerHa;
    const p2 = area2 * densityPerHa;
    const p3 = area3 * densityPerHa;

    const newProfile: PropertyProfile = {
      id: regionType,
      name: farmName,
      municipality,
      state: 'BA',
      biome: regionType === 'ilheus' ? 'Mata Atlântica (Sul da Bahia)' : 'Cerrado Baiano (Oeste da Bahia)',
      hydrographicBasin:
        regionType === 'ilheus'
          ? 'Bacia Hidrográfica do Rio Cachoeira / Almada'
          : 'Bacia Hidrográfica do Rio Grande / São Francisco',
      totalAreaHa: Math.round(cacaoAreaHa * 1.4),
      cacaoAreaHa,
      plantingDensityPerHa: densityPerHa,
      estimatedPlants: totalPlants,
      cropAgeYears,
      cultivationSystem:
        regionType === 'ilheus' ? 'Cabruca Tradicional & Adensado' : 'Pleno Sol Mecanizado (Filas Duplas)',
      soilType:
        regionType === 'ilheus'
          ? 'Argissolo Vermelho-Amarelo (Cabruca)'
          : 'Latossolo Franco-Arenoso Profundo (Cerrado)',
      currentStage,
      irrigationType:
        regionType === 'ilheus'
          ? 'Gotejamento Sub-Copa Anti-Vassoura'
          : 'Gotejamento com Fertirrigação (Delivery System)',
      waterSources: [
        'Açude / Reservatório Principal da Propriedade',
        `Captação Pluvial em Telhados de Barcaças/Galpões (${roofAreaM2} m²)`
      ],
      roofCatchmentAreaM2: roofAreaM2,
      catchmentEfficiency: 0.85,
      weather: {
        tempC,
        airHumidityPct,
        evapotranspirationMmDay: regionType === 'ilheus' ? 4.3 : 6.4,
        forecastRain7DaysMm: daysWithoutRain > 30 ? 0 : 12,
        daysWithoutRain,
        elNinoAlertLevel:
          daysWithoutRain >= 30 ? 'Alerta Severo (El Niño)' : 'Atenção (Veranico)',
        fungalRiskLevel:
          airHumidityPct >= 85
            ? 'Crítico (Vassoura-de-Bruxa / Podridão-Parda)'
            : 'Baixo (Escape Climático)'
      },
      automationConfig: {
        antiWitchesBroomLock: regionType === 'ilheus',
        greenTariffSync: true,
        osmoticDeficitMode: regionType === 'oeste',
        autoRainDiverter: true,
        offlineLoRaMode: true,
        electricalConductivityDsm: regionType === 'ilheus' ? 0.45 : 0.95
      },
      regulation: {
        waterBodyName:
          regionType === 'ilheus' ? 'Microbacia Local Sul da Bahia' : 'Sub-bacia do Rio Grande (Oeste)',
        legalInstrument: hasOutorgaOrDispensa,
        processNumber: 'CEFIR/INEMA-BA Cadastrado pelo Produtor',
        authorizedFlowM3Day: Math.round(dailyWaterM3 * 1.25 * 10) / 10,
        currentWithdrawalM3Day: dailyWaterM3,
        appSpringsPreserved: true,
        carStatus: 'Ativo e Regular (CEFIR/BA)',
        legalLawsApplied: [
          'Lei Federal nº 9.433/1997 (Política Nacional de Recursos Hídricos)',
          'Lei Estadual BA nº 11.612/2009 (INEMA)',
          'Lei Federal nº 12.651/2012 (Código Florestal — APP preservada)'
        ]
      },
      agronomicThesis: {
        headline:
          regionType === 'ilheus'
            ? `${farmName} (${municipality}): Irrigação Sub-Copa Sem Acordar a Vassoura-de-Bruxa`
            : `${farmName} (${municipality}): Cacau a Pleno Sol com Ajuste Osmótico e Fertirrigação`,
        whyDripHere:
          regionType === 'ilheus'
            ? 'Gotejamento calculado especificamente para sua área de Cabruca: entrega água direto na raiz (0-20 cm) durante o veranico sem molhar a copa e sem elevar a umidade acima de 85%.'
            : 'No clima seco do Cerrado, o ar seco inibe a Vassoura-de-Bruxa e o gotejamento entrega água + nutrientes na raiz mantendo os estômatos abertos sob pleno sol.',
        physiologicalSecret:
          'Cálculo personalizado gerado a partir do cadastro da sua fazenda: economia de 58% de água frente à aspersão e desconto automático do assoreamento do seu açude.',
        expectedYieldKgHa: regionType === 'ilheus' ? 1050 : 3000,
        baselineYieldWithoutDripKgHa: regionType === 'ilheus' ? 450 : 300,
        waterConsumptionDripMmSeason: regionType === 'ilheus' ? 224 : 410,
        waterConsumptionSprinklerMmSeason: regionType === 'ilheus' ? 535 : 890
      },
      sectors: [
        {
          id: 'custom-sec-1',
          name: `Talhão 01 Principal (${area1} ha)`,
          areaHa: area1,
          plantsCount: p1,
          cloneType: regionType === 'ilheus' ? 'Clone CEPEC-2002 / PH-16' : 'Clone CCN-51 Pleno Sol',
          stage: currentStage,
          targetLitersPerPlantDay: baseLitersPerPlant,
          nominalFlowLh: p1 * 2,
          measuredFlowLh: Math.round(p1 * 1.98),
          pressureBar: 1.8,
          nominalPressureBar: 1.8,
          valveStatus: airHumidityPct >= 85 && regionType === 'ilheus' ? 'auto_blocked' : 'open',
          diagnosticStatus: 'ok',
          diagnosticMessage:
            airHumidityPct >= 85 && regionType === 'ilheus'
              ? `Trava Anti-Vassoura ativa (UR ${airHumidityPct}%). Pulso agendado para 21h30.`
              : 'Válvula operando dentro da curva normal de vazão e pressão.',
          soilMoisturePct: 72,
          osmoticAdjustmentActive: regionType === 'oeste'
        },
        {
          id: 'custom-sec-2',
          name: `Talhão 02 Secundário (${area2} ha)`,
          areaHa: area2,
          plantsCount: p2,
          cloneType: 'Clone PS-1319',
          stage: currentStage,
          targetLitersPerPlantDay: baseLitersPerPlant,
          nominalFlowLh: p2 * 2,
          measuredFlowLh: Math.round(p2 * 2 * 0.81),
          pressureBar: 2.35,
          nominalPressureBar: 1.8,
          valveStatus: 'scheduled',
          diagnosticStatus: 'clogged_alert',
          diagnosticMessage:
            'ALERTA HIDRÁULICO: Vazão 19% menor no cabeçal. Recomendado executar Flushing (desentupir linha).',
          soilMoisturePct: 60,
          osmoticAdjustmentActive: regionType === 'oeste'
        },
        {
          id: 'custom-sec-3',
          name: `Talhão 03 Renovação/Mudas (${area3} ha)`,
          areaHa: area3,
          plantsCount: p3,
          cloneType: 'Mudas Enxertadas',
          stage: 'mudas',
          targetLitersPerPlantDay: regionType === 'ilheus' ? 6 : 9,
          nominalFlowLh: p3 * 2,
          measuredFlowLh: Math.round(p3 * 1.99),
          pressureBar: 1.8,
          nominalPressureBar: 1.8,
          valveStatus: 'open',
          diagnosticStatus: 'ok',
          diagnosticMessage: 'Proteção prioritária de mudas jovens ativa.',
          soilMoisturePct: 75,
          osmoticAdjustmentActive: true
        }
      ],
      reservoirs: [
        {
          id: 'custom-res-1',
          name: 'Açude / Reservatório Principal Cadastrado',
          type: 'acude',
          nominalCapacityM3: acudeNominalM3,
          siltationLossPct: siltationPct,
          evaporationLossMmDay: regionType === 'ilheus' ? 5.0 : 6.8,
          currentApparentVolumeM3: apparentAcudeM3,
          currentRealVolumeM3: realAcudeM3,
          hasCoverOrGeomembrane: false
        },
        {
          id: 'custom-res-2',
          name: `Cisterna das Barcaças/Galpões (${roofAreaM2} m² calhas)`,
          type: 'cisterna_barcaca',
          nominalCapacityM3: cisternNominalM3,
          siltationLossPct: 2,
          evaporationLossMmDay: 0.3,
          currentApparentVolumeM3: realCisternM3,
          currentRealVolumeM3: realCisternM3,
          hasCoverOrGeomembrane: true
        }
      ],
      latitude: regionType === 'ilheus' ? -14.7565 : -11.7462,
      longitude: regionType === 'ilheus' ? -39.2245 : -44.9102,
      farmRadiusM: Math.round(Math.sqrt((cacaoAreaHa * 10000) / Math.PI) * 1.15),
      polygonVertices:
        regionType === 'ilheus'
          ? [
              { lat: -14.7546, lon: -39.2268 },
              { lat: -14.7542, lon: -39.2225 },
              { lat: -14.7575, lon: -39.2214 },
              { lat: -14.7590, lon: -39.2251 },
              { lat: -14.7572, lon: -39.2276 }
            ]
          : [
              { lat: -11.7430, lon: -44.9138 },
              { lat: -11.7426, lon: -44.9068 },
              { lat: -11.7484, lon: -44.9060 },
              { lat: -11.7498, lon: -44.9112 },
              { lat: -11.7475, lon: -44.9145 }
            ]
    };

    onApplyNewFarm(regionType, newProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Modo Agricultor — Configurar Sistema do Zero (Passo {step} de 4)
            </span>
            <h3 className="text-lg sm:text-xl font-black mt-0.5">
              Cadastro Guiado da Propriedade e Orçamento Hídrico da Safra
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
          >
            Fechar ✕
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 grid grid-cols-4 gap-2 text-xs font-bold">
          <div className={step >= 1 ? 'text-emerald-700' : 'text-slate-400'}>1. Sua Roça e Cacau</div>
          <div className={step >= 2 ? 'text-emerald-700' : 'text-slate-400'}>2. Seus Açudes e Chuva</div>
          <div className={step >= 3 ? 'text-emerald-700' : 'text-slate-400'}>3. Clima e Outorga</div>
          <div className={step >= 4 ? 'text-emerald-700' : 'text-slate-400'}>4. Plano Hídrico Gerado</div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs sm:text-sm">
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs">
                <strong>Passo 1:</strong> Vamos começar pelos dados básicos da sua plantação de cacau na Bahia. Isso define quantas árvores você tem e qual o manejo ideal (Cabruca vs. Pleno Sol).
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Qual o nome da sua Fazenda / Sítio?
                  </label>
                  <input
                    type="text"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Em qual Região da Bahia ela fica?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRegionSelect('ilheus')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border ${
                        regionType === 'ilheus'
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      🌳 Sul (Ilhéus / Cabruca)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegionSelect('oeste')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border ${
                        regionType === 'oeste'
                          ? 'bg-amber-500 text-slate-950 border-amber-600'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      ☀️ Oeste (Cerrado / Sol)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Município:</label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hectares Plantados de Cacau:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={cacaoAreaHa}
                    onChange={(e) => setCacaoAreaHa(Math.max(1, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Estágio Atual da Lavoura:
                  </label>
                  <select
                    value={currentStage}
                    onChange={(e) => setCurrentStage(e.target.value as PhenologicalStage)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 bg-white"
                  >
                    <option value="mudas">🌱 Mudas Jovens (&lt; 2 anos)</option>
                    <option value="vegetativo">🌿 Vegetativo (Folhas)</option>
                    <option value="floracao">🌸 Floração e Peco</option>
                    <option value="frutificacao">🍫 Frutificação Cheia</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-100 text-xs text-slate-700 flex items-center justify-between">
                <span>
                  Quantidade calculada de cacaueiros ({densityPerHa} pés/ha):
                </span>
                <strong className="text-sm text-emerald-800">{totalPlants.toLocaleString('pt-BR')} árvores</strong>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 text-xs">
                <strong>Passo 2 (O Coração Hídrico):</strong> Agora informe quanta água você tem guardada e o tamanho dos seus telhados (barcaças de secar cacau, galpões) para o sistema descontar o assoreamento e planejar a captação de chuva.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Capacidade Total do seu Açude / Barreiro (m³):
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={50000}
                    value={acudeNominalM3}
                    onChange={(e) => setAcudeNominalM3(Math.max(10, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900"
                  />
                  <span className="text-xs text-slate-500">1 m³ = 1.000 litros de água</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quão cheio ele parece estar hoje olhando a régua? ({acudeApparentFillPct}%)
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={acudeApparentFillPct}
                    onChange={(e) => setAcudeApparentFillPct(Number(e.target.value))}
                    className="w-full accent-sky-600 mt-2"
                  />
                  <div className="text-xs text-slate-600">
                    Volume aparente: <strong>{apparentAcudeM3} m³</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assoreamento (Lama no fundo do açude):
                  </label>
                  <select
                    value={siltationLevel}
                    onChange={(e) => setSiltationLevel(e.target.value as 'baixo' | 'medio' | 'alto')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 bg-white"
                  >
                    <option value="baixo">Baixo (-5% lodo — limpo recentemente)</option>
                    <option value="medio">Médio (-18% lodo — sem limpar há 3 anos)</option>
                    <option value="alto">Alto (-30% lodo — açude antigo assoreado)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Área de Telhados p/ Captar Chuva (m²):
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={5000}
                    value={roofAreaM2}
                    onChange={(e) => setRoofAreaM2(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900"
                  />
                  <span className="text-xs text-slate-500">Barcaças de cacau + estufas + galpão</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tamanho da Cisterna Fechada (m³):
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    value={cisternNominalM3}
                    onChange={(e) => setCisternNominalM3(Math.max(10, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950">
                <strong>Descoberta Importante:</strong> Olhando a superfície, parece que seu açude tem <strong>{apparentAcudeM3} m³</strong>, mas descontando o assoreamento de fundo (-{siltationPct}%), você tem na verdade <strong>{realAcudeM3} m³ úteis</strong> no açude (+ {realCisternM3} m³ na cisterna = <strong>{totalRealWaterM3} m³ reais</strong>).
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs">
                <strong>Passo 3 (Clima e Regularização no INEMA):</strong> Informe as condições climáticas de hoje na fazenda para calibrar a trava contra Vassoura-de-Bruxa e a conformidade legal.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Há quantos dias não chove na roça?
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={150}
                    value={daysWithoutRain}
                    onChange={(e) => setDaysWithoutRain(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Temperatura Atual (°C):
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={45}
                    step={0.5}
                    value={tempC}
                    onChange={(e) => setTempC(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Umidade do Ar Hoje (%):
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={100}
                    value={airHumidityPct}
                    onChange={(e) => setAirHumidityPct(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900"
                  />
                  <span className="text-xs text-slate-500">Acima de 85% ativa trava Anti-Vassoura</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Situação Legal da Captação de Água no INEMA (Lei Estadual BA 11.612/2009):
                </label>
                <select
                  value={hasOutorgaOrDispensa}
                  onChange={(e) => setHasOutorgaOrDispensa(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 bg-white"
                >
                  <option value="Dispensa de Outorga (Uso Insignificante - INEMA)">
                    Dispensa de Outorga (Pequeno Produtor / Vazão Insignificante no INEMA)
                  </option>
                  <option value="Outorga de Direito de Uso (Portaria INEMA/ANA)">
                    Outorga de Direito de Uso Ativa (Médio/Grande Porte — Portaria INEMA)
                  </option>
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-900 text-white space-y-2">
                <div className="text-xs font-bold uppercase text-emerald-300">
                  Diagnóstico Hídrico Calculado do Zero para {farmName}
                </div>
                <h4 className="text-lg font-black">
                  Sua Fazenda tem {realAutonomyDays} Dias de Autonomia Real no Gotejamento!
                </h4>
                <p className="text-xs text-emerald-100">
                  Se você irrigasse por aspersão convencional, sua água acabaria em apenas{' '}
                  <strong>{Math.floor(realAutonomyDays * (224 / 535))} dias</strong>. Com o gotejamento automatizado do AgroCiclo AI, você economiza 58% de água e protege sua florada.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Total de Cacaueiros</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {totalPlants.toLocaleString('pt-BR')} pés
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Meta no Gotejamento</div>
                  <div className="text-base font-black text-emerald-700 mt-0.5">
                    {baseLitersPerPlant} L/planta/dia
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Consumo Diário Total</div>
                  <div className="text-base font-black text-sky-700 mt-0.5">
                    {dailyWaterM3} m³ / dia
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Chuva de 40mm no Telhado</div>
                  <div className="text-base font-black text-amber-700 mt-0.5">
                    +{rain40mmLiters.toLocaleString('pt-BR')} L
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as any)}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev + 1) as any)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <span>Próximo Passo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinishWizard}
              className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              Carregar Minha Fazenda no Sistema Agora!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
