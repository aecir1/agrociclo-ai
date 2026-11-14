# Histórico da Conversa e Contexto de Evolução do Projeto (`AgroCiclo AI`)

Este documento registra todas as decisões, pedidos de melhoria e implementações realizadas na sessão de evolução do **AgroCiclo AI**, servindo de referência rápida para continuar o trabalho no PC (no VS Code ou no Google Antigravity).

---

## 1. Resumo Cronológico das Solicitações e Implementações

### Etapa 1 — Adição do Mapa 2D / 3D da Fazenda com Latitude, Longitude, Raio e Delimitação Manual
* **Solicitação:**
  * Adicionar um mapa interativo estilo Google Maps da fazenda capaz de alternar entre **2D e 3D**.
  * Permitir informar **Latitude e Longitude** exatas da propriedade, visualizar o **raio da fazenda** e **delimitar manualmente a área** (marcando os vértices no mapa) para calcular os hectares.
  * Consolidar tudo na versão principal do projeto (`/home/aecio/Projetos/agrociclo-ai`) e no arquivo portátil `prototipo_standalone.html`.
* **Implementação Inicial:**
  * Criados `src/utils/geoMap.ts` (conversão métrica local e cálculo de área/perímetro por Shoelace) e `src/components/FarmMap2D3D.tsx`.

---

### Etapa 2 — Correção de Bloqueio de Imagens no Mapa + Redesign Completo de UI/UX (Inspirado no Figma) + Tutorial Guiado
* **Feedback do Usuário:**
  1. **Problema no Mapa:** Ao abrir `prototipo_standalone.html` direto no navegador (`file://` / Brave), os provedores externos de blocos (como OpenStreetMap) exibiam erro de acesso não autorizado ou falhavam.
  2. **Excesso de Informações na Tela:** A tela inicial tinha textos demais e jargões técnicos pesados para um produtor rural com pouca familiaridade com tecnologia.
  3. **Melhoria de UI/UX com Referência do Figma (`Dealport`):** Interface mais limpa, bonita e polida, com menu lateral branco, destaque verde-esmeralda, botões principais bem visíveis e informações extras escondidas por padrão (mas acessíveis caso necessário).
  4. **Melhoria do Tutorial:** Deixar o tutorial completo, passo a passo e intuitivo.
* **Soluções Implementadas:**
  * **Motor de Mapa 2D / 3D Próprio em HTML5 Canvas (`src/components/FarmMap2D3D.tsx`):**
    * Zero dependência de scripts externos sujeitos a bloqueio em `file://`.
    * **Modo Relevo Agro (100% Offline):** Abre instantaneamente sem internet e sem qualquer erro de autorização.
    * **Modo Satélite (Online Verificado):** Busca blocos 5×5 da Esri World Imagery via `fetch` CORS validado com projeção isométrica contínua (sem frestas entre blocos); se estiver offline ou bloqueado pelo navegador, mantém o mapa próprio automaticamente sem exibir imagem de erro.
    * Coordenadas padrão de Ilhéus ajustadas para zona rural cacaueira (`-14.7565, -39.2245`).
  * **Redesign Estilo Figma e Divulgação Progressiva (`src/App.tsx`):**
    * Barra lateral esquerda branca fixa com troca rápida **🌳 Ilhéus** / **☀️ Oeste** e navegação dividida em **O que você mais usa** (*Início*, *Mapa 2D/3D*, *Irrigação*, *Seca e Chuva*) e **Ferramentas Extras** (*Foto da Folha IA*, *Emergência & Chat IA*, *Outorga e Crédito*).
    * Topo branco limpo com botões de destaque: **Abrir Mapa 2D/3D**, **Como Usar (Tutorial)** e **+ Cadastrar Fazenda**.
    * Tela inicial enxuta: 4 botões grandes de **Ações Rápidas**, 3 cartões de KPI em linguagem simples (*Água Guardada*, *Tempo e Risco Hoje*, *Sua Lavoura de Cacau*), gráfico SVG limpo de 30 dias e 2 checagens práticas do dia.
    * Seção **"Quer ver informações extras ou dados técnicos?"** no rodapé da tela inicial, mantendo recolhidos por padrão:
      1. *Previsão 24h e 7 Dias*
      2. *Comparar Sul vs. Oeste e Agronomia*
      3. *Dados Técnicos & INEMA*
  * **Novo Tutorial Passo a Passo (`src/components/InteractiveTutorialModal.tsx`):**
    * Guia interativo em **6 passos numerados** com barra de progresso, instruções claras do que clicar, dica rápida, botão de atalho direto para a funcionalidade e aba **Dicionário Simples** traduzindo termos técnicos (*m³*, *Assoreamento*, *Vassoura-de-Bruxa*, *Cobertura Morta*, *Outorga INEMA*, *Cabruca*).

