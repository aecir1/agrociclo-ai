import { PropertyProfile } from '../types';

export const INITIAL_PROFILES: Record<'ilheus' | 'oeste', PropertyProfile> = {
  ilheus: {
    id: 'ilheus',
    name: 'Fazenda Santa Cruz do Cabruca',
    municipality: 'Ilhéus',
    state: 'BA',
    latitude: -14.7565,
    longitude: -39.2245,
    farmRadiusM: 360,
    terrainSlopePct: 16,
    terrainProfileType: 'morro',
    polygonVertices: [
      { lat: -14.7546, lon: -39.2268 },
      { lat: -14.7542, lon: -39.2225 },
      { lat: -14.7575, lon: -39.2214 },
      { lat: -14.7590, lon: -39.2251 },
      { lat: -14.7572, lon: -39.2276 },
    ],
    biome: 'Mata Atlântica (Sul da Bahia)',
    hydrographicBasin: 'Bacia Hidrográfica do Rio Cachoeira / Almada (RPGA VII)',
    totalAreaHa: 28,
    cacaoAreaHa: 18,
    plantingDensityPerHa: 1111, // 3m x 3m adensado na cabruca
    estimatedPlants: 20000,
    cropAgeYears: 7,
    cultivationSystem: 'Cabruca Tradicional & Adensado',
    soilType: 'Argissolo Vermelho-Amarelo Eutrófico (Raso a Médio)',
    currentStage: 'floracao',
    irrigationType: 'Gotejamento Sub-Copa Anti-Vassoura',
    waterSources: [
      'Açude / Barreiro Interno da Propriedade',
      'Captação Pluvial em Telhados de Barcaças e Estufas Solares',
      'Córrego Santana (Dispensa de Outorga INEMA)'
    ],
    roofCatchmentAreaM2: 480, // Telhados de 3 barcaças de cacau + galpão de fermentação
    catchmentEfficiency: 0.85,
    weather: {
      tempC: 31.4,
      airHumidityPct: 86,
      evapotranspirationMmDay: 4.2,
      forecastRain7DaysMm: 8,
      daysWithoutRain: 24,
      elNinoAlertLevel: 'Atenção (Veranico)',
      fungalRiskLevel: 'Crítico (Vassoura-de-Bruxa / Podridão-Parda)',
    },
    automationConfig: {
      antiWitchesBroomLock: true,
      greenTariffSync: true,
      osmoticDeficitMode: false,
      autoRainDiverter: true,
      offlineLoRaMode: true,
      electricalConductivityDsm: 0.45, // Água doce de ótima qualidade
    },
    regulation: {
      waterBodyName: 'Afluente do Rio Santana / Bacia do Rio Cachoeira',
      legalInstrument: 'Dispensa de Outorga (Uso Insignificante - INEMA)',
      processNumber: 'CEFIR/INEMA-BA Nº 2025.004189-DISP',
      authorizedFlowM3Day: 43.2, // Abaixo de 0,5 L/s (43,2 m³/dia)
      currentWithdrawalM3Day: 34.5,
      appSpringsPreserved: true,
      carStatus: 'Ativo e Regular (CEFIR/BA)',
      legalLawsApplied: [
        'Lei Federal nº 9.433/1997 (Política Nacional de Recursos Hídricos)',
        'Lei Estadual BA nº 11.612/2009 (Política Estadual de Recursos Hídricos / INEMA)',
        'Lei Federal nº 12.651/2012 (Código Florestal — APP de Nascentes raio 50m preservada)'
      ]
    },
    agronomicThesis: {
      headline: 'Sul da Bahia (Ilhéus): Combate aos Veranicos sem Acordar a Vassoura-de-Bruxa',
      whyDripHere:
        'Em Ilhéus, o cacaueiro na Cabruca possui raízes superficiais acostumadas historicamente à chuva constante. Nos veranicos atuais (El Niño), 20 dias sem chuva causam abortamento severo de flores e bilros. Porém, irrigar por aspersão molha a copa e eleva a umidade relativa acima de 85%, explodindo a Vassoura-de-Bruxa (Moniliophthora perniciosa) e a Podridão-Parda (Phytophthora). O gotejamento sub-copa entrega água apenas no bulbo radicular, mantendo tronco, flores e frutos secos!',
      physiologicalSecret:
        'Trava Fitossanitária Inteligente + Cobertura Morta: O sistema aplica pulsos curtos na zona radicular (0–20 cm) quando a tensão do solo atinge 20 kPa (Jadin & Jacquemart, 1978), mas suspende a rega se a umidade relativa passar de 85%, reduzindo em 58% o consumo de água frente à aspersão (224 mm vs. 535 mm).',
      expectedYieldKgHa: 1050, // Salto de 450 kg/ha (média cabruca sem irrigação) para 1.050 kg/ha tecnificado
      baselineYieldWithoutDripKgHa: 450,
      waterConsumptionDripMmSeason: 224,
      waterConsumptionSprinklerMmSeason: 535,
    },
    sectors: [
      {
        id: 'sec-il-1',
        name: 'Talhão 01 — Cabruca Renovada (Clone CEPEC-2002)',
        areaHa: 6,
        plantsCount: 6666,
        cloneType: 'CEPEC-2002 (Resistente)',
        stage: 'floracao',
        targetLitersPerPlantDay: 12,
        nominalFlowLh: 13300,
        measuredFlowLh: 13180,
        pressureBar: 1.8,
        nominalPressureBar: 1.8,
        valveStatus: 'auto_blocked',
        diagnosticStatus: 'ok',
        diagnosticMessage: 'Pausa Preventiva Anti-Vassoura ativa (Umidade do ar em 86% > limite de 85%). Retoma às 21h30.',
        soilMoisturePct: 71,
        osmoticAdjustmentActive: false,
      },
      {
        id: 'sec-il-2',
        name: 'Talhão 02 — Encosta Sul (Clone PH-16 em Frutificação)',
        areaHa: 5,
        plantsCount: 5555,
        cloneType: 'PH-16',
        stage: 'frutificacao',
        targetLitersPerPlantDay: 15,
        nominalFlowLh: 11100,
        measuredFlowLh: 8990, // -19% de vazão!
        pressureBar: 2.35, // Pressão subiu no cabeçal!
        nominalPressureBar: 1.8,
        valveStatus: 'scheduled',
        diagnosticStatus: 'clogged_alert',
        diagnosticMessage: 'ALERTA HIDRÁULICO: Vazão 19% abaixo do nominal e pressão elevada (2,35 bar). Provável entupimento de gotejadores por ferro/sedimento nas linhas 3 e 4.',
        soilMoisturePct: 58,
        osmoticAdjustmentActive: false,
      },
      {
        id: 'sec-il-3',
        name: 'Talhão 03 — Baixada Úmida (Cacau Comum / Pará-Parazinho)',
        areaHa: 4,
        plantsCount: 4444,
        cloneType: 'Cacau Comum / Híbrido',
        stage: 'vegetativo',
        targetLitersPerPlantDay: 8,
        nominalFlowLh: 8880,
        measuredFlowLh: 8850,
        pressureBar: 1.75,
        nominalPressureBar: 1.8,
        valveStatus: 'closed',
        diagnosticStatus: 'ok',
        diagnosticMessage: 'Umidade do solo adequada (76%) graças ao sombreamento e cobertura morta de pseudocaule de bananeira.',
        soilMoisturePct: 76,
        osmoticAdjustmentActive: false,
      },
      {
        id: 'sec-il-4',
        name: 'Talhão 04 — Área de Mudas Jovens (2 anos - Enxertia)',
        areaHa: 3,
        plantsCount: 3335,
        cloneType: 'CCN-51 / PS-1319',
        stage: 'mudas',
        targetLitersPerPlantDay: 6,
        nominalFlowLh: 6670,
        measuredFlowLh: 6640,
        pressureBar: 1.8,
        nominalPressureBar: 1.8,
        valveStatus: 'open',
        diagnosticStatus: 'ok',
        diagnosticMessage: 'Irrigação sub-copa ativa em pulso curto para proteger mudas jovens contra estresse térmico.',
        soilMoisturePct: 68,
        osmoticAdjustmentActive: true,
      },
    ],
    reservoirs: [
      {
        id: 'res-il-1',
        name: 'Açude Principal da Baixada (Barreiro Aberto)',
        type: 'acude',
        nominalCapacityM3: 1500,
        siltationLossPct: 18, // 18% perdido por assoreamento de fundo!
        evaporationLossMmDay: 5.2,
        currentApparentVolumeM3: 1180, // O que o produtor acha que tem olhando a régua
        currentRealVolumeM3: 910, // Volume real descontando assoreamento no fundo
        hasCoverOrGeomembrane: false,
      },
      {
        id: 'res-il-2',
        name: 'Cisterna Fechada das Barcaças de Secagem (480 m² calhas)',
        type: 'cisterna_barcaca',
        nominalCapacityM3: 300,
        siltationLossPct: 2,
        evaporationLossMmDay: 0.3,
        currentApparentVolumeM3: 245,
        currentRealVolumeM3: 240,
        hasCoverOrGeomembrane: true,
      },
      {
        id: 'res-il-3',
        name: 'Barragem Subterrânea / Caixa Seca de Encosta',
        type: 'barragem_subterranea',
        nominalCapacityM3: 250,
        siltationLossPct: 5,
        evaporationLossMmDay: 1.1,
        currentApparentVolumeM3: 160,
        currentRealVolumeM3: 150,
        hasCoverOrGeomembrane: true,
      }
    ]
  },

  oeste: {
    id: 'oeste',
    name: 'Fazenda Ouro do Cerrado',
    municipality: 'Riachão das Neves / Barreiras',
    state: 'BA',
    latitude: -11.7462,
    longitude: -44.9102,
    farmRadiusM: 520,
    terrainSlopePct: 4,
    terrainProfileType: 'plano',
    polygonVertices: [
      { lat: -11.7430, lon: -44.9138 },
      { lat: -11.7426, lon: -44.9068 },
      { lat: -11.7484, lon: -44.9060 },
      { lat: -11.7498, lon: -44.9112 },
      { lat: -11.7475, lon: -44.9145 },
    ],
    biome: 'Cerrado Baiano (Oeste da Bahia)',
    hydrographicBasin: 'Bacia Hidrográfica do Rio Grande / Médio São Francisco',
    totalAreaHa: 65,
    cacaoAreaHa: 40,
    plantingDensityPerHa: 1600, // 2,5m x 2,5m como no PDF 4 (CPCRI / Netafim)
    estimatedPlants: 64000,
    cropAgeYears: 4,
    cultivationSystem: 'Pleno Sol Mecanizado (Filas Duplas)',
    soilType: 'Latossolo Vermelho-Amarelo Franco-Arenoso (Profundo e Plano)',
    currentStage: 'frutificacao',
    irrigationType: 'Gotejamento com Fertirrigação (Delivery System)',
    waterSources: [
      'Piscinão Revestido com Geomembrana (Baixa Perda)',
      'Captação Superficial Outorgada (Bacia do Rio Grande)',
      'Poço Tubular Complementar + Cisterna de Galpão (850 m²)'
    ],
    roofCatchmentAreaM2: 850,
    catchmentEfficiency: 0.88,
    weather: {
      tempC: 34.8,
      airHumidityPct: 38,
      evapotranspirationMmDay: 6.4,
      forecastRain7DaysMm: 0,
      daysWithoutRain: 52,
      elNinoAlertLevel: 'Alerta Severo (El Niño)',
      fungalRiskLevel: 'Baixo (Escape Climático)',
    },
    automationConfig: {
      antiWitchesBroomLock: false, // No Cerrado a umidade já é baixa (38%)
      greenTariffSync: true,
      osmoticDeficitMode: true,
      autoRainDiverter: true,
      offlineLoRaMode: true,
      electricalConductivityDsm: 1.15, // Atenção moderada para sais do poço complementar
    },
    regulation: {
      waterBodyName: 'Sub-bacia do Rio Branco / Bacia do Rio Grande (Oeste BA)',
      legalInstrument: 'Outorga de Direito de Uso (Portaria INEMA/ANA)',
      processNumber: 'Portaria INEMA Nº 28.910/2024',
      authorizedFlowM3Day: 1150,
      currentWithdrawalM3Day: 980,
      appSpringsPreserved: true,
      carStatus: 'Ativo e Regular (CEFIR/BA)',
      legalLawsApplied: [
        'Lei Federal nº 9.433/1997 (Outorga de Direito de Uso e Gestão por Bacia)',
        'Lei Estadual BA nº 11.612/2009 (Monitoramento Hidrométrico Telemetrado INEMA)',
        'Lei Federal nº 12.651/2012 (Reserva Legal 20% no Cerrado + APP regularizadas no CEFIR)'
      ]
    },
    agronomicThesis: {
      headline: 'Oeste Baiano (Cerrado): Por que o Cacau Resiste ao Clima Seco e Produz 3.000 kg/ha (10x a Média Nacional)?',
      whyDripHere:
        'O Cerrado tem 5 a 6 meses de seca severa e baixa umidade do ar (35–45%), mas tornou-se o novo polo mundial do cacau (ex: projetos em Riachão das Neves, Barreiras e Cocos). O ar seco e o sol pleno eliminam naturalmente a Vassoura-de-Bruxa! Com gotejamento + fertirrigação (Delivery System Netafim) aplicando até 20 L/árvore/dia (5,6 a 7,0 mm/dia — CPCRI, 2010) direto na raiz, a planta mantém os estômatos abertos sob sol pleno e faz fotossíntese máxima.',
      physiologicalSecret:
        'Ajuste Osmótico Ativo Radicular (Moser et al., 2010) + Fertirrigação de Precisão: O cacaueiro submetido a ar seco e pulsos controlados de gotejamento realiza ajuste osmótico ativo nas raízes (acumula solutos celulares para extrair água com alta eficiência) e concentra raízes finas no bulbo molhado nutrido, evitando lixiviação e atingindo 3.000 kg/ha (200 arrobas/ha).',
      expectedYieldKgHa: 3000, // Exatamente os 3 mil kg/ha da reportagem da Schmidt Agrícola!
      baselineYieldWithoutDripKgHa: 300, // Média nacional sem irrigação (ou inviabilidade no Cerrado sem água)
      waterConsumptionDripMmSeason: 410,
      waterConsumptionSprinklerMmSeason: 890,
    },
    sectors: [
      {
        id: 'sec-oe-1',
        name: 'Setor Pivô/Gotejo A — Clone CCN-51 Alta Performance',
        areaHa: 12,
        plantsCount: 19200,
        cloneType: 'CCN-51 (Pleno Sol)',
        stage: 'frutificacao',
        targetLitersPerPlantDay: 20, // 20 L/árvore/dia conforme CPCRI (2010) no PDF 4!
        nominalFlowLh: 38400,
        measuredFlowLh: 38150,
        pressureBar: 2.0,
        nominalPressureBar: 2.0,
        valveStatus: 'open',
        diagnosticStatus: 'ok',
        diagnosticMessage: 'Fertirrigação ativa (Delivery System: NPK + Micronutrientes). Ajuste osmótico radicular estável.',
        soilMoisturePct: 78,
        osmoticAdjustmentActive: true,
      },
      {
        id: 'sec-oe-2',
        name: 'Setor Gotejo B — Clone PS-1319 (Floração Induzida)',
        areaHa: 10,
        plantsCount: 16000,
        cloneType: 'PS-1319',
        stage: 'floracao',
        targetLitersPerPlantDay: 16,
        nominalFlowLh: 32000,
        measuredFlowLh: 31800,
        pressureBar: 2.0,
        nominalPressureBar: 2.0,
        valveStatus: 'scheduled',
        diagnosticStatus: 'ok',
        diagnosticMessage: 'Agendado para 21h30 (Tarifa Verde Coelba — 38% de economia de energia elétrica e mínima evaporação).',
        soilMoisturePct: 66,
        osmoticAdjustmentActive: true,
      },
      {
        id: 'sec-oe-3',
        name: 'Setor Gotejo C — Clone CEPEC-2002 (Consórcio Inicial Gliricídia)',
        areaHa: 10,
        plantsCount: 16000,
        cloneType: 'CEPEC-2002',
        stage: 'vegetativo',
        targetLitersPerPlantDay: 13,
        nominalFlowLh: 26000,
        measuredFlowLh: 20800, // -20% de vazão
        pressureBar: 2.48,
        nominalPressureBar: 2.0,
        valveStatus: 'scheduled',
        diagnosticStatus: 'clogged_alert',
        diagnosticMessage: 'ALERTA DE INCRUSTAÇÃO: Vazão caiu 20% e pressão subiu para 2,48 bar. Precipitação de carbonato da água do poço complementar.',
        soilMoisturePct: 54,
        osmoticAdjustmentActive: true,
      },
      {
        id: 'sec-oe-4',
        name: 'Setor Gotejo D — Mudas de Expansão Mecanizada (1,5 ano)',
        areaHa: 8,
        plantsCount: 12800,
        cloneType: 'CCN-51 / SJ-02',
        stage: 'mudas',
        targetLitersPerPlantDay: 9,
        nominalFlowLh: 19200,
        measuredFlowLh: 19100,
        pressureBar: 1.95,
        nominalPressureBar: 2.0,
        valveStatus: 'open',
        diagnosticStatus: 'ok',
        diagnosticMessage: 'Quebra-vento e cobertura morta na linha preservando 98% de pegamento das mudas no Cerrado.',
        soilMoisturePct: 74,
        osmoticAdjustmentActive: true,
      }
    ],
    reservoirs: [
      {
        id: 'res-oe-1',
        name: 'Piscinão Principal com Geomembrana PEAD',
        type: 'piscinao_geomembrana',
        nominalCapacityM3: 15000,
        siltationLossPct: 2,
        evaporationLossMmDay: 6.8,
        currentApparentVolumeM3: 11200,
        currentRealVolumeM3: 10950,
        hasCoverOrGeomembrane: true,
      },
      {
        id: 'res-oe-2',
        name: 'Açude Auxiliar de Captação Pluvial / Barraginhas',
        type: 'acude',
        nominalCapacityM3: 3500,
        siltationLossPct: 22, // Alto assoreamento em solo franco-arenoso!
        evaporationLossMmDay: 7.5,
        currentApparentVolumeM3: 2100,
        currentRealVolumeM3: 1520,
        hasCoverOrGeomembrane: false,
      },
      {
        id: 'res-oe-3',
        name: 'Cisterna dos Galpões de Beneficiamento (850 m²)',
        type: 'cisterna_barcaca',
        nominalCapacityM3: 500,
        siltationLossPct: 1,
        evaporationLossMmDay: 0.4,
        currentApparentVolumeM3: 180,
        currentRealVolumeM3: 178,
        hasCoverOrGeomembrane: true,
      }
    ]
  }
};

