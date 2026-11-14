import React, { useState } from 'react';
import {
  HelpCircle,
  Droplets,
  Sliders,
  Camera,
  CloudSun,
  Scale,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  BookOpen,
  Sparkles,
  Home
} from 'lucide-react';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: any) => void;
  onOpenWizard: () => void;
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
  targetTab?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Passo 1: Coloque os dados da sua fazenda',
    subtitle: 'Você faz isso uma única vez em menos de 2 minutos.',
    icon: UserPlus,
    colorClass: 'bg-amber-100 text-amber-800 border-amber-300',
    whatIsIt:
      'Antes de calcular quantos dias sua água dura, o sistema precisa saber o tamanho da sua roça de cacau e o tamanho do seu açude ou cisterna.',
    stepsToFollow: [
      'Clique no botão amarelo "+ Cadastrar Fazenda" lá no topo.',
      'Escolha sua região (Sul da Bahia/Cabruca ou Oeste/Pleno Sol).',
      'Digite quantos hectares de cacau você tem e o tamanho do seu reservatório.',
      'Pronto! Todas as contas de água e seca passam a valer para a sua fazenda.'
    ],
    goldenTip: 'Não sabe a medida exata da roça? No Passo 3 deste guia mostramos como medir pelo Mapa!',
    actionLabel: 'Abrir Cadastro da Fazenda Agora',
    actionType: 'wizard'
  },
  {
    title: 'Passo 2: Olhe o Início (Tela Principal) todo dia',
    subtitle: 'Tudo o que importa em 3 cartões fáceis de entender.',
    icon: Home,
    colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    whatIsIt:
      'A tela inicial foi limpa para não te confundir. Você vê só o essencial do dia: quanta água real tem no açude, como está o tempo hoje e se alguma mangueira precisa de atenção.',
    stepsToFollow: [
      'Use os 4 botões grandes no topo ("Ações Rápidas") para ir direto ao que você usa mais.',
      'Confira o cartão "Água Guardada" para saber quantos dias sua reserva aguenta sem chuva.',
      'Se quiser ver gráficos detalhados ou dados técnicos de agronomia, clique em "Ver informações extras" lá embaixo.'
    ],
    goldenTip: 'O sistema já desconta a lama/lodo do fundo do açude para você não ser enganado achando que tem mais água!',
    actionLabel: 'Ir para o Início',
    actionType: 'tab',
    targetTab: 'overview'
  },
  {
    title: 'Passo 3: Marque sua roça no Mapa 2D / 3D',
    subtitle: 'Localize pelo GPS, ajuste o raio e meça os hectares com o dedo ou mouse.',
    icon: MapPin,
    colorClass: 'bg-sky-100 text-sky-800 border-sky-300',
    whatIsIt:
      'No Mapa da Fazenda você enxerga sua propriedade de cima (2D) ou inclinada (3D), mesmo sem internet.',
    stepsToFollow: [
      'Clique em "Usar Minha Localização (GPS)" ou escolha sua cidade da Bahia.',
      'Ajuste a barra do "Raio da Fazenda" até cobrir sua área.',
      'Clique nos cantos da sua roça no mapa para desenhar a cerca (ou arraste as bolinhas amarelas).',
      'Clique no botão verde "Salvar Área na Minha Fazenda" para atualizar seus hectares automaticamente.'
    ],
    goldenTip: 'Você pode trocar entre "Mapa Limpo" (funciona 100% offline) e "Satélite" quando tiver boa conexão.',
    actionLabel: 'Abrir Mapa 2D / 3D Agora',
    actionType: 'tab',
    targetTab: 'mapa'
  },
  {
    title: 'Passo 4: Controle a Irrigação e evite entupimento',
    subtitle: 'Ligue ou pause a água de cada talhão e proteja contra Vassoura-de-Bruxa.',
    icon: Sliders,
    colorClass: 'bg-teal-100 text-teal-800 border-teal-300',
    whatIsIt:
      'Mostra cada setor (talhão) de cacau e avisa na hora se a pressão subiu por gotejador entupido ou caiu por mangueira furada.',
    stepsToFollow: [
      'Escolha a fase do cacau (Mudas, Floração ou Frutos) — a água ideal muda em cada fase.',
      'Clique em "Abrir / Fechar Válvula" para ligar ou desligar a rega daquele setor.',
      'Deixe a "Trava Anti-Vassoura" ligada se estiver no Sul da Bahia: ela evita regar quando o ar já está úmido demais (>85%).'
    ],
    goldenTip: 'Ligar a Tarifa Verde noturna programa a bomba para rodar depois das 21h30, economizando até 38% na conta de luz.',
    actionLabel: 'Abrir Irrigação Agora',
    actionType: 'tab',
    targetTab: 'automation'
  },
  {
    title: 'Passo 5: Simule a Seca e calcule a Água da Chuva',
    subtitle: 'Descubra antes da estiagem se sua água vai dar conta.',
    icon: CloudSun,
    colorClass: 'bg-orange-100 text-orange-800 border-orange-300',
    whatIsIt:
      'Aqui você testa cenários de 15, 30, 60 ou 90 dias sem chuva e calcula quantos litros de chuva você consegue guardar usando os telhados das barcaças e galpões.',
    stepsToFollow: [
      'Escolha quantos dias sem chuva quer testar (ex: 30 ou 60 dias).',
      'Veja no gráfico quanto tempo a água dura com gotejamento e cobertura morta.',
      'Logo abaixo, digite quantos m² de telhado você tem para saber quantos litros cada chuva enche na cisterna.'
    ],
    goldenTip: 'Um telhado simples de barcaça de 200 m² já capta 8.000 litros em uma única chuva boa de 40 mm!',
    actionLabel: 'Abrir Seca e Chuva Agora',
    actionType: 'tab',
    targetTab: 'simulator'
  },
  {
    title: 'Passo 6: Tire Foto da Folha, Chat IA e Crédito Rural',
    subtitle: 'Ferramentas extras sempre à mão quando precisar.',
    icon: Camera,
    colorClass: 'bg-purple-100 text-purple-800 border-purple-300',
    whatIsIt:
      'Quando ficar na dúvida se o pé de cacau está com sede ou fungo, ou precisar falar com o banco/INEMA, você encontra tudo no menu lateral em "Ferramentas Extras".',
    stepsToFollow: [
      'Foto da Folha (Câmera IA): envie uma foto da folha/fruto para checar estresse hídrico ou Vassoura-de-Bruxa.',
      'Emergência & Chat IA: siga a lista do que fazer antes/durante/depois da seca e pergunte em linguagem simples ao AgroAssist.',
      'Outorga e Crédito Rural: confira se está dentro do limite do INEMA e gere o relatório para financiamento (FNE Verde/Água).'
    ],
    goldenTip: 'O AgroAssist responde perguntas diretas como "Minha água dura 45 dias?" usando os números reais da sua fazenda!',
    actionLabel: 'Abrir Perguntas IA e Emergência',
    actionType: 'tab',
    targetTab: 'property_ai'
  }
];

