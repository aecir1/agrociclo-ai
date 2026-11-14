export type RegionId = 'ilheus' | 'oeste';

export type PhenologicalStage = 'mudas' | 'vegetativo' | 'floracao' | 'frutificacao';

export interface LatLonPoint {
  lat: number;
  lon: number;
}

export interface IrrigationSector {
  id: string;
  name: string;
  areaHa: number;
  plantsCount: number;
  cloneType: string;
  stage: PhenologicalStage;
  targetLitersPerPlantDay: number;
  nominalFlowLh: number;
  measuredFlowLh: number;
  pressureBar: number;
  nominalPressureBar: number;
  valveStatus: 'open' | 'closed' | 'scheduled' | 'auto_blocked';
  diagnosticStatus: 'ok' | 'clogged_alert' | 'leak_alert';
  diagnosticMessage: string;
  soilMoisturePct: number;
  osmoticAdjustmentActive: boolean;
  terrainZone?: 'baixada' | 'meia_encosta' | 'topo';
}

export interface ReservoirNode {
  id: string;
  name: string;
  type: 'acude' | 'cisterna_barcaca' | 'piscinao_geomembrana' | 'barragem_subterranea';
  nominalCapacityM3: number;
  siltationLossPct: number; // Assoreamento (%)
  evaporationLossMmDay: number;
  currentApparentVolumeM3: number;
  currentRealVolumeM3: number;
  hasCoverOrGeomembrane: boolean;
}

export interface PropertyProfile {
  id: RegionId;
  name: string;
  municipality: string;
  state: string;
  biome: string;
  hydrographicBasin: string;
  totalAreaHa: number;
  cacaoAreaHa: number;
  plantingDensityPerHa: number;
  estimatedPlants: number;
  cropAgeYears: number;
  cultivationSystem: 'Cabruca Tradicional & Adensado' | 'Pleno Sol Mecanizado (Filas Duplas)';
  soilType: string;
  currentStage: PhenologicalStage;
  irrigationType: 'Gotejamento Sub-Copa Anti-Vassoura' | 'Gotejamento com Fertirrigação (Delivery System)';
  waterSources: string[];
  roofCatchmentAreaM2: number; // Telhados de barcaças, estufas e galpões
  catchmentEfficiency: number;
  weather: {
    tempC: number;
    airHumidityPct: number;
    evapotranspirationMmDay: number;
    forecastRain7DaysMm: number;
    daysWithoutRain: number;
    elNinoAlertLevel: 'Normal' | 'Atenção (Veranico)' | 'Alerta Severo (El Niño)';
    fungalRiskLevel: 'Baixo (Escape Climático)' | 'Moderado' | 'Crítico (Vassoura-de-Bruxa / Podridão-Parda)';
  };
  automationConfig: {
    antiWitchesBroomLock: boolean; // Trava se UR > 85%
    greenTariffSync: boolean; // Horário fora de ponta Coelba (21h30 - 06h00)
    osmoticDeficitMode: boolean; // Déficit controlado Moser et al. (2010)
    autoRainDiverter: boolean; // Redistribuição automática entre cisternas
    offlineLoRaMode: boolean; // Operação sem internet estável
    electricalConductivityDsm: number; // Salinidade da água
  };
  regulation: {
    waterBodyName: string;
    legalInstrument: 'Dispensa de Outorga (Uso Insignificante - INEMA)' | 'Outorga de Direito de Uso (Portaria INEMA/ANA)';
    processNumber: string;
    authorizedFlowM3Day: number;
    currentWithdrawalM3Day: number;
    appSpringsPreserved: boolean;
    carStatus: 'Ativo e Regular (CEFIR/BA)' | 'Pendente de Retificação';
    legalLawsApplied: string[];
  };
  agronomicThesis: {
    headline: string;
    whyDripHere: string;
    physiologicalSecret: string;
    expectedYieldKgHa: number;
    baselineYieldWithoutDripKgHa: number;
    waterConsumptionDripMmSeason: number; // Ex: 224 mm (Jadin & Jacquemart, 1978)
    waterConsumptionSprinklerMmSeason: number; // Ex: 535 mm
  };
  sectors: IrrigationSector[];
  reservoirs: ReservoirNode[];
  latitude?: number;
  longitude?: number;
  farmRadiusM?: number;
  polygonVertices?: LatLonPoint[];
  terrainSlopePct?: number;
  terrainProfileType?: 'plano' | 'ondulado' | 'morro' | 'escarpado';
}