export interface SoilPracticeItem {
  id: string;
  title: string;
  targetRegion: 'Ambos' | 'Sul da Bahia (Ilhéus)' | 'Oeste Baiano (Cerrado)';
  problemSolved: string;
  scientificBasis: string;
  costRange: 'Muito Baixo (Insumo da Fazenda)' | 'Baixo' | 'Médio';
  difficulty: 'Fácil' | 'Moderada';
  expectedBenefit: string;
  waterSavingPct: number;
  limitations: string;
  requiresAgronomist: boolean;
}

export const SOIL_PRACTICES: SoilPracticeItem[] = [
  {
    id: 'mulch-banana',
    title: 'Cobertura Morta com Pseudocaule de Bananeira e Casca de Cacau',
    targetRegion: 'Ambos',
    problemSolved: 'Perda rápida de umidade nos primeiros 20 cm do solo (onde ficam 80% das raízes absorventes do cacau) e mortalidade de mudas na seca.',
    scientificBasis: 'Orchard & Saltos (1988) demonstraram que cobertura morta repetida com pseudocaules frescos e úmidos de bananeira garante o estabelecimento de cacaueiros em secas prolongadas de até 6 meses.',
    costRange: 'Muito Baixo (Insumo da Fazenda)',
    difficulty: 'Fácil',
    expectedBenefit: 'Reduz evaporação superficial do solo em até 35% e fornece potássio/matéria orgânica.',
    waterSavingPct: 18,
    limitations: 'Casca de cacau com sintomas de podridão-parda/vassoura deve ser compostada antes para não espalhar esporos.',
    requiresAgronomist: false,
  },
  {
    id: 'shade-gliricidia',
    title: 'Sombreamento Provisório e Quebra-Vento com Gliricídia / Bananeira',
    targetRegion: 'Oeste Baiano (Cerrado)',
    problemSolved: 'Desidratação severa por ventos secos do Cerrado e excesso de demanda evaporativa em lavouras jovens a pleno sol.',
    scientificBasis: 'Moser et al. (2010) comprovaram que a mitigação da seca por sombreamento com Gliricídia aliada ao ajuste osmótico ativo preserva a biomassa de folhas e raízes finas durante eventos de El Niño.',
    costRange: 'Baixo',
    difficulty: 'Moderada',
    expectedBenefit: 'Reduz a temperatura foliar em até 4 °C, fixa nitrogênio no solo e reduz a evapotranspiração do talhão.',
    waterSavingPct: 15,
    limitations: 'Exige poda periódica para não sombrear excessivamente o cacau adulto de alta produtividade.',
    requiresAgronomist: true,
  },
  {
    id: 'cabruca-pruning',
    title: 'Poda Fitossanitária + Raleamento Seletivo de Sombra na Cabruca',
    targetRegion: 'Sul da Bahia (Ilhéus)',
    problemSolved: 'Bolsões de umidade > 90% que favorecem a Vassoura-de-Bruxa e competição hídrica entre árvores de sombra gigantes e o cacaueiro.',
    scientificBasis: 'A entrada controlada de luz reduz a sobrevivência de esporos fúngicos na copa, enquanto o gotejamento sub-copa hidrata a raiz sem molhar os frutos.',
    costRange: 'Baixo',
    difficulty: 'Moderada',
    expectedBenefit: 'Diminui incidência de Vassoura-de-Bruxa em até 60% e melhora resposta à fertirrigação.',
    waterSavingPct: 12,
    limitations: 'Supressão ou poda de árvores nativas na Cabruca exige respeito à legislação estadual (INEMA/CEFIR).',
    requiresAgronomist: true,
  },
  {
    id: 'subsurface-barraginha',
    title: 'Caixas Secas / Barraginhas de Contenção e Recarga de Lençol',
    targetRegion: 'Ambos',
    problemSolved: 'Escoamento superficial e erosão durante chuvas torrenciais rápidas, perdendo água que deveria infiltrar para a zona radicular.',
    scientificBasis: 'Retém enxurradas nas estradas e entrelinhas, forçando a infiltração lenta para abastecer o perfil do solo e as nascentes (APP).',
    costRange: 'Baixo',
    difficulty: 'Fácil',
    expectedBenefit: 'Aumenta a reserva de água no solo por mais 15 a 25 dias após o fim das chuvas.',
    waterSavingPct: 14,
    limitations: 'Requer limpeza anual de sedimentos (desassoreamento manual ou mecanizado).',
    requiresAgronomist: false,
  }
];

