import React, { useState } from 'react';
import {
  HelpCircle,
  Sliders,
  Camera,
  CloudSun,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  BookOpen,
  Sparkles,
  Home,
  Compass,
} from 'lucide-react';
import { TourTabId } from './AppTourOverlay';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: TourTabId) => void;
  onOpenWizard: () => void;
  onStartTour: () => void;
}

interface TutorialStep {
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  colorClass: string;
  whatIsIt: string;
  stepsToFollow: string[];
  goldenTip: string;
  actionLabel: string;
  actionType: 'wizard' | 'tab';
  targetTab?: TourTabId;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Passo 1: Coloque os dados da sua fazenda',
    subtitle: 'Você faz isso uma única vez em menos de 2 minutos.',
    icon: UserPlus,
    colorClass: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    whatIsIt:
      'Antes de calcular quantos dias sua água dura, o sistema precisa saber o tamanho da sua roça de cacau e o tamanho do seu açude ou cisterna.',
    stepsToFollow: [
      'Clique no botão "+ Cadastrar Fazenda" lá no topo.',
      'Escolha sua região (Sul da Bahia/Cabruca ou Oeste/Pleno Sol).',
      'Digite quantos hectares de cacau você tem e o tamanho do seu reservatório.',
      'Ao finalizar, o Tour Interativo mostra onde fica cada função na tela!',
    ],
    goldenTip:
      'Não sabe o tamanho exato em hectares? No Passo 3 mostramos como medir desenhando direto no mapa!',
    actionLabel: 'Abrir Cadastro da Fazenda Agora',
    actionType: 'wizard',
  },
  {
    title: 'Passo 2: Olhe o Início todo dia',
    subtitle: 'Bata o olho na caixa d’água e veja o clima sem complicação.',
    icon: Home,
    colorClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    whatIsIt:
      'A tela inicial foi limpa para mostrar direto o que importa: quantos dias a água do seu açude aguenta e como está o tempo hoje.',
    stepsToFollow: [
      'Olhe a Caixa d’Água para saber em segundos quantos dias a lavoura aguenta sem chuva.',
      'Ligue o botão Switch no cartão do clima se quiser abrir a previsão por turnos (de 3 em 3 horas) e da semana inteira.',
      'Use os botões grandes de Ações Rápidas para pular direto para Mapa, Rega, Seca ou Foto da Folha.',
    ],
    goldenTip:
      'O sistema já desconta o lodo do fundo do açude para você não achar que tem mais água do que realmente existe!',
    actionLabel: 'Ir para o Início',
    actionType: 'tab',
    targetTab: 'overview',
  },
  {
    title: 'Passo 3: Marque sua roça no Mapa Leaflet e Relevo 3D',
    subtitle: 'Localize no satélite, desenhe os cantos e veja a chuva no morro.',
    icon: MapPin,
    colorClass: 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    whatIsIt:
      'No Mapa da Fazenda você enxerga sua propriedade no mapa real de satélite ou muda para a Vista 3D de Relevo.',
    stepsToFollow: [
      'Clique em "Usar GPS" ou escolha seu município na lista.',
      'Clique nos cantos da sua roça no mapa para desenhar a área (ou arraste os pontos numerados).',
      'Clique no botão verde "Salvar Área na Minha Fazenda" para atualizar seus hectares.',
    ],
    goldenTip:
      'Você pode ligar o modo "Relevo 3D" para enxergar o caimento do morro e para onde corre a enxurrada da chuva.',
    actionLabel: 'Abrir Mapa Agora',
    actionType: 'tab',
    targetTab: 'mapa',
  },
  {
    title: 'Passo 4: Ligue e controle sua Irrigação',
    subtitle: 'Ative as travas de proteção com botões switch e controle cada talhão.',
    icon: Sliders,
    colorClass: 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    whatIsIt:
      'Controla seus talhões de cacau, liga ou pausa válvulas e avisa na hora se algum gotejador entupiu ou se furou mangueira.',
    stepsToFollow: [
      'Escolha a fase do cacau (Mudas, Floração ou Frutos) para ajustar os litros por pé.',
      'Use os botões Switch no topo para ativar a Trava Anti-Vassoura e a Tarifa Verde Noturna (-38% energia).',
      'Clique em "Ligar Rega Agora" ou "Pausar Rega" em cada setor ou use "Dividir em 2" se quiser separar parte da área.',
    ],
    goldenTip:
      'No Sul da Bahia, a Trava Anti-Vassoura evita molhar quando o ar está muito úmido, protegendo contra o fungo.',
    actionLabel: 'Abrir Irrigação Agora',
    actionType: 'tab',
    targetTab: 'automation',
  },
  {
    title: 'Passo 5: Simule a Seca e a Chuva no Morro',
    subtitle: 'Teste 15, 30, 60 ou 90 dias sem chuva e calcule sua captação em telhados.',
    icon: CloudSun,
    colorClass: 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800',
    whatIsIt:
      'Dividido em duas telas limpas: uma para testar quantos dias sua água aguenta na seca e outra para calcular captação em telhados e infiltração na encosta.',
    stepsToFollow: [
      'Na aba "Teste de Seca", clique em 15, 30, 60 ou 90 dias e ligue os ajustes de economia.',
      'Na aba "Chuva & Relevo", informe o tamanho dos telhados das barcaças/galpões para ver quantos litros guarda em cada chuva.',
    ],
    goldenTip:
      'Um telhado de barcaça de 200 m² já junta cerca de 8.000 litros em uma chuva forte de 40 mm!',
    actionLabel: 'Abrir Seca e Chuva Agora',
    actionType: 'tab',
    targetTab: 'simulator',
  },
  {
    title: 'Passo 6: Tire Foto da Folha e Gere Crédito no Banco',
    subtitle: 'Identifique Vassoura-de-Bruxa na foto e imprima seu comprovante INEMA / BNB.',
    icon: Camera,
    colorClass: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    whatIsIt:
      'Na aba Saúde da Folha você envia uma foto do galho ou folha para contornar sinais de doença ou sede. Na aba Outorga e Crédito você comprova sua regularidade no INEMA.',
    stepsToFollow: [
      'Saúde da Folha: envie uma foto da galeria ou câmera; o sistema contorna onde há problema e diz se é Vassoura-de-Bruxa ou Falta de Água.',
      'Outorga e Crédito Rural: entenda em 3 passos como o gotejamento mantém o INEMA em dia e gere o PDF para o Banco do Nordeste (FNE Verde / Água).',
      'Plano de Seca: marque as ações de prevenção que você já fez na roça.',
    ],
    goldenTip:
      'O documento em PDF de Outorga & Crédito já calcula em quantas safras o kit de gotejamento se paga com a produção extra!',
    actionLabel: 'Abrir Saúde da Folha Agora',
    actionType: 'tab',
    targetTab: 'camera_ml',
  },
];