---

### Etapa 3 — Divisão de Talhões (`+`), Visualização do Relevo em 3D e Cálculo da Influência do Relevo na Chuva
* **Solicitação:**
  1. Na parte do **Talhão** (`Irrigação`), ter um botão **`+`** para adicionar novas partições e dividir melhor os hectares.
  2. Na parte do **Mapa**, poder **ver o relevo quando colocar em 3D**.
  3. O sistema **calcular como o relevo influencia na questão da chuva** (infiltração vs. escoamento/enxurrada).
* **Soluções Implementadas:**
  1. **Particionamento de Talhões (`src/components/AutomationTab.tsx`):**
     * Botão **`+ Novo Talhão / Dividir Hectares`** que abre um formulário simples para criar uma nova partição definindo nome, hectares, posição no relevo (*Baixada / Várzea*, *Meia Encosta*, *Topo de Morro*), clone e estágio fenológico, com opção de descontar automaticamente esses hectares do maior talhão existente.
     * Em cada talhão da lista: botão **`Dividir em 2`** (divide um talhão em *Parte A* e *Parte B* na metade dos hectares), botões **`−` / `+` 0,5 ha** para ajuste fino e botão de exclusão de partição.
  2. **Relevo 3D no Mapa (`src/components/FarmMap2D3D.tsx` + `src/utils/geoMap.ts`):**
     * Modelagem contínua de elevação (`getTerrainElevationM`) representando os *Mares de Morros* do Sul da Bahia e o *Chapadão* do Oeste.
     * Na **Vista 3D (Relevo)**, renderiza uma malha topográfica 3D sombreada (com algoritmo do pintor para oclusão correta em qualquer ângulo de rotação), indicador de altitude máxima (`Topo +XXm`), cerca/vértices acompanhando a altura do terreno e **setas azuis indicando o sentido de escoamento da chuva morro abaixo** (`getTerrainDownhillVector`).
     * Presets rápidos de declividade (**Plano 3%**, **Ondulado 10%**, **Morro 18%**, **Íngreme 28%**) + controle deslizante de `1%` a `35%`.
  3. **Cálculo Hidrológico Relevo × Chuva (`src/utils/geoMap.ts`, `src/components/FarmMap2D3D.tsx`, `src/components/DroughtSimulatorTab.tsx`):**
     * Função `calculateReliefRainImpact` que calcula quanto de uma chuva (em `mm`) **infiltra na zona radicular (`%`, `mm`, `m³/ha`)** versus quanto **escorre morro abaixo como enxurrada (`%`, `mm`, `m³/ha`)** em função da declividade do terreno, cobertura morta/Cabruca e presença de **Caixas Secas / Valas em Curva de Nível**.
     * Mostra o volume de enxurrada que pode ser captado por gravidade na baixada (`+m³` e `+dias extras de irrigação`) e classifica o **Risco de Erosão / Assoreamento no Açude** (*Baixo*, *Moderado*, *Alto*).
     * Sincronizado em tempo real entre a aba **Mapa 2D / 3D** e a aba **Seca e Chuva**.

---

## 2. Arquivos Principais Modificados / Criados
* `src/App.tsx` — Layout geral estilo Figma, sidebar, topbar, início simplificado e gavetas de detalhes extras.
* `src/types.ts` — Tipagens `LatLonPoint`, `terrainZone` em `IrrigationSector`, e `latitude`, `longitude`, `farmRadiusM`, `polygonVertices`, `terrainSlopePct`, `terrainProfileType` em `PropertyProfile`.
* `src/utils/geoMap.ts` — Geometria de polígonos em metros/hectares, modelo de elevação 3D (`getTerrainElevationM`), gradiente de descida (`getTerrainDownhillVector`) e cálculo hidrológico (`calculateReliefRainImpact`).
* `src/components/FarmMap2D3D.tsx` — Componente interativo de Mapa 2D/3D com malha de relevo, fluxo de chuva, satélite validado e medição de área.
* `src/components/AutomationTab.tsx` — Criador de partições (`+ Novo Talhão / Dividir Hectares`), botão `Dividir em 2` e ajuste de hectares por talhão.
* `src/components/DroughtSimulatorTab.tsx` — Simulador de seca, captação de telhados e painel completo de *Hidrologia de Encosta & Relevo da Propriedade*.
* `src/components/InteractiveTutorialModal.tsx` — Tutorial guiado em 6 passos + Dicionário Simples do Produtor.
* `src/components/FarmerSetupWizard.tsx` e `src/data/mockProfiles.ts` — Coordenadas rurais e parâmetros iniciais de relevo/polígono.
* `prototipo_standalone.html` — Build único atualizado contendo todo o código compilado.
