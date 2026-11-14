import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, X } from 'lucide-react';

export type TourTabId =
  | 'overview'
  | 'mapa'
  | 'automation'
  | 'simulator'
  | 'camera_ml'
  | 'regulation'
  | 'emergency';

export interface TourStep {
  id: string;
  tab: TourTabId;
  target: string;
  badge: string;
  title: string;
  description: string;
  tip: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'region',
    tab: 'overview',
    target: 'sidebar-region',
    badge: 'Passo 1 de 6',
    title: 'Escolha Sua Região',
    description:
      'Aqui você troca entre Sul da Bahia (Ilhéus) e Oeste Baiano, ou vê sua fazenda recém-cadastrada. Tudo no sistema muda junto com o clima da sua região.',
    tip: 'Se você acabou de cadastrar sua fazenda, seus dados já estão ativos aqui.',
  },
  {
    id: 'water-tank',
    tab: 'overview',
    target: 'home-water-tank',
    badge: 'Passo 2 de 6',
    title: 'Bata o Olho: Quantos Dias Sua Água Dura',
    description:
      'Sem gráficos difíceis! Esta caixa d’água mostra na hora quantos dias você aguenta no gotejamento e quantos dias extras ganha frente à rega comum.',
    tip: 'Laranja ou vermelho avisa que é hora de reduzir gasto ou usar chuva de telhado.',
  },
  {
    id: 'weather-switch',
    tab: 'overview',
    target: 'home-weather-switch',
    badge: 'Passo 3 de 6',
    title: 'Clima Agora + Botão da Previsão',
    description:
      'Aqui você vê o calor e o risco de Vassoura-de-Bruxa hoje. Ligue o botão "Ver Previsão" para abrir os turnos de 3 horas e a semana inteira sem ficar rolando a página.',
    tip: 'Mostramos em blocos grandes (ex: 06:00 às 09:00) já dizendo quando o sistema rega.',
  },
  {
    id: 'map',
    tab: 'mapa',
    target: 'map-panel',
    badge: 'Passo 4 de 6',
    title: 'Mapa de Satélite e Relevo 3D',
    description:
      'Veja sua fazenda no mapa real de satélite (Leaflet), arraste os cantos da cerca ou clique em "Relevo 3D" para enxergar para onde a chuva escorre no morro.',
    tip: 'Quanto mais inclinado o morro, mais água corre morro abaixo em enxurrada.',
  },
  {
    id: 'automation',
    tab: 'automation',
    target: 'automation-panel',
    badge: 'Passo 5 de 6',
    title: 'Ligar / Desligar Regras e Talhões',
    description:
      'Ligue os botões switch de proteção (como Trava Anti-Vassoura e Tarifa Verde Noturna) e abra, feche ou divida seus talhões com um clique.',
    tip: 'Se faltar chuva ou subir a pressão do cano, o sistema avisa qual talhão checar.',
  },
  {
    id: 'regulation',
    tab: 'regulation',
    target: 'regulation-panel',
    badge: 'Passo 6 de 6',
    title: 'Outorga INEMA e Crédito no Banco do Nordeste',
    description:
      'Com água medida no gotejamento e abaixo do limite do INEMA, você gera o Comprovante PDF pronto para buscar crédito FNE Verde / FNE Água no banco.',
    tip: 'Tudo pronto! Você pode refazer este tour quando quiser no botão "Como Usar".',
  },
];

interface AppTourOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: TourTabId) => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const AppTourOverlay: React.FC<AppTourOverlayProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  const overlayRootRef = useRef<HTMLDivElement | null>(null);

  const currentStep = TOUR_STEPS[stepIdx];

  const findVisibleTarget = useCallback((target: string): HTMLElement | null => {
    const candidates = Array.from(
      document.querySelectorAll(`[data-tour="${target}"]`)
    ) as HTMLElement[];
    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.right > 4 && r.left < window.innerWidth - 4) {
        return el;
      }
    }
    return candidates[0] || null;
  }, []);

  const measureTarget = useCallback(() => {
    if (!isOpen || !currentStep) return;
    const el = findVisibleTarget(currentStep.target);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const rootRect = overlayRootRef.current?.getBoundingClientRect() ?? {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
    setContainerHeight(rootRect.height);

    const relTop = r.top - rootRect.top;
    const relLeft = r.left - rootRect.left;
    setRect({
      top: Math.max(8, relTop - 6),
      left: Math.max(8, relLeft - 6),
      width: Math.min(rootRect.width - 16, r.width + 12),
      height: r.height + 12,
    });
  }, [isOpen, currentStep, findVisibleTarget]);

  useEffect(() => {
    if (!isOpen) {
      setStepIdx(0);
      setRect(null);
      return;
    }
    onNavigateTab(currentStep.tab);

    const scrollTimer = window.setTimeout(() => {
      const el = findVisibleTarget(currentStep.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      measureTarget();
    }, 60);

    const measureTimer = window.setTimeout(measureTarget, 320);
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(measureTimer);
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [isOpen, currentStep, onNavigateTab, measureTarget, findVisibleTarget]);

  if (!isOpen || !currentStep) return null;

  const isFirst = stepIdx === 0;
  const isLast = stepIdx === TOUR_STEPS.length - 1;

  // Decide se o cartão flutuante fica embaixo ou no topo para nunca tampar o alvo
  const placeCardAtTop = rect ? rect.top > containerHeight * 0.52 : false;

  return (
    <div ref={overlayRootRef} className="fixed inset-0 z-[100] pointer-events-none">
      {/* Holofote ao redor do componente destacado */}
      {rect ? (
        <div
          className="fixed rounded-2xl border-2 border-emerald-400 tour-spotlight transition-all duration-300 pointer-events-none"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.65)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-[1px]" />
      )}

      {/* Cartão Flutuante Interativo */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 ${
          placeCardAtTop ? 'top-4 sm:top-6' : 'bottom-20 lg:bottom-6'
        } w-[calc(100%-20px)] max-w-lg pointer-events-auto`}
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-500 shadow-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                <Compass className="w-5 h-5" />
              </span>
              <div>
                <span className="inline-block text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {currentStep.badge}
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1 leading-tight">
                  {currentStep.title}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar tour"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {currentStep.description}
          </p>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 font-medium">
            💡 <strong>Dica:</strong> {currentStep.tip}
          </div>

          {/* Barra de progresso e botões */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Ir para passo ${idx + 1}`}
                  onClick={() => setStepIdx(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === stepIdx
                      ? 'w-6 bg-emerald-600'
                      : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar
                </button>
              )}

              {!isLast ? (
                <button
                  type="button"
                  onClick={() => setStepIdx((i) => Math.min(TOUR_STEPS.length - 1, i + 1))}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Próximo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Concluir Tour!
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
