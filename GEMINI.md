# Contexto Completo do Projeto (Memória Automática para o Antigravity)

Este arquivo `GEMINI.md` é lido automaticamente pelo **Google Antigravity** quando você abre esta pasta no seu PC ou em outro computador da equipe. Ele contém todo o histórico, decisões de produto/UX e arquitetura técnica atualizada do projeto.

Para o histórico detalhado da conversa e evolução passo a passo das funcionalidades solicitadas, consulte também `docs/HISTORICO_CONVERSA_E_CONTEXTO.md` e `docs/GUIA_DO_PITCH_E_DEFESA.md`.

---

## 1. Visão Geral do Projeto (`AgroCiclo AI`)
* **Objetivo:** Plataforma AgTech de **Gestão Hídrica, Mapeamento 2D/3D com Relevo, Automação de Gotejamento de Baixo Custo e Regularidade Ambiental** focada na cacauicultura da Bahia (**Ilhéus / Sul da Bahia** vs. **Oeste Baiano / Cerrado**).
* **Público-Alvo e Diretriz de UX/UI:**
  * Pequenos e médios produtores rurais (muitas vezes com pouca familiaridade tecnológica).
  * **Design inspirado em Dashboard Moderno (Figma / Dealport):** Fundo claro suave (`#F5F7F6`), barra lateral branca fixa com item ativo em verde-esmeralda (`bg-emerald-600`), topo limpo com os botões mais usados sempre visíveis (**Abrir Mapa 2D/3D**, **Como Usar (Tutorial)**, **+ Cadastrar Fazenda**).
  * **Divulgação Progressiva (Menos informação de imediato, extras sob demanda):** A tela inicial mostra apenas 4 botões grandes de Ações Rápidas, 3 cartões de KPI em linguagem direta, gráfico limpo de duração da água em 30 dias e 2 avisos práticos do dia. Dados densos (Previsão 24h/7d, comparativo agronômico Sul vs. Oeste e detalhes técnicos INEMA/LoRa/Assoreamento) ficam recolhidos na parte inferior e abrem com 1 clique quando necessário.

---

## 2. Tese Agronômica e Hídrica (Ilhéus vs. Oeste Baiano)
1. **Sul da Bahia (Ilhéus — Sistema Cabruca, coordenadas rurais `-14.7565, -39.2245`):**
   * Cacau com raízes superficiais que sofre abortamento de flores e frutos nos veranicos (El Niño) e terrenos movimentados (*Mares de Morros*, declividade padrão `16%`).
   * Não pode usar irrigação por aspersão sobre a copa porque a água livre nas folhas e a umidade relativa $>85\%$ explodem a **Vassoura-de-Bruxa (*Moniliophthora perniciosa*)** e a Podridão-Parda.
   * **Solução:** Gotejamento sub-copa (molha apenas a raiz de 0–20 cm) com **Trava Fitossanitária Automática** (suspende pulsos se $\text{UR} \ge 85\%$) + captação pluvial em telhados de barcaças + contenção de enxurrada em encostas (caixas secas / cobertura morta) + desconto de assoreamento em açudes + Dispensa de Outorga INEMA.
2. **Oeste Baiano (Cerrado — Riachão das Neves / Barreiras — Pleno Sol, `-11.7462, -44.9102`):**
   * Clima seco ($\text{UR } 35\text{–}45\%$) e relevo plano/suave (declividade padrão `4%`) eliminam naturalmente a Vassoura-de-Bruxa (escape fitossanitário).
   * Atinge alta produtividade graças ao **Ajuste Osmótico Ativo nas raízes** (*Moser et al., 2010*) aliado ao **Delivery System (Fertirrigação por Gotejamento)** entregando até $20\text{ L/árvore/dia}$ (*CPCRI, 2010*) sob sol pleno.
   * **Solução:** Agendamento automático na **Tarifa Verde Noturna (21h30 às 06h00)** (-38% de energia elétrica na Coelba e mínima evaporação), controle de salinidade e trava no limite diário da Outorga do INEMA.

---

