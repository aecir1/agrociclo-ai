# Contexto Completo do Projeto (Memória Automática para o Antigravity)

Este arquivo `GEMINI.md` é lido automaticamente pelo **Google Antigravity** quando você abre esta pasta no seu PC ou em outro computador da equipe. Ele contém todo o histórico, decisões de produto/UX e arquitetura técnica atualizada do projeto.

Para o histórico detalhado da conversa e evolução passo a passo das funcionalidades solicitadas, consulte também `docs/HISTORICO_CONVERSA_E_CONTEXTO.md` e `docs/GUIA_DO_PITCH_E_DEFESA.md`.

---

## 1. Visão Geral do Projeto (`AgroCiclo AI`)
* **Objetivo:** Plataforma AgTech de **Gestão Hídrica, Mapa Leaflet + Relevo 3D, Automação de Gotejamento de Baixo Custo, Diagnóstico Visual da Folha e Regularidade Ambiental** focada na cacauicultura da Bahia (**Ilhéus / Sul da Bahia** vs. **Oeste Baiano / Cerrado**).
* **Público-Alvo e Diretriz de UX/UI:**
  * Pequenos e médios produtores rurais (muitas vezes com pouca familiaridade tecnológica), com interface limpa sem poluição visual e alternância entre **Tema Claro (`#EDF3EE` suave)** e **Tema Escuro (`#0B1120`)**.
  * **Tela Inicial Limpa e Intuitiva:** Caixa d’água visual com dias de autonomia no gotejamento vs. rega comum, cartão verde de Clima Agora com **Switch no topo** para abrir a previsão em **blocos de 3 horas** e **7 dias** sem rolar a tela, e 4 botões grandes de Ações Rápidas.
  * **Sem Chat de IA:** O módulo de chat/API de IA foi removido por feedback de produtores e mentores, mantendo a experiência direta e focada em decisões práticas na roça.

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
* `src/App.tsx` + `src/components/ToggleSwitch.tsx`: Shell com barra lateral, alternância **Ilhéus** vs. **Oeste**, botão de **Modo Claro / Escuro**, Caixa d’Água visual de autonomia e **Switch** direto no card climático para expandir a previsão (`CityWeatherForecast.tsx` agrupada em turnos de 3h + semana).
* `src/components/FarmMap2D3D.tsx` + `src/utils/geoMap.ts`:
  * **Mapa Real com Leaflet** (Satélite, Ruas, Relevo Topo, pin da Sede arrastável, polígono clicável/editável com marcadores `L.divIcon`) **+ Vista 3D de Relevo** em Canvas isométrico com setas de escoamento da chuva e cálculo de declividade (`1%` a `35%`).
* `src/components/AutomationTab.tsx`: Cartões clicáveis com `ToggleSwitch` reais para as travas de proteção (`Trava Anti-Vassoura`, `Tarifa Verde Noturna`, `Modo Economia`, `Offline`) e controle direto por talhão (`Ligar Rega Agora` / `Pausar Rega`, `+ Novo Talhão`, `Dividir em 2`).
* `src/components/DroughtSimulatorTab.tsx`: Organizado em duas abas limpas (**`1. Teste de Seca`** e **`2. Chuva & Relevo`**), removendo seletores técnicos confusos e exibindo barras comparativas claras de reserva, captação em telhados e enxurrada em encosta.
* `src/components/CameraVisionTab.tsx` + `backend_python/ml_server.py`: Diagnóstico visual da folha com persistência da foto enviada, **contornos tracejados** sobre as regiões afetadas (switch `Contornar sinais na foto`), alerta destacado de **Vassoura-de-Bruxa**, probabilidades amplas e switch lateral para detalhes técnicos opcionais.
* `src/components/RegulationCreditTab.tsx`: Explicação visual em 3 passos (Economia de Água → INEMA → Banco do Nordeste FNE Verde/Água), emissão de Comprovante PDF e detalhes extras de reúso/solo recolhidos em switch.
* `src/components/PropertyAndEmergencyTab.tsx`: Checklist de contingência da seca (Antes/Durante/Depois) + editor dos dados da fazenda.
* `src/components/InteractiveTutorialModal.tsx` + `src/components/AppTourOverlay.tsx` + `src/components/FarmerSetupWizard.tsx`: Ao concluir o cadastro em **`+ Cadastrar Fazenda`**, o sistema salva a propriedade e inicia automaticamente um **Tour Guiado Interativo em 6 passos** com holofote direto nos elementos da tela.
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
