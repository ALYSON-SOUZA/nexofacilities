export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  vendedor?: string;
}

export interface QuoteItem {
  id: string;
  name: string;
  quantity: number;
  prices: Record<string, number | null>; // prices[supplierId] = unit price
  currentStock?: number;
  minStock?: number;
  observation?: string;
  preferredSupplierId?: string | null; // preferred supplier for this item
  comprado?: boolean; // whether this item has been bought
}

export interface QuoteState {
  quoteDate: string;
  suppliers: Supplier[];
  items: QuoteItem[];
}

export interface ComparisonSummary {
  supplierTotals: Record<string, number>; // total cost for 100% order with each supplier
  mixedTotal: number; // sum of min cost per item
  bestSupplierId: string | null; // which single supplier has the absolute lowest total
  worstSupplierId: string | null; // which single supplier has the absolute highest total
  savingsVersusWorst: number; // worst single supplier - mixedTotal
  savingsVersusBestUnique: number; // best single supplier - mixedTotal
  itemBestSuppliers: Record<string, string[]>; // item.id -> supplier.id[] (for highlighting cheapest per row)
}

export interface CapacityRow {
  month: string;
  capacity: number;
  value: number;
  isEditablePrice: boolean;
}

export interface SavedItemInfo {
  name: string;
  quantity: number;
  prices: Record<string, number | null>;
}

export interface SavedComparison {
  isValid: boolean;
  savedDate: string;
  monthLabel: string;
  totals: {
    mixedTotal: number;
    totalQuantity: number;
  };
  itemsDetailed: Record<string, SavedItemInfo>;
}

export interface ArchivedQuote {
  id: string; // ex: "COT-001"
  title?: string;
  quoteDate: string;
  userName: string;
  userCpf: string;
  savedAt: string;
  suppliers: Supplier[];
  items: QuoteItem[];
  capacityRows: CapacityRow[];
  summary: ComparisonSummary;
  categoryName?: string;
  categoryId?: string;
  chamadoNumber?: string;
}

export interface Category {
  id: string;
  name: string;
  items: string[];
}

export interface Measurement {
  id: string;
  date: string; // DD/MM/YYYY
  balances: Record<string, number>; // itemId/name -> qty
}

export interface MeiContractData {
  nomeCompleto: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;
  dataNascimento: string;
  naturalidade: string;
  naturalidadeUf: string;
  sexo: "M" | "F" | "";
  grauInstrucao: "1º Grau" | "2º Grau (cursando)" | "2º Grau (completo)" | "Superior (cursando)" | "Superior (completo)" | "";
  estadoCivil: string;
  dataCasamento: string;
  nomeConjuge: string;
  racaCor: "Branca" | "Preta" | "Amarela" | "Parda" | "";
  funcaoAtividade: string;
  cpf: string;
  pis: string;
  pix: string;
  banco: string;
  cnpj: string;
  agencia: string;
  conta: string;
}

export interface TermsResponsibilityData {
  termType: "chaves" | "equipamentos" | "veiculos" | "cartao";
  
  // Dados do Responsável
  nomeCompleto: string;
  cargo: string;
  setor: string;
  cpf: string;
  rg: string;
  telefone: string;
  email: string;

  // Específico - Chaves
  nomeChavePorta: string;
  codigoChave: string;
  localPorta: string;
  observacaoChaves: string;

  // Específico - Equipamentos (Comodato)
  descricaoEquipamento: string;
  marcaModelo: string;
  numeroSerie: string;
  patrimonio: string;
  estadoConservacao: string;
  valorEstimado: string;

  // Específico - Veículos
  modeloVeiculo: string;
  placaVeiculo: string;
  renavamVeiculo: string;
  corVeiculo: string;
  kmInicial: string;
  nivelCombustivel: string;

  // Específico - Cartão Corporativo
  numeroCartao: string;
  bandeiraCartao: string;
  limiteMensal: string;
  finalidadeCartao: string;
}

export interface AprendizContractData {
  id?: string;
  status?: "Ativo" | "Inativo";
  dataDesligamento?: string;
  // 1. Identificação do Aprendiz
  nomeCompleto: string;
  dataNascimento: string;
  idade: string;
  cpf: string;
  rg: string;
  nomeMae: string;
  nomePai: string;
  telefone: string;
  email: string;
  
  // Endereço
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;

  // 2. Responsável Legal (se menor de 18 anos)
  nomeResponsavel: string;
  cpfResponsavel: string;
  rgResponsavel: string;
  parentescoResponsavel: string;
  telefoneResponsavel: string;

  // 3. Dados Escolares
  instituicaoEnsino: string;
  cursoGrau: string;
  turnoEscolar: "Manhã" | "Tarde" | "Noite" | "";
  serieAno: string;

  // 4. Informações do Contrato
  dataAdmissao: string;
  dataTermino: string;
  entidadeQualificadora: string;
  cursoAprendizagem: string;
  tutorSupervisor: string;
  setorAlocacao: string;
  horarioTrabalho: string;

  // 5. Dados Bancários
  banco: string;
  agencia: string;
  conta: string;
  pix: string;

  // Custom scheduling & category fields
  diaTeorica: "Segunda-feira" | "Terça-feira" | "Quarta-feira" | "Quinta-feira" | "Sexta-feira" | "";
  tipoAprendiz: "Administrativo" | "Serviço" | "";
}





