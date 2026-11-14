import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MapPin,
  Undo2,
  Redo2,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Compass,
  Navigation,
  Pencil,
  Box,
  Map as MapIcon,
  Satellite,
  Mountain,
  CloudRain,
  ArrowRight,
  Crosshair,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { LatLonPoint, PropertyProfile } from '../types';
import {
  calculateFarmGeometry,
  calculateReliefRainImpact,
  getTerrainDownhillVector,
  getTerrainElevationM,
  localMetersToLatLon,
} from '../utils/geoMap';
import { ToggleSwitch } from './ToggleSwitch';

interface FarmMap2D3DProps {
  profile: PropertyProfile;
  onUpdateProfile: (updated: PropertyProfile) => void;
  onOpenSimulator?: () => void;
}

const BAHIA_PRESETS: Array<{ label: string; lat: number; lon: number }> = [
  { label: 'Ilhéus • Zona Rural', lat: -14.7565, lon: -39.2245 },
  { label: 'Itabuna • CEPLAC', lat: -14.7695, lon: -39.2312 },
  { label: 'Uruçuca (Cacau)', lat: -14.5931, lon: -39.2844 },
  { label: 'Camacan', lat: -15.4192, lon: -39.4958 },
  { label: 'Riachão das Neves', lat: -11.7462, lon: -44.9102 },
  { label: 'Barreiras (Oeste)', lat: -12.1528, lon: -44.9901 },
];

type LeafletLayerStyle = 'satellite' | 'topo';
type MapEngineMode = 'leaflet' | 'relief3d';

const LEAFLET_TILE_PROVIDERS: Record<
  LeafletLayerStyle,
  { url: string; attribution: string; maxZoom: number }
> = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 18,
  },
  topo: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri Topo',
    maxZoom: 18,
  },
};

const MAPLIBRE_BASE_TILES: Record<
  LeafletLayerStyle,
  { tiles: string[]; attribution: string; maxzoom: number }
> = {
  satellite: {
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: 'Esri World Imagery',
    maxzoom: 18,
  },
  topo: {
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: 'Esri World Topo',
    maxzoom: 18,
  },
};

function makeCircleRing(
  centerLat: number,
  centerLon: number,
  radiusM: number,
  segments = 24
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= segments; i++) {
    const ang = (i / segments) * Math.PI * 2;
    const p = localMetersToLatLon(
      Math.cos(ang) * radiusM,
      Math.sin(ang) * radiusM,
      centerLat,
      centerLon
    );
    pts.push([p.lon, p.lat]);
  }
  return pts;
}

function makeRectPolygon(
  dxCenter: number,
  dyCenter: number,
  halfW: number,
  halfH: number,
  originLat: number,
  originLon: number
): Array<[number, number]> {
  const corners: Array<[number, number]> = [
    [dxCenter - halfW, dyCenter - halfH],
    [dxCenter + halfW, dyCenter - halfH],
    [dxCenter + halfW, dyCenter + halfH],
    [dxCenter - halfW, dyCenter + halfH],
    [dxCenter - halfW, dyCenter - halfH],
  ];
  return corners.map(([dx, dy]) => {
    const p = localMetersToLatLon(dx, dy, originLat, originLon);
    return [p.lon, p.lat];
  });
}

function build3DStyle(layerStyle: LeafletLayerStyle): maplibregl.StyleSpecification {
  const baseCfg = MAPLIBRE_BASE_TILES[layerStyle];
  return {
    version: 8,
    sources: {
      'base-raster': {
        type: 'raster',
        tiles: baseCfg.tiles,
        tileSize: 256,
        maxzoom: baseCfg.maxzoom,
        attribution: baseCfg.attribution,
      },
      'terrain-dem': {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 15,
        encoding: 'terrarium',
      },
    },
    layers: [
      {
        id: 'base-raster-layer',
        type: 'raster',
        source: 'base-raster',
        paint: {
          'raster-opacity': 1,
        },
      },
      {
        id: 'terrain-hillshade',
        type: 'hillshade',
        source: 'terrain-dem',
        paint: {
          'hillshade-exaggeration': 0.35,
          'hillshade-shadow-color': '#0f172a',
          'hillshade-highlight-color': '#fefce8',
          'hillshade-accent-color': '#059669',
        },
      },
    ],
  };
}