const SIMPLE_GLOSSARY = [
  {
    term: 'm³ (Metro Cúbico)',
    meaning: 'Equivale a 1.000 litros de água (uma caixa d’água padrão de mil litros).'
  },
  {
    term: 'Assoreamento (Lodo no Açude)',
    meaning: 'Terra e areia que descem com a chuva e ocupam espaço no fundo do açude, reduzindo a água útil real.'
  },
  {
    term: 'Vassoura-de-Bruxa',
    meaning: 'Fungo que ataca o cacau quando há muita umidade no ar e nas folhas. Por isso o gotejo molha só a raiz!'
  },
  {
    term: 'Cobertura Morta (Mulching)',
    meaning: 'Folhas secas e palhada espalhadas embaixo do pé de cacau para segurar a umidade no chão por muito mais tempo.'
  },
  {
    term: 'Outorga / Dispensa (INEMA)',
    meaning: 'Autorização do governo da Bahia para captar água do rio ou açude de forma regular e conseguir crédito no banco.'
  },
  {
    term: 'Cabruca',
    meaning: 'Sistema tradicional da Bahia onde o cacau cresce protegido na sombra das árvores nativas da Mata Atlântica.'
  }
];

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenWizard
}) => {
  const [mode, setMode] = useState<'steps' | 'glossary'>('steps');
  const [stepIdx, setStepIdx] = useState<number>(0);

  if (!isOpen) return null;

  const current = TUTORIAL_STEPS[stepIdx];
  const StepIcon = current.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Cabeçalho Limpo */}
        <div className="p-5 sm:p-6 bg-emerald-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              Tutorial Fácil do Produtor
            </span>
            <h3 className="text-lg sm:text-xl font-black mt-0.5">
              Aprenda a usar o AgroCiclo AI em 6 passos simples
            </h3>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="bg-emerald-800/80 p-1 rounded-xl flex text-xs font-bold">
              <button
                type="button"
                onClick={() => setMode('steps')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  mode === 'steps' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-100 hover:text-white'
                }`}
              >
                Passo a Passo
              </button>
              <button
                type="button"
                onClick={() => setMode('glossary')}
                className={`px-3 py-1.5 rounded-lg transition-all inline-flex items-center gap-1 ${
                  mode === 'glossary' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-100 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Dicionário Simples
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl"
            >
              Fechar ✕
            </button>
          </div>
        </div>

        {mode === 'steps' ? (
          <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Barra de Passos Clicáveis */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Progresso do Guia</span>
                <span className="text-emerald-700">Passo {stepIdx + 1} de {TUTORIAL_STEPS.length}</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {TUTORIAL_STEPS.map((st, idx) => (
                  <button
                    key={st.title}
                    type="button"
                    onClick={() => setStepIdx(idx)}
                    className={`py-2 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1 ${
                      idx === stepIdx
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : idx < stepIdx
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{idx + 1}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cartão do Passo Atual */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${current.colorClass}`}>
                  <StepIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-slate-900">{current.title}</h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{current.subtitle}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Para que serve:</strong> {current.whatIsIt}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Como fazer na prática:
                </div>
                <div className="space-y-2">
                  {current.stepsToFollow.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
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
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>{current.actionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950">
              Explicação direta dos termos usados no sistema, sem palavras difíceis:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SIMPLE_GLOSSARY.map((g) => (
                <div key={g.term} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                  <div className="font-bold text-sm text-emerald-900">{g.term}</div>
                  <p className="text-xs text-slate-700 leading-relaxed">{g.meaning}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé com Botões Grandes */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {mode === 'steps' ? (
            <>
              <button
                type="button"
                disabled={stepIdx === 0}
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-800 font-bold text-xs inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Passo Anterior
              </button>

              {stepIdx < TUTORIAL_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStepIdx((i) => Math.min(TUTORIAL_STEPS.length - 1, i + 1))}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
                >
                  <span>Próximo Passo ({stepIdx + 2}/{TUTORIAL_STEPS.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
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
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5"
              >
                <Droplets className="w-4 h-4" />
                Voltar para o Passo a Passo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