export interface EmergencyAction {
  id: string;
  phase: 'antes' | 'durante' | 'depois';
  title: string;
  description: string;
  costLevel: 'Gratuito / Operacional' | 'Baixo Custo' | 'Investimento Moderado';
  autonomyGainDays: number;
  completed: boolean;
}

export const INITIAL_EMERGENCY_ACTIONS: EmergencyAction[] = [
  // Antes da seca
  {
    id: 'em-1',
    phase: 'antes',
    title: 'Auditoria de Assoreamento e Vazamentos no Reservatório',
    description: 'Medir a profundidade real do açude/barreiro (descontando lama no fundo) e vedar microfissuras na cisterna das barcaças.',
    costLevel: 'Gratuito / Operacional',
    autonomyGainDays: 6,
    completed: true,
  },
  {
    id: 'em-2',
    phase: 'antes',
    title: 'Limpeza de Calhas das Barcaças e Desvio de Primeira Água',
    description: 'Desobstruir calhas dos telhados de secagem de cacau para garantir 85%+ de aproveitamento nas últimas chuvas antes do veranico.',
    costLevel: 'Baixo Custo',
    autonomyGainDays: 5,
    completed: true,
  },
  {
    id: 'em-3',
    phase: 'antes',
    title: 'Aplicação Preventiva de Cobertura Morta na Projeção da Copa',
    description: 'Distribuir palhada, pseudocaule de bananeira picado e folhas secas sobre a linha de gotejamento (0–20 cm).',
    costLevel: 'Gratuito / Operacional',
    autonomyGainDays: 8,
    completed: false,
  },
  // Durante a seca
  {
    id: 'em-4',
    phase: 'durante',
    title: 'Ativar Irrigação Noturna (Tarifa Verde) + Pulsos de Gotejamento',
    description: 'Irrigar apenas entre 21h30 e 06h00 para zerar perdas por evaporação imediata e economizar 38% na tarifa de energia elétrica.',
    costLevel: 'Gratuito / Operacional',
    autonomyGainDays: 9,
    completed: true,
  },
  {
    id: 'em-5',
    phase: 'durante',
    title: 'Priorização de Talhões: Mudas Jovens e Clones em Floração/Peco',
    description: 'Se a reserva cair abaixo de 30%, garantir 100% da lâmina para mudas (< 2 anos) e talhões em pegamento de frutos, aplicando déficit controlado (Moser et al., 2010) nos talhões vegetativos.',
    costLevel: 'Gratuito / Operacional',
    autonomyGainDays: 11,
    completed: false,
  },
  {
    id: 'em-6',
    phase: 'durante',
    title: 'Flushing (Retrolavagem) de Linhas com Alerta de Entupimento',
    description: 'Abrir finais de linha nos setores onde o AgroCiclo AI detectou queda de vazão (>15%) e subida de pressão para expulsar precipitados.',
    costLevel: 'Gratuito / Operacional',
    autonomyGainDays: 4,
    completed: false,
  },
  // Após a seca
  {
    id: 'em-7',
    phase: 'depois',
    title: 'Balanço de Perdas e Relatório de Eficiência para o Banco do Nordeste / INEMA',
    description: 'Exportar histórico de m³ bombeados vs. economizados para comprovar regularidade da outorga e solicitar linha FNE Verde.',
    costLevel: 'Gratuito / Operacional',
    autonomyGainDays: 0,
    completed: false,
  },
  {
    id: 'em-8',
    phase: 'depois',
    title: 'Fertirrigação de Recuperação Radicular e Foliar',
    description: 'Aplicar solução nutritiva fracionada via gotejamento (Delivery System) após as primeiras chuvas para recuperar a emissão de flores.',
    costLevel: 'Baixo Custo',
    autonomyGainDays: 0,
    completed: false,
  }
];