## 3. Arquitetura e Módulos Implementados (`src/`)
* `src/App.tsx`: Layout estilo Figma com barra lateral esquerda (`O que você mais usa` vs. `Ferramentas Extras`), seletor rápido **Ilhéus** vs. **Oeste**, topbar clara e painel inicial simplificado com seções expansíveis sob demanda.
* `src/components/FarmMap2D3D.tsx` + `src/utils/geoMap.ts`:
  * **Mapa Interativo 2D e 3D com Relevo Real (100% funcional offline e em `file://`):**
    * Motor próprio em HTML5 Canvas isométrico sem depender de bibliotecas externas que bloqueiem em `file://` ou navegadores com bloqueio de rastreamento (Brave).
    * **Modo Relevo Agro (Offline)** e **Modo Satélite (Online via Esri World Imagery validado via CORS com fallback automático sem erro na tela)**.
    * **Malha Topográfica 3D Sombreada:** Quando em **Vista 3D (Relevo)**, renderiza morros, encostas e baixadas com iluminação direcional, altitude máxima/mínima (`Topo +XXm`), cerca extrudada acompanhando o relevo e **setas azuis indicando o sentido de descida da água da chuva**.
    * **Delimitação e GPS:** Botão de GPS do navegador, atalhos de municípios da Bahia, entrada de Latitude/Longitude, ajuste do **Raio da Fazenda (m)**, marcação manual clicando nos cantos da propriedade (ou arrastando os vértices/Sede) e botão **Salvar Área na Minha Fazenda** que atualiza os hectares automaticamente.
    * **Cálculo Relevo × Chuva no Mapa:** Simulador rápido acoplado mostrando quanto da chuva infiltra no solo vs. escorre morro abaixo conforme a declividade (`1%` a `35%`).
* `src/components/AutomationTab.tsx`:
  * **Controle de Gotejamento "Sensor-Lite" & Particionamento de Talhões:**
    * Botão **`+ Novo Talhão / Dividir Hectares`**: permite criar novas partições escolhendo nome, hectares, posição no relevo (*Baixada / Várzea*, *Meia Encosta*, *Topo de Morro*), clone e estágio fenológico, com opção de descontar automaticamente os hectares do maior talhão existente.
    * Botões rápidos em cada talhão: **`Dividir em 2`** (divide o talhão em Parte A e Parte B com plantas e vazões proporcionais), ajuste **`−` / `+` 0,5 ha**, exclusão de partição, diagnóstico de entupimento (*Flushing*) e rompimento de mangueira.
* `src/components/DroughtSimulatorTab.tsx`:
  * **Simulador de Seca (15, 30, 60 e 90 dias)** + **Calculadora de Captação em Telhados de Barcaças** + **Auditoria de Assoreamento**.
  * **Seção 3 — Hidrologia de Encosta & Influência do Relevo na Chuva:** Calcula em tempo real (sincronizado com a declividade do Mapa 3D) a fração da chuva que **infiltra na raiz (`%`, `mm`, `m³/ha`)** vs. **escorre em enxurrada (`%`, `mm`, `m³/ha`)**, o volume **aproveitável por gravidade em Caixas Secas / Açude Baixo** e o **Risco de Erosão / Assoreamento** (*Baixo*, *Moderado*, *Alto*).
* `src/components/InteractiveTutorialModal.tsx`:
  * **Tutorial Guiado em 6 Passos** com barra de progresso interativa, instruções passo a passo em linguagem acessível para o produtor, botões de ação direta para abrir cada tela e aba **Dicionário Simples** explicando termos técnicos sem jargão.
* `src/components/CameraVisionTab.tsx` + `backend_python/ml_server.py`:
  * Diagnóstico óptico por foto/câmera para detectar *Estresse Hídrico (Seca)*, *Vassoura-de-Bruxa* ou *Planta Saudável*.
* `src/components/RegulationCreditTab.tsx`:
  * Conformidade INEMA / CEFIR, mapa de reúso seguro da água e emissão de Relatório Técnico para crédito rural (FNE Verde / FNE Água).
* `src/components/PropertyAndAiTab.tsx`:
  * Plano de Emergência Hídrica (Antes, Durante e Após a seca), edição completa do cadastro e assistente **AgroAssist**.
* `prototipo_standalone.html`:
  * Versão single-file gerada a partir do `dist/` compilado pelo Vite (pode ser aberta direto com dois cliques no navegador sem precisar rodar servidor).

---

## 4. Comandos Úteis no PC
* Instalar dependências: `npm install`
* Rodar servidor de desenvolvimento: `npm run dev`
* Verificar tipagem e gerar build de produção: `npx tsc --noEmit && npm run build`
* Atualizar o `prototipo_standalone.html` após `npm run build`:
  ```bash
  python3 -c '
  import glob, re, os
  html = open("dist/index.html", encoding="utf-8").read()
  css = "\n".join(open(f, encoding="utf-8").read() for f in glob.glob("dist/assets/*.css"))
  js = "\n".join(open(f, encoding="utf-8").read() for f in glob.glob("dist/assets/*.js"))
  html = re.sub(r"<link[^>]+href=\"/assets/[^\"]+\.css\"[^>]*>", lambda _: f"<style>{css}</style>", html)
  html = re.sub(r"<script[^>]+src=\"/assets/[^\"]+\.js\"[^>]*></script>", lambda _: f"<script type=\"module\">{js}</script>", html)
  open("prototipo_standalone.html", "w", encoding="utf-8").write(html)
  '
  ```
* Rodar via Docker (Frontend + Python ML): `docker compose up --build`