export const FarmMap2D3D: React.FC<FarmMap2D3DProps> = ({
  profile,
  onUpdateProfile,
  onOpenSimulator,
}) => {
  const originLat = profile.latitude ?? (profile.id === 'oeste' ? -11.7462 : -14.7565);
  const originLon = profile.longitude ?? (profile.id === 'oeste' ? -44.9102 : -39.2245);
  const farmRadiusM = profile.farmRadiusM ?? 360;
  const slopePct = profile.terrainSlopePct ?? (profile.id === 'oeste' ? 4 : 16);
  const vertices: LatLonPoint[] = profile.polygonVertices ?? [];

  const [engineMode, setEngineMode] = useState<MapEngineMode>('leaflet');
  const [layerStyle, setLayerStyle] = useState<LeafletLayerStyle>('satellite');
  const [drawingMode, setDrawingMode] = useState<boolean>(false);
  const [showRunoffArrows, setShowRunoffArrows] = useState<boolean>(true);
  const [showManualCoords, setShowManualCoords] = useState<boolean>(false);
  const [latInput, setLatInput] = useState<string>(String(originLat));
  const [lonInput, setLonInput] = useState<string>(String(originLon));
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const [tileOfflineWarning, setTileOfflineWarning] = useState<boolean>(false);

  // MapLibre 3D Camera & Relief Exaggeration controls
  const [bearingDeg, setBearingDeg] = useState<number>(-22);
  const [pitchDeg, setPitchDeg] = useState<number>(58);
  const [terrainExag, setTerrainExag] = useState<number>(() =>
    slopePct <= 6 ? 1.4 : slopePct <= 14 ? 2.1 : 2.8
  );
  const [webglError, setWebglError] = useState<string | null>(null);
  const [mapLibreReady, setMapLibreReady] = useState<boolean>(false);

  // Refs for Leaflet map & overlays
  const leafletContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);
  const lastRegionRef = useRef<string>(profile.id);

  // Refs for MapLibre GL JS 4.x WebGL 3D map
  const maplibreContainerRef = useRef<HTMLDivElement | null>(null);
  const maplibreMapRef = useRef<maplibregl.Map | null>(null);
  const maplibreMarkersRef = useRef<maplibregl.Marker[]>([]);
  const lastRegion3DRef = useRef<string>(profile.id);

  // Refs for latest callback values inside map event handlers
  const profileRef = useRef<PropertyProfile>(profile);
  profileRef.current = profile;
  const drawingModeRef = useRef<boolean>(drawingMode);
  drawingModeRef.current = drawingMode;
  const onUpdateProfileRef = useRef(onUpdateProfile);
  onUpdateProfileRef.current = onUpdateProfile;

  // Histórico de desfazer/refazer (Ctrl+Z / Ctrl+Y) dos vértices/arestas da fazenda
  const undoStackRef = useRef<LatLonPoint[][]>([]);
  const redoStackRef = useRef<LatLonPoint[][]>([]);
  const [historyState, setHistoryState] = useState<{ canUndo: boolean; canRedo: boolean }>({
    canUndo: false,
    canRedo: false,
  });

  const syncHistoryState = useCallback(() => {
    setHistoryState({
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
    });
  }, []);

  useEffect(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncHistoryState();
  }, [profile.id, syncHistoryState]);

  const commitVertices = useCallback(
    (nextVerts: LatLonPoint[]) => {
      const curr = profileRef.current;
      const prevVerts = (curr.polygonVertices ?? []).map((p) => ({ ...p }));
      undoStackRef.current = [...undoStackRef.current.slice(-49), prevVerts];
      redoStackRef.current = [];
      syncHistoryState();
      onUpdateProfileRef.current({
        ...curr,
        polygonVertices: nextVerts,
      });
    },
    [syncHistoryState],
  );
  const commitVerticesRef = useRef(commitVertices);
  commitVerticesRef.current = commitVertices;

  const handleUndo = useCallback(() => {
    const curr = profileRef.current;
    const currentVerts = (curr.polygonVertices ?? []).map((p) => ({ ...p }));
    if (undoStackRef.current.length > 0) {
      const previous = undoStackRef.current[undoStackRef.current.length - 1];
      undoStackRef.current = undoStackRef.current.slice(0, -1);
      redoStackRef.current = [...redoStackRef.current.slice(-49), currentVerts];
      syncHistoryState();
      onUpdateProfileRef.current({
        ...curr,
        polygonVertices: previous.map((p) => ({ ...p })),
      });
      return;
    }
    if (currentVerts.length > 0) {
      redoStackRef.current = [...redoStackRef.current.slice(-49), currentVerts];
      syncHistoryState();
      onUpdateProfileRef.current({
        ...curr,
        polygonVertices: currentVerts.slice(0, -1),
      });
    }
  }, [syncHistoryState]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const curr = profileRef.current;
    const currentVerts = (curr.polygonVertices ?? []).map((p) => ({ ...p }));
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current.slice(-49), currentVerts];
    syncHistoryState();
    onUpdateProfileRef.current({
      ...curr,
      polygonVertices: next.map((p) => ({ ...p })),
    });
  }, [syncHistoryState]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((k === 'z' && e.shiftKey) || k === 'y') {
          e.preventDefault();
          handleRedo();
        }
      } else if (e.key === 'Escape' && drawingModeRef.current) {
        setDrawingMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    const leafletEl = leafletMapRef.current?.getContainer();
    if (leafletEl) {
      leafletEl.style.cursor = drawingMode ? 'crosshair' : '';
    }
    const maplibreCanvas = maplibreMapRef.current?.getCanvas();
    if (maplibreCanvas) {
      maplibreCanvas.style.cursor = drawingMode ? 'crosshair' : '';
    }
  }, [drawingMode, engineMode, mapLibreReady]);

  useEffect(() => {
    setLatInput(String(originLat));
    setLonInput(String(originLon));
  }, [originLat, originLon]);

  useEffect(() => {
    setTerrainExag(slopePct <= 6 ? 1.4 : slopePct <= 14 ? 2.1 : slopePct <= 22 ? 2.8 : 3.4);
  }, [slopePct]);

  const geometry = useMemo(
    () => calculateFarmGeometry(originLat, originLon, farmRadiusM, vertices),
    [originLat, originLon, farmRadiusM, vertices]
  );

  const dailyDemandM3 = useMemo(
    () =>
      profile.sectors.reduce((acc, s) => acc + s.plantsCount * s.targetLitersPerPlantDay, 0) / 1000,
    [profile.sectors]
  );

  const reliefRainImpact = useMemo(
    () =>
      calculateReliefRainImpact({
        slopePct,
        rainMm: 45,
        cacaoAreaHa: profile.cacaoAreaHa,
        hasMulchingOrCabruca: profile.id === 'ilheus',
        hasContourDitches: false,
        dailyDemandM3,
      }),
    [dailyDemandM3, profile.cacaoAreaHa, profile.id, slopePct]
  );

  const elevationBounds = useMemo(() => {
    let minE = Infinity;
    let maxE = -Infinity;
    for (let x = -420; x <= 420; x += 70) {
      for (let y = -420; y <= 420; y += 70) {
        const e = getTerrainElevationM(x, y, slopePct, profile.id);
        if (e > maxE) maxE = e;
        if (e < minE) minE = e;
      }
    }
    return {
      minM: Math.round(minE),
      maxM: Math.round(maxE),
      diffM: Math.max(0, Math.round(maxE - minE)),
    };
  }, [profile.id, slopePct]);

  // =========================================================
  // 1. REAL LEAFLET MAP ENGINE (2D EDITING)
  // =========================================================
  useEffect(() => {
    if (engineMode !== 'leaflet') return;
    const container = leafletContainerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: [originLat, originLon],
      zoom: 16,
      zoomControl: true,
    });

    const overlayGroup = L.layerGroup().addTo(map);
    leafletMapRef.current = map;
    overlayGroupRef.current = overlayGroup;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!drawingModeRef.current) return;
      const curr = profileRef.current;
      const nextPt: LatLonPoint = {
        lat: Number(e.latlng.lat.toFixed(6)),
        lon: Number(e.latlng.lng.toFixed(6)),
      };
      commitVerticesRef.current([...(curr.polygonVertices ?? []), nextPt]);
    });

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.invalidateSize();
          })
        : null;
    if (resizeObserver) resizeObserver.observe(container);

    const mountTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => {
      window.clearTimeout(mountTimer);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      leafletMapRef.current = null;
      tileLayerRef.current = null;
      overlayGroupRef.current = null;
    };
  }, [engineMode]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || engineMode !== 'leaflet') return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    setTileOfflineWarning(false);
    let errCount = 0;
    const cfg = LEAFLET_TILE_PROVIDERS[layerStyle];
    const layer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    });

    layer.on('tileerror', () => {
      errCount++;
      if (errCount >= 3) setTileOfflineWarning(true);
    });

    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [layerStyle, engineMode]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || engineMode !== 'leaflet') return;
    if (lastRegionRef.current !== profile.id) {
      lastRegionRef.current = profile.id;
      map.setView([originLat, originLon], 16, { animate: true });
    }
  }, [profile.id, originLat, originLon, engineMode]);

  useEffect(() => {
    const map = leafletMapRef.current;
    const group = overlayGroupRef.current;
    if (!map || !group || engineMode !== 'leaflet') return;

    group.clearLayers();

    L.circle([originLat, originLon], {
      radius: farmRadiusM,
      color: '#0284c7',
      weight: 2,
      dashArray: '6, 6',
      fillColor: '#0ea5e9',
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(group);

    if (vertices.length >= 2) {
      const latLngs = vertices.map((v) => [v.lat, v.lon] as [number, number]);
      if (vertices.length >= 3) {
        L.polygon(latLngs, {
          color: '#059669',
          weight: 3,
          fillColor: '#10b981',
          fillOpacity: 0.24,
          interactive: false,
        }).addTo(group);
      } else {
        L.polyline(latLngs, {
          color: '#059669',
          weight: 3,
          interactive: false,
        }).addTo(group);
      }
    }

    vertices.forEach((v, idx) => {
      const icon = L.divIcon({
        className: 'agrociclo-vertex-icon',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        html: `<div style="width:22px;height:22px;border-radius:9999px;background:#f59e0b;border:2.5px solid #ffffff;color:#0f172a;font-weight:800;font-size:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);cursor:move;">${
          idx + 1
        }</div>`,
      });

      const marker = L.marker([v.lat, v.lon], {
        icon,
        draggable: true,
      }).addTo(group);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const curr = profileRef.current;
        const nextVerts = [...(curr.polygonVertices ?? [])];
        nextVerts[idx] = {
          lat: Number(pos.lat.toFixed(6)),
          lon: Number(pos.lng.toFixed(6)),
        };
        commitVerticesRef.current(nextVerts);
      });
    });

    const sedeIcon = L.divIcon({
      className: 'agrociclo-sede-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      html: `<div style="width:30px;height:30px;border-radius:9999px;background:#e11d48;border:3px solid #ffffff;color:#ffffff;font-weight:900;font-size:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.45);cursor:grab;">S</div>`,
    });

    const sedeMarker = L.marker([originLat, originLon], {
      icon: sedeIcon,
      draggable: true,
    })
      .bindTooltip('Sede da Fazenda (Arraste para mover)', { direction: 'top', offset: [0, -14] })
      .addTo(group);

    sedeMarker.on('dragend', () => {
      const pos = sedeMarker.getLatLng();
      const curr = profileRef.current;
      onUpdateProfileRef.current({
        ...curr,
        latitude: Number(pos.lat.toFixed(6)),
        longitude: Number(pos.lng.toFixed(6)),
      });
    });
  }, [originLat, originLon, farmRadiusM, vertices, engineMode]);

  // =========================================================
  // 2. REAL WEBGL 3D TERRAIN & EXTRUSIONS (MAPLIBRE GL JS 4.x)
  // =========================================================
  const build3DOverlayGeoJson = useMemo(() => {
    const farmRing =
      vertices.length >= 3
        ? [...vertices.map((v) => [v.lon, v.lat] as [number, number]), [vertices[0].lon, vertices[0].lat]]
        : makeCircleRing(originLat, originLon, farmRadiusM);

    const radiusRing = makeCircleRing(originLat, originLon, farmRadiusM, 36);

    const perimeterFeatures: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { kind: 'radius' },
          geometry: { type: 'LineString', coordinates: radiusRing },
        },
        {
          type: 'Feature',
          properties: { kind: 'farm-area', height: 6 },
          geometry: { type: 'Polygon', coordinates: [farmRing] },
        },
        ...(vertices.length >= 2 && vertices.length < 3
          ? [
              {
                type: 'Feature' as const,
                properties: { kind: 'draft-line' },
                geometry: {
                  type: 'LineString' as const,
                  coordinates: vertices.map((v) => [v.lon, v.lat]),
                },
              },
            ]
          : []),
      ],
    };

    // Talhões 3D extrudados distribuídos ao redor da fazenda
    const sectorCount = Math.max(1, profile.sectors.length);
    const sectorFeatures: GeoJSON.Feature[] = profile.sectors.map((sec, i) => {
      const ang = ((i / sectorCount) * Math.PI * 2) + Math.PI / 5;
      const dist = farmRadiusM * 0.44;
      const cx = Math.cos(ang) * dist;
      const cy = Math.sin(ang) * dist;
      const halfSize = Math.max(42, Math.min(95, farmRadiusM * 0.22));
      const color =
        sec.diagnosticStatus === 'leak_alert'
          ? '#e11d48'
          : sec.diagnosticStatus === 'clogged_alert'
            ? '#d97706'
            : '#059669';
      return {
        type: 'Feature',
        properties: {
          name: sec.name,
          color,
          height: sec.valveStatus === 'open' ? 14 : 9,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [makeRectPolygon(cx, cy, halfSize, halfSize * 0.72, originLat, originLon)],
        },
      };
    });

    // Estruturas 3D: Barcaça / Telhado de Captação (terracota) e Reservatório/Açude (azul água)
    const structuresFeatures: GeoJSON.Feature[] = [
      {
        type: 'Feature',
        properties: { name: 'Barcaça / Sede (Telhado Pluvial)', color: '#b45309', height: 22 },
        geometry: {
          type: 'Polygon',
          coordinates: [makeRectPolygon(0, 0, 22, 16, originLat, originLon)],
        },
      },
      {
        type: 'Feature',
        properties: { name: 'Açude / Reservatório Principal', color: '#0284c7', height: 11 },
        geometry: {
          type: 'Polygon',
          coordinates: [makeRectPolygon(44, -36, 26, 20, originLat, originLon)],
        },
      },
    ];

    // Linhas/Setas de escoamento da chuva seguindo o declive do terreno
    const runoffFeatures: GeoJSON.Feature[] = [];
    if (showRunoffArrows && slopePct >= 2) {
      const step = Math.max(120, Math.round(farmRadiusM * 0.55));
      for (let ax = -step; ax <= step; ax += step) {
        for (let ay = -step; ay <= step; ay += step) {
          const vec = getTerrainDownhillVector(ax, ay, slopePct, profile.id);
          const p1 = localMetersToLatLon(ax, ay, originLat, originLon);
          const p2 = localMetersToLatLon(ax + vec.dx * 70, ay + vec.dy * 70, originLat, originLon);
          const arrowEnd = localMetersToLatLon(ax + vec.dx * 70, ay + vec.dy * 70, originLat, originLon);
          const leftWing = localMetersToLatLon(
            ax + vec.dx * 48 - vec.dy * 15,
            ay + vec.dy * 48 + vec.dx * 15,
            originLat,
            originLon
          );
          const rightWing = localMetersToLatLon(
            ax + vec.dx * 48 + vec.dy * 15,
            ay + vec.dy * 48 - vec.dx * 15,
            originLat,
            originLon
          );
          runoffFeatures.push(
            {
              type: 'Feature',
              properties: { kind: 'flow' },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [p1.lon, p1.lat],
                  [p2.lon, p2.lat],
                ],
              },
            },
            {
              type: 'Feature',
              properties: { kind: 'head' },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [leftWing.lon, leftWing.lat],
                  [arrowEnd.lon, arrowEnd.lat],
                  [rightWing.lon, rightWing.lat],
                ],
              },
            }
          );
        }
      }
    }

    return {
      perimeter: perimeterFeatures,
      extrusions: {
        type: 'FeatureCollection' as const,
        features: [...sectorFeatures, ...structuresFeatures],
      },
      runoff: {
        type: 'FeatureCollection' as const,
        features: runoffFeatures,
      },
    };
  }, [farmRadiusM, originLat, originLon, profile.id, profile.sectors, showRunoffArrows, slopePct, vertices]);

  const applyOverlaysToMapLibre = (
    map: maplibregl.Map,
    overlays: ReturnType<() => typeof build3DOverlayGeoJson>
  ) => {
    const ensureGeoJsonSource = (id: string, data: GeoJSON.FeatureCollection) => {
      const existing = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
      if (existing) {
        existing.setData(data);
      } else {
        map.addSource(id, { type: 'geojson', data });
      }
    };

    ensureGeoJsonSource('farm-perimeter-src', overlays.perimeter);
    ensureGeoJsonSource('farm-extrusions-src', overlays.extrusions);
    ensureGeoJsonSource('farm-runoff-src', overlays.runoff);

    if (!map.getLayer('farm-radius-line')) {
      map.addLayer({
        id: 'farm-radius-line',
        type: 'line',
        source: 'farm-perimeter-src',
        filter: ['==', ['get', 'kind'], 'radius'],
        paint: {
          'line-color': '#38bdf8',
          'line-width': 2.5,
          'line-dasharray': [3, 2],
        },
      });
    }

    if (!map.getLayer('farm-area-3d')) {
      map.addLayer({
        id: 'farm-area-3d',
        type: 'fill-extrusion',
        source: 'farm-perimeter-src',
        filter: ['==', ['get', 'kind'], 'farm-area'],
        paint: {
          'fill-extrusion-color': '#10b981',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.28,
        },
      });
    }

    if (!map.getLayer('farm-area-outline')) {
      map.addLayer({
        id: 'farm-area-outline',
        type: 'line',
        source: 'farm-perimeter-src',
        filter: ['==', ['get', 'kind'], 'farm-area'],
        paint: {
          'line-color': '#34d399',
          'line-width': 3,
        },
      });
    }

    if (!map.getLayer('farm-sectors-3d')) {
      map.addLayer({
        id: 'farm-sectors-3d',
        type: 'fill-extrusion',
        source: 'farm-extrusions-src',
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.85,
        },
      });
    }

    if (!map.getLayer('farm-runoff-lines')) {
      map.addLayer({
        id: 'farm-runoff-lines',
        type: 'line',
        source: 'farm-runoff-src',
        paint: {
          'line-color': '#0ea5e9',
          'line-width': 3,
          'line-opacity': 0.9,
        },
      });
    }
  };

  useEffect(() => {
    if (engineMode !== 'relief3d') return;
    const container = maplibreContainerRef.current;
    if (!container) return;

    setWebglError(null);
    setMapLibreReady(false);
    setTileOfflineWarning(false);

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container,
        style: build3DStyle(layerStyle),
        center: [originLon, originLat],
        zoom: 15.2,
        pitch: pitchDeg,
        bearing: bearingDeg,
        maxPitch: 78,
        antialias: true,
        attributionControl: { compact: true },
      });
    } catch {
      setWebglError(
        'Navegador sem suporte ativo a WebGL para o Relevo 3D. Use o modo Mapa Real (Leaflet) ao lado.'
      );
      return;
    }

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }),
      'top-right'
    );

    const configureScene = () => {
      try {
        map.setTerrain({ source: 'terrain-dem', exaggeration: terrainExag });
      } catch {
        // Ignora caso tiles DEM estejam offline
      }
      try {
        map.setSky({
          'sky-color': '#7dd3fc',
          'sky-horizon-blend': 0.45,
          'horizon-color': '#ecfdf5',
          'atmosphere-blend': 0.65,
        });
      } catch {
        // Fallback gracioso em drivers WebGL sem suporte ao Sky layer
      }
      applyOverlaysToMapLibre(map, build3DOverlayGeoJson);
      setMapLibreReady(true);
    };

    map.on('load', configureScene);
    map.on('styledata', () => {
      if (map.isStyleLoaded()) {
        configureScene();
      }
    });

    map.on('error', (ev) => {
      const msg = String(ev?.error?.message || '');
      if (msg.toLowerCase().includes('webgl')) {
        setWebglError(
          'WebGL indisponível neste dispositivo. Alterne para Mapa Real (Leaflet) para visualizar em 2D.'
        );
      }
    });

    map.on('moveend', () => {
      setBearingDeg(Math.round(map.getBearing()));
      setPitchDeg(Math.round(map.getPitch()));
    });

    map.on('click', (e) => {
      if (!drawingModeRef.current) return;
      const curr = profileRef.current;
      const nextPt: LatLonPoint = {
        lat: Number(e.lngLat.lat.toFixed(6)),
        lon: Number(e.lngLat.lng.toFixed(6)),
      };
      commitVerticesRef.current([...(curr.polygonVertices ?? []), nextPt]);
    });

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.resize();
          })
        : null;
    if (resizeObserver) resizeObserver.observe(container);

    maplibreMapRef.current = map;
    const mountTimer = window.setTimeout(() => map.resize(), 120);

    return () => {
      window.clearTimeout(mountTimer);
      if (resizeObserver) resizeObserver.disconnect();
      maplibreMarkersRef.current.forEach((m) => m.remove());
      maplibreMarkersRef.current = [];
      map.remove();
      maplibreMapRef.current = null;
      setMapLibreReady(false);
    };
    // Recria o mapa MapLibre 3D ao entrar na aba 3D ou trocar estilo de camada base
  }, [engineMode, layerStyle]);

  // Atualiza sobreposições GeoJSON e marcadores 3D sem recriar o contexto WebGL
  useEffect(() => {
    const map = maplibreMapRef.current;
    if (!map || engineMode !== 'relief3d' || !mapLibreReady) return;

    applyOverlaysToMapLibre(map, build3DOverlayGeoJson);

    maplibreMarkersRef.current.forEach((m) => m.remove());
    maplibreMarkersRef.current = [];

    // Marcador arrastável da Sede
    const sedeEl = document.createElement('div');
    sedeEl.style.cssText =
      'width:30px;height:30px;border-radius:9999px;background:#e11d48;border:3px solid #ffffff;color:#ffffff;font-weight:900;font-size:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.45);cursor:grab;';
    sedeEl.textContent = 'S';
    sedeEl.title = 'Sede da Fazenda (Arraste para mover)';

    const sedeMarker = new maplibregl.Marker({ element: sedeEl, draggable: true })
      .setLngLat([originLon, originLat])
      .addTo(map);

    sedeMarker.on('dragend', () => {
      const pos = sedeMarker.getLngLat();
      const curr = profileRef.current;
      onUpdateProfileRef.current({
        ...curr,
        latitude: Number(pos.lat.toFixed(6)),
        longitude: Number(pos.lng.toFixed(6)),
      });
    });
    maplibreMarkersRef.current.push(sedeMarker);

    // Marcadores arrastáveis dos cantos
    vertices.forEach((v, idx) => {
      const vEl = document.createElement('div');
      vEl.style.cssText =
        'width:22px;height:22px;border-radius:9999px;background:#f59e0b;border:2.5px solid #ffffff;color:#0f172a;font-weight:800;font-size:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:move;';
      vEl.textContent = String(idx + 1);

      const m = new maplibregl.Marker({ element: vEl, draggable: true })
        .setLngLat([v.lon, v.lat])
        .addTo(map);

      m.on('dragend', () => {
        const pos = m.getLngLat();
        const curr = profileRef.current;
        const nextVerts = [...(curr.polygonVertices ?? [])];
        nextVerts[idx] = {
          lat: Number(pos.lat.toFixed(6)),
          lon: Number(pos.lng.toFixed(6)),
        };
        commitVerticesRef.current(nextVerts);
      });
      maplibreMarkersRef.current.push(m);
    });
  }, [build3DOverlayGeoJson, engineMode, mapLibreReady, originLat, originLon, vertices]);

  // Atualiza exagero 3D do relevo quando o usuário ajusta declividade ou slider
  useEffect(() => {
    const map = maplibreMapRef.current;
    if (!map || engineMode !== 'relief3d' || !mapLibreReady) return;
    try {
      map.setTerrain({ source: 'terrain-dem', exaggeration: terrainExag });
    } catch {
      // ignore if style reloading
    }
  }, [engineMode, mapLibreReady, terrainExag]);

  // Centraliza câmera 3D automaticamente ao alternar Ilhéus <-> Oeste
  useEffect(() => {
    const map = maplibreMapRef.current;
    if (!map || engineMode !== 'relief3d') return;
    if (lastRegion3DRef.current !== profile.id) {
      lastRegion3DRef.current = profile.id;
      map.flyTo({
        center: [originLon, originLat],
        zoom: 15.2,
        pitch: pitchDeg,
        bearing: bearingDeg,
        duration: 850,
      });
    }
  }, [bearingDeg, engineMode, originLat, originLon, pitchDeg, profile.id]);

  const recenterActiveMap = (lat: number, lon: number) => {
    if (engineMode === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lon], 16, { animate: true });
    }
    if (engineMode === 'relief3d' && maplibreMapRef.current) {
      maplibreMapRef.current.flyTo({
        center: [lon, lat],
        zoom: 15.2,
        pitch: pitchDeg,
        bearing: bearingDeg,
        duration: 750,
      });
    }
  };

  const handleUseBrowserGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Navegador sem acesso ao GPS.');
      return;
    }
    setGpsStatus('Buscando GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        setLatInput(String(lat));
        setLonInput(String(lon));
        onUpdateProfile({ ...profile, latitude: lat, longitude: lon });
        recenterActiveMap(lat, lon);
        setGpsStatus('Localização aplicada!');
      },
      () => setGpsStatus('Permita o GPS ou escolha sua cidade abaixo.')
    );
  };

  const handleApplyCoords = () => {
    const lat = Number(latInput);
    const lon = Number(lonInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return;
    }
    const cleanLat = Number(lat.toFixed(6));
    const cleanLon = Number(lon.toFixed(6));
    onUpdateProfile({ ...profile, latitude: cleanLat, longitude: cleanLon });
    recenterActiveMap(cleanLat, cleanLon);
  };

  const handleGenerateFromRadius = () => {
    const r = farmRadiusM;
    const offsets = [
      [-r * 0.78, r * 0.65],
      [r * 0.72, r * 0.74],
      [r * 0.85, -r * 0.45],
      [-r * 0.15, -r * 0.85],
      [-r * 0.82, -r * 0.35],
    ];
    const generated = offsets.map(([dx, dy]) => localMetersToLatLon(dx, dy, originLat, originLon));
    commitVertices(generated);
  };

  const handleApplyDelimitedArea = () => {
    if (geometry.areaHa <= 0.05) return;
    const newTotalHa = Number(geometry.areaHa.toFixed(2));
    const ratio = profile.totalAreaHa > 0 ? profile.cacaoAreaHa / profile.totalAreaHa : 0.7;
    const newCacaoHa = Number(Math.max(0.5, newTotalHa * ratio).toFixed(2));
    onUpdateProfile({
      ...profile,
      totalAreaHa: newTotalHa,
      cacaoAreaHa: newCacaoHa,
      estimatedPlants: Math.round(newCacaoHa * profile.plantingDensityPerHa),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3500);
  };

  const handleUpdateSlope = (nextSlope: number) => {
    const profileType =
      nextSlope <= 5 ? 'plano' : nextSlope <= 12 ? 'ondulado' : nextSlope <= 22 ? 'morro' : 'escarpado';
    onUpdateProfile({
      ...profile,
      terrainSlopePct: nextSlope,
      terrainProfileType: profileType,
    });
  };

  return (
    <div className="space-y-4">
      {/* Compact Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Mapa da Fazenda
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mapa 2D (Leaflet) e Relevo 3D WebGL em tempo real (MapLibre GL)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switch Engine: Leaflet 2D vs MapLibre 3D */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setEngineMode('leaflet')}
              className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                engineMode === 'leaflet'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Mapa 2D (Leaflet)
            </button>
            <button
              type="button"
              onClick={() => setEngineMode('relief3d')}
              className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                engineMode === 'relief3d'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              Relevo 3D (WebGL)
            </button>
          </div>

          {/* Seletor de Camada Base (funciona em ambos 2D e 3D WebGL!) */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLayerStyle('satellite')}
              className={`px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer ${
                layerStyle === 'satellite'
                  ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Satellite className="w-3.5 h-3.5" />
              Satélite
            </button>
            <button
              type="button"
              onClick={() => setLayerStyle('topo')}
              className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${
                layerStyle === 'topo'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Relevo
            </button>
          </div>

          <button
            type="button"
            onClick={() => setDrawingMode((v) => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
              drawingMode
                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-700'
            }`}
            title="Ative este botão para clicar no mapa e adicionar arestas/vértices do terreno"
          >
            <Pencil className="w-3.5 h-3.5" />
            {drawingMode ? 'Adicionar Arestas: ON' : 'Adicionar Arestas'}
          </button>
        </div>
      </div>

      {/* Main Split Grid: Map FIRST on Mobile, Controls Left on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Compact Left Control Column (4 cols) */}
        <div className="lg:col-span-4 order-2 lg:order-1 space-y-4">
          {/* Card 1: Localização */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
              <span>1. Onde fica a fazenda</span>
              <button
                type="button"
                onClick={() => setShowManualCoords((v) => !v)}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Crosshair className="w-3 h-3" />
                Coordenadas
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleUseBrowserGps}
                className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                Usar Meu GPS
              </button>

              <select
                value=""
                onChange={(e) => {
                  const found = BAHIA_PRESETS.find((p) => p.label === e.target.value);
                  if (!found) return;
                  setLatInput(String(found.lat));
                  setLonInput(String(found.lon));
                  onUpdateProfile({ ...profile, latitude: found.lat, longitude: found.lon });
                  recenterActiveMap(found.lat, found.lon);
                }}
                className="border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 bg-white dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-100"
              >
                <option value="">Escolher cidade...</option>
                {BAHIA_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {gpsStatus && <p className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">{gpsStatus}</p>}

            {showManualCoords && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2">
                <input
                  type="number"
                  step="0.0001"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1.5 font-mono text-slate-900 dark:text-white"
                  placeholder="Lat"
                />
                <input
                  type="number"
                  step="0.0001"
                  value={lonInput}
                  onChange={(e) => setLonInput(e.target.value)}
                  className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1.5 font-mono text-slate-900 dark:text-white"
                  placeholder="Lon"
                />
                <button
                  type="button"
                  onClick={handleApplyCoords}
                  className="bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-lg inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Navigation className="w-3 h-3" /> Ir
                </button>
              </div>
            )}
          </div>

          {/* Card 2: Área Marcada & Raio */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                2. Tamanho e Limites
              </span>
              <span className="font-mono font-bold text-sky-700 dark:text-sky-400">
                Raio {farmRadiusM} m
              </span>
            </div>

            <input
              type="range"
              min={100}
              max={1500}
              step={20}
              value={farmRadiusM}
              onChange={(e) => onUpdateProfile({ ...profile, farmRadiusM: Number(e.target.value) })}
              className="w-full accent-sky-600 cursor-pointer"
            />

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setDrawingMode((v) => !v)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  drawingMode
                    ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                {drawingMode ? 'Adicionar Arestas (Ativo — Clique no Mapa)' : '+ Adicionar Arestas no Mapa'}
              </button>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={!historyState.canUndo && vertices.length === 0}
                  title="Voltar último ponto/alteração (Ctrl+Z)"
                  className="py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 font-bold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Voltar
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={!historyState.canRedo}
                  title="Refazer (Ctrl+Y)"
                  className="py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 font-bold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Redo2 className="w-3.5 h-3.5" /> Refazer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (vertices.length > 0) commitVertices([]);
                  }}
                  disabled={vertices.length === 0}
                  className="py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 disabled:opacity-40 font-bold text-rose-700 dark:text-rose-300 inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Limpar
                </button>
                <button
                  type="button"
                  onClick={handleGenerateFromRadius}
                  className="py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100 font-bold text-sky-800 dark:text-sky-300 inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Auto
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Atalho: <strong className="text-slate-700 dark:text-slate-200">Ctrl+Z</strong> volta aresta •{' '}
                <strong className="text-slate-700 dark:text-slate-200">Ctrl+Y</strong> refaz.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  Área Marcada no Mapa
                </div>
                <div className="text-2xl font-black text-emerald-900 dark:text-white">
                  {geometry.areaHa.toFixed(2)} ha
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyDelimitedArea}
                disabled={geometry.areaHa <= 0.05}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Salvar Área
              </button>
            </div>

            {savedNotice && (
              <div className="text-center py-1.5 rounded-lg bg-emerald-600 text-white font-bold">
                Área salva na sua fazenda!
              </div>
            )}
          </div>

          {/* Card 3: Relevo e Chuva (Compacto) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Mountain className="w-4 h-4 text-emerald-600" />
                3. Terreno &amp; Chuva
              </span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {slopePct}% declive
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'Plano', val: 3 },
                { label: 'Leve', val: 10 },
                { label: 'Morro', val: 18 },
                { label: 'Forte', val: 28 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleUpdateSlope(p.val)}
                  className={`py-1.5 rounded-lg font-bold border text-[11px] transition-all cursor-pointer ${
                    Math.abs(slopePct - p.val) <= 3
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-700">
                <div
                  style={{ width: `${reliefRainImpact.infiltrationPct}%` }}
                  className="bg-emerald-500 h-full transition-all"
                />
                <div
                  style={{ width: `${reliefRainImpact.runoffPct}%` }}
                  className="bg-amber-500 h-full transition-all"
                />
              </div>
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-emerald-700 dark:text-emerald-400">
                  Solo absorve: {reliefRainImpact.infiltrationPct}%
                </span>
                <span className="text-amber-700 dark:text-amber-400">
                  Escorre: {reliefRainImpact.runoffPct}%
                </span>
              </div>
            </div>

            {onOpenSimulator && (
              <button
                type="button"
                onClick={onOpenSimulator}
                className="w-full py-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800 inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Ver Detalhes em Seca e Chuva</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Map Viewport (8 cols) */}
        <div className="lg:col-span-8 order-1 lg:order-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-700 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-600" /> Sede (Arraste)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400 border border-slate-400" /> Cantos ({vertices.length})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" /> {geometry.areaHa.toFixed(2)} ha
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDrawingMode((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg border font-bold inline-flex items-center gap-1 cursor-pointer transition-all ${
                    drawingMode
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-amber-50'
                  }`}
                >
                  <Pencil className="w-3 h-3" />
                  {drawingMode ? 'Arestas: ON' : '+ Adicionar Arestas'}
                </button>
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={!historyState.canUndo && vertices.length === 0}
                  title="Desfazer última aresta (Ctrl+Z)"
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Undo2 className="w-3 h-3" /> Voltar (Ctrl+Z)
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={!historyState.canRedo}
                  title="Refazer (Ctrl+Y)"
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  <Redo2 className="w-3 h-3" />
                </button>

                {engineMode === 'relief3d' ? (
                  <>
                    <ToggleSwitch
                      size="sm"
                      checked={showRunoffArrows}
                      onChange={setShowRunoffArrows}
                      activeColor="sky"
                      label="Setas da Chuva"
                    />
                    <button
                      type="button"
                      onClick={() => maplibreMapRef.current?.zoomIn()}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                      title="Zoom +"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => maplibreMapRef.current?.zoomOut()}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                      title="Zoom -"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => recenterActiveMap(originLat, originLon)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      Centralizar 3D
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => recenterActiveMap(originLat, originLon)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Centralizar na Sede
                  </button>
                )}
              </div>
            </div>

            {engineMode === 'leaflet' ? (
              <div className="relative h-[340px] sm:h-[440px] lg:h-[530px] mobile-map-box w-full">
                <div ref={leafletContainerRef} className="w-full h-full" />

                {tileOfflineWarning && (
                  <div className="pointer-events-none absolute top-3 right-3 z-[400] bg-amber-900/90 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold shadow">
                    Sem internet: você ainda pode marcar os pontos normalmente
                  </div>
                )}

                <div className="pointer-events-none absolute bottom-3 left-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 shadow-sm">
                  {drawingMode
                    ? 'Modo Arestas ATIVO: clique no mapa para marcar cantos • Ctrl+Z volta • Esc sai'
                    : 'Arraste para navegar no mapa • Clique em "Adicionar Arestas" para marcar cantos'}
                </div>
              </div>
            ) : (
              <div className="relative h-[360px] sm:h-[450px] lg:h-[540px] mobile-map-box w-full bg-slate-950">
                <div ref={maplibreContainerRef} className="w-full h-full" />

                {webglError && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 text-white gap-3">
                    <Box className="w-10 h-10 text-amber-400" />
                    <p className="text-sm font-bold max-w-md">{webglError}</p>
                    <button
                      type="button"
                      onClick={() => setEngineMode('leaflet')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Voltar para Mapa 2D (Leaflet)
                    </button>
                  </div>
                )}

                {/* Barra de controles 3D WebGL (Inclinação, Giro, Exagero do Relevo) */}
                <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs shadow-md">
                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                    <CloudRain className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>
                      Relevo WebGL ({elevationBounds.diffM} m desnível • {slopePct}%)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    <label className="flex items-center gap-1.5">
                      <span>Girar:</span>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={5}
                        value={bearingDeg}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setBearingDeg(v);
                          maplibreMapRef.current?.setBearing(v);
                        }}
                        className="w-20 accent-emerald-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center gap-1.5">
                      <span>Inclinar:</span>
                      <input
                        type="range"
                        min={0}
                        max={75}
                        step={3}
                        value={pitchDeg}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setPitchDeg(v);
                          maplibreMapRef.current?.setPitch(v);
                        }}
                        className="w-20 accent-sky-600 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center gap-1.5">
                      <span>Altura 3D:</span>
                      <input
                        type="range"
                        min={1}
                        max={3.8}
                        step={0.2}
                        value={terrainExag}
                        onChange={(e) => setTerrainExag(Number(e.target.value))}
                        className="w-16 accent-amber-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
