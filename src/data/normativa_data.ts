export interface NormativaSubSection {
  title: string;
  number?: string;
  content: string; // html or text content
  steps?: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
  alert?: {
    type: "info" | "warning" | "success" | "tip";
    text: string;
    icon?: string;
  };
}

export interface NormativaSection {
  id: string;
  number: string;
  title: string;
  subsections?: NormativaSubSection[];
  content?: string;
}

export const NORMATIVA_SECTIONS: NormativaSection[] = [
  {
    id: "sec-1",
    number: "01",
    title: "Apresentação do Documento",
    content: `
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed">
        Este documento único reúne a <strong>Normativa Facilities 2026</strong> e o <strong>Manual de Treinamento dos Processos Administrativos e de Facilities</strong>, consolidando diretrizes, governança, rotinas operacionais, sistemas, fluxos de atendimento e boas práticas em um único material de consulta.
      </p>
      <h4 class="text-xs font-black uppercase tracking-wider text-[#FF2E63] mt-4 mb-2">Objetivo do material unificado</h4>
      <ul class="list-disc pl-5 space-y-1.5 text-slate-750 dark:text-slate-300 text-xs">
        <li>Padronizar a execução das rotinas administrativas e de Facilities.</li>
        <li>Facilitar o treinamento de novos colaboradores e a consulta diária da equipe.</li>
        <li>Reduzir erros na abertura, atendimento e encerramento de chamados.</li>
        <li>Garantir rastreabilidade dos processos por meio de chamados, aprovações, anexos, IDs, notas fiscais e evidências.</li>
        <li>Fortalecer a governança, o compliance e a qualidade dos serviços prestados em todas as unidades.</li>
      </ul>
      <div class="mt-4 p-3 bg-[#FF2E63]/5 border-l-4 border-[#FF2E63] rounded-r-xl">
        <p class="text-[11px] font-bold text-[#FF2E63] flex items-center gap-1.5 leading-tight">
          📌 <strong>Orientação de uso:</strong> O índice lateral deve ser utilizado para navegação rápida. O glossário foi mantido no final para consulta rápida das siglas, termos e sistemas.
        </p>
      </div>
    `
  },
  {
    id: "sec-2",
    number: "02",
    title: "Finalidade, Objetivos e Abrangência",
    subsections: [
      {
        title: "Finalidade",
        number: "2.1",
        content: `
          <p class="text-slate-750 dark:text-slate-300 leading-relaxed">
            Esta Normativa tem por finalidade estabelecer as diretrizes, competências, responsabilidades, processos e padrões de atuação da Carteira (Setor) de Facilities, vinculada ao Departamento de Facilities e Infraestrutura, visando garantir um ambiente físico de trabalho seguro, funcional, eficiente e alinhado às necessidades operacionais e estratégicas da <strong>Bellinati Perez</strong>.
          </p>
        `
      },
      {
        title: "Objetivos Gerais",
        number: "2.2",
        content: `
          <ul class="list-disc pl-5 space-y-1.5 text-slate-750 dark:text-slate-300">
            <li>Garantir a operação contínua, segura, eficiente e padronizada de todos os serviços de suporte físico, administrativo, operacional e logístico nas unidades.</li>
            <li>Definir parâmetros fundamentais de qualidade, desempenho, conformidade, organização e rastreabilidade para todos os processos vinculados à área de Facilities e Infraestrutura.</li>
            <li>Definir claramente atribuições, responsabilidades, níveis hierárquicos, fluxos operacionais e canais oficiais de comunicação entre equipes internas, prestadores de serviço, fornecedores e áreas de apoio.</li>
            <li>Assegurar conformidade com legislações vigentes, normas regulamentadoras (NRs), ABNT, requisitos ambientais, diretrizes de SST (Saúde e Segurança do Trabalho), exigências condominiais e políticas internas da organização.</li>
            <li>Promover eficiência operacional, redução de custos, controle orçamentário e otimização de recursos por meio de boas práticas de gestão, indicadores de desempenho (KPIs), monitoramento operacional e controle contínuo dos processos.</li>
          </ul>
        `
      },
      {
        title: "Objetivos Específicos",
        number: "2.3",
        content: `
          <ul class="list-disc pl-5 space-y-1.5 text-slate-750 dark:text-slate-300">
            <li>Manter os ambientes físicos (escritórios, depósitos, áreas comuns) em condições ideais de conservação.</li>
            <li>Gerenciar contratos com monitoramento contínuo de indicadores e SLAs.</li>
            <li>Executar e controlar planos de manutenção preventiva, preditiva e corretiva.</li>
            <li>Coordenar suprimento e controle de materiais de consumo, limpeza, copa e descartáveis.</li>
            <li>Apoiar planejamento e execução de reformas, adequações físicas e projetos de layout.</li>
            <li>Garantir o funcionamento de catracas, CFTV e segurança patrimonial em conformidade com as diretrizes da empresa.</li>
          </ul>
        `
      },
      {
        title: "Âmbito de Aplicação",
        number: "2.4",
        content: `
          <p class="text-slate-750 dark:text-slate-300 leading-relaxed">
            Esta Normativa aplica-se integralmente a todos os colaboradores da Carteira de Facilities, do Departamento de Facilities e Infraestrutura, gestores de filiais, prestadores de serviço terceirizados e todas as unidades fisicamente administradas pela organização, sem exceção.
          </p>
        `
      }
    ]
  },
  {
    id: "sec-3",
    number: "03",
    title: "Estrutura Organizacional de Facilities",
    content: `
      <p class="mb-4 text-slate-750 dark:text-slate-300 leading-relaxed">
        A Carteira de Facilities reporta-se ao Departamento de Facilities e Infraestrutura, subordinado à Superintendência Administrativa:
      </p>
      
      <div class="bg-slate-50 dark:bg-slate-900 border-2 border-slate-150 dark:border-slate-800 rounded-2xl p-4 mb-5 text-center flex flex-col items-center">
        <div class="bg-[#FF2E63] text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs uppercase tracking-wider">
          Superintendência Administrativa
        </div>
        <div class="h-6 w-0.5 bg-slate-300 dark:bg-slate-700"></div>
        <div class="bg-slate-800 dark:bg-slate-750 text-[#08D9D6] font-black text-xs px-4 py-2 rounded-xl shadow-xs uppercase tracking-wider border border-[#08D9D6]/20">
          Departamento de Facilities e Infraestrutura
        </div>
        <div class="h-6 w-0.5 bg-slate-300 dark:bg-slate-700"></div>
        <div class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs uppercase tracking-wider border-2 border-[#FF2E63]">
          Carteira (Setor) de Facilities
        </div>
        
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 w-full text-[10px] font-bold text-slate-650 dark:text-slate-400">
          <div class="bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-850">Manutenção Predial</div>
          <div class="bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-850">Limpeza e Conservação</div>
          <div class="bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-850">Copa e Copa Executiva</div>
          <div class="bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-850">Recepção e Portaria</div>
          <div class="bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-850">Layout e Espaços</div>
          <div class="bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-850">Gestão de Fornecedores</div>
          <div class="bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-850">Setor Compras</div>
          <div class="bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-850">Segurança Patrimonial</div>
        </div>
      </div>
    `,
    subsections: [
      {
        title: "Manutenção Predial e de Infraestrutura",
        number: "3.2.1",
        content: `<p class="text-slate-750 dark:text-slate-300">Manutenção preventiva e corretiva de instalações elétricas, hidráulicas, elevadores, geradores, bombas, ar-condicionado e fachadas. Controle de chamados via GLPI e acompanhamento de ordens de serviço (OS) especializadas.</p>`
      },
      {
        title: "Limpeza e Conservação",
        number: "3.2.2",
        content: `<p class="text-slate-750 dark:text-slate-300">Gestão dos contratos com prestadores de serviço de limpeza e zeladoria das unidades, gestão do descarte de resíduos e conformidade socioambiental.</p>`
      },
      {
        title: "Copa, Refeitório e Suprimentos",
        number: "3.2.3",
        content: `<p class="text-slate-750 dark:text-slate-300">Controle e fornecimento de insumos de copa (água, café, açúcar, descartáveis) e acompanhamento do uso e manutenção de equipamentos domésticos corporativos (geladeiras, micro-ondas, bebedouros).</p>`
      },
      {
        title: "Recepção, Portaria e Controle de Acesso",
        number: "3.2.4",
        content: `<p class="text-slate-750 dark:text-slate-300">Gerenciamento da equipe de recepção, controle de acesso físico de visitantes, prestadores e funcionários via sistema de catracas DIMEP/DMP, crachás e triagem de correspondências.</p>`
      },
      {
        title: "Gestão de Espaços e Mudanças de Layout",
        number: "3.2.5",
        content: `<p class="text-slate-750 dark:text-slate-300">Planejamento e logística para remanejamento de mobiliário e PAs, organização de almoxarifados, controle patrimonial físico e gestão das reservas de auditórios/salas de treinamento.</p>`
      },
      {
        title: "Gestão de Fornecedores e Contratos",
        number: "3.2.6",
        content: `<p class="text-slate-750 dark:text-slate-300">Fiscalização de prestadores de serviço externos (zeladoria, segurança, dedetização, manutenções especializadas), validação de notas fiscais, cumprimento de SLAs e avaliação semestral de desempenho.</p>`
      }
    ]
  },
  {
    id: "sec-4",
    number: "04",
    title: "Responsabilidades e Governança",
    subsections: [
      {
        title: "Matriz de Responsabilidades",
        number: "4.1",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300">
            Abaixo estão descritas as principais atribuições e responsabilidades por cargo dentro da governança do setor:
          </p>
        `,
        table: {
          headers: ["Cargo / Área", "Principais Atribuições"],
          rows: [
            [
              "Superintendente Administrativo(a)",
              "Aprovar políticas, normativas, contratos estratégicos de alto valor e orçamentos corporativos. Validar processos de grande impacto financeiro ou regulatório."
            ],
            [
              "Gerente Executivo(a) / Administrativo(a) de Facilities",
              "Coordenar frentes operacionais e estratégicas. Gerir equipe de Facilities interna e prestadores terceirizados. Administrar contratos firmados, fornecedores e indicadores. Suporte emergencial a filiais e aprovação de requisições conforme alçadas."
            ],
            [
              "Coordenador(a) Administrativo(a) / Facilities",
              "Supervisionar a execução operacional diária nas filiais físicas. Realizar rondas e vistoria para aplicação de normativas. Garantir regularização de laudos e manutenção predial. Controlar consumo de materiais, custos operacionais e verificar atividades executadas pelos Administrativos locais."
            ],
            [
              "Administrativo(a) de Filial",
              "Executar chamados operacionais diários. Abrir e tratar chamados no GLPI. Lançar e faturar despesas (Uber, Correios) no módulo 353 e anexar evidências no módulo 326. Preencher planilhas de rateio, descarte e controle de ponto."
            ],
            [
              "Demais Áreas e Colaboradores",
              "Encaminhar demandas de facilities exclusivamente pelos canais oficiais (GLPI). Respeitar as normas de organização de PAs, descarte e agendamento de espaços."
            ]
          ]
        }
      }
    ]
  },
  {
    id: "sec-5",
    number: "05",
    title: "Sistemas Utilizados",
    content: `
      <p class="mb-4 text-slate-750 dark:text-slate-300 leading-relaxed">
        Para a execução e controle diário dos processos administrativos e de facilities, são utilizados os seguintes sistemas oficiais:
      </p>
      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
          <thead>
            <tr class="bg-slate-100 dark:bg-slate-900 font-bold border-b border-slate-200 dark:border-slate-800">
              <th class="p-3">Sistema</th>
              <th class="p-3">Endereço / Acesso</th>
              <th class="p-3">Finalidade</th>
              <th class="p-3">Utilização</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-150 dark:divide-slate-850">
            <tr>
              <td class="p-3 font-black text-slate-900 dark:text-white">GLPI</td>
              <td class="p-3 font-mono text-[10px]">servicedesk.bellinatiperez.com.br</td>
              <td class="p-3">Abertura, acompanhamento e solução de chamados operacionais.</td>
              <td class="p-3">Colaboradores, ADMs e Técnicos</td>
            </tr>
            <tr>
              <td class="p-3 font-black text-slate-900 dark:text-white">Sistema ADM (ERP)</td>
              <td class="p-3 font-mono text-[10px]">adm.bellinatiperez.com.br/erp/modulos</td>
              <td class="p-3">Acesso a módulos específicos (170, 326, 353, 379, 410) para processos corporativos.</td>
              <td class="p-3">Administrativo e Compras</td>
            </tr>
            <tr>
              <td class="p-3 font-black text-slate-900 dark:text-white">SGPWeb</td>
              <td class="p-3 font-mono text-[10px]">novo.sgpweb.com.br</td>
              <td class="p-3">Sistema de pré-postagem manual e geração de etiquetas para correspondências físicas dos Correios.</td>
              <td class="p-3">Administrativo / Facilities</td>
            </tr>
            <tr>
              <td class="p-3 font-black text-slate-900 dark:text-white">Arquivo Digital</td>
              <td class="p-3 font-mono text-[10px]">arquivodigital.bellinatiperez.com.br</td>
              <td class="p-3">Módulo 326. Armazenamento seguro de evidências, faturas, recibos e notas fiscais.</td>
              <td class="p-3">Administrativo de Filial</td>
            </tr>
            <tr>
              <td class="p-3 font-black text-slate-900 dark:text-white">Uber Empresa</td>
              <td class="p-3 font-mono text-[10px]">Faturamento / Portal Uber</td>
              <td class="p-3">Portal de monitoramento de faturas, corridas corporativas e usuários autorizados.</td>
              <td class="p-3">Gestores e Administrativos</td>
            </tr>
            <tr>
              <td class="p-3 font-black text-slate-900 dark:text-white">Controle de Ponto</td>
              <td class="p-3 font-mono text-[10px]">controladoria.bellinatiperez.com.br/sistemas</td>
              <td class="p-3">Registro de ponto diário de colaboradores e extração de quadro batido de filiais.</td>
              <td class="p-3">Todos os colaboradores</td>
            </tr>
            <tr>
              <td class="p-3 font-black text-slate-900 dark:text-white">DIMEP / DMP</td>
              <td class="p-3 font-mono text-[10px]">dmp.bellinatiperez.com.br</td>
              <td class="p-3">Portal de controle e monitoramento online de catracas físicas e controle de acesso biométrico/facial.</td>
              <td class="p-3">Coordenadores de Facilities</td>
            </tr>
            <tr>
              <td class="p-3 font-black text-slate-900 dark:text-white">Pasta de Rede Shared</td>
              <td class="p-3 font-mono text-[10px]">\\\\192.168.200.81\\Administrativo</td>
              <td class="p-3">Armazenamento compartilhado local de arquivos, planilhas de controle e histórico físico de descartes/catracas.</td>
              <td class="p-3">Administrativos de Filial</td>
            </tr>
          </tbody>
        </table>
      </div>
    `
  },
  {
    id: "sec-6",
    number: "06",
    title: "Procedimentos Operacionais das Filiais",
    subsections: [
      {
        title: "Abertura e Fechamento de Filial",
        number: "6.1",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300">
            O responsável administrativo local deve, obrigatoriamente, conferir os seguintes parâmetros de controle na abertura e no encerramento das atividades na filial física:
          </p>
        `,
        table: {
          headers: ["Item de Verificação", "Padrão Esperado", "Ação de Correção em Desvio"],
          rows: [
            ["Portas de acesso", "Abertas no horário exato de operação. Trancadas e seguras no fechamento.", "Regularizar imediatamente, fotografar e informar no grupo oficial de Facilities."],
            ["Iluminação comum", "Totalmente acesa na abertura. Totalmente apagada após o fechamento.", "Ligar/desligar imediatamente. Em caso de lâmpadas com defeito, abrir chamado corretivo no GLPI."],
            ["Ares-condicionados", "Desligados nos horários de fechamento e ociosidade.", "Desligar imediatamente. Fotografar desvios e notificar liderança se houver reincidência."],
            ["Ventiladores / Exaustores", "Totalmente desligados no encerramento.", "Desligar imediatamente e registrar ocorrência fotográfica."],
            ["Bebedouros e pias", "Sem vazamentos ativos, bom fluxo de refrigeração.", "Fechar registros de água se vazamento grave, acionar manutentor e abrir chamado prioritário no GLPI."],
            ["Janelas", "Totalmente fechadas no encerramento (evitar riscos climáticos).", "Fechar imediatamente. Fotografar e relatar se deixadas abertas por operadores."]
          ]
        },
        alert: {
          type: "warning",
          text: "Toda e qualquer irregularidade encontrada durante a abertura ou fechamento deve ser fotografada e enviada nos canais oficiais de comunicação para registro de auditoria e conformidade.",
          icon: "📸"
        }
      },
      {
        title: "Ronda Operacional pelos Andares",
        number: "6.2",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300">
            Atividade de auditoria física contínua realizada pelos Administrativos e Coordenadores com o objetivo de garantir a ordem, limpeza e a segurança operacional:
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
            <div class="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-3">
              <h5 class="font-black text-[#FF2E63] uppercase tracking-wide mb-1.5">6.2.1 Organização das PAs</h5>
              <ul class="list-disc pl-4 space-y-1">
                <li>Alimentos, copos abertos, garrafas vazias ou resíduos nas mesas → solicitar recolhimento imediato e orientar. Reincidências geram Termo de Orientação.</li>
                <li>Celulares particulares em PAs → solicitar imediata guarda em armário próprio, anotar CPF do colaborador e reportar à liderança para aplicação de advertência formal.</li>
                <li>Objetos decorativos indevidos ou cabos expostos → orientar a remoção ou acionar equipe de TI/Manutenção.</li>
              </ul>
            </div>
            <div class="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-3">
              <h5 class="font-black text-slate-800 dark:text-white uppercase tracking-wide mb-1.5">6.2.2 Equipamentos e Periféricos</h5>
              <ul class="list-disc pl-4 space-y-1">
                <li>Detectar acúmulo de periféricos sobressalentes nas mesas de operação (monitores extras, teclados, mouses, headsets sem uso).</li>
                <li>Verificar com os supervisores se os equipamentos estão ativos.</li>
                <li>Se inativos → recolher para o almoxarifado sob custódia de Facilities para manter a organização visual da operação.</li>
              </ul>
            </div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-750 dark:text-slate-300">
            <h5 class="font-black text-slate-800 dark:text-white uppercase tracking-wide mb-1.5">6.2.3 Áreas Comuns e Sanitários</h5>
            <ul class="list-disc pl-4 space-y-1">
              <li>Verificar rotinas de limpeza, odorizadores, dispenser de sabonete e reposição de toalhas de papel/papel higiênico.</li>
              <li>Fiscalizar obstruções em rotas de fuga ou extintores.</li>
              <li>Qualquer defeito físico (trincas, vazamentos) deve ser registrado e ter chamado correspondente aberto no GLPI.</li>
            </ul>
          </div>
        `
      },
      {
        title: "Manutenção e Troca de Cadeiras",
        number: "6.3",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300">
            O fluxo operacional para tratamento de cadeiras danificadas ou inoperantes nas filiais deve seguir estritamente o seguinte rito:
          </p>
        `,
        steps: [
          "Identificação do defeito: Identificar cadeira danificada (braços, pistão, rodízios ou encosto) e abrir chamado no GLPI, contendo localização exata, foto e descrição.",
          "Retirada imediata: Remover a cadeira danificada do posto de trabalho (PA) para evitar riscos ergonômicos ou acidentes, armazenando-a no almoxarifado.",
          "Agrupamento semanal: Enviar lotes de cadeiras danificadas para manutenção externa credenciada semanalmente (evitando acúmulo no espaço físico).",
          "Acompanhamento do SLA: Monitorar retorno das cadeiras. No sistema de compras (Módulo 410), o SLA de análise de reparo é de 48h úteis, e no GLPI o reparo rápido (rodízios/ajustes) possui SLA de 24h.",
          "Fluxo de Descarte: Caso a cadeira não possua viabilidade física de reparo, o Administrativo deve seguir as regras de Descarte de Equipamentos.",
          "Reposicionar e Registrar: Ao retornar da manutenção, reposicionar a cadeira e encerrar o respectivo chamado com as fotos de comprovação."
        ]
      },
      {
        title: "Vistoria Diária Técnica",
        number: "6.4",
        content: `
          <p class="text-slate-750 dark:text-slate-300 leading-relaxed mb-3">
            A vistoria é um procedimento técnico de alta disciplina operacional, realizada pelo time de Facilities obrigatoriamente duas vezes ao dia: às <strong>9h00</strong> e às <strong>16h00</strong>.
          </p>
          <p class="text-slate-750 dark:text-slate-300 leading-relaxed mb-3">
            A inspeção deve contemplar de forma detalhada as seguintes esferas:
          </p>
          <ol class="list-decimal pl-5 space-y-2 text-xs text-slate-750 dark:text-slate-300 leading-relaxed">
            <li><strong>Equipamentos de Utilidade Geral:</strong> Filtros de água (vazamentos, fluxo de resfriamento, troca de refil de filtragem), ar-condicionado (temperatura, pingadeiras, filtros de poeira), TVs de avisos operacionais (ligadas com conteúdo atualizado), catracas e câmeras do circuito de segurança CFTV.</li>
            <li><strong>Zeladoria e Limpeza:</strong> PAs livres de poeira, banheiros com suprimentos abastecidos (papel toalha, higiênico, sabonete), pias secas e sem obstruções, coleta regular de lixeiras e pisos brilhando. Quaisquer desvios de limpeza devem ser comunicados imediatamente à encarregada da equipe terceirizada de limpeza.</li>
            <li><strong>Hábitos Operacionais:</strong> Policiamento rigoroso de regras nas PAs. É terminantemente proibido manter papéis de anotações, canetas extras, mochilas, bolsas, casacos sobre as cadeiras ou lanches nas estações. Os cabos de força e dados de informática devem estar devidamente embutidos e presos por abraçadeiras de nylon.</li>
            <li><strong>Detecção de Manutenções Corretivas:</strong> Identificar e sinalizar preventivamente lâmpadas queimadas ou de colorações divergentes no mesmo refeitório/sala, sensores de presença inativos, fechaduras ou maçanetas soltas, danos de pintura nas paredes ou fitas-borda de PAs descoladas.</li>
            <li><strong>Policiamento de Segurança e Normas:</strong> Coibir o uso de telefones celulares, alimentação na PA, colaboradores 'furando' catraca comum ou emprestando crachás de acesso corporativo.</li>
          </ol>
        `
      },
      {
        title: "Controle de Catracas no DIMEP",
        number: "6.5",
        content: `
          <p class="text-slate-750 dark:text-slate-300 leading-relaxed mb-3">
            Procedimento padrão de auditoria diária do status físico e de comunicação dos equipamentos de controle de acesso biométrico e facial:
          </p>
          <ol class="list-decimal pl-5 space-y-2 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-3">
            <li>Acesse o endereço eletrônico oficial: <a href="https://dmp.bellinatiperez.com.br/logon.aspx" target="_blank" class="text-[#FF2E63] font-bold hover:underline">dmp.bellinatiperez.com.br</a>.</li>
            <li>Efetue o logon com os dados de acesso corporativo autorizados.</li>
            <li>Selecione a aba superior <strong>Monitoração</strong> e clique em <strong>Dashboard de Equipamento</strong>.</li>
            <li>Verifique a legenda de cores indicativa: se o dispositivo constar em <strong class="text-emerald-500">Verde</strong>, está operando e comunicando normalmente; se constar em <strong class="text-amber-500">Amarelo ou Vermelho</strong>, apresenta inconsistência física ou falha de conexão na rede interna.</li>
            <li>Navegue até o diretório compartilhado na rede para salvar os relatórios diários de status: <code class="bg-slate-100 p-1 rounded font-mono text-[10px]">\\\\192.168.200.81\\Administrativo\\Filial Park\\7- Matheus\\2- Catracas</code>.</li>
            <li>Caso ocorram anomalias graves de hardware, o time deve registrar descrição do defeito e abrir chamado corretivo prioritário direcionado à TI e Manutenção.</li>
          </ol>
        `
      },
      {
        title: "Bater o Ponto e Puxar Quadro Batido",
        number: "6.6",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed">
            <strong>6.6.1 Procedimento para Bater Ponto Corretamente:</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
            <li>Ative a tela de login do computador de ponto físico (aperte qualquer tecla se em repouso).</li>
            <li>Pressione as teclas combinadas <strong>Ctrl + Alt + Del</strong>.</li>
            <li>Se constar o CPF de outro funcionário ativo na tela, clique em <strong>Trocar de Usuário</strong> no canto inferior esquerdo.</li>
            <li>Insira seu respectivo CPF e senha de acesso.</li>
            <li>Abra o navegador Google Chrome e acesse o endereço: <code class="bg-slate-100 p-0.5 rounded font-mono text-[10px]">controladoria.bellinatiperez.com.br/sistemas</code>.</li>
            <li>Selecione a opção Intranet e faça o login correspondente.</li>
            <li>Clique no menu <strong>Bater Ponto</strong> e depois em <strong>Confirmar</strong>.</li>
            <li>Verifique atentamente o aviso em pop-up de confirmação de gravação do registro e, após o sucesso, pressione <strong>Ctrl + Alt + Del</strong> e clique em <strong>Sair</strong> do usuário.</li>
          </ol>
          <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed">
            <strong>6.6.2 Procedimento para Puxar Quadro Batido da Filial:</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed">
            <li>Abra o sistema de ponto corporativo e selecione o menu <strong>Relatórios</strong>.</li>
            <li>Clique na opção <strong>Relatório Quadro Batido</strong>.</li>
            <li>Selecione o filtro de layout como <strong>Analítico</strong>.</li>
            <li>Defina a filial física desejada e insira o mês correspondente de referência.</li>
            <li>Clique em Pesquisar e baixe a planilha gerada em formato Excel (.xlsx).</li>
            <li>No Excel, aplique um filtro rápido na coluna designada como <strong>HomeWork: não</strong> (Isso filtrará apenas a operação ativa no local).</li>
            <li>O total de registros remanescentes aponta o quadro físico presente na filial de referência para controles de rateio e auditoria.</li>
          </ol>
        `
      },
      {
        title: "Descarte de Equipamentos Inoperantes",
        number: "6.7",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300">
            Regras para expurgo legal, baixa patrimonial e encaminhamento para reciclagem de ativos sem viabilidade econômica de manutenção:
          </p>
        `,
        steps: [
          "Contagem e Separação: Realizar contagem dos periféricos descartados e anotar os respectivos números de plaquetas de patrimônio correspondentes.",
          "Planilha de Descarte: Acessar a planilha geral de controle de descarte disponível na pasta de rede compartilhada.",
          "Preenchimento de Registros: Registrar data, lote e preencher os dados do descarte.",
          "Baixa no Módulo 170: Entrar no ERP (Sistema ADM) no Módulo 170 - Baixa Patrimonial.",
          "Alteração de Status: Alterar a situação do ativo físico para a opção 'Cancelado' e preencher o motivo padrão como 'Descarte'.",
          "Confirmação e Auditoria: Marcar as baixas concluídas na planilha compartilhada, anexar print do módulo 170 e enviar o arquivo de lote por e-mail para a Reciclatech (parceira de descarte) e responsáveis fiscais corporativos."
        ]
      },
      {
        title: "Acesso à Pasta de Rede e Rede Compartilhada",
        number: "6.8",
        content: `
          <p class="text-slate-750 dark:text-slate-300 leading-relaxed">
            Para acessar, gravar e ler as planilhas financeiras, controles de compras e registros operacionais locais, execute o seguinte comando:
          </p>
          <div class="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl font-mono text-xs my-3 text-slate-800 dark:text-white block">
            \\\\192.168.200.81\\Administrativo
          </div>
          <p class="text-slate-750 dark:text-slate-300 leading-relaxed">
            Insira o endereço no Executar do Windows (teclas Windows + R), digite suas credenciais normais de rede autorizadas pelo TI e navegue pelas subpastas das filiais correspondentes.
          </p>
        `
      }
    ]
  },
  {
    id: "sec-7",
    number: "07",
    title: "Manutenção, Infraestrutura e Patrimônio",
    content: `
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed">
        Todas as solicitações de serviços de manutenção corretiva e alterações físicas de infraestrutura devem ser encaminhadas exclusivamente pelos canais oficiais:
      </p>
      <ul class="list-disc pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
        <li><strong>Canal GLPI (Manutenção):</strong> Usado para manutenção civil, elétrica rápida, refrigeração de ar-condicionado, defeitos mecânicos e suporte operacional físico geral nas unidades.</li>
        <li><strong>Canal Sistema ADM (Módulo 410):</strong> Exclusivo para requisições de compra de materiais permanentes, serviços de reformas complexas e contratações externas com custo.</li>
      </ul>
      <div class="p-3 bg-amber-50/45 dark:bg-amber-955/20 border-l-4 border-amber-500 rounded-r-xl mb-4 text-xs text-amber-900 dark:text-amber-100 font-bold leading-relaxed">
        ⚠️ Atenção: Solicitações de facilities realizadas por canais informais, verbais, bilhetes ou mensagens de aplicativo sem número de chamado registrado serão terminantemente desconsideradas.
      </div>
      <h4 class="text-xs font-black uppercase tracking-wider text-[#FF2E63] mt-4 mb-2">Plano Anual de Manutenção Preventiva (PAMP)</h4>
      <p class="text-slate-750 dark:text-slate-300 text-xs leading-relaxed mb-3">
        O setor de Facilities deve manter atualizado e gerenciar anualmente o PAMP, mapeando e agendando preventivas para: sistemas de climatização predial (limpeza de filtros de ar e PMOC), grupos geradores de energia elétrica, subestações, bombas de incêndio, laudos de para-raios (SPDA), renovação de Alvará e Auto de Vistoria do Corpo de Bombeiros (AVCB).
      </p>
    `
  },
  {
    id: "sec-8",
    number: "08",
    title: "Limpeza, Conservação e Zeladoria",
    subsections: [
      {
        title: "Incentivo Mensal de Produtividade para Zeladoras",
        number: "8.1",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed">
            A bonificação mensal é um benefício financeiro de incentivo para reconhecer e motivar o bom desempenho, assiduidade e postura profissional das Zeladoras de todas as unidades da empresa.
          </p>
          <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed">
            <strong>Valor e Pagamento:</strong> O valor do benefício é fixo em <strong>R$ 90,00 (noventa reais) mensais</strong>, creditados diretamente no cartão de benefícios Alelo da colaboradora.
          </p>
          <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed">
            <strong>Critérios de Elegibilidade (Regras cumulativas):</strong>
          </p>
        `,
        table: {
          headers: ["Fator de Avaliação", "Critério Regra para Elegibilidade"],
          rows: [
            ["Assiduidade", "100% de presença ativa no mês de referência. Faltas injustificadas ou justificadas por atestados médicos de dia inteiro geram desclassificação. Atestado de horas parciais é tolerado."],
            ["Banco de Horas", "Saldo negativo máximo consolidado de até 4 (quatro) horas no encerramento do fechamento do ponto mensal."],
            ["Medidas Disciplinares", "Ausência absoluta de advertências escritas, termos de orientação graves ou suspensões de conduta no período."],
            ["Avaliação de Qualidade", "Inexistência de reclamações fundamentadas das coordenações de operação quanto à qualidade técnica ou agilidade da limpeza."],
            ["Avaliação de Desempenho", "Participação em ao menos um feedback de alinhamento com a liderança no ciclo de 90 dias."],
            ["Tempo de Casa", "O benefício aplica-se exclusivamente após a conclusão do período inicial de experiência profissional de 90 dias."]
          ]
        }
      },
      {
        title: "Procedimento de Apuração e Fechamento",
        number: "8.2",
        content: `
          <ol class="list-decimal pl-5 space-y-2 text-xs text-slate-750 dark:text-slate-300 leading-relaxed">
            <li>O Departamento de Gestão de Incentivos (DP) realiza mensalmente a extração dos dados brutos com base nos relatórios do escritório parceiro Gomes (Faltas, atestados, banco de horas e medidas disciplinares).</li>
            <li>O DP compila a lista preliminar e envia aos respectivos Coordenadores Administrativos de cada filial.</li>
            <li>Os Coordenadores de cada filial validam a planilha preliminar, informando se houve alguma ocorrência de desvio de qualidade notificado formalmente pelas equipes operacionais locais (único item não automatizado).</li>
            <li>Após a chancela final das lideranças administrativas de filial, a listagem de pagamento aprovada é enviada para o Contas a Pagar para lançamento no cartão Alelo das colaboradoras elegíveis.</li>
          </ol>
        `
      }
    ]
  },
  {
    id: "sec-9",
    number: "09",
    title: "Processos Administrativos e Operacionais",
    subsections: [
      {
        title: "Envio de Correspondências via Correios",
        number: "9.1",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            Procedimento padrão para postagem de correspondências institucionais e documentos físicos pela empresa via Correios:
          </p>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>9.1.1 Fluxo Operacional:</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
            <li>Abertura do Chamado: O funcionário solicitante abre chamado no GLPI selecionando a categoria obrigatória <strong>Correio</strong>.</li>
            <li>Autorização Obrigatória: É obrigatório anexar no chamado o Documento de Aprovação (D.A.) com a assinatura física/digital do Gerente Executivo ou Diretor responsável pela área.</li>
            <li>Embalagem: O solicitante deve embalar o material em papel pardo resistente ou plástico bolha se o item for de natureza frágil.</li>
            <li>Entrega física: O pacote selado e identificado deve ser entregue fisicamente na unidade central Toronto (Curitiba) — Av. Marechal Floriano Peixoto, 672.</li>
            <li>Pré-postagem: A equipe de Facilities realiza a pré-postagem eletrônica no portal SGPWeb e emite a etiqueta oficial com código de barras.</li>
            <li>Registro Financeiro: O Administrativo cadastra o recibo e a nota de despesa no <strong>Módulo 353</strong> do ERP para fins de faturamento e rateio.</li>
            <li>Arquivo de Evidência: O comprovante de autorização e o recibo de envio devem ser anexados digitalmente no portal Arquivo Digital, no <strong>Módulo 326</strong>.</li>
            <li>Encerramento: O chamado no GLPI é respondido informando a ID financeira do Módulo 353 e o chamado é solucionado para faturamento final.</li>
          </ol>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>9.1.2 Passo a Passo da Pré-Postagem no Portal SGPWeb:</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
            <li>Acesse o portal eletrônico: <a href="https://novo.sgpweb.com.br" target="_blank" class="text-[#FF2E63] font-bold hover:underline">novo.sgpweb.com.br</a>.</li>
            <li>Efetue o login com as credenciais de e-mail administrativas oficiais: <code class="bg-slate-100 p-0.5 rounded font-mono text-[10.5px]">adm.toronto@bellinatiperez.com.br</code> e senha padrão autorizada.</li>
            <li>Navegue até o menu <strong>Gestão Pré-postagem</strong> e clique em <strong>Pré-postagem</strong>.</li>
            <li>Verifique o número do cartão ativo dos Correios e clique em Pesquisar.</li>
            <li>Clique na opção <strong>Pré-postagem Manual</strong>.</li>
            <li>Configure o serviço: selecione <strong>Carta Registrada</strong> com o código de contratação padrão de tarifa <strong>80810</strong>.</li>
            <li>Insira as informações do destinatário e remetente. Defina dimensões aproximadas padrão como: <strong>11 cm x 16 cm</strong>.</li>
            <li>Insira a descrição do produto enviado, grave o formulário, emita a etiqueta de postagem com código de barras e cole no envelope.</li>
          </ol>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>9.1.3 Lançamento da Despesa no Módulo 353 (Controle Financeiro):</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
            <li>Acesse o Sistema ADM (ERP) e entre no Módulo 353.</li>
            <li>Selecione o fornecedor padrão dos Correios em Curitiba (Código interno de fornecedor: <strong>11865</strong> | CNPJ: 34.028.316/0020-76).</li>
            <li>Preencha a data de emissão e o valor correspondente ao recibo de envio dos Correios.</li>
            <li>No campo de vinculação, digite o CPF do funcionário que solicitou o chamado do correio.</li>
            <li>Grave o registro inicial e copie o código da Nota Fiscal gerada pelo sistema.</li>
            <li>Navegue até a consulta de notas fiscais cadastradas, acesse o lançamento e abra a ID correspondente para editar detalhes.</li>
            <li>Preencha a descrição contendo a data do envio, número do chamado GLPI de origem, a carteira financeira solicitante e o CPF da pessoa.</li>
            <li>Configure a data de vencimento da ID para <strong>D+2</strong> (máximo de dois dias úteis após o envio) e clique em Finalizar para obter o número definitivo da ID.</li>
          </ol>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>9.1.4 Cadastro no Módulo 326 (Arquivo Digital):</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed">
            <li>Acesse o portal eletrônico: <a href="https://arquivodigital.bellinatiperez.com.br" target="_blank" class="text-[#FF2E63] font-bold hover:underline">arquivodigital.bellinatiperez.com.br</a>.</li>
            <li>Pesquise pela ID financeira da despesa cadastrada no passo anterior (Módulo 353).</li>
            <li>Renomeie o comprovante PDF ou foto do recibo físico exatamente com o número da ID gerada (Ex: <code class="bg-slate-100 p-0.5 rounded font-mono text-[10.5px]">ID_12345.pdf</code>).</li>
            <li>Anexe o recibo e anexe o documento D.A. de autorização como tipo "RECIBO" e "AUTORIZAÇÃO", garantindo compliance fiscal em auditoria.</li>
          </ol>
        `,
        alert: {
          type: "warning",
          text: "O atraso superior a 48 horas (D+2) para lançamento das despesas de Correios no Módulo 353 acarreta em suspensão de novas autorizações para a área inadimplente.",
          icon: "⏳"
        }
      },
      {
        title: "Gestão e Lançamento de Uber Corporativo",
        number: "9.2",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            O uso da modalidade Uber Corporativo está sujeito a regras severas de controle para evitar desvios de finalidade e garantir conformidade fiscal:
          </p>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>9.2.1 Liberação de Acesso ao Perfil Uber Empresa (Cenários de Uso):</strong>
          </p>
          <ul class="list-disc pl-5 space-y-2 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
            <li><strong>Cenário 1 — Viagens Temporárias:</strong> O colaborador deve abrir um chamado no GLPI na categoria <strong>Viagens</strong> anexando todo o cronograma da viagem e as devidas autorizações. Em seguida, deve abrir um chamado específico na categoria <strong>Uber</strong> informando o período exato e enviar e-mail de aviso aos gestores responsáveis. O perfil de usuário temporário no aplicativo Uber será liberado exclusivamente para as datas da viagem de trabalho.</li>
            <li><strong>Cenário 2 — Demandas Externas Esporádicas:</strong> O colaborador abre chamado no GLPI na categoria <strong>Uber</strong>, preenchendo a máscara de informações detalhadas (Origem, Destino, Data, Motivo da demanda) e anexando o respectivo documento D.A. assinado eletronicamente por seu Gerente Executivo ou Diretor de área. A liberação de perfil será efetuada apenas para o dia da realização da demanda de trabalho externa.</li>
            <li><strong>Cenário 3 — Acesso Contínuo / Fixo:</strong> Destinado apenas a colaboradores cujos cargos exijam deslocamentos externos constantes e frequentes. Deve ser formalizado via envio de e-mail contendo a justificativa detalhada e D.A. formal assinado pela Diretoria Administrativa ou Superintendência.</li>
          </ul>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>9.2.2 Procedimento de Faturamento e Lançamento Financeiro (Módulo 353):</strong>
          </p>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            Apenas as corridas realizadas por colaboradores baseados fisicamente na filial de Curitiba devem ser cadastradas e faturadas por este fluxo.
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed">
            <li>Acesse o portal administrativo de controle Uber Empresa e extraia o relatório de corridas faturadas recentes.</li>
            <li>Verifique o nome e o CPF do solicitante da corrida de trabalho no sistema de ponto, conferindo se está ativo na filial Curitiba.</li>
            <li>Insira as informações na planilha financeira interna de controle de faturamento Uber, preenchendo: Data, nome do colaborador, CPF, valor total da corrida, número do chamado de origem, setor, carteira solicitante, número da nota fiscal e número da ID financeira.</li>
            <li>Acesse o Sistema ADM (ERP) e navegue até o Módulo 353.</li>
            <li>Selecione o fornecedor padrão Uber (Código interno: <strong>35745</strong> | CNPJ: 17.895.646/0001-87).</li>
            <li>Configure os campos fiscais: no campo número da nota, selecione a opção padrão do sistema <strong>NF NÃO EMITIDA</strong>.</li>
            <li>Insira a data da corrida de trabalho no campo de emissão e preencha o valor correspondente.</li>
            <li>Configure o campo filial do lançamento como sempre <strong>Maringá</strong> (Regra tributária interna de centralização de despesas Uber, independente do colaborador ser lotado em Curitiba).</li>
            <li>Conclua o lançamento do faturamento no Módulo 353 para obter a respectiva nota. No relatório de notas lançadas, consulte o lançamento e abra a ID do financeiro correspondente.</li>
            <li>Configure o vencimento da ID para o dia 11 do mês subsequente (vencimento do faturamento do cartão Itaú corporativo de centralização).</li>
            <li>No campo descrição da ID, preencha o texto padronizado: <code class="bg-slate-100 p-0.5 rounded font-mono text-[10.5px]">DATA_CORRIDA - NOME_CORRIDA - CHAMADO_ORIGEM - CARTEIRA - CPF</code>.</li>
            <li>Gere o número de ID final, baixe o comprovante detalhado de corrida no Uber Empresa, renomeie o arquivo PDF com o respectivo número de ID e anexe o documento no portal do Arquivo Digital (Módulo 326) como tipo "RECIBO" e "AUTORIZAÇÃO".</li>
            <li>Responda e solucione o chamado de origem no GLPI informando o número definitivo de ID gerada para faturamento interno.</li>
          </ol>
        `
      },
      {
        title: "Controle de Ativos de Home Office (Módulo 379)",
        number: "9.3",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            O <strong>Módulo 379 Controle de Ativos — Home Office</strong> do ERP corporativo é a ferramenta oficial obrigatória de controle para monitorar todas as movimentações físicas, entregas, trocas e devoluções de ativos de TI e equipamentos ergonômicos mantidos sob custódia de colaboradores em teletrabalho:
          </p>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>9.3.1 Cadastro de Entregas e Trocas de Equipamentos:</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
            <li>No ERP (Sistema ADM), acesse o campo de busca de módulos rápidos, digite o número <strong>379</strong> e pressione ENTER.</li>
            <li>Selecione a opção de cadastro e preencha integralmente as informações de contato, telefone, endereço e e-mail do colaborador teletrabalhador (conforme consta no chamado de entrega/troca aberto no GLPI).</li>
            <li>Acesse a planilha compartilhada ou as informações do Grupo Motoboy e copie os números de etiquetas patrimoniais de todos os ativos enviados no lote (Notebook, Monitor, Desktop, Teclado, Mouse, Headset, Filtro de linha).</li>
            <li>Insira os patrimônios correspondentes na aba do módulo 379 designada como <strong>Patrimônios</strong>.</li>
            <li>Clique no comando <strong>Cadastrar</strong> e aguarde a geração do Termo de Responsabilidade e Comodato pelo sistema.</li>
            <li>Envie o Termo emitido para colher a assinatura digital do colaborador teletrabalhador e, após o retorno, salve no chamado e anexe no ERP.</li>
          </ol>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>9.3.2 Registro de Equipamentos Recolhidos / Devolvidos:</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed">
            <li>No Módulo 379, clique no submenu de <strong>Relatórios</strong>.</li>
            <li>Insira o número do CPF do colaborador que retornou ou se desligou no filtro de busca de funcionários.</li>
            <li>Selecione o ícone correspondente à visualização detalhada dos ativos custodiados no CPF selecionado.</li>
            <li>Insira a data exata da devolução física dos equipamentos no campo correspondente de recebimento técnico.</li>
            <li>Clique em <strong>Confirmar Devolução</strong>. Repita esse procedimento para todas as linhas de ativos entregues fisicamente no almoxarifado local.</li>
            <li>Responda o chamado do GLPI confirmando o recebimento técnico dos ativos com a lista de patrimônios e mude o status para solucionado.</li>
          </ol>
        `
      },
      {
        title: "Processamento de Compras e Alçadas (Módulo 410)",
        number: "9.4",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>9.4.1 Diretrizes do Canal de Compras:</strong>
          </p>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            Toda e qualquer aquisição física de materiais de consumo, serviços de manutenção terceirizados ou materiais permanentes para o time de Facilities deve ser operada exclusivamente por requisição no <strong>Módulo 410 Compras</strong> do ERP. 
          </p>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            É terminantemente proibida a abertura de chamados comuns de compra de materiais pelo sistema do GLPI. Caso ocorram requisições de compra abertas no GLPI, o chamado será cancelado imediatamente e direcionado para abertura no Módulo 410.
          </p>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>Como abrir um pedido de compras no ERP:</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
            <li>Acesse o ERP e no campo de navegação rápida digite <strong>410</strong> e pressione ENTER.</li>
            <li>Selecione a opção <strong>Novo Pedido</strong>.</li>
            <li>Preencha obrigatoriamente todos os campos obrigatórios fiscais e técnicos com máxima atenção técnica.</li>
          </ol>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>9.4.2 Tabela de Alçadas Limites de Aprovação de Compras:</strong>
          </p>
        `,
        table: {
          headers: ["Responsável pela Aprovação", "Alçada / Limite Financeiro Autorizado"],
          rows: [
            ["Gerente Administrativo(a) / Facilities", "Até R$ 300,00"],
            ["Gerente Executivo(a) / Facilities", "Até R$ 300,00"],
            ["Gerente de Compras", "Até R$ 3.000,00"],
            ["Superintendente Administrativo(a)", "Até R$ 9.999,00"],
            ["Vice-Presidência", "Qualquer valor (irrestrito)"],
            ["Presidência", "Qualquer valor (irrestrito)"]
          ]
        }
      },
      {
        title: "SLAs e Arquivo de Evidências (Módulo 326)",
        number: "9.5",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>9.5.1 SLAs de Análise do Setor de Compras por Categoria:</strong>
          </p>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            O prazo refere-se à triagem, cotação e liberação comercial do pedido pelo time de Compras, e não ao prazo de entrega logística do produto pelo fornecedor:
          </p>
          <ul class="list-disc pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
            <li><strong>Cadeiras ergonômicas / Peças de Reposição:</strong> SLA de 24 horas úteis.</li>
            <li><strong>Material de Informática geral:</strong> SLA de 24 horas úteis.</li>
            <li><strong>Material de Limpeza e Insumos de Copa:</strong> SLA de 24 horas úteis.</li>
            <li><strong>Computadores e Servidores físicos:</strong> SLA de 48 horas úteis.</li>
            <li><strong>Notebooks operacionais:</strong> SLA de 48 horas úteis.</li>
            <li><strong>Mobiliário de Escritório permanente:</strong> SLA de 72 horas úteis.</li>
            <li><strong>Reformas civis e Serviços Gerais complexos:</strong> SLA de 72 horas úteis.</li>
            <li><strong>Dedetização, Desratização e Sanitização predial:</strong> SLA de 72 horas úteis.</li>
          </ul>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>9.5.2 Normas de Arquivo Digital e Evidências Comprobatórias:</strong>
          </p>
          <p class="text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            Todas as compras, pagamentos pontuais ou despesas de viagens corporativas devem, obrigatoriamente, possuir a documentação comprobatória anexada na ID correspondente no <strong>Módulo 326 Arquivo Digital</strong>. São considerados documentos obrigatórios para auditoria: nota fiscal de produto/serviço com CNPJ correto, documento D.A. de autorização do gestor competente de acordo com a tabela de alçadas, orçamentos comparativos do mercado, e comprovantes de entrega/recebimento assinados pelo almoxarifado local.
          </p>
        `
      }
    ]
  },
  {
    id: "sec-10",
    number: "10",
    title: "Reserva de Salas, Visitas, Eventos e Almoço Corporativo",
    subsections: [
      {
        title: "Reserva de Auditório e Salas de Treinamento",
        number: "10.1",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>Objetivo:</strong> Padronizar a reserva do Auditório e das Salas de Treinamento, espaços de maior capacidade destinados a reuniões ampliadas, apresentações, integrações e eventos corporativos, garantindo disponibilidade, organização do espaço e suporte audiovisual quando necessário.
          </p>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>Procedimento para Reserva:</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
            <li>O funcionário solicitante deve abrir chamado no GLPI com antecedência mínima obrigatória de <strong>48 horas úteis</strong> em relação à data do uso.</li>
            <li>Selecione a categoria padrão <strong>Reserva</strong>, especificando no título se o local desejado é o "Auditório" ou "Sala de Treinamento".</li>
            <li>Preencha os dados da máscara: Filial física, andar, data exata, horário de início, horário de término e finalidade descritiva do uso (treinamento, reunião, integração).</li>
            <li>Informe a quantidade estimada de participantes ativos para fins de verificação de capacidade máxima e segurança.</li>
            <li>Sinalize expressamente se haverá necessidade de suporte ou testes de equipamentos de áudio/vídeo (Projetor, caixas de som, microfones, notebook) ou serviços de coffee break/café corporativo.</li>
          </ol>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>Regras Disciplinares de Reserva:</strong>
          </p>
          <ul class="list-disc pl-5 space-y-1 text-xs text-slate-750 dark:text-slate-300 leading-relaxed">
            <li>É terminantemente proibido agrupar múltiplas datas de uso em um único chamado. Deve ser aberto <strong>um chamado separado para cada data desejada</strong>, visando garantir rotatividade e transparência de agendamento de espaços.</li>
            <li>Reservas com duração excedente a um turno de trabalho completo (mais de 4 horas) devem possuir anuência e aprovação formal do Coordenador de Facilities.</li>
            <li>O suporte de áudio e vídeo solicitado deve ser previamente testado por um funcionário de Facilities pelo menos <strong>30 minutos antes</strong> do início do evento.</li>
            <li>A conferência física do espaço (organização de cadeiras, limpeza, climatização de ar) deve ser efetuada pela equipe de Facilities com pelo menos <strong>20 minutos de antecedência</strong> em relação ao horário do chamado.</li>
            <li>Ao encerramento das atividades, o solicitante da reserva é o responsável legal por devolver o espaço organizado, com aparelhos de ar-condicionado desligados e materiais recolhidos.</li>
          </ul>
        `
      },
      {
        title: "Fluxo de Visita de Contratantes e Eventos de Integração",
        number: "10.2",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>10.2.1 Recepção de Visitas de Contratantes:</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
            <li>O Gestor da carteira anfitriã deve abrir uma requisição de compras no Módulo 410 contendo a descrição da visita, quantidade de participantes externos, data, horário e solicitando o fornecimento de petit four/serviços de alimentação específicos.</li>
            <li>Em paralelo, deve abrir um chamado de suporte no GLPI na categoria <strong>Reserva</strong> informando a sala desejada de reunião e sinalizando a necessidade do coffee break.</li>
            <li>O time de Facilities providenciará a água mineral, café e a montagem do petit four na sala selecionada com até <strong>20 minutos de antecedência</strong> do horário da reunião.</li>
          </ol>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>10.2.2 Organização de Eventos Corporativos e de Integração:</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed">
            <li>O Gestor da área solicita a liberação financeira abrindo pedido de compras no Módulo 410 detalhando o evento, data, horário, estimativa de pessoas e justificativa (Ex: comemoração de batimento de metas).</li>
            <li>O chamado deve especificar o tipo de alimentação (Churrasco, rodízio de pizza, coquetel de salgados) ou serviços externos.</li>
            <li>Abrir chamado de espaço físico no GLPI na categoria <strong>Reserva</strong> indicando a filial e o espaço comum a ser utilizado.</li>
            <li>O time de Compras fará as cotações financeiras com os fornecedores e prestadores de buffet homologados, enquanto o time de Facilities apoiará na preparação civil, montagem do local e suporte durante a realização.</li>
          </ol>
        `
      },
      {
        title: "Almoço de Negócios e Vouchers de Alimentação",
        number: "10.3",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>10.3.1 Regras de Solicitação do Almoço com Contratante:</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
            <li>O Gestor requerente deve abrir um chamado no GLPI obrigatoriamente na categoria <strong>Administrativo > Almoço</strong>.</li>
            <li>Preencher todos os campos exigidos na máscara de abertura: Carteira solicitante, data exata, horário aproximado, nome completo de todos os funcionários e de todos os contratantes participantes, restaurante parceiro escolhido da lista homologada e a justificativa comercial do encontro.</li>
            <li>Anexar obrigatoriamente o arquivo D.A. com a aprovação formal da Superintendência Administrativa.</li>
            <li>O chamado deve ser aberto com antecedência mínima de <strong>24 horas úteis</strong> em relação à data do almoço.</li>
          </ol>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>10.3.2 Emissão de Voucher e Contato Administrativo:</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
            <li>O Administrativo de filial recebe o chamado GLPI e, se todas as informações e aprovações do D.A. estiverem corretas, preenche os dados cadastrais do documento do voucher oficial.</li>
            <li>Gera e emite o arquivo PDF de voucher do almoço.</li>
            <li>Tira um print legível do voucher e envia para o Gestor solicitante via canais de mensagens corporativos (WhatsApp ou Teams).</li>
            <li>Entra em contato com o responsável do restaurante parceiro selecionado para notificar sobre a realização do almoço corporativo e enviar o respectivo código de voucher para faturamento.</li>
          </ol>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>10.3.3 Restaurantes Parceiros Homologados em Curitiba:</strong>
          </p>
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 mb-4">
            <table class="w-full text-left text-xs text-slate-750 dark:text-slate-300 border-collapse">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <th class="p-2.5">Restaurante</th>
                  <th class="p-2.5">Responsável Contato</th>
                  <th class="p-2.5">Telefone de Contato</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-150 dark:divide-slate-850">
                <tr>
                  <td class="p-2.5 font-bold">Sale Pepe Restaurante</td>
                  <td class="p-2.5">Mayara</td>
                  <td class="p-2.5 font-mono">(41) 98879-0482</td>
                </tr>
                <tr>
                  <td class="p-2.5 font-bold">Jokers Bar e Restaurante</td>
                  <td class="p-2.5">Denise</td>
                  <td class="p-2.5 font-mono">(41) 99879-4596</td>
                </tr>
                <tr>
                  <td class="p-2.5 font-bold">Pote Chopp</td>
                  <td class="p-2.5">Luciano</td>
                  <td class="p-2.5 font-mono">(41) 99225-0042</td>
                </tr>
                <tr>
                  <td class="p-2.5 font-bold">Restaurante Imperial</td>
                  <td class="p-2.5">Letícia</td>
                  <td class="p-2.5 text-slate-500">Contato disponível no grupo corporativo</td>
                </tr>
                <tr>
                  <td class="p-2.5 font-bold">Brasílico Restaurante</td>
                  <td class="p-2.5">Roberto</td>
                  <td class="p-2.5 font-mono">(41) 99205-5332</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mb-3 text-slate-750 dark:text-slate-300 text-xs leading-relaxed">
            <strong>10.3.4 Faturamento, Pagamento e Prestação de Contas:</strong>
          </p>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed">
            <li>Após a conclusão do almoço, o gestor anfitrião deve conferir os valores consumidos, emitir a Nota Fiscal de Serviços com a descrição correta contendo o CNPJ oficial da Bellinati Perez.</li>
            <li>Realize o pagamento utilizando o cartão de crédito corporativo correspondente ou encaminhe para faturamento em conta se aplicável.</li>
            <li>O chamado do GLPI correspondente deve permanecer configurado com o status <strong>Planejado</strong> desde a abertura até a prestação de contas final.</li>
            <li>O gestor deve obrigatoriamente anexar a foto legível da Nota Fiscal emitida no chamado do GLPI.</li>
            <li>O time administrativo valida a nota fiscal, confere o voucher gerado, altera o status do chamado para Solucionado e encerra o processo financeiro da despesa.</li>
          </ol>
        `
      }
    ]
  },
  {
    id: "sec-11",
    number: "11",
    title: "GLPI — Sistema de Chamados",
    content: `
      <p class="mb-4 text-slate-750 dark:text-slate-300 leading-relaxed">
        O GLPI é o sistema oficial de central de serviços e service desk utilizado pela empresa para toda a gestão de ciclo de vida das demandas operacionais de TI, Compras, Manutenções e rotinas de Facilities.
      </p>
      <div class="space-y-3.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed">
        <div>
          <h5 class="font-black text-slate-800 dark:text-white uppercase tracking-wide mb-1">11.1 Acesso e Autenticação de Usuário</h5>
          <ol class="list-decimal pl-5 space-y-1">
            <li>Abra o navegador e acesse o endereço eletrônico: <a href="https://servicedesk.bellinatiperez.com.br" target="_blank" class="text-[#FF2E63] font-bold hover:underline">servicedesk.bellinatiperez.com.br</a>.</li>
            <li>No campo usuário, insira o número do seu <strong>CPF</strong> de colaborador.</li>
            <li>Insira sua senha de rede integrada e clique em <strong>Entrar</strong>.</li>
          </ol>
        </div>
        <div>
          <h5 class="font-black text-slate-800 dark:text-white uppercase tracking-wide mb-1">11.2 Alteração de Perfil de Acesso Técnico</h5>
          <p class="mb-1">Após efetuar o logon inicial, os funcionários que atuam no atendimento de chamados devem configurar o perfil técnico para habilitar o painel completo de controle de ordens:</p>
          <ol class="list-decimal pl-5 space-y-1">
            <li>Clique no menu de dados do usuário localizado no canto superior direito da interface.</li>
            <li>Altere o perfil de acesso padrão ativo de <strong>Padrão (Self-Service)</strong> para <strong>Técnico</strong>.</li>
            <li>A tela recarregará exibindo as opções de chamados atribuídos aos seus grupos, SLA de acompanhamento e painéis de atendimento.</li>
          </ol>
        </div>
        <div>
          <h5 class="font-black text-slate-800 dark:text-white uppercase tracking-wide mb-1">11.3 Procedimento para Criação de um Novo Chamado</h5>
          <ol class="list-decimal pl-5 space-y-1">
            <li>Navegue até o menu lateral e clique em <strong>Assistência</strong> e em seguida em <strong>Criar Chamado</strong>.</li>
            <li>Insira um <strong>Título</strong> conciso, técnico e objetivo (Ex: "Corrimão de segurança solto - Escada Andar 3 Curitiba"). Títulos genéricos como "Ajuda" ou "Problema" serão cancelados por falta de especificidade.</li>
            <li>Selecione rigorosamente a <strong>Categoria</strong> correta da árvore de serviços de Facilities.</li>
            <li>Preencha por completo todos os campos solicitados pela <strong>máscara do chamado</strong> na caixa de descrição técnica.</li>
            <li>Insira a <strong>Localização</strong> detalhada (Filial física, bloco, andar, sala ou número de PA correspondente).</li>
            <li>Se a categoria exigir, anexe fotos nítidas do problema civil/físico ou adicione o arquivo D.A. de autorização do gestor em anexo.</li>
            <li>Clique no botão <strong>Adicionar</strong> para consolidar a abertura do chamado.</li>
          </ol>
        </div>
        <div>
          <h5 class="font-black text-slate-800 dark:text-white uppercase tracking-wide mb-1">11.4 Fluxo de Atendimento e Tratativa de Chamados</h5>
          <ol class="list-decimal pl-5 space-y-1">
            <li>Acesse a caixa de entrada de chamados e filtre as demandas atribuídas ao seu grupo de atendimento ("Não Solucionados").</li>
            <li>Abra a demanda desejada, leia toda a descrição da máscara técnica e verifique se as fotos e o D.A. de aprovação foram anexados.</li>
            <li>Se houver inconsistência ou faltarem dados básicos para execução, adicione uma interação de acompanhamento solicitando os ajustes e altere o status do chamado para "Pendente" (O cronômetro de contagem de SLA congelará até o retorno do solicitante).</li>
            <li>Durante a execução física do serviço (civil, elétrico ou hidráulico), registre interações periódicas de progresso na aba de acompanhamentos.</li>
            <li>Ao concluir com sucesso a atividade física, preencha o formulário de solução técnica descrevendo em detalhes o que foi executado, anexe fotos do serviço finalizado como evidência e altere o status final para <strong>Solucionado</strong>.</li>
          </ol>
        </div>
      </div>
    `
  },
  {
    id: "sec-12",
    number: "12",
    title: "Categorias GLPI — Facilities",
    content: `
      <p class="mb-4 text-slate-750 dark:text-slate-300 leading-relaxed">
        Para agilizar o atendimento, evitar devoluções por triagem incorreta e garantir conformidade dos fluxos operacionais, o solicitante deve mapear a categoria exata no GLPI de acordo com o serviço desejado:
      </p>
      <div class="overflow-y-auto max-h-[350px] rounded-xl border border-slate-200 dark:border-slate-800">
        <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
          <thead>
            <tr class="bg-slate-100 dark:bg-slate-900 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
              <th class="p-2.5">Nome exato da Categoria de Serviço no GLPI</th>
              <th class="p-2.5">Palavras-chave de Busca Rápida</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-150 dark:divide-slate-850">
            <tr><td class="p-2.5 font-bold">Facilities > Alteração de perfil de acesso DIMEP</td><td class="p-2.5">CATRACA, FACIAL, BIOMETRIA, LIBERAÇÃO DE ACESSO, DIMEP, PORTA</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Almoço</td><td class="p-2.5">CONTRATANTE, ALMOÇO, REUNIÃO, RESTAURANTE, VOUCHER, PRESTAÇÃO DE CONTAS</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Cadeira Quebrada Filial</td><td class="p-2.5">MANUTENÇÃO CADEIRA, RODÍZIO, PISTÃO, BRAÇO QUEBRADO, ENCOSTO, TROCA CADEIRA</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Cartão Corporativo</td><td class="p-2.5">CARTÃO CRÉDITO, CARTÃO CORPORATIVO, ITAÚ, DESPESAS, VIAGEM</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Chip corporativo</td><td class="p-2.5">CHIP CELULAR, CLARO, OPERADORA, CORPORATIVO</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Chip corporativo > Número banido no WhatsApp</td><td class="p-2.5">WHATSAPP BANIDO, WHATSAPP CORPORATIVO, RECUPERAR NÚMERO CLARO</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Chip corporativo > Problemas com a linha/rede/internet</td><td class="p-2.5">SEM SINAL, SEM INTERNET, LINHA BLOQUEADA, CLARO FORA DO AR, CHIP DEFEITO</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Chip corporativo > Recolhimento de chip/celular</td><td class="p-2.5">RECOLHER CHIP, DEVOLVER CELULAR, DESLIGAMENTO, RESCISÃO COLABORADOR</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Chip corporativo > Solicitação de nova</td><td class="p-2.5">NOVO CHIP, SOLICITAR LINHA NOVA, CLARO CHIP CORPORATIVO</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Demanda Externa</td><td class="p-2.5">DEMANDA EXTERNA, SERVIÇO DE RUA, COMPRA EXTERNA, FISCALIZAÇÃO</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Descarte de Máquinas</td><td class="p-2.5">DESCARTE MÁQUINAS, SUCATA TI, MÓDULO 170, RECICLATECH, PATRIMÔNIO CANCELADO</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Devolução de Notebook</td><td class="p-2.5">DEVOLUÇÃO NOTEBOOK, DEVOLUÇÃO COMPUTADOR, DESLIGAMENTO TI, MÓDULO 379</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Entrega de equipamentos/materiais Home Office</td><td class="p-2.5">MÓDULO 379, HOME OFFICE EQUIPAMENTOS, ENVIAR NOTEBOOK, ENVIAR MONITOR, MOTOBOY</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Entrega de máquina Home Office</td><td class="p-2.5">ENTREGAR NOTEBOOK, ENTREGAR COMPUTADOR, TELETRABALHO INÍCIO, MÓDULO 379</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Entrega de periférico na filial</td><td class="p-2.5">ENTREGAR MOUSE, ENTREGAR TECLADO, CABO DE REDE, ADAPTADOR, HEADSET FILIAL</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Enviar correio</td><td class="p-2.5">CORREIOS, CARTA REGISTRADA, SEDEX, PAC, SGPWEB, ENVELOPE, POSTAGEM</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > FRETE / DESLOCAMENTO ENTRE FILIAIS</td><td class="p-2.5">FRETE COMPARTILHADO, TRANSPORTADORA, REMANEJAR MÓVEIS, DESLOCAMENTO CARGA</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > GUARDA TEMPORÁRIA DE NOTEBOOK</td><td class="p-2.5">CUSTÓDIA NOTEBOOK, ALMOXARIFADO GUARDA NOTEBOOK, TI NOTEBOOK RESERVA</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Headphone Filial</td><td class="p-2.5">HEADSET FILIAL, FONE DE OUVIDO ATENDIMENTO, TELEFONIA HEADSET NOVO</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Higienização de capas (somente uso do ADM)</td><td class="p-2.5">LAVAR CAPAS, LIMPEZA HIGIENIZAÇÃO CAPAS CADEIRAS, AUDITÓRIO HIGIENE</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Manutenção</td><td class="p-2.5">MANUTENÇÃO CIVIL, REPARO ELÉTRICO, AJUSTE PORTA, PINTURA, VAZAMENTO</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Manutenção > Ar Condicionado</td><td class="p-2.5">AR-CONDICIONADO COM DEFEITO, REFRIGERAÇÃO, PINGANDO ÁGUA, PMOC MANUTENÇÃO</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Manutenção > Configuração/Ativação de nova câmera CFTV</td><td class="p-2.5">CÂMERA NOVA CFTV, CONFIGURAR CÂMERA, INSTALAR CFTV GRAVAÇÃO, SEGURANÇA</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Manutenção > Movimentação de câmera CFTV</td><td class="p-2.5">MOVER CÂMERA CFTV, AJUSTAR ENQUADRAMENTO CFTV, REPOSICIONAR CFTV</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Manutenção de cadeiras</td><td class="p-2.5">MANUTENÇÃO CADEIRAS EXTERNA, CONSERTO DE CADEIRAS LOTE, REFORMA CADEIRA</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > MANUTENÇÃO DE HEADSET</td><td class="p-2.5">REPARAR HEADSET, CONSERTAR MICROFONE FONE, REPOSIÇÃO ESPUMA HEADSET</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Manutenção DIMEP - somente Facilities</td><td class="p-2.5">MANUTENÇÃO CATRACA DIMEP, BIOMETRIA DEFEITO, LEITOR FACIAL QUEBRADO, DMP FALHA</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Manutenção Externa</td><td class="p-2.5">MANUTENÇÃO EXTERNA CALÇADA, MANUTENÇÃO TELHADO CONDOMÍNIO, MANUTENÇÃO VIZINHOS</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Material de Escritório Filial</td><td class="p-2.5">COMPRA PAPEL SULFITE, CANETAS CORES, GRAMPEADOR, CLIPS, PASTA AZ ESCRITÓRIO</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Pagamentos Pontuais</td><td class="p-2.5">PAGAR PRESTADOR PONTUAL, NOTA FISCAL DESPESA UNIDADE, FATURA MANUTENÇÃO</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Realocação / Movimentação de computadores</td><td class="p-2.5">REMANEJAR PA, MOVER COMPUTADOR LAYOUT, TROCAR LUGAR OPERAÇÃO, MOVER TI</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Retorno de máquina Home Office</td><td class="p-2.5">DEVOLUÇÃO NOTEBOOK HOME OFFICE, RETORNO DE EQUIPAMENTOS TI MÓDULO 379</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Solicitação de Motoboy (somente ADM e MKT)</td><td class="p-2.5">MOTOBOY ENTREGA, COLETA DOCUMENTO, MOTO UBER CORRIDA RÁPIDA, ENTREGADOR</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Solicitação de Notebooks (somente TI)</td><td class="p-2.5">TI NOTEBOOK SOLICITAÇÃO, ESTOQUE DE NOTEBOOKS TI CENTRAL</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Solicitar notebook</td><td class="p-2.5">COMPRA NOTEBOOK, SOLICITAR MÓDULO 410 NOTEBOOK NOVO</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Solicitar novo computador</td><td class="p-2.5">SOLICITAR NOVO DESKTOP, COMPRAR COMPUTADOR, MÓDULO 410 COMPUTADOR</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Troca de Monitor Filial</td><td class="p-2.5">MONITOR QUEBRADO FILIAL, SUBSTITUIR TELA MONITOR, MONITOR ADM NOVO</td></tr>
            <tr><td class="p-2.5 font-bold">Facilities > Uber</td><td class="p-2.5">UBER EMPRESA CORRIDA, VIAGEM UBER, LIBERAÇÃO PERFIL UBER CORPORATIVO</td></tr>
          </tbody>
        </table>
      </div>
    `
  },
  {
    id: "sec-13",
    number: "13",
    title: "Linhas Corporativas — Chips e Celulares",
    content: `
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        As linhas de telefonia móvel e chips de internet corporativa são operadas em parceria com a empresa <strong>Claro</strong>, intermediada pela consultoria terceirizada de Telecom <strong>MOAI Tecnologia</strong>:
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-750 dark:text-slate-300 mb-4">
        <div class="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-3">
          <h5 class="font-black text-[#FF2E63] uppercase tracking-wide mb-1.5">13.1 Como Abrir Chamado na Operadora</h5>
          <p class="mb-2 leading-relaxed">Em caso de problemas técnicos com linhas móveis, necessidade de novo chip físico, e-SIM ou bloqueio de linhas, o Administrativo deve abrir chamado de Telecom no GLPI e enviar e-mail de requisição direcionado a:</p>
          <ul class="space-y-0.5 font-bold text-slate-800 dark:text-white">
            <li>• Para: <code class="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded font-normal text-[10px]">kelly.huzar@bellinatiperez.com.br</code></li>
            <li>• Para: <code class="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded font-normal text-[10px]">jean.siconha@bellinatiperez.com.br</code></li>
            <li>• Com cópia: <code class="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded font-normal text-[10px]">ricardo.zinke@bellinatiperez.com.br</code></li>
          </ul>
        </div>
        <div class="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-3">
          <h5 class="font-black text-slate-800 dark:text-white uppercase tracking-wide mb-1.5">13.2 Contato Direto com Consultoria Telecom MOAI</h5>
          <p class="mb-2 leading-relaxed">Para auditorias de linhas ativas, cancelamento de números de ex-funcionários, histórico de tráfego de internet móvel e suporte técnico direto:</p>
          <ul class="space-y-0.5 font-bold text-slate-800 dark:text-white">
            <li>• Consultor: <code class="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded font-normal text-[10px]">claudio.basso@moaitecnologia.com</code></li>
            <li>• Suporte: <code class="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded font-normal text-[10px]">valdirene.passos@moaitecnologia.com</code></li>
          </ul>
        </div>
      </div>
    `
  },
  {
    id: "sec-14",
    number: "14",
    title: "Contratos, Fornecedores e Prestadores",
    content: `
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        <strong>14.1 Contratação e Homologação de Serviços:</strong>
      </p>
      <p class="mb-4 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        Toda contratação de serviços técnicos ou fornecimento terceirizado de facilities deve, obrigatoriamente, ser respaldada por um processo de cotação comparativa de preços, exigindo um <strong>mínimo de 3 orçamentos válidos</strong> de concorrentes do mercado. Empresas candidatas devem passar por homologação cadastral perante o setor de Compliance Jurídico e comprovar regularidades fiscais, trabalhistas, laudos de SST (Saúde e Segurança do Trabalho) e habilitações técnicas regulamentares obrigatórias (Ex: CREA, CRT, CFT).
      </p>
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        <strong>14.2 Monitoramento Contínuo de Contratos (SLA e Glosas):</strong>
      </p>
      <p class="mb-4 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        Cada contrato permanente de facilities ativo (Limpeza, Segurança Armada, Telefonia, Climatização) deve possuir obrigatoriamente um Gestor e Fiscal designado formalmente na empresa. A fiscalização de campo deve apurar mensalmente o cumprimento das planilhas de rotinas operacionais, qualidade dos materiais e o cumprimento dos SLAs de chamados técnicos. O descumprimento injustificado de SLA pelo parceiro acarretará em aplicação automática de <strong>glosas financeiras (multas e abatimentos em fatura)</strong> e, em caso de reincidência por dois meses consecutivos, abertura imediata do processo de distrato jurídico.
      </p>
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        <strong>14.3 Avaliação Periódica de Desempenho (Vendor Rating):</strong>
      </p>
      <p class="text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        Todos os fornecedores estratégicos do setor de facilities serão avaliados semestralmente pelas lideranças administrativas de filial. A avaliação de pontuação (de 0% a 100%) considera critérios como: qualidade técnica, atendimento de prazos, conduta ética de colaboradores no local, tempo de resposta a emergências e cumprimento das NRs de SST. Fornecedores que obtiverem avaliação inferior a 70% serão notificados a implantar Plano de Ação de Melhoria Corretiva no prazo de 15 dias úteis e estarão sujeitos a encerramento de contrato.
      </p>
    `
  },
  {
    id: "sec-15",
    number: "15",
    title: "Indicadores de Desempenho — KPIs",
    subsections: [
      {
        title: "Painel de Indicadores Operacionais de Facilities",
        number: "15.1",
        content: `
          <p class="mb-3 text-slate-750 dark:text-slate-300">
            Abaixo estão os indicadores oficiais chave de performance (KPIs) utilizados para auditar e monitorar a eficiência, qualidade e cumprimento orçamentário da Carteira de Facilities:
          </p>
        `,
        table: {
          headers: ["Nome do Indicador (KPI)", "Meta Corporativa", "Frequência de Apuração", "Responsável Técnico"],
          rows: [
            ["Taxa de Cumprimento de SLA (Chamados)", "≥ 90,00% de chamados dentro do prazo", "Apuração Mensal", "Coordenador(a) de Facilities"],
            ["Tempo Médio de Atendimento (TMA)", "Conforme prioridade (Baixa, Média, Alta)", "Apuração Mensal", "Coordenador(a) de Facilities"],
            ["Índice de Satisfação do Usuário (ISU)", "≥ 85,00% de satisfação na pesquisa", "Apuração Trimestral", "Gerente de Facilities"],
            ["% Execução do Plano Preventivo (PAMP)", "100,00% de preventivas executadas", "Apuração Mensal", "Supervisor(a) de Manutenção"],
            ["Custo Corretivo vs. Total Manutenção", "≤ 30,00% de despesas em corretivas", "Apuração Mensal", "Gerente de Facilities e Compras"],
            ["Volume de Chamados GLPI (Abertos x Fechados)", "Fins de monitoramento e volumetria de carga", "Apuração Semanal", "Analista de Qualidade de Processos"],
            ["Avaliação Periódica de Fornecedores", "≥ 70,00% de pontuação mínima de rating", "Apuração Semestral", "Coordenador(a) de Facilities"],
            ["% Pedidos de Compra dentro do SLA (410)", "≥ 90,00% de pedidos processados no prazo", "Apuração Mensal", "Coordenador(a) de Facilities"]
          ]
        }
      },
      {
        title: "Rotina de Reporting de Desempenho",
        number: "15.2",
        content: `
          <ul class="list-disc pl-5 space-y-2 text-xs text-slate-750 dark:text-slate-300 leading-relaxed">
            <li><strong>Relatório Operacional Semanal:</strong> Painel sumário de ordens de serviço (OS) em aberto, andamento e solucionados, taxa de conformidade de SLA e registro de ocorrências prediais críticas. Enviado para ciência do Gerente.</li>
            <li><strong>Relatório Gerencial Mensal:</strong> Consolidado dos KPIs, rateio financeiro de compras do Módulo 410, custos de telecom, despesas de faturamento Uber/Correios, percentual de preventivas PAMP e apuração de bonificação de zeladoras. Apresentado à Superintendência Administrativa.</li>
            <li><strong>Relatório de Revisão Trimestral:</strong> Consolidação de vendor rating, resultados de auditorias prediais de segurança, satisfação de usuários e plano de ação corretivo para desvios recorrentes de SLA.</li>
          </ul>
        `
      }
    ]
  },
  {
    id: "sec-16",
    number: "16",
    title: "Medidas Disciplinares",
    content: `
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        Procedimento padrão para notificar, emitir Termo de Orientação ou solicitar aplicação de Medida Disciplinar (Advertência escrita ou suspensão) a colaboradores que violarem as regras prediais e políticas internas da empresa:
      </p>
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        <strong>16.1 Infrações Elegíveis para Notificação Disciplinar:</strong>
      </p>
      <ul class="list-disc pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
        <li>Descumprimento da Política de Mesa e Tela Limpa (manter anotações com dados de clientes nas PAs).</li>
        <li>Violação de regras de Segurança da Informação (uso de pendrives, celulares na PA ou gravação de telas).</li>
        <li>Furar a catraca de acesso ou ceder/emprestar o crachá corporativo de identificação para terceiros.</li>
        <li>Desperdício voluntário ou dano físico proposital a patrimônio da empresa (Cadeiras, mobiliários, bebedouros).</li>
        <li>Consumo de alimentos e bebidas abertas nas estações de trabalho/PAs (exceto água em garrafas fechadas).</li>
      </ul>
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        <strong>16.2 Fluxo Operacional de Registro de Infração:</strong>
      </p>
      <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed mb-4">
        <li>Abordagem Educativa: O funcionário de Facilities que identificar a irregularidade deve orientar polidamente o colaborador a cessar a infração.</li>
        <li>Coleta de Dados: Caso haja reincidência, desrespeito ou a infração seja de natureza grave (Mesa Limpa/Celular), solicite o CPF do colaborador ou acione seu respectivo Supervisor de Operações.</li>
        <li>Envio do E-mail de Notificação: O Administrativo de filial deve enviar e-mail formal solicitando a emissão da medida disciplinar para os seguintes destinatários:
          <ul class="space-y-0.5 font-bold text-slate-800 dark:text-white mt-1 pl-4">
            <li>• Para: <code class="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded font-normal text-[10px]">medidasdisciplinares@bellinatiperez.com.br</code></li>
            <li>• Para: <code class="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded font-normal text-[10px]">adriel.korbela@bellinatiperez.com.br</code></li>
            <li>• Com cópia: Respectivo Gestor imediato do colaborador infrator e coordenador de Facilities.</li>
          </ul>
        </li>
      </ol>
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        <strong>16.3 Modelo Oficial de E-mail de Solicitação:</strong>
      </p>
      <div class="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl font-mono text-xs text-slate-750 dark:text-slate-300 mb-4 whitespace-pre-wrap leading-relaxed">
Prezados, solicito a emissão de Termo de Orientação / Medida Disciplinar para o colaborador abaixo especificado:

• CPF do funcionário: [Preencher CPF]
• Nome Completo: [Preencher Nome]
• Motivo da Infração: [Especificar o descumprimento, Ex: Celular em PA / Violação de Mesa Limpa]
• Descrição detalhada do ocorrido: [Preencher com clareza a dinâmica do desvio]
• Data do ocorrido: [DD/MM/YYYY]
• Horário de expediente do colaborador: [Apenas em caso de Medida Disciplinar formal]

Gestores imediatos copiados no e-mail. Aguardo o retorno técnico do documento para recolhimento de assinaturas.
      </div>
    `
  },
  {
    id: "sec-17",
    number: "17",
    title: "Boas Práticas, Padronização e Conformidade",
    content: `
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        Para manter um alto padrão de governança e garantir que as rotinas de facilities e processos administrativos transcorram com máxima eficiência, adote as seguintes diretrizes de conformidade:
      </p>
      <ul class="list-disc pl-5 space-y-1.5 text-xs text-slate-750 dark:text-slate-300 leading-relaxed">
        <li><strong>Títulos claros e objetivos nos chamados do GLPI:</strong> Facilita a localização rápida, triagem e encaminhamento das ordens de serviço pelas equipes.</li>
        <li><strong>Selecione a Categoria de Serviço correta:</strong> Evita atrasos de triagem e que o chamado fique 'passeando' entre setores que não são os responsáveis.</li>
        <li><strong>Preenchimento integral das máscaras:</strong> Forneça todas as informações técnicas necessárias na primeira abertura para evitar que o chamado seja devolvido por falta de dados.</li>
        <li><strong>Anexação obrigatória de documentos de comprovação:</strong> Comprovantes de entrega, recibos de correio, notas fiscais, vouchers de almoço e aprovações de D.A. devem ser salvos no ERP (Módulos 353 e 326) e no chamado correspondente.</li>
        <li><strong>Respeite as Alçadas Financeiras de Aprovação:</strong> Nunca execute nenhuma demanda de facilities que exija custos sem antes verificar a aprovação assinada do gestor competente de acordo com a tabela financeira.</li>
        <li><strong>Garantia de Rastreabilidade total:</strong> Todos os registros de interações, decisões, aprovações e cronograma de manutenções prediais devem constar nos sistemas corporativos oficiais para fins de auditoria interna e compliance.</li>
      </ul>
    `
  },
  {
    id: "sec-18",
    number: "18",
    title: "Disposições Gerais e Finais",
    content: `
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        <strong>18.1 Revisão Anual da Normativa:</strong>
      </p>
      <p class="mb-4 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        A presente normativa predial, diretrizes de manutenção civil e manual de processos operacionais administrativos do time de Facilities deve ser revisada formalmente uma vez ao ano, ou extraordinariamente em qualquer período quando houver alterações significativas em layouts físicos, contratações de novos sistemas ou mudanças em legislações estaduais/federais pertinentes. Todas as edições devem ser chanceladas pela Superintendência Administrativa.
      </p>
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        <strong>18.2 Resolução de Casos Omissos:</strong>
      </p>
      <p class="mb-4 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        Todos os casos omissos, incidentes críticos prediais não previstos ou divergências técnicas de interpretação desta normativa serão analisados e chancelados tecnicamente pela Gerência Administrativa de Facilities e Infraestrutura com anuência direta da Superintendência Administrativa, podendo ser consolidados adendos futuros.
      </p>
      <p class="mb-3 text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        <strong>18.3 Início da Vigência:</strong>
      </p>
      <p class="text-slate-750 dark:text-slate-300 leading-relaxed text-xs">
        Esta Normativa unificada e consolidações técnicas entram em vigor na data de publicação oficial no painel corporativo de comunicações, revogando todas as circulares internas anteriores ou comunicados informais que versem sobre o mesmo objeto.
      </p>
    `
  },
  {
    id: "sec-19",
    number: "19",
    title: "Glossário de Termos e Siglas",
    content: `
      <p class="mb-4 text-slate-750 dark:text-slate-300 leading-relaxed">
        Consulte as principais siglas, termos e nomes de sistemas internos referenciados nos fluxos de trabalho administrativo e rotinas de facilities:
      </p>
      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
          <thead>
            <tr class="bg-slate-100 dark:bg-slate-900 font-bold border-b border-slate-200 dark:border-slate-800">
              <th class="p-2.5">Termo / Sigla</th>
              <th class="p-2.5">Significado / Definição Técnica</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-150 dark:divide-slate-850">
            <tr><td class="p-2.5 font-bold">ADM</td><td>Sistema Administrativo integrado corporativo (ERP) contendo os módulos de controle (170, 326, 353, 379, 410).</td></tr>
            <tr><td class="p-2.5 font-bold">AR</td><td>Aviso de Recebimento de correspondências expedidas pelos Correios (comprova a entrega ao destinatário).</td></tr>
            <tr><td class="p-2.5 font-bold">CFTV</td><td>Circuito Fechado de Televisão (sistemas de câmeras de monitoramento e gravação de segurança da filial).</td></tr>
            <tr><td class="p-2.5 font-bold">D.A.</td><td>Documento de Aprovação interna oficial com autorização de despesas e custos assinado por liderança competente.</td></tr>
            <tr><td class="p-2.5 font-bold">D+2</td><td>Prazo limite tolerado de até 2 (dois) dias úteis após a ocorrência do fato para lançamento de faturas e comprovantes.</td></tr>
            <tr><td class="p-2.5 font-bold">DIMEP / DMP</td><td>Marca do sistema de hardware e software online para auditoria de catracas eletrônicas e biometria de acesso predial.</td></tr>
            <tr><td class="p-2.5 font-bold">DML</td><td>Depósito de Material de Limpeza (almoxarifado local da equipe de zeladoria das filiais físicas).</td></tr>
            <tr><td class="p-2.5 font-bold">GLPI</td><td>Gestor Livre de Parque de Informática. Sistema oficial de service desk para abertura de chamados técnicos de suporte.</td></tr>
            <tr><td class="p-2.5 font-bold">ID Financeira</td><td>Identificador e código numérico único gerado pelo ERP que identifica uma despesa faturada para pagamento.</td></tr>
            <tr><td class="p-2.5 font-bold">Módulo 170</td><td>Submenu no ERP responsável pelo controle patrimonial físico e baixa regulamentar de ativos por cancelamento.</td></tr>
            <tr><td class="p-2.5 font-bold">Módulo 326</td><td>Arquivo Digital. Submenu no ERP destinado para arquivar comprovantes PDFs, Notas Fiscais, recibos e autorizações D.A.</td></tr>
            <tr><td class="p-2.5 font-bold">Módulo 353</td><td>Controle de Compras e Lançamentos. Módulo ERP usado para faturar e lançar despesas de concessionárias, Correios e Uber.</td></tr>
            <tr><td class="p-2.5 font-bold">Módulo 379</td><td>Controle de Ativos Home Office. Submenu ERP de comodato de notebooks, periféricos e cadeiras sob custódia em teletrabalho.</td></tr>
            <tr><td class="p-2.5 font-bold">Módulo 410</td><td>Compras e Serviços. Módulo do ERP exclusivo para solicitar compra de bens duráveis, insumos ou contratação de reformas prediais.</td></tr>
            <tr><td class="p-2.5 font-bold">NF</td><td>Nota Fiscal de venda ou prestação de serviços civis.</td></tr>
            <tr><td class="p-2.5 font-bold">PA</td><td>Posto de Atendimento. Estação de trabalho física com mesa, cadeira, computador, monitor e fone de operação.</td></tr>
            <tr><td class="p-2.5 font-bold">PAC</td><td>Prático, Acessível e Conveniente. Encomenda econômica padrão de correspondências e volumes operada pelos Correios.</td></tr>
            <tr><td class="p-2.5 font-bold">Petit Four</td><td>Coquetel ou prato de salgados e biscoitos delicados servidos em recepções executivas de contratantes ou visitas de negócios.</td></tr>
            <tr><td class="p-2.5 font-bold">SGPWeb</td><td>Sistema de Gestão de Pré-Postagem eletrônica contratado com os Correios para emissão de etiquetas e rastreabilidade.</td></tr>
            <tr><td class="p-2.5 font-bold">SLA</td><td>Service Level Agreement. Acordo de nível de serviço com o prazo estipulado para triagem, início ou conclusão de demandas.</td></tr>
            <tr><td class="p-2.5 font-bold">Voucher</td><td>Cupom fiscal / bilhete de autorização digital de almoço emitido pelo ADM para faturamento direto com os restaurantes.</td></tr>
          </tbody>
        </table>
      </div>
    `
  }
];