const SIMPLE_GLOSSARY = [
  {
    term: 'm³ (Metro Cúbico)',
    meaning: 'Equivale a 1.000 litros de água (uma caixa d’água padrão de mil litros).',
  },
  {
    term: 'Assoreamento (Lodo no Açude)',
    meaning: 'Terra e areia que descem com a chuva e ocupam espaço no fundo do açude, reduzindo a água útil real.',
  },
  {
    term: 'Vassoura-de-Bruxa',
    meaning: 'Fungo que ataca o cacau quando há muita umidade no ar e nas folhas. Por isso o gotejo molha só a raiz!',
  },
  {
    term: 'Cobertura Morta (Palhada)',
    meaning: 'Folhas secas e palhada espalhadas embaixo do pé de cacau para segurar a umidade no chão por muito mais tempo.',
  },
  {
    term: 'Outorga / Dispensa (INEMA)',
    meaning: 'Autorização do governo da Bahia para captar água de forma regular, evitar multas e conseguir juros baixos no banco.',
  },
  {
    term: 'FNE Verde / FNE Água',
    meaning: 'Linhas de financiamento do Banco do Nordeste com condições melhores para projetos sustentáveis e irrigação eficiente.',
  },
];

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenWizard,
  onStartTour,
}) => {
  const [mode, setMode] = useState<'steps' | 'glossary'>('steps');
  const [stepIdx, setStepIdx] = useState<number>(0);

  if (!isOpen) return null;

  const current = TUTORIAL_STEPS[stepIdx];
  const StepIcon = current.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Cabeçalho */}
        <div className="p-5 sm:p-6 bg-emerald-700 dark:bg-emerald-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              Guia do Produtor Rural
            </span>
            <h3 className="text-lg sm:text-xl font-black mt-0.5">
              Aprenda a usar o AgroCiclo em 6 passos simples
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            <div className="bg-emerald-800/80 dark:bg-slate-950/40 p-1 rounded-xl flex text-xs font-bold">
              <button
                type="button"
                onClick={() => setMode('steps')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  mode === 'steps'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                Passo a Passo
              </button>
              <button
                type="button"
                onClick={() => setMode('glossary')}
                className={`px-3 py-1.5 rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer ${
                  mode === 'glossary'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Dicionário Simples
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl cursor-pointer"
            >
              Fechar ✕
            </button>
          </div>
        </div>

        {/* Faixa de Destaque: Tour Guiado na Própria Tela */}
        <div className="px-5 sm:px-6 py-3 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-xs text-emerald-950 dark:text-emerald-200 font-semibold">
            Quer que o sistema aponte diretamente na tela onde clicar?
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartTour();
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            Iniciar Tour Guiado na Tela
          </button>
        </div>

        {mode === 'steps' ? (
          <div className="p-5 sm:p-6 space-y-5 max-h-[68vh] overflow-y-auto">
            {/* Barra de Passos Clicáveis */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Progresso do Guia</span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  Passo {stepIdx + 1} de {TUTORIAL_STEPS.length}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {TUTORIAL_STEPS.map((st, idx) => (
                  <button
                    key={st.title}
                    type="button"
                    onClick={() => setStepIdx(idx)}
                    className={`py-2 rounded-xl text-xs font-black border transition-all flex items-center justify-center cursor-pointer ${
                      idx === stepIdx
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : idx < stepIdx
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Cartão do Passo Atual */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5 space-y-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${current.colorClass}`}
                >
                  <StepIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    {current.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    {current.subtitle}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-100">Para que serve:</strong>{' '}
                {current.whatIsIt}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Como fazer na prática:
                </div>
                <div className="space-y-2">
                  {current.stepsToFollow.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Dica Rápida:</strong> {current.goldenTip}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (current.actionType === 'wizard') {
                    onOpenWizard();
                  } else if (current.targetTab) {
                    onNavigateTab(current.targetTab);
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span>{current.actionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-4 max-h-[68vh] overflow-y-auto">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 text-xs text-emerald-950 dark:text-emerald-200">
              Explicação direta dos termos usados no sistema, sem palavras difíceis:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SIMPLE_GLOSSARY.map((g) => (
                <div
                  key={g.term}
                  className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-1"
                >
                  <div className="font-bold text-sm text-emerald-900 dark:text-emerald-300">
                    {g.term}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {g.meaning}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          {mode === 'steps' ? (
            <>
              <button
                type="button"
                disabled={stepIdx === 0}
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-800 dark:text-slate-200 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Passo Anterior
              </button>

              {stepIdx < TUTORIAL_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStepIdx((i) => Math.min(TUTORIAL_STEPS.length - 1, i + 1))}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Próximo Passo ({stepIdx + 2}/{TUTORIAL_STEPS.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Entendi, Começar a Usar!
                </button>
              )}
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => setMode('steps')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                Voltar para o Passo a Passo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
