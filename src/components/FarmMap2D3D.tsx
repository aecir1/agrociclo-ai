import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Undo2,
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
  ZoomOut
} from 'lucide-react';
import { LatLonPoint, PropertyProfile } from '../types';
import {
  calculateFarmGeometry,
  calculateReliefRainImpact,
  getTerrainDownhillVector,
  getTerrainElevationM,
  localMetersToLatLon
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
  { label: 'Barreiras (Oeste)', lat: -12.1528, lon: -44.9901 }
];

type LeafletLayerStyle = 'satellite' | 'streets' | 'topo';
type MapEngineMode = 'leaflet' | 'relief3d';

const TILE_PROVIDERS: Record<LeafletLayerStyle, { url: string; attribution: string; maxZoom: number }> = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 18
  },
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    maxZoom: 19
  },
  topo: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri Topo',
    maxZoom: 18
  }
};

function latLonToLocalMeters(
  lat: number,
  lon: number,
  originLat: number,
  originLon: number
): { x: number; y: number } {
  const latScale = 111320;
  const lonScale = Math.max(1e-6, 111320 * Math.cos((originLat * Math.PI) / 180));
  return {
    x: (lon - originLon) * lonScale,
    y: (lat - originLat) * latScale
  };
}

export const FarmMap2D3D: React.FC<FarmMap2D3DProps> = ({
  profile,
  onUpdateProfile,
  onOpenSimulator
}) => {
  const originLat = profile.latitude ?? (profile.id === 'oeste' ? -11.7462 : -14.7565);
  const originLon = profile.longitude ?? (profile.id === 'oeste' ? -44.9102 : -39.2245);
  const farmRadiusM = profile.farmRadiusM ?? 360;
  const slopePct = profile.terrainSlopePct ?? (profile.id === 'oeste' ? 4 : 16);
  const vertices: LatLonPoint[] = profile.polygonVertices ?? [];

  const [engineMode, setEngineMode] = useState<MapEngineMode>('leaflet');
  const [layerStyle, setLayerStyle] = useState<LeafletLayerStyle>('satellite');
  const [drawingMode, setDrawingMode] = useState<boolean>(true);
  const [showRunoffArrows, setShowRunoffArrows] = useState<boolean>(true);
  const [showManualCoords, setShowManualCoords] = useState<boolean>(false);
  const [latInput, setLatInput] = useState<string>(String(originLat));
  const [lonInput, setLonInput] = useState<string>(String(originLon));
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const [tileOfflineWarning, setTileOfflineWarning] = useState<boolean>(false);

  // 3D canvas states
  const [bearingDeg, setBearingDeg] = useState<number>(-18);
  const [pixelsPerMeter, setPixelsPerMeter] = useState<number>(0.52);
  const [panOffsetM, setPanOffsetM] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs for Leaflet map & overlays
  const leafletContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);
  const lastRegionRef = useRef<string>(profile.id);

  // Refs for latest callback values inside Leaflet event handlers
  const profileRef = useRef<PropertyProfile>(profile);
  profileRef.current = profile;
  const drawingModeRef = useRef<boolean>(drawingMode);
  drawingModeRef.current = drawingMode;
  const onUpdateProfileRef = useRef(onUpdateProfile);
  onUpdateProfileRef.current = onUpdateProfile;

  // 3D Canvas refs
  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);
  const drag3DRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  }>({ active: false, startClientX: 0, startClientY: 0, startPanX: 0, startPanY: 0 });

  useEffect(() => {
    setLatInput(String(originLat));
    setLonInput(String(originLon));
  }, [originLat, originLon]);

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
        dailyDemandM3
      }),
    [dailyDemandM3, profile.cacaoAreaHa, profile.id, slopePct]
  );

  const elevationBounds = useMemo(() => {
    let minE = Infinity;
    let maxE = -Infinity;
    let maxPt = { x: 0, y: 0 };
    for (let x = -420; x <= 420; x += 70) {
      for (let y = -420; y <= 420; y += 70) {
        const e = getTerrainElevationM(x, y, slopePct, profile.id);
        if (e > maxE) {
          maxE = e;
          maxPt = { x, y };
        }
        if (e < minE) minE = e;
      }
    }
    return {
      minM: Math.round(minE),
      maxM: Math.round(maxE),
      diffM: Math.max(0, Math.round(maxE - minE)),
      maxPt
    };
  }, [profile.id, slopePct]);

  // =========================================================
  // 1. REAL LEAFLET MAP ENGINE
  // =========================================================
  useEffect(() => {
    if (engineMode !== 'leaflet') return;
    const container = leafletContainerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: [originLat, originLon],
      zoom: 16,
      zoomControl: true
    });

    const overlayGroup = L.layerGroup().addTo(map);
    leafletMapRef.current = map;
    overlayGroupRef.current = overlayGroup;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!drawingModeRef.current) return;
      const curr = profileRef.current;
      const nextPt: LatLonPoint = {
        lat: Number(e.latlng.lat.toFixed(6)),
        lon: Number(e.latlng.lng.toFixed(6))
      };
      onUpdateProfileRef.current({
        ...curr,
        polygonVertices: [...(curr.polygonVertices ?? []), nextPt]
      });
    });

    // Keep Leaflet viewport sized accurately on mobile orientation & phone preview transitions
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

  // Update Leaflet base tile layer cleanly
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || engineMode !== 'leaflet') return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    setTileOfflineWarning(false);
    let errCount = 0;
    const cfg = TILE_PROVIDERS[layerStyle];
    const layer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom
    });

    layer.on('tileerror', () => {
      errCount++;
      if (errCount >= 3) setTileOfflineWarning(true);
    });

    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [layerStyle, engineMode]);

  // Recenter Leaflet when switching region or explicitly updating coordinates far away
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || engineMode !== 'leaflet') return;
    if (lastRegionRef.current !== profile.id) {
      lastRegionRef.current = profile.id;
      map.setView([originLat, originLon], 16, { animate: true });
    }
  }, [profile.id, originLat, originLon, engineMode]);

  // Render Leaflet Polygon, Radius Circle, Sede Pin, and Draggable Corners
  useEffect(() => {
    const map = leafletMapRef.current;
    const group = overlayGroupRef.current;
    if (!map || !group || engineMode !== 'leaflet') return;

    group.clearLayers();

    // 1. Blue dashed radius circle
    L.circle([originLat, originLon], {
      radius: farmRadiusM,
      color: '#0284c7',
      weight: 2,
      dashArray: '6, 6',
      fillColor: '#0ea5e9',
      fillOpacity: 0.08,
      interactive: false
    }).addTo(group);

    // 2. Green delimited farm polygon
    if (vertices.length >= 2) {
      const latLngs = vertices.map((v) => [v.lat, v.lon] as [number, number]);
      if (vertices.length >= 3) {
        L.polygon(latLngs, {
          color: '#059669',
          weight: 3,
          fillColor: '#10b981',
          fillOpacity: 0.24,
          interactive: false
        }).addTo(group);
      } else {
        L.polyline(latLngs, {
          color: '#059669',
          weight: 3,
          interactive: false
        }).addTo(group);
      }
    }

    // 3. Draggable Corner Vertices (numbered badges)
    vertices.forEach((v, idx) => {
      const icon = L.divIcon({
        className: 'agrociclo-vertex-icon',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        html: `<div style="width:22px;height:22px;border-radius:9999px;background:#f59e0b;border:2.5px solid #ffffff;color:#0f172a;font-weight:800;font-size:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);cursor:move;">${
          idx + 1
        }</div>`
      });

      const marker = L.marker([v.lat, v.lon], {
        icon,
        draggable: true
      }).addTo(group);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const curr = profileRef.current;
        const nextVerts = [...(curr.polygonVertices ?? [])];
        nextVerts[idx] = {
          lat: Number(pos.lat.toFixed(6)),
          lon: Number(pos.lng.toFixed(6))
        };
        onUpdateProfileRef.current({ ...curr, polygonVertices: nextVerts });
      });
    });

    // 4. Draggable Sede Pin
    const sedeIcon = L.divIcon({
      className: 'agrociclo-sede-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      html: `<div style="width:30px;height:30px;border-radius:9999px;background:#e11d48;border:3px solid #ffffff;color:#ffffff;font-weight:900;font-size:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.45);cursor:grab;">S</div>`
    });

    const sedeMarker = L.marker([originLat, originLon], {
      icon: sedeIcon,
      draggable: true
    })
      .bindTooltip('Sede da Fazenda (Arraste para mover)', { direction: 'top', offset: [0, -14] })
      .addTo(group);

    sedeMarker.on('dragend', () => {
      const pos = sedeMarker.getLatLng();
      const curr = profileRef.current;
      onUpdateProfileRef.current({
        ...curr,
        latitude: Number(pos.lat.toFixed(6)),
        longitude: Number(pos.lng.toFixed(6))
      });
    });
  }, [originLat, originLon, farmRadiusM, vertices, engineMode]);

  // =========================================================
  // 2. POLISHED 3D RELIEF & RAIN FLOW ENGINE
  // =========================================================
  const project3D = useCallback(
    (mx: number, my: number, zMeters: number, width: number, height: number) => {
      const cx = width / 2;
      const cy = height / 2 + 30;
      const dx = mx - panOffsetM.x;
      const dy = my - panOffsetM.y;
      const rad = bearingDeg * (Math.PI / 180);
      const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
      return {
        sx: cx + rx * pixelsPerMeter,
        sy: cy - ry * pixelsPerMeter * 0.56 - zMeters * pixelsPerMeter * 1.55,
        ryRot: ry
      };
    },
    [bearingDeg, panOffsetM.x, panOffsetM.y, pixelsPerMeter]
  );

  const draw3D = useCallback(() => {
    const canvas = canvas3DRef.current;
    if (!canvas || engineMode !== 'relief3d') return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Soft sky + ground gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#dbeafe');
    sky.addColorStop(0.35, '#ecfdf5');
    sky.addColorStop(1, '#dcfce7');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // 3D Terrain mesh
    const span = 640;
    const step = 64;
    const maxAlt = Math.max(10, elevationBounds.maxM);
    const quads: Array<{
      pts: Array<{ sx: number; sy: number }>;
      depth: number;
      fill: string;
      stroke: string;
    }> = [];

    for (let x = -span; x < span; x += step) {
      for (let y = -span; y < span; y += step) {
        const z00 = getTerrainElevationM(x, y, slopePct, profile.id);
        const z10 = getTerrainElevationM(x + step, y, slopePct, profile.id);
        const z11 = getTerrainElevationM(x + step, y + step, slopePct, profile.id);
        const z01 = getTerrainElevationM(x, y + step, slopePct, profile.id);

        const p00 = project3D(x, y, z00, w, h);
        const p10 = project3D(x + step, y, z10, w, h);
        const p11 = project3D(x + step, y + step, z11, w, h);
        const p01 = project3D(x, y + step, z01, w, h);

        const avgZ = (z00 + z10 + z11 + z01) / 4;
        const normH = Math.min(1, Math.max(0, avgZ / maxAlt));
        const dzdx = (z10 - z00 + z11 - z01) / (2 * step);
        const dzdy = (z01 - z00 + z11 - z10) / (2 * step);
        const shade = Math.max(-0.35, Math.min(0.35, (-dzdx * 0.7 + dzdy * 0.7) * 1.4));

        const baseR = profile.id === 'oeste' ? 218 : 138;
        const baseG = profile.id === 'oeste' ? 215 : 210;
        const baseB = profile.id === 'oeste' ? 145 : 146;
        const r = Math.round(Math.min(248, Math.max(75, baseR + normH * 56 + shade * 60)));
        const g = Math.round(Math.min(245, Math.max(115, baseG + normH * 22 + shade * 55)));
        const b = Math.round(Math.min(205, Math.max(70, baseB - normH * 24 + shade * 35)));

        quads.push({
          pts: [p00, p10, p11, p01],
          depth: (p00.ryRot + p10.ryRot + p11.ryRot + p01.ryRot) / 4,
          fill: `rgb(${r}, ${g}, ${b})`,
          stroke: 'rgba(20, 83, 45, 0.14)'
        });
      }
    }

    quads.sort((a, b) => b.depth - a.depth);
    for (const q of quads) {
      ctx.beginPath();
      ctx.moveTo(q.pts[0].sx, q.pts[0].sy);
      ctx.lineTo(q.pts[1].sx, q.pts[1].sy);
      ctx.lineTo(q.pts[2].sx, q.pts[2].sy);
      ctx.lineTo(q.pts[3].sx, q.pts[3].sy);
      ctx.closePath();
      ctx.fillStyle = q.fill;
      ctx.fill();
      ctx.strokeStyle = q.stroke;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    // Blue water flow arrows downhill
    if (showRunoffArrows && slopePct >= 2) {
      for (let ax = -360; ax <= 360; ax += 180) {
        for (let ay = -300; ay <= 300; ay += 150) {
          const vec = getTerrainDownhillVector(ax, ay, slopePct, profile.id);
          const tailZ = getTerrainElevationM(ax, ay, slopePct, profile.id) + 1.5;
          const headX = ax + vec.dx * 50;
          const headY = ay + vec.dy * 50;
          const headZ = getTerrainElevationM(headX, headY, slopePct, profile.id) + 1.5;

          const p1 = project3D(ax, ay, tailZ, w, h);
          const p2 = project3D(headX, headY, headZ, w, h);

          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.strokeStyle = 'rgba(2, 132, 199, 0.8)';
          ctx.lineWidth = 2.4;
          ctx.stroke();

          const ang = Math.atan2(p2.sy - p1.sy, p2.sx - p1.sx);
          ctx.beginPath();
          ctx.moveTo(p2.sx, p2.sy);
          ctx.lineTo(p2.sx - Math.cos(ang - 0.55) * 7, p2.sy - Math.sin(ang - 0.55) * 7);
          ctx.lineTo(p2.sx - Math.cos(ang + 0.55) * 7, p2.sy - Math.sin(ang + 0.55) * 7);
          ctx.closePath();
          ctx.fillStyle = '#0284c7';
          ctx.fill();
        }
      }
    }

    // Farm Polygon Fence in 3D
    const polyLocal = vertices.map((v) => latLonToLocalMeters(v.lat, v.lon, originLat, originLon));
    if (polyLocal.length >= 3) {
      const groundPts = polyLocal.map((p) =>
        project3D(p.x, p.y, getTerrainElevationM(p.x, p.y, slopePct, profile.id) + 0.8, w, h)
      );
      const topPts = polyLocal.map((p) =>
        project3D(p.x, p.y, getTerrainElevationM(p.x, p.y, slopePct, profile.id) + 10, w, h)
      );

      for (let i = 0; i < groundPts.length; i++) {
        const next = (i + 1) % groundPts.length;
        ctx.beginPath();
        ctx.moveTo(groundPts[i].sx, groundPts[i].sy);
        ctx.lineTo(groundPts[next].sx, groundPts[next].sy);
        ctx.lineTo(topPts[next].sx, topPts[next].sy);
        ctx.lineTo(topPts[i].sx, topPts[i].sy);
        ctx.closePath();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#047857';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    // High point altitude tag
    const highP = project3D(
      elevationBounds.maxPt.x,
      elevationBounds.maxPt.y,
      getTerrainElevationM(elevationBounds.maxPt.x, elevationBounds.maxPt.y, slopePct, profile.id) + 5,
      w,
      h
    );
    ctx.fillStyle = 'rgba(120, 53, 15, 0.9)';
    ctx.fillRect(highP.sx - 42, highP.sy - 16, 84, 18);
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Topo +${elevationBounds.maxM}m`, highP.sx, highP.sy - 4);

    // Sede Marker in 3D
    const sz = getTerrainElevationM(0, 0, slopePct, profile.id);
    const sg = project3D(0, 0, sz, w, h);
    const st = project3D(0, 0, sz + 11, w, h);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(sg.sx - 10, st.sy, 20, sg.sy - st.sy + 3);
    ctx.beginPath();
    ctx.moveTo(sg.sx - 14, st.sy);
    ctx.lineTo(sg.sx, st.sy - 10);
    ctx.lineTo(sg.sx + 14, st.sy);
    ctx.closePath();
    ctx.fillStyle = '#dc2626';
    ctx.fill();

    ctx.restore();
  }, [engineMode, elevationBounds, originLat, originLon, profile.id, project3D, showRunoffArrows, slopePct, vertices]);

  useEffect(() => {
    draw3D();
    window.addEventListener('resize', draw3D);
    return () => window.removeEventListener('resize', draw3D);
  }, [draw3D]);

  const recenterLeaflet = (lat: number, lon: number) => {
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lon], 16, { animate: true });
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
        recenterLeaflet(lat, lon);
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
    recenterLeaflet(cleanLat, cleanLon);
  };

  const handleGenerateFromRadius = () => {
    const r = farmRadiusM;
    const offsets = [
      [-r * 0.78, r * 0.65],
      [r * 0.72, r * 0.74],
      [r * 0.85, -r * 0.45],
      [-r * 0.15, -r * 0.85],
      [-r * 0.82, -r * 0.35]
    ];
    const generated = offsets.map(([dx, dy]) => localMetersToLatLon(dx, dy, originLat, originLon));
    onUpdateProfile({ ...profile, polygonVertices: generated });
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
      estimatedPlants: Math.round(newCacaoHa * profile.plantingDensityPerHa)
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
      terrainProfileType: profileType
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
              Marque os cantos da sua roça no mapa real (Leaflet) ou veja o relevo 3D
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switch Engine: Leaflet vs 3D Relief */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setEngineMode('leaflet')}
              className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all ${
                engineMode === 'leaflet'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Mapa Real (Leaflet)
            </button>
            <button
              type="button"
              onClick={() => setEngineMode('relief3d')}
              className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all ${
                engineMode === 'relief3d'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              Relevo 3D
            </button>
          </div>

          {engineMode === 'leaflet' && (
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLayerStyle('satellite')}
                className={`px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 ${
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
                onClick={() => setLayerStyle('streets')}
                className={`px-2.5 py-1.5 rounded-lg ${
                  layerStyle === 'streets'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Ruas
              </button>
              <button
                type="button"
                onClick={() => setLayerStyle('topo')}
                className={`px-2.5 py-1.5 rounded-lg ${
                  layerStyle === 'topo'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Relevo
              </button>
            </div>
          )}

          {engineMode === 'leaflet' && (
            <button
              type="button"
              onClick={() => setDrawingMode((v) => !v)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-all ${
                drawingMode
                  ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              {drawingMode ? 'Clicar p/ Marcar Cantos: ON' : 'Marcar Cantos: OFF'}
            </button>
          )}
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
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                <Crosshair className="w-3 h-3" />
                Coordenadas
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleUseBrowserGps}
                className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold inline-flex items-center justify-center gap-1.5 shadow-sm"
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
                  recenterLeaflet(found.lat, found.lon);
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
                  className="bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-lg inline-flex items-center justify-center gap-1"
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

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onUpdateProfile({ ...profile, polygonVertices: vertices.slice(0, -1) })}
                disabled={vertices.length === 0}
                className="py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 font-bold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1"
              >
                <Undo2 className="w-3.5 h-3.5" /> Desfazer
              </button>
              <button
                type="button"
                onClick={() => onUpdateProfile({ ...profile, polygonVertices: [] })}
                disabled={vertices.length === 0}
                className="py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 disabled:opacity-40 font-bold text-rose-700 dark:text-rose-300 inline-flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar
              </button>
              <button
                type="button"
                onClick={handleGenerateFromRadius}
                className="py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100 font-bold text-sky-800 dark:text-sky-300 inline-flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Auto
              </button>
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
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold inline-flex items-center gap-1.5 shadow-sm"
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
                { label: 'Forte', val: 28 }
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleUpdateSlope(p.val)}
                  className={`py-1.5 rounded-lg font-bold border text-[11px] transition-all ${
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
                className="w-full py-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800 inline-flex items-center justify-center gap-1"
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

              {engineMode === 'relief3d' ? (
                <div className="flex items-center gap-2">
                  <ToggleSwitch
                    size="sm"
                    checked={showRunoffArrows}
                    onChange={setShowRunoffArrows}
                    activeColor="sky"
                    label="Setas da Chuva"
                  />
                  <button
                    type="button"
                    onClick={() => setPixelsPerMeter((z) => Math.min(1.6, z * 1.15))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    title="Zoom +"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPixelsPerMeter((z) => Math.max(0.22, z / 1.15))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    title="Zoom -"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => recenterLeaflet(originLat, originLon)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100"
                >
                  Centralizar na Sede
                </button>
              )}
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
                    ? 'Clique no mapa para marcar novos cantos • Arraste as bolinhas amarelas para ajustar'
                    : 'Arraste para mover o mapa • Ative "Clicar p/ Marcar Cantos" para desenhar a área'}
                </div>
              </div>
            ) : (
              <div className="relative h-[340px] sm:h-[440px] lg:h-[530px] mobile-map-box w-full">
                <canvas
                  ref={canvas3DRef}
                  onPointerDown={(e) => {
                    drag3DRef.current = {
                      active: true,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      startPanX: panOffsetM.x,
                      startPanY: panOffsetM.y
                    };
                  }}
                  onPointerMove={(e) => {
                    if (!drag3DRef.current.active) return;
                    const dx = e.clientX - drag3DRef.current.startClientX;
                    const dy = e.clientY - drag3DRef.current.startClientY;
                    const rad = -bearingDeg * (Math.PI / 180);
                    const mx = -dx / pixelsPerMeter;
                    const my = (dy * 1.55) / pixelsPerMeter;
                    setPanOffsetM({
                      x: drag3DRef.current.startPanX + mx * Math.cos(rad) - my * Math.sin(rad),
                      y: drag3DRef.current.startPanY + mx * Math.sin(rad) + my * Math.cos(rad)
                    });
                  }}
                  onPointerUp={() => {
                    drag3DRef.current.active = false;
                  }}
                  onPointerCancel={() => {
                    drag3DRef.current.active = false;
                  }}
                  className="w-full h-full block touch-none cursor-grab active:cursor-grabbing"
                />

                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                    <CloudRain className="w-4 h-4 text-sky-600" />
                    <span>
                      Desnível de {elevationBounds.diffM} m ({slopePct}%) • Setas mostram para onde a chuva desce
                    </span>
                  </div>
                  <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                    <span>Girar 3D:</span>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={5}
                      value={bearingDeg}
                      onChange={(e) => setBearingDeg(Number(e.target.value))}
                      className="w-28 accent-emerald-600"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
