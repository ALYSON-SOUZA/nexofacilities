import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Eye, Plus, Trash2, Calendar, MapPin, User, Check, X, ShieldAlert, 
  Sparkles, ChevronRight, CheckCircle, Volume2, Mic, MicOff, Search, FileText, 
  Download, Send, ArrowLeft, Building2, AlertTriangle, Hammer, Trash, Clock, 
  HelpCircle, MessageSquare, Clipboard, ExternalLink, Mail, Printer, Edit, Edit2, Save, Image 
} from "lucide-react";

// --- EMOJI ICON STANDARDIZATION ---
import { EmojiButton, ICON_MAP } from "./EmojiButton";

// --- Supabase Sync ---
import {
  dbFetchRondas, dbUpsertRonda, dbDeleteRonda,
  dbFetchRondaSalas, dbUpsertRondaSala, dbDeleteRondaSalasByRondaId,
  dbFetchRondaOccurrences, dbUpsertRondaOccurrence, dbDeleteRondaOccurrencesBySalaId,
  dbFetchRondaChamados, dbUpsertRondaChamado, dbDeleteRondaChamadosByRondaId,
  dbUploadRondaPhoto, dbDeleteRondaPhotosByOccurrence,
} from "../supabaseClient";

// --- Types ---
export interface Collaborator {
  nome: string;
  gestor: string;
  filial: string;
  funcao: string;
  email: string;
}

export interface RondaOccurrence {
  id: string;
  type: "autuacao" | "limpeza" | "manutencao";
  description: string;
  images: string[]; // Base64 strings
  createdAt: string; // ISO String
}

export interface RondaSala {
  id: string;
  sala: string;
  gestorSala: string;
  gerenteCarteira: string;
  occurrences: RondaOccurrence[];
}

export interface Ronda {
  id: string; // RD-{FILIAL_SHORT_CODE}-{AAAAMMDD}-{sequencial}
  date: string; // ISO string
  filial: string;
  user: string;
  salas: RondaSala[];
  completed: boolean;
}

export interface RondaChamado {
  id: string; // CH-{id}
  rondaId: string;
  salaId: string;
  occurrenceId: string;
  description: string;
  responsible: string;
  status: "Aberto" | "Em andamento" | "Concluido";
  createdAt: string;
}

// --- Mock / Reference Data ---
export const COLLABORATORS_DATA: Collaborator[] = [
  {"nome":"Alyson de Moura Souza","gestor":"Ane Caroline de Souza Bonete","filial":"Fortaleza/Planalto","funcao":"Coordenador Administrativo","email":"admfortaleza@bellinatiperez.com.br"},
  {"nome":"Ane Caroline de Souza Bonete","gestor":"Rogerio Belinati Garcia Polimeni","filial":"Maringá","funcao":"Gerente Administrativo","email":"ane.bonete@bellinatiperez.com.br"},
  {"nome":"Cleverson Luis Maciel","gestor":"Mateus Daniel Rodrigues Damasceno","filial":"Curitiba/CEBP","funcao":"Assistente Administrativo","email":"cleverson.maciel@bellinatiperez.com.br"},
  {"nome":"David Vidal do Carmo","gestor":"Ricardo de Paula Zinke","filial":"Curitiba/Marechal","funcao":"Coordenador Administrativo","email":"david.carmo@bellinatiperez.com.br"},
  {"nome":"Dayani Aparecida Sinval Siqueira","gestor":"Joao Henrique da Rocha","filial":"Curitiba/Toronto","funcao":"Assistente Administrativo","email":"dayani.siqueira@bellinatiperez.com.br"},
  {"nome":"Diego Machado do Nascimento","gestor":"Alyson de Moura Souza","filial":"Fortaleza/Planalto","funcao":"Assistente Administrativo","email":"diego.nascimento@bellinatiperez.com.br"},
  {"nome":"Erick de Lima Nunes","gestor":"David Vidal do Carmo","filial":"Curitiba/Marechal","funcao":"Assistente Administrativo","email":"erick.nunes@bellinatiperez.com.br"},
  {"nome":"Joao Henrique da Rocha","gestor":"Ricardo de Paula Zinke","filial":"Curitiba/Toronto","funcao":"Coordenador Administrativo","email":"joao.rocha@bellinatiperez.com.br"},
  {"nome":"Kelly Jaqueline Huzar","gestor":"Ricardo de Paula Zinke","filial":"Curitiba Park & Business","funcao":"Coordenador Administrativo","email":"kelly.huzar@bellinatiperez.com.br"},
  {"nome":"Mateus Daniel Rodrigues Damasceno","gestor":"Ricardo de Paula Zinke","filial":"Curitiba/CEBP","funcao":"Coordenador Administrativo","email":"mateus.damasceno@bellinatiperez.com.br"},
  {"nome":"Matheus Amaral de Almeida Pereira","gestor":"Joao Henrique da Rocha","filial":"Curitiba/Toronto","funcao":"Assistente Administrativo","email":"matheus.pereira@bellinatiperez.com.br"},
  {"nome":"Ricardo de Paula Zinke","gestor":"Rogerio Belinati Garcia Polimeni","filial":"Curitiba/Marechal","funcao":"Gerente Executivo Administrativo","email":"ricardo.zinke@bellinatiperez.com.br"},
  {"nome":"Sarah Elaysa Candeo","gestor":"Ane Caroline de Souza Bonete","filial":"Maringá","funcao":"Assistente Administrativo","email":"sarah.candeo@bellinatiperez.com.br"},
  {"nome":"Saudio Weslley Paula da Silva","gestor":"Mateus Daniel Rodrigues Damasceno","filial":"Curitiba/CEBP","funcao":"Assistente Administrativo","email":"saudio.silva@bellinatiperez.com.br"}
];

// Get unique filiais from collaborator database
export const FILIAIS_OPTIONS = Array.from(new Set(COLLABORATORS_DATA.map(c => c.filial))).sort();

interface RondaViewProps {
  onBack: () => void;
  userName?: string;
  visualTheme?: "light" | "comfort" | "ultradark";
}

export default function RondaView({ onBack, userName = "Alyson de Moura Souza", visualTheme = "light" }: RondaViewProps) {
  // --- Persistent Storage (localStorage fast-init + Supabase async sync) ---
  const [rondas, setRondas] = useState<Ronda[]>(() => {
    try {
      const saved = localStorage.getItem("bellinati_rondas_v1");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error loading rondas from localStorage:", e);
    }
    return [];
  });

  const [chamados, setChamados] = useState<RondaChamado[]>(() => {
    try {
      const saved = localStorage.getItem("bellinati_rondas_chamados_v1");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error loading chamados from localStorage:", e);
    }
    return [];
  });

  // --- Supabase: load from cloud on mount ---
  const [isLoadedFromCloud, setIsLoadedFromCloud] = useState(false);

  useEffect(() => {
    async function loadFromSupabase() {
      try {
        // Fetch all rondas from Supabase
        const dbRondas = await dbFetchRondas();
        if (dbRondas.length > 0) {
          // For each ronda, fetch salas, occurrences, and chamados
          const hydratedRondas: Ronda[] = await Promise.all(
            dbRondas.map(async (dbR) => {
              const dbSalas = await dbFetchRondaSalas(dbR.id);
              const salasWithOccurrences: RondaSala[] = await Promise.all(
                dbSalas.map(async (dbS) => {
                  const dbOccs = await dbFetchRondaOccurrences(dbS.id);
                  return {
                    id: dbS.id,
                    sala: dbS.sala,
                    gestorSala: dbS.gestor_sala,
                    gerenteCarteira: dbS.gerente_carteira,
                    occurrences: dbOccs.map((o) => ({
                      id: o.id,
                      type: o.type as RondaOccurrence["type"],
                      description: o.description,
                      images: o.images || [],
                      createdAt: o.created_at,
                    })),
                  };
                })
              );
              return {
                id: dbR.id,
                date: dbR.date,
                filial: dbR.filial,
                user: dbR.user_name,
                salas: salasWithOccurrences,
                completed: dbR.completed,
              };
            })
          );
          setRondas(hydratedRondas);

          // Fetch all chamados
          const allChamados: RondaChamado[] = [];
          for (const r of hydratedRondas) {
            const dbChamados = await dbFetchRondaChamados(r.id);
            for (const ch of dbChamados) {
              allChamados.push({
                id: ch.id,
                rondaId: ch.ronda_id,
                salaId: ch.sala_id,
                occurrenceId: ch.occurrence_id,
                description: ch.description,
                responsible: ch.responsible,
                status: ch.status as RondaChamado["status"],
                createdAt: ch.created_at,
              });
            }
          }
          if (allChamados.length > 0) setChamados(allChamados);
        }
      } catch (err) {
        console.warn("[RondaView] Failed to load from Supabase, using localStorage:", err);
      } finally {
        setIsLoadedFromCloud(true);
      }
    }
    loadFromSupabase();
  }, []);

  // --- Sync to localStorage on every state change ---
  useEffect(() => {
    localStorage.setItem("bellinati_rondas_v1", JSON.stringify(rondas));
  }, [rondas]);

  useEffect(() => {
    localStorage.setItem("bellinati_rondas_chamados_v1", JSON.stringify(chamados));
  }, [chamados]);

  // --- Sync to Supabase (debounced) when data changes after cloud load ---
  useEffect(() => {
    if (!isLoadedFromCloud) return;

    const timeout = setTimeout(async () => {
      try {
        for (const r of rondas) {
          await dbUpsertRonda({
            id: r.id,
            date: r.date,
            filial: r.filial,
            user_name: r.user,
            completed: r.completed,
          });
          for (const s of r.salas) {
            await dbUpsertRondaSala({
              id: s.id,
              ronda_id: r.id,
              sala: s.sala,
              gestor_sala: s.gestorSala,
              gerente_carteira: s.gerenteCarteira,
            });
            for (const o of s.occurrences) {
              await dbUpsertRondaOccurrence({
                id: o.id,
                sala_id: s.id,
                type: o.type,
                description: o.description,
                images: o.images,
              });
            }
          }
        }
        for (const ch of chamados) {
          await dbUpsertRondaChamado({
            id: ch.id,
            ronda_id: ch.rondaId,
            sala_id: ch.salaId,
            occurrence_id: ch.occurrenceId,
            description: ch.description,
            responsible: ch.responsible,
            status: ch.status,
          });
        }
      } catch (err) {
        console.error("[RondaView] Supabase sync failed:", err);
      }
    }, 2000); // 2-second debounce

    return () => clearTimeout(timeout);
  }, [rondas, chamados, isLoadedFromCloud]);

  // --- Sub views state ---
  // "dashboard" | "wizard_ronda" | "history_list" | "detail_view" | "create_chamado"
  const [rondaActiveSubView, setRondaActiveSubView] = useState<"dashboard" | "wizard_ronda" | "history_list" | "detail_view" | "create_chamado">("dashboard");
  
  // Selected Ronda for detailed inspection / PDF / export
  const [selectedRondaId, setSelectedRondaId] = useState<string | null>(null);

  // --- Search / Filter states ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilialFilter, setSelectedFilialFilter] = useState("TODOS");

  // --- Voice Transcription State (Web Speech API) ---
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // --- Drill-down State ---
  const [drillDownConfig, setDrillDownConfig] = useState<{
    title: string;
    type: "rondas" | "occurrences" | "chamados";
    items: any[];
  } | null>(null);

  // --- CRUD Modal States ---
  const [editingRonda, setEditingRonda] = useState<Ronda | null>(null);
  const [editingSala, setEditingSala] = useState<{ rondaId: string; sala: RondaSala } | null>(null);
  const [editingOccurrence, setEditingOccurrence] = useState<{ rondaId: string; salaId: string; occurrence: RondaOccurrence } | null>(null);
  const [editingChamado, setEditingChamado] = useState<RondaChamado | null>(null);
  
  // For adding a new sala directly to an existing ronda
  const [addingSalaToRondaId, setAddingSalaToRondaId] = useState<string | null>(null);
  // For adding a new occurrence directly to an existing sala
  const [addingOccToSala, setAddingOccToSala] = useState<{ rondaId: string; salaId: string } | null>(null);

  // --- Wizard States for "Nova Ronda" ---
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [wizardStep, setWizardStep] = useState<"header" | "sala_form" | "occurrence_form" | "confirm_next" | "ask_next_sala">("header");
  
  // 1. Current Ronda Header values
  const [newRondaFilial, setNewRondaFilial] = useState(() => {
    const currentOperator = COLLABORATORS_DATA.find(c => c.nome === userName);
    return currentOperator ? currentOperator.filial : FILIAIS_OPTIONS[0];
  });
  const [currentRondaId, setCurrentRondaId] = useState<string | null>(null);
  const [currentRondaDate, setCurrentRondaDate] = useState("");
  
  // 2. Current Room values
  const [currentSalaName, setCurrentSalaName] = useState("");
  const [currentSalaGestor, setCurrentSalaGestor] = useState("");
  const [currentSalaGerente, setCurrentSalaGerente] = useState("");
  const [currentRondaSalas, setCurrentRondaSalas] = useState<RondaSala[]>([]);
  
  // 3. Current Occurrence values
  const [currentOccType, setCurrentOccType] = useState<"autuacao" | "limpeza" | "manutencao">("limpeza");
  const [currentOccDesc, setCurrentOccDesc] = useState("");
  const [currentOccImages, setCurrentOccImages] = useState<string[]>([]);
  const [currentSalaOccurrences, setCurrentSalaOccurrences] = useState<RondaOccurrence[]>([]);

  // Autocomplete UI helpers
  const [gestorSuggestions, setGestorSuggestions] = useState<Collaborator[]>([]);
  const [gerenteSuggestions, setGerenteSuggestions] = useState<Collaborator[]>([]);

  // --- Create Ticket (Chamado) Form States ---
  const [ticketRondaId, setTicketRondaId] = useState("");
  const [ticketSalaId, setTicketSalaId] = useState("");
  const [ticketOccurrenceId, setTicketOccurrenceId] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketResponsible, setTicketResponsible] = useState("");
  const [ticketStatus, setTicketStatus] = useState<"Aberto" | "Em andamento" | "Concluido">("Aberto");

  // --- Statistics computations ---
  const stats = useMemo(() => {
    const totalRondas = rondas.length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const rondasThisMonth = rondas.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    let autuacaoCount = 0;
    let limpezaCount = 0;
    let manutencaoCount = 0;
    let totalOccurrences = 0;

    rondas.forEach(r => {
      r.salas.forEach(s => {
        s.occurrences.forEach(o => {
          totalOccurrences++;
          if (o.type === "autuacao") autuacaoCount++;
          if (o.type === "limpeza") limpezaCount++;
          if (o.type === "manutencao") manutencaoCount++;
        });
      });
    });

    const totalChamados = chamados.length;
    const chamadosConcluidos = chamados.filter(c => c.status === "Concluido").length;
    const chamadosAbertos = totalChamados - chamadosConcluidos;

    const lastRonda = rondas.length > 0 ? [...rondas].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;

    return {
      totalRondas,
      rondasThisMonth,
      totalOccurrences,
      autuacaoCount,
      limpezaCount,
      manutencaoCount,
      totalChamados,
      chamadosAbertos,
      chamadosConcluidos,
      lastRonda
    };
  }, [rondas, chamados]);

  // Filtered Rondas List
  const filteredRondas = useMemo(() => {
    return rondas.filter(r => {
      const matchFilial = selectedFilialFilter === "TODOS" || r.filial === selectedFilialFilter;
      
      const query = searchTerm.toLowerCase().trim();
      if (!query) return matchFilial;

      const matchId = r.id.toLowerCase().includes(query);
      const matchFilialName = r.filial.toLowerCase().includes(query);
      const matchUser = r.user.toLowerCase().includes(query);
      
      const matchSalas = r.salas.some(s => {
        const matchSalaName = s.sala.toLowerCase().includes(query);
        const matchGestor = s.gestorSala.toLowerCase().includes(query);
        const matchGerente = s.gerenteCarteira.toLowerCase().includes(query);
        const matchOccs = s.occurrences.some(o => o.description.toLowerCase().includes(query));
        return matchSalaName || matchGestor || matchGerente || matchOccs;
      });

      return matchFilial && (matchId || matchFilialName || matchUser || matchSalas);
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rondas, selectedFilialFilter, searchTerm]);

  // Selected Ronda Details
  const selectedRondaDetail = useMemo(() => {
    return rondas.find(r => r.id === selectedRondaId) || null;
  }, [rondas, selectedRondaId]);

  // Flat list of all occurrences across all rondas for stats drill-down
  const flatOccurrences = useMemo(() => {
    const list: Array<{
      rondaId: string;
      rondaFilial: string;
      rondaDate: string;
      rondaUser: string;
      salaId: string;
      salaName: string;
      occurrence: RondaOccurrence;
    }> = [];
    rondas.forEach(r => {
      r.salas.forEach(s => {
        s.occurrences.forEach(o => {
          list.push({
            rondaId: r.id,
            rondaFilial: r.filial,
            rondaDate: r.date,
            rondaUser: r.user,
            salaId: s.id,
            salaName: s.sala,
            occurrence: o
          });
        });
      });
    });
    return list;
  }, [rondas]);

  // --- Voice Input Logic using Web Speech API ---
  const handleStartVoiceRecording = (targetSetter: React.Dispatch<React.SetStateAction<string>>) => {
    setSpeechError(null);
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSpeechError("A API de reconhecimento de voz não é suportada neste navegador.");
      setIsRecording(true);
      const timer = setTimeout(() => {
        setIsRecording(false);
        const voiceMocks = [
          "Ar condicionado pingando água muito forte sobre os computadores da mesa principal.",
          "Verificamos que a lâmpada do canto esquerdo da sala 215 está queimada.",
          "Falta de sabonete líquido e papel toalha no banheiro masculino do andar.",
          "Fios expostos na caixa de tomadas sob a mesa de reuniões da diretoria."
        ];
        const randomMock = voiceMocks[Math.floor(Math.random() * voiceMocks.length)];
        targetSetter(prev => prev ? `${prev} ${randomMock}` : randomMock);
      }, 3000);
      recognitionRef.current = { stop: () => clearTimeout(timer) };
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = "pt-BR";
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        if (e.error === "not-allowed") {
          setSpeechError("Acesso ao microfone negado. Verifique as permissões de privacidade do seu navegador.");
        } else if (e.error === "no-speech") {
          setSpeechError("Nenhuma fala foi detectada. Por favor, tente novamente falando mais próximo ao microfone.");
        } else if (e.error === "audio-capture") {
          setSpeechError("Nenhum microfone encontrado. Se estiver usando um notebook ou headset, verifique se ele está selecionado como padrão nas configurações de som do seu sistema.");
        } else if (e.error === "network") {
          setSpeechError("Erro de comunicação com os servidores de voz. Verifique sua conexão com a Internet.");
        } else {
          setSpeechError(`Erro no reconhecimento de voz: ${e.error || 'desconhecido'}.`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          targetSetter(prev => prev ? `${prev} ${transcript}` : transcript);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  const handlePasteEventGeneric = (
    e: React.ClipboardEvent<HTMLTextAreaElement> | React.ClipboardEvent<HTMLDivElement>, 
    imageSetter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    let imageFound = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          imageFound = true;
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === "string") {
              imageSetter(prev => [...prev, reader.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
    if (imageFound) {
      e.preventDefault();
    }
  };

  // --- Autocomplete Handling ---
  const handleGestorSearch = (val: string) => {
    setCurrentSalaGestor(val);
    if (!val.trim()) {
      setGestorSuggestions([]);
      return;
    }
    const filtered = COLLABORATORS_DATA.filter(c => 
      c.nome.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 5);
    setGestorSuggestions(filtered);
  };

  const handleGerenteSearch = (val: string) => {
    setCurrentSalaGerente(val);
    if (!val.trim()) {
      setGerenteSuggestions([]);
      return;
    }
    const filtered = COLLABORATORS_DATA.filter(c => 
      c.nome.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 5);
    setGerenteSuggestions(filtered);
  };

  // Select autocomplete suggestion
  const selectGestor = (colab: Collaborator) => {
    setCurrentSalaGestor(colab.nome);
    setGestorSuggestions([]);
    // Automatically pre-fill the manager of this collaborator if possible
    if (colab.gestor) {
      setCurrentSalaGerente(colab.gestor);
    }
  };

  const selectGerente = (colab: Collaborator) => {
    setCurrentSalaGerente(colab.nome);
    setGerenteSuggestions([]);
  };

  // --- Photo Attachments Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setCurrentOccImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePasteEvent = (e: React.ClipboardEvent<HTMLTextAreaElement> | React.ClipboardEvent<HTMLDivElement>) => {
    handlePasteEventGeneric(e, setCurrentOccImages);
  };

  // --- Nova Ronda Flow ---
  const startNewRondaFlow = () => {
    const defaultFilial = COLLABORATORS_DATA.find(c => c.nome === userName)?.filial || FILIAIS_OPTIONS[0];
    setNewRondaFilial(defaultFilial);
    setCurrentRondaSalas([]);
    setCurrentSalaOccurrences([]);
    setCurrentRondaId(null);
    
    // Clear room inputs
    setCurrentSalaName("");
    setCurrentSalaGestor("");
    setCurrentSalaGerente("");

    setWizardStep("header");
    setRondaActiveSubView("wizard_ronda");
  };

  const handleSaveRondaHeader = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    setCurrentRondaDate(now.toISOString());
    
    // Generate a beautiful short name abbreviation for the ID
    const shortFilial = newRondaFilial
      .replace("Fortaleza/", "FORT-")
      .replace("Curitiba/", "CUR-")
      .replace("Maringá", "MAR-")
      .substring(0, 4)
      .toUpperCase();
    
    const formattedDate = now.getFullYear() + 
      String(now.getMonth() + 1).padStart(2, '0') + 
      String(now.getDate()).padStart(2, '0');
    
    const sequence = rondas.filter(r => r.id.includes(formattedDate)).length + 1;
    const generatedId = `RD-${shortFilial.replace("-","")}-${formattedDate}-${String(sequence).padStart(3, "0")}`;
    
    setCurrentRondaId(generatedId);
    setWizardStep("sala_form");
  };

  const handleSaveSalaHeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSalaName.trim()) return;
    
    // Proceed to register occurrences in this room
    setCurrentOccType("limpeza");
    setCurrentOccDesc("");
    setCurrentOccImages([]);
    setWizardStep("occurrence_form");
  };

  const handleAddOccurrence = () => {
    if (!currentOccDesc.trim()) return;

    const newOcc: RondaOccurrence = {
      id: `occ-${Date.now()}`,
      type: currentOccType,
      description: currentOccDesc.trim(),
      images: currentOccImages,
      createdAt: new Date().toISOString()
    };

    setCurrentSalaOccurrences(prev => [...prev, newOcc]);

    // Reset occurrence form
    setCurrentOccDesc("");
    setCurrentOccImages([]);

    // Ask if wants another occurrence in this room, or finish room
    setWizardStep("confirm_next");
  };

  const handleAddAnotherOccurrenceInSameSala = () => {
    setWizardStep("occurrence_form");
  };

  const handleFinishSalaAndAskNext = () => {
    // Add current room to room list
    const newSala: RondaSala = {
      id: `sala-${Date.now()}`,
      sala: currentSalaName.trim(),
      gestorSala: currentSalaGestor.trim() || "Não Informado",
      gerenteCarteira: currentSalaGerente.trim() || "Não Informado",
      occurrences: currentSalaOccurrences
    };

    setCurrentRondaSalas(prev => [...prev, newSala]);
    
    // Clear the occurrences list for the next room
    setCurrentSalaOccurrences([]);

    // Go to step asking if they want to add another room
    setWizardStep("ask_next_sala");
  };

  const handleAddAnotherSala = () => {
    // Clear room form and go back to sala_form step
    setCurrentSalaName("");
    setCurrentSalaGestor("");
    setCurrentSalaGerente("");
    setWizardStep("sala_form");
  };

  const handleCompleteRonda = () => {
    // Save entire Ronda
    const finishedRonda: Ronda = {
      id: currentRondaId || `RD-TEMP-${Date.now()}`,
      date: currentRondaDate,
      filial: newRondaFilial,
      user: userName,
      salas: currentRondaSalas,
      completed: true
    };

    setRondas(prev => [finishedRonda, ...prev]);
    setRondaActiveSubView("dashboard");
    alert(`Ronda ${finishedRonda.id} salva com sucesso com ${finishedRonda.salas.length} sala(s)!`);
  };

  // --- Ticket (Chamado) Management ---
  const handleOpenCreateChamado = (rondaId?: string, salaId?: string, occId?: string) => {
    setTicketRondaId(rondaId || rondas[0]?.id || "");
    setTicketSalaId(salaId || "");
    setTicketOccurrenceId(occId || "");
    setTicketDescription("");
    setTicketResponsible("");
    setTicketStatus("Aberto");
    setRondaActiveSubView("create_chamado");
  };

  // Find occurrences for selected ticket ronda
  const ticketRondaSalas = useMemo(() => {
    const r = rondas.find(x => x.id === ticketRondaId);
    return r ? r.salas : [];
  }, [ticketRondaId, rondas]);

  const handleSaveChamado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketRondaId || !ticketDescription.trim()) return;

    const newChamado: RondaChamado = {
      id: `CH-${String(chamados.length + 1).padStart(3, "0")}`,
      rondaId: ticketRondaId,
      salaId: ticketSalaId,
      occurrenceId: ticketOccurrenceId,
      description: ticketDescription,
      responsible: ticketResponsible || userName,
      status: ticketStatus,
      createdAt: new Date().toISOString()
    };

    setChamados(prev => [newChamado, ...prev]);
    setRondaActiveSubView("dashboard");
    alert(`Chamado ${newChamado.id} criado com sucesso vinculado à ronda ${newChamado.rondaId}!`);
  };

  const handleUpdateChamadoStatus = (chamadoId: string, newStatus: "Aberto" | "Em andamento" | "Concluido") => {
    setChamados(prev => prev.map(c => c.id === chamadoId ? { ...c, status: newStatus } : c));
  };

  // --- Standardized Report File Name Generator ---
  const handleGerarNomeArquivoRelatorio = (ronda: Ronda): string => {
    const cleanFilial = ronda.filial
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");
    
    const cleanUsuario = ronda.user
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");

    const d = new Date(ronda.date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    return `${ronda.id}_${cleanFilial}_${cleanUsuario}_${dateStr}`;
  };

  // --- CRUD Operation Handlers ---
  const handleSaveEditedRonda = (updated: Ronda) => {
    setRondas(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditingRonda(null);
  };

  const handleDeleteRonda = (rondaId: string) => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente a ronda ${rondaId}? Esta ação é irreversível e apagará todas as ocorrências e chamados vinculados.`)) {
      setRondas(prev => prev.filter(r => r.id !== rondaId));
      setChamados(prev => prev.filter(c => c.rondaId !== rondaId));
      if (selectedRondaId === rondaId) {
        setSelectedRondaId(null);
        setRondaActiveSubView("dashboard");
      }
      setDrillDownConfig(null);
      // Async delete from Supabase (cascades via FK)
      dbDeleteRonda(rondaId).catch((err) =>
        console.error("[RondaView] Failed to delete ronda from Supabase:", err)
      );
      alert("Ronda excluída com sucesso!");
    }
  };

  const handleSaveEditedSala = (rondaId: string, updatedSala: RondaSala) => {
    setRondas(prev => prev.map(r => {
      if (r.id !== rondaId) return r;
      return {
        ...r,
        salas: r.salas.map(s => s.id === updatedSala.id ? updatedSala : s)
      };
    }));
    setEditingSala(null);
  };

  const handleDeleteSala = (rondaId: string, salaId: string, salaName: string) => {
    if (window.confirm(`Tem certeza que deseja remover o ambiente "${salaName}" desta ronda?`)) {
      setRondas(prev => prev.map(r => {
        if (r.id !== rondaId) return r;
        return {
          ...r,
          salas: r.salas.filter(s => s.id !== salaId)
        };
      }));
      alert("Ambiente removido com sucesso!");
    }
  };

  const handleAddSalaToRonda = (rondaId: string, newSalaName: string, gestor: string, gerente: string) => {
    const newSala: RondaSala = {
      id: `sala-${Date.now()}`,
      sala: newSalaName.trim(),
      gestorSala: gestor.trim() || "Não Informado",
      gerenteCarteira: gerente.trim() || "Não Informado",
      occurrences: []
    };
    setRondas(prev => prev.map(r => {
      if (r.id !== rondaId) return r;
      return {
        ...r,
        salas: [...r.salas, newSala]
      };
    }));
    setAddingSalaToRondaId(null);
    alert("Ambiente adicionado com sucesso!");
  };

  const handleSaveEditedOccurrence = (rondaId: string, salaId: string, updatedOcc: RondaOccurrence) => {
    setRondas(prev => prev.map(r => {
      if (r.id !== rondaId) return r;
      return {
        ...r,
        salas: r.salas.map(s => {
          if (s.id !== salaId) return s;
          return {
            ...s,
            occurrences: s.occurrences.map(o => o.id === updatedOcc.id ? updatedOcc : o)
          };
        })
      };
    }));
    setEditingOccurrence(null);
  };

  const handleDeleteOccurrence = (rondaId: string, salaId: string, occId: string) => {
    if (window.confirm("Deseja realmente excluir esta ocorrência permanentemente?")) {
      setRondas(prev => prev.map(r => {
        if (r.id !== rondaId) return r;
        return {
          ...r,
          salas: r.salas.map(s => {
            if (s.id !== salaId) return s;
            return {
              ...s,
              occurrences: s.occurrences.filter(o => o.id !== occId)
            };
          })
        };
      }));
      alert("Ocorrência removida!");
    }
  };

  const handleAddOccToSala = (rondaId: string, salaId: string, type: "autuacao" | "limpeza" | "manutencao", desc: string, images: string[]) => {
    const newOcc: RondaOccurrence = {
      id: `occ-${Date.now()}`,
      type,
      description: desc.trim(),
      images,
      createdAt: new Date().toISOString()
    };
    setRondas(prev => prev.map(r => {
      if (r.id !== rondaId) return r;
      return {
        ...r,
        salas: r.salas.map(s => {
          if (s.id !== salaId) return s;
          return {
            ...s,
            occurrences: [...s.occurrences, newOcc]
          };
        })
      };
    }));
    setAddingOccToSala(null);
    alert("Ocorrência registrada!");
  };

  const handleSaveEditedChamado = (updated: RondaChamado) => {
    setChamados(prev => prev.map(c => c.id === updated.id ? updated : c));
    setEditingChamado(null);
  };

  const handleDeleteChamado = (chamadoId: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o chamado ${chamadoId}?`)) {
      setChamados(prev => prev.filter(c => c.id !== chamadoId));
      setEditingChamado(null);
      setDrillDownConfig(null);
      // Async delete from Supabase
      import("../supabaseClient").then(({ supabase }) =>
        supabase.from("ronda_chamados").delete().eq("id", chamadoId)
      ).catch((err) =>
        console.error("[RondaView] Failed to delete chamado from Supabase:", err)
      );
      alert("Chamado excluído!");
    }
  };

  // Export report to WhatsApp
  const handleExportToWhatsApp = (ronda: Ronda) => {
    let reportText = `*RELATÓRIO DE RONDA BP — ${ronda.id}*\n`;
    reportText += `*Filial:* ${ronda.filial}\n`;
    reportText += `*Responsável:* ${ronda.user}\n`;
    reportText += `*Data:* ${new Date(ronda.date).toLocaleDateString("pt-BR")} às ${new Date(ronda.date).toLocaleTimeString("pt-BR")}\n\n`;
    reportText += `*SALA(S) VISTORADA(S):*\n`;

    ronda.salas.forEach((s, sIdx) => {
      reportText += `\n*${sIdx + 1}. Sala:* ${s.sala}\n`;
      reportText += `   *Gestor:* ${s.gestorSala} / *Gerente:* ${s.gerenteCarteira}\n`;
      if (s.occurrences.length === 0) {
        reportText += `   _Nenhuma ocorrência registrada nesta sala._\n`;
      } else {
        s.occurrences.forEach((o, oIdx) => {
          const typeEmoji = o.type === "autuacao" ? "🟥 [AUTUAÇÃO]" : o.type === "limpeza" ? "🟦 [LIMPEZA]" : "🟨 [MANUTENÇÃO]";
          reportText += `   • ${typeEmoji} ${o.description}\n`;
        });
      }
    });

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(reportText)}`;
    window.open(url, "_blank");
  };

  // Export report to Email
  const handleExportToEmail = (ronda: Ronda) => {
    const subject = `Relatório de Ronda BP - ${ronda.id} (${ronda.filial})`;
    let body = `Olá,\n\nSegue o resumo da ronda de vistorias realizada na filial ${ronda.filial}:\n\n`;
    body += `ID da Ronda: ${ronda.id}\n`;
    body += `Responsável: ${ronda.user}\n`;
    body += `Data: ${new Date(ronda.date).toLocaleString("pt-BR")}\n\n`;
    body += `SALA(S) VISTORADA(S):\n`;

    ronda.salas.forEach((s, sIdx) => {
      body += `\n${sIdx + 1}. Sala: ${s.sala}\n`;
      body += `Gestor: ${s.gestorSala} / Gerente de Carteira: ${s.gerenteCarteira}\n`;
      if (s.occurrences.length === 0) {
        body += `Nenhuma ocorrência registrada nesta sala.\n`;
      } else {
        s.occurrences.forEach((o) => {
          body += `- [${o.type.toUpperCase()}] ${o.description}\n`;
        });
      }
    });

    body += `\n\nGerado pelo sistema integrado Nexo Facilities Bellinati Perez.`;

    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
  };

  // Direct print handler with sandboxed iframe fallback help (exactly like COTAÇÃO)
  const handlePrint = () => {
    const originalTitle = document.title;
    try {
      if (selectedRondaDetail) {
        document.title = `${selectedRondaDetail.id} - ${selectedRondaDetail.filial}`;
      }
      window.focus();
      window.print();
    } catch (e) {
      console.error("Erro ao imprimir:", e);
    } finally {
      // Restore the tab title after a short delay so browser print captures the overridden title
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }
    const isIframe = window.self !== window.top;
    if (isIframe) {
      setShowPrintModal(true);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 select-none animate-fade-in print:p-0 print:m-0 print:max-w-none print:shadow-none">
      
      {/* HEADER BAR (print:hidden) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Voltar ao mapa comparativo"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="bp-badge bp-badge-pink">
              MÓDULO DE RONDA
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-1.5 leading-tight">
              <Eye className="h-6 w-6 text-[#ff2a6d]" /> Ronda & Vistoria Predial
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-500" />
            <span>{userName}</span>
          </div>

          <EmojiButton
            iconKey={rondaActiveSubView === "dashboard" ? "novaRonda" : "dashboard"}
            onClick={() => {
              if (rondaActiveSubView === "dashboard") {
                startNewRondaFlow();
              } else {
                setRondaActiveSubView("dashboard");
              }
            }}
            variant="primary"
            size="md"
          />
        </div>
      </div>

      {/* ----------------- SUB-VIEW: DASHBOARD ----------------- */}
      {rondaActiveSubView === "dashboard" && (
        <div className="space-y-6 print:hidden">
          
          {/* STATS TILES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            
            <div 
              onClick={() => setDrillDownConfig({ title: "Todas as Rondas de Vistoria", type: "rondas", items: rondas })}
              className="ramp-surface p-2.5 sm:p-4 flex flex-col justify-between cursor-pointer hover:border-[#ff2a6d] hover:scale-[1.01] transition-all group"
            >
              <span className="text-[9px] sm:text-[11px] font-black uppercase text-slate-500 tracking-wider group-hover:text-[#ff2a6d] transition-colors">Rondas</span>
              <div className="flex items-baseline gap-1 sm:gap-1.5 mt-1 sm:mt-2">
                <span className="text-xl sm:text-3xl font-black text-slate-800">{stats.totalRondas}</span>
                <span className="text-[9px] sm:text-[11px] font-bold text-slate-500">vist.</span>
              </div>
              <span className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 flex items-center gap-1 truncate">{stats.rondasThisMonth} no mês <span className="text-[#ff2a6d] hidden sm:inline">🔍 ver</span></span>
            </div>
 
            <div 
              onClick={() => setDrillDownConfig({ title: "Todas as Ocorrências Registradas", type: "occurrences", items: flatOccurrences })}
              className="ramp-surface p-2.5 sm:p-4 flex flex-col justify-between cursor-pointer hover:border-[#ff2a6d] hover:scale-[1.01] transition-all group"
            >
              <span className="text-[9px] sm:text-[11px] font-black uppercase text-slate-500 tracking-wider group-hover:text-[#ff2a6d] transition-colors">Ocorrências</span>
              <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-1 sm:mt-2 text-center text-[9px] sm:text-[11px] font-black">
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrillDownConfig({ title: "Ocorrências de Autuação", type: "occurrences", items: flatOccurrences.filter(x => x.occurrence.type === "autuacao") });
                  }}
                  className="p-1 sm:p-1.5 bg-red-50 text-[#ff2a6d] rounded-lg hover:bg-red-100 transition-colors"
                  title="Filtrar por Autuação"
                >
                  <span className="block text-xs sm:text-sm">{stats.autuacaoCount}</span> Aut
                </div>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrillDownConfig({ title: "Ocorrências de Limpeza e Organização", type: "occurrences", items: flatOccurrences.filter(x => x.occurrence.type === "limpeza") });
                  }}
                  className="p-1 sm:p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  title="Filtrar por Limpeza"
                >
                  <span className="block text-xs sm:text-sm">{stats.limpezaCount}</span> Limp
                </div>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrillDownConfig({ title: "Ocorrências de Manutenção Física", type: "occurrences", items: flatOccurrences.filter(x => x.occurrence.type === "manutencao") });
                  }}
                  className="p-1 sm:p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                  title="Filtrar por Manutenção"
                >
                  <span className="block text-xs sm:text-sm">{stats.manutencaoCount}</span> Manut
                </div>
              </div>
              <span className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 flex items-center justify-between">
                <span>Total: {stats.totalOccurrences}</span>
                <span className="text-[#ff2a6d] font-bold hidden sm:inline">Ver tudo</span>
              </span>
            </div>
 
            <div 
              onClick={() => setDrillDownConfig({ title: "Todos os Chamados Técnicos", type: "chamados", items: chamados })}
              className="ramp-surface p-2.5 sm:p-4 flex flex-col justify-between cursor-pointer hover:border-[#ff2a6d] hover:scale-[1.01] transition-all group"
            >
              <span className="text-[9px] sm:text-[11px] font-black uppercase text-slate-500 tracking-wider group-hover:text-[#ff2a6d] transition-colors">Chamados</span>
              <div className="flex items-baseline gap-1 sm:gap-1.5 mt-1 sm:mt-2">
                <span className="text-xl sm:text-3xl font-black text-slate-800">{stats.totalChamados}</span>
                <span className="text-[9px] sm:text-[11px] text-[#ff2a6d] font-extrabold">{stats.chamadosAbertos} abertos</span>
              </div>
              <span className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 flex items-center justify-between">
                <span>Concluídos: {stats.chamadosConcluidos}</span>
                <span className="text-[#ff2a6d] font-bold hidden sm:inline">🔍 ver</span>
              </span>
            </div>
 
            <div 
              onClick={() => {
                if (stats.lastRonda) {
                  setSelectedRondaId(stats.lastRonda.id);
                  setRondaActiveSubView("detail_view");
                } else {
                  setDrillDownConfig({ title: "Todas as Rondas de Vistoria", type: "rondas", items: rondas });
                }
              }}
              className="ramp-surface p-2.5 sm:p-4 flex flex-col justify-between cursor-pointer hover:border-[#ff2a6d] hover:scale-[1.01] transition-all group"
            >
              <span className="text-[9px] sm:text-[11px] font-black uppercase text-slate-500 tracking-wider group-hover:text-[#ff2a6d] transition-colors">Último Registro</span>
              {stats.lastRonda ? (
                <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs">
                  <p className="font-extrabold text-slate-800 leading-tight truncate">{stats.lastRonda.filial}</p>
                  <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5">{new Date(stats.lastRonda.date).toLocaleDateString("pt-BR")}</p>
                </div>
              ) : (
                <p className="text-[9px] sm:text-[11px] text-slate-500 mt-1 sm:mt-2">Nenhum registro.</p>
              )}
              <span className="text-[9px] sm:text-[11px] text-[#ff2a6d] font-bold mt-0.5 sm:mt-1 flex items-center justify-between">
                <span className="hidden sm:inline">Bellinati Perez</span>
                <span>→</span>
              </span>
            </div>
 
          </div>

          {/* TWO COLUMN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1 & 2: RECENT ROUNDS AND SEARCH */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                  <Clock className="h-4 w-4 text-slate-500" /> Rondas de Vistoria Recentes
                </h2>

                <button
                  onClick={() => setRondaActiveSubView("history_list")}
                  className="text-[11px] font-bold text-[#ff2a6d] hover:underline"
                >
                  Ver todos os registros ({rondas.length}) →
                </button>
              </div>

              {/* SEARCH FILTER BAR */}
              <div className="flex flex-col sm:flex-row gap-2 bg-white p-2 border border-slate-200 rounded-xl">
                <div className="flex-1 flex items-center gap-2 px-2.5">
                  <Search className="h-4 w-4 text-slate-500 shrink-0" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por filial, ID, gestor, sala ou ocorrência..."
                    className="w-full bg-transparent border-none text-xs font-semibold focus:outline-hidden text-slate-800"
                  />
                </div>

                <select
                  value={selectedFilialFilter}
                  onChange={(e) => setSelectedFilialFilter(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:outline-hidden"
                >
                  <option value="TODOS">Todas as Filiais</option>
                  {FILIAIS_OPTIONS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* ROUNDS LIST CARD */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {filteredRondas.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 font-semibold text-xs">
                    Nenhuma ronda encontrada para o filtro selecionado.
                  </div>
                ) : (
                  filteredRondas.slice(0, 5).map((r) => {
                    // Count total occurrences inside this round
                    let occTotal = 0;
                    r.salas.forEach(s => { occTotal += s.occurrences.length; });

                    return (
                      <div key={r.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                        <div className="space-y-1 pr-4 truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-slate-800">{r.id}</span>
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px] font-black uppercase">
                              {r.filial}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-bold">
                            Vistoriado por {r.user} em {new Date(r.date).toLocaleDateString("pt-BR")}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold">
                            <span>🏢 {r.salas.length} salas visitadas</span>
                            <span>🚨 {occTotal} ocorrências</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <EmojiButton
                            iconKey="verDetalhes"
                            onClick={() => {
                              setSelectedRondaId(r.id);
                              setRondaActiveSubView("detail_view");
                            }}
                            size="sm"
                          />

                          <EmojiButton
                            iconKey="exportarWhatsApp"
                            onClick={() => handleExportToWhatsApp(r)}
                            size="sm"
                            className="bg-emerald-50 hover:bg-[#25D366] hover:text-white border-emerald-100"
                            variant="custom"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMN 3: SERVICE TICKETS & ACTIONS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4 text-slate-500" /> Chamados de Manutenção
                </h2>
                
                <EmojiButton
                  iconKey="criarChamado"
                  onClick={() => handleOpenCreateChamado()}
                  size="sm"
                  variant="primary"
                />
              </div>

              {/* TICKETS LIST */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-sm">
                {chamados.length === 0 ? (
                  <p className="text-[11px] text-slate-500 font-bold text-center py-4">Nenhum chamado de manutenção em aberto.</p>
                ) : (
                  chamados.slice(0, 4).map(c => {
                    return (
                      <div key={c.id} className="text-xs space-y-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-slate-800">{c.id}</span>
                          
                          <select
                            value={c.status}
                            onChange={(e) => handleUpdateChamadoStatus(c.id, e.target.value as any)}
                            className={`text-[11px] font-black uppercase tracking-wide rounded-full px-2 py-0.5 border leading-none cursor-pointer focus:outline-hidden ${
                              c.status === "Concluido"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : c.status === "Em andamento"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            <option value="Aberto">Aberto</option>
                            <option value="Em andamento">Em andamento</option>
                            <option value="Concluido">Concluído</option>
                          </select>
                        </div>

                        <p className="font-semibold text-slate-700 leading-normal line-clamp-2">{c.description}</p>
                        
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold pt-1 border-t border-slate-100">
                          <span>Ref: {c.rondaId}</span>
                          <span>Resp: {c.responsible.split(" ")[0]}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* GRAPHICS / RATIO SVG PIE CHART */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                <span className="block text-[11px] font-black uppercase text-slate-500 tracking-wider leading-none">Distribuição de Ocorrências</span>
                
                {stats.totalOccurrences === 0 ? (
                  <p className="text-[11px] text-slate-500 font-bold text-center py-6">Registros insuficientes para gráfico.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    {/* Tiny visual chart bar stack */}
                    <div className="w-full space-y-2">
                      <div 
                        onClick={() => setDrillDownConfig({ title: "Ocorrências de Autuação", type: "occurrences", items: flatOccurrences.filter(x => x.occurrence.type === "autuacao") })}
                        className="cursor-pointer hover:bg-red-50/50 p-1 rounded-lg transition-colors group"
                        title="Ver ocorrências de Autuação"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-0.5">
                          <span className="flex items-center gap-1 group-hover:text-[#ff2a6d]"><span className="h-2 w-2 rounded-full bg-[#ff2a6d]"></span> Autuação</span>
                          <span>{stats.autuacaoCount} ({Math.round(stats.autuacaoCount / stats.totalOccurrences * 100)}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#ff2a6d] h-full transition-all" style={{ width: `${(stats.autuacaoCount / stats.totalOccurrences) * 100}%` }}></div>
                        </div>
                      </div>
 
                      <div 
                        onClick={() => setDrillDownConfig({ title: "Ocorrências de Limpeza e Organização", type: "occurrences", items: flatOccurrences.filter(x => x.occurrence.type === "limpeza") })}
                        className="cursor-pointer hover:bg-blue-50/50 p-1 rounded-lg transition-colors group"
                        title="Ver ocorrências de Limpeza"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-0.5">
                          <span className="flex items-center gap-1 group-hover:text-blue-500"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Limpeza e Organização</span>
                          <span>{stats.limpezaCount} ({Math.round(stats.limpezaCount / stats.totalOccurrences * 100)}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full transition-all" style={{ width: `${(stats.limpezaCount / stats.totalOccurrences) * 100}%` }}></div>
                        </div>
                      </div>
 
                      <div 
                        onClick={() => setDrillDownConfig({ title: "Ocorrências de Manutenção Física", type: "occurrences", items: flatOccurrences.filter(x => x.occurrence.type === "manutencao") })}
                        className="cursor-pointer hover:bg-amber-50/50 p-1 rounded-lg transition-colors group"
                        title="Ver ocorrências de Manutenção"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-0.5">
                          <span className="flex items-center gap-1 group-hover:text-amber-500"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Manutenção Física</span>
                          <span>{stats.manutencaoCount} ({Math.round(stats.manutencaoCount / stats.totalOccurrences * 100)}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full transition-all" style={{ width: `${(stats.manutencaoCount / stats.totalOccurrences) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ----------------- SUB-VIEW: HISTORY ALL RECORDS ----------------- */}
      {rondaActiveSubView === "history_list" && (
        <div className="space-y-4 print:hidden">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-black text-sm text-slate-800 uppercase tracking-wide">Histórico de Rondas Cadastradas</h2>
            <EmojiButton 
              iconKey="voltar"
              onClick={() => setRondaActiveSubView("dashboard")}
              size="sm"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {filteredRondas.map((r) => (
              <div key={r.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 pr-4 truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-800">{r.id}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px] font-black uppercase">
                      {r.filial}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-bold">
                    Registrado em {new Date(r.date).toLocaleString("pt-BR")} por {r.user}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Salas visitadas: {r.salas.map(s => s.sala).join(", ")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <EmojiButton
                    iconKey="verDetalhes"
                    onClick={() => {
                      setSelectedRondaId(r.id);
                      setRondaActiveSubView("detail_view");
                    }}
                    size="sm"
                  />
                  <EmojiButton
                    iconKey="exportarWhatsApp"
                    onClick={() => handleExportToWhatsApp(r)}
                    size="sm"
                    className="bg-emerald-50 hover:bg-[#25D366] hover:text-white border-emerald-100"
                    variant="custom"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- SUB-VIEW: NOVA RONDA (WIZARD FORM) ----------------- */}
      {rondaActiveSubView === "wizard_ronda" && (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-md print:hidden">
          
          {/* Header Wizard indicator */}
          <div className="bg-[#111c2e] text-white p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-black tracking-widest uppercase text-slate-500">Ronda em Andamento</span>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                {currentRondaId || "Nova Ronda"}
              </h2>
            </div>
            <button
              onClick={() => {
                if (window.confirm("Deseja mesmo cancelar esta ronda? Todos os dados não finalizados serão descartados.")) {
                  setRondaActiveSubView("dashboard");
                }
              }}
              className="p-1 rounded-full text-slate-500 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            
            {/* STEP: HEADER (Choose Filial) */}
            {wizardStep === "header" && (
              <form onSubmit={handleSaveRondaHeader} className="space-y-5">
                <div className="bg-[#ff2a6d]/5 p-4 rounded-2xl border border-[#ff2a6d]/10 flex items-start gap-3">
                  <span className="text-xl">📍</span>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-[#ff2a6d] uppercase tracking-wide">Passo 1: Selecionar Filial para Vistoria</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Escolha a filial onde a ronda de vistoria está sendo realizada:</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Filial de Vistoria *</label>
                    <select
                      value={newRondaFilial}
                      onChange={(e) => setNewRondaFilial(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#ff2a6d] bg-white text-slate-700"
                    >
                      {FILIAIS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Metadata cards showing operator & date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center gap-2.5">
                      <User className="h-4 w-4 text-slate-500 shrink-0" />
                      <div className="space-y-0.5">
                        <span className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">Operador Responsável</span>
                        <span className="block text-xs font-bold text-slate-700">{userName}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                      <div className="space-y-0.5">
                        <span className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">Data de Início</span>
                        <span className="block text-xs font-bold text-slate-700">{new Date().toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-2 justify-center">
                  <EmojiButton
                    iconKey="voltar"
                    onClick={() => setRondaActiveSubView("dashboard")}
                    size="md"
                    variant="neutral"
                  />
                  <EmojiButton
                    iconKey="continuarVistoria"
                    type="submit"
                    size="md"
                    variant="primary"
                  />
                </div>
              </form>
            )}

            {/* STEP: SALA_FORM (Room header input) */}
            {wizardStep === "sala_form" && (
              <form onSubmit={handleSaveSalaHeader} className="space-y-5">
                <div className="bg-[#ff2a6d]/5 p-4 rounded-2xl border border-[#ff2a6d]/10 flex items-start gap-3">
                  <span className="text-xl">🏢</span>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-[#ff2a6d] uppercase tracking-wide">Passo 2: Identificar a Sala / Andar</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Informe os detalhes do ambiente físico vistoriado agora:</p>
                  </div>
                </div>

                <div className="space-y-4">
                  
                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Identificação da Sala *</label>
                    <input 
                      type="text" 
                      required
                      value={currentSalaName}
                      onChange={(e) => setCurrentSalaName(e.target.value)}
                      placeholder="Ex: Sala de Operações 201, Copa, Recepção"
                      className="w-full rounded-xl border border-slate-200 p-3 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#ff2a6d]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Gestor da Sala with Autocomplete */}
                    <div className="flex flex-col space-y-1 relative">
                      <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Gestor da Sala</label>
                      <input 
                        type="text" 
                        value={currentSalaGestor}
                        onChange={(e) => handleGestorSearch(e.target.value)}
                        placeholder="Nome do gestor da sala..."
                        className="w-full rounded-xl border border-slate-200 p-3 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#ff2a6d]"
                      />
                      {gestorSuggestions.length > 0 && (
                        <div className="absolute top-[100%] left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10 overflow-hidden divide-y divide-slate-100">
                          {gestorSuggestions.map(col => (
                            <button
                              key={col.nome}
                              type="button"
                              onClick={() => selectGestor(col)}
                              className="w-full text-left p-2.5 hover:bg-slate-50 text-[11px] font-bold text-slate-700 block"
                            >
                              <span className="block">{col.nome}</span>
                              <span className="block text-[11px] text-slate-500 font-semibold">{col.funcao} — {col.filial}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Gerente da Carteira with Autocomplete */}
                    <div className="flex flex-col space-y-1 relative">
                      <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Gerente da Carteira</label>
                      <input 
                        type="text" 
                        value={currentSalaGerente}
                        onChange={(e) => handleGerenteSearch(e.target.value)}
                        placeholder="Nome do gerente de carteira..."
                        className="w-full rounded-xl border border-slate-200 p-3 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#ff2a6d]"
                      />
                      {gerenteSuggestions.length > 0 && (
                        <div className="absolute top-[100%] left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10 overflow-hidden divide-y divide-slate-100">
                          {gerenteSuggestions.map(col => (
                            <button
                              key={col.nome}
                              type="button"
                              onClick={() => selectGerente(col)}
                              className="w-full text-left p-2.5 hover:bg-slate-50 text-[11px] font-bold text-slate-700 block"
                            >
                              <span>{col.nome}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-2 justify-center">
                  <EmojiButton
                    iconKey="voltar"
                    onClick={() => setWizardStep("header")}
                    size="md"
                    variant="neutral"
                  />
                  <EmojiButton
                    iconKey="continuarVistoria"
                    type="submit"
                    size="md"
                    variant="primary"
                  />
                </div>
              </form>
            )}

            {/* STEP: OCCURRENCE_FORM (Fill occurrence) */}
            {wizardStep === "occurrence_form" && (
              <div className="space-y-5">
                
                <div className="bg-[#ff2a6d]/5 p-4 rounded-2xl border border-[#ff2a6d]/10">
                  <span className="text-[11px] font-black text-[#ff2a6d] uppercase tracking-wide block">Ambiente: {currentSalaName}</span>
                  <p className="text-[11px] text-slate-500 font-bold mt-1">Registre se identificou alguma inconformidade ou problema de manutenção/limpeza nesta sala:</p>
                </div>

                {/* Chips visual choice of classification */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Tipo de Ocorrência *</label>
                  <div className="grid grid-cols-3 gap-2">
                    
                    <EmojiButton
                      iconKey="tipoAutuacao"
                      onClick={() => setCurrentOccType("autuacao")}
                      variant={currentOccType === "autuacao" ? "danger" : "neutral"}
                      size="lg"
                    />

                    <EmojiButton
                      iconKey="tipoLimpeza"
                      onClick={() => setCurrentOccType("limpeza")}
                      variant={currentOccType === "limpeza" ? "primary" : "neutral"}
                      size="lg"
                    />

                    <EmojiButton
                      iconKey="tipoManutencao"
                      onClick={() => setCurrentOccType("manutencao")}
                      variant={currentOccType === "manutencao" ? "success" : "neutral"}
                      size="lg"
                    />

                  </div>
                </div>

                {/* Occurrence text entry with microphone dictation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Descrição Detalhada *</label>
                    
                    {/* Voice Recognition Dictation Button */}
                    <EmojiButton
                      iconKey="ditarVoz"
                      onClick={() => handleStartVoiceRecording(setCurrentOccDesc)}
                      variant={isRecording ? "danger" : "neutral"}
                      size="sm"
                      className={isRecording ? "animate-pulse" : ""}
                    />
                  </div>

                  {speechError && (
                    <p className="text-[11px] text-red-600 font-bold">{speechError}</p>
                  )}

                  <textarea
                    rows={4}
                    value={currentOccDesc}
                    onChange={(e) => setCurrentOccDesc(e.target.value)}
                    onPaste={handlePasteEvent}
                    placeholder="Cole fotos diretamente aqui (Ctrl+V) ou digite a descrição detalhada do problema físico..."
                    className="w-full rounded-xl border border-slate-200 p-3 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#ff2a6d] bg-slate-50/20 focus:bg-white transition-all resize-none"
                  />
                </div>

                {/* Image Captures */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Anexo Fotográfico (Fotos da Ocorrência)</label>
                  
                  {/* Visual 3-way trigger */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    
                    <label className="border border-dashed border-slate-300 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 cursor-pointer text-center">
                      <span className="text-lg">📷</span>
                      <span className="text-[11px] font-black text-slate-600 uppercase">Tirar Foto / Anexar</span>
                      <span className="text-[11px] text-slate-500 font-bold">Use a câmera do celular/tablet</span>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleFileChange}
                        className="hidden" 
                      />
                    </label>

                    <div className="border border-slate-200 rounded-xl p-3 flex flex-col justify-center items-center text-center bg-slate-50">
                      <span className="text-lg">📋</span>
                      <span className="text-[11px] font-black text-slate-600 uppercase">Colar Clipboard (Ctrl+V)</span>
                      <span className="text-[11px] text-slate-500 font-bold">Basta colar com a área de texto focada</span>
                    </div>

                  </div>

                  {/* Thumbnail Previews */}
                  {currentOccImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {currentOccImages.map((img, idx) => (
                        <div key={idx} className="relative h-14 w-14 rounded-lg overflow-hidden border border-slate-200 group">
                          <img src={img} alt="Preview" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setCurrentOccImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold"
                          >
                            Excluir
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-2 justify-center">
                  <EmojiButton
                    iconKey="voltar"
                    onClick={() => {
                      if (currentSalaOccurrences.length > 0) {
                        setWizardStep("confirm_next");
                      } else {
                        setWizardStep("sala_form");
                      }
                    }}
                    size="md"
                    variant="neutral"
                  />
                  <EmojiButton
                    iconKey="salvar"
                    disabled={!currentOccDesc.trim()}
                    onClick={handleAddOccurrence}
                    size="md"
                    variant="primary"
                  />
                </div>

              </div>
            )}

            {/* STEP: CONFIRM_NEXT */}
            {wizardStep === "confirm_next" && (
              <div className="text-center py-6 space-y-6">
                
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-black text-slate-900 uppercase">Ocorrência Registrada com Sucesso!</h3>
                  <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto">
                    A inconformidade do tipo <strong className="text-slate-800 uppercase font-bold">{currentOccType}</strong> foi inserida no mapa de vistoria temporário da sala.
                  </p>
                </div>

                <div className="flex gap-4 justify-center pt-4">
                  <EmojiButton
                    iconKey="continuarVistoria"
                    onClick={handleAddAnotherOccurrenceInSameSala}
                    size="md"
                    variant="neutral"
                  />
                  <EmojiButton
                    iconKey="finalizarOcorrencia"
                    onClick={handleFinishSalaAndAskNext}
                    size="md"
                    variant="primary"
                  />
                </div>

              </div>
            )}

            {/* STEP: ASK_NEXT_SALA */}
            {wizardStep === "ask_next_sala" && (
              <div className="text-center py-6 space-y-6">
                
                <div className="mx-auto h-12 w-12 rounded-full bg-red-50 text-[#ff2a6d] flex items-center justify-center border border-red-100">
                  <Building2 className="h-5 w-5" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-black text-slate-900 uppercase">Ambiente Registrado!</h3>
                  <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto">
                    A sala/ambiente foi inserido com sucesso na sua lista de vistoria atual.
                  </p>
                  <div className="mt-3 inline-block bg-slate-50 border border-slate-150 px-3.5 py-1.5 rounded-full text-[11px] text-slate-600 font-bold">
                    Total nesta Ronda: <span className="text-[#ff2a6d] font-extrabold">{currentRondaSalas.length} sala(s)</span>
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-left max-w-md mx-auto">
                  <p className="text-[11px] text-slate-500 uppercase font-black tracking-wider text-center">O que deseja fazer agora?</p>
                </div>

                <div className="flex gap-4 justify-center pt-2">
                  <EmojiButton
                    iconKey="adicionarSala"
                    onClick={handleAddAnotherSala}
                    size="md"
                    variant="neutral"
                  />
                  <EmojiButton
                    iconKey="finalizarVistoria"
                    onClick={handleCompleteRonda}
                    size="md"
                    variant="primary"
                  />
                </div>

              </div>
            )}

          </div>

        </div>
      )}

      {/* ----------------- SUB-VIEW: TICKETS GENERATION FORM ----------------- */}
      {rondaActiveSubView === "create_chamado" && (
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-md print:hidden">
          
          <div className="bg-[#111c2e] text-white p-5 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="h-5 w-5 text-[#ff2a6d]" /> Abertura de Chamado de Manutenção
            </h2>
            <button
              onClick={() => setRondaActiveSubView("dashboard")}
              className="p-1 rounded-full text-slate-500 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSaveChamado} className="p-6 space-y-5">
            
            {/* Ronda Origin Selector */}
            <div className="flex flex-col space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Selecione a Ronda de Origem *</label>
              <select
                value={ticketRondaId}
                onChange={(e) => {
                  setTicketRondaId(e.target.value);
                  setTicketSalaId("");
                  setTicketOccurrenceId("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#ff2a6d]"
              >
                <option value="">Selecione uma ronda recente...</option>
                {rondas.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.id} — {r.filial} ({new Date(r.date).toLocaleDateString("pt-BR")})
                  </option>
                ))}
              </select>
            </div>

            {/* Room Selector based on Ronda */}
            {ticketRondaId && (
              <div className="flex flex-col space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Sala / Andar de Origem *</label>
                <select
                  value={ticketSalaId}
                  onChange={(e) => {
                    setTicketSalaId(e.target.value);
                    setTicketOccurrenceId("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#ff2a6d]"
                >
                  <option value="">Selecione a sala visitada...</option>
                  {ticketRondaSalas.map(s => (
                    <option key={s.id} value={s.id}>{s.sala}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Specific Occurrence selector based on Room */}
            {ticketSalaId && (
              <div className="flex flex-col space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Inconformidade / Ocorrência de Origem *</label>
                <select
                  value={ticketOccurrenceId}
                  onChange={(e) => {
                    setTicketOccurrenceId(e.target.value);
                    // Pre-fill ticket description with occurrence text to save typing!
                    const selectedRoom = ticketRondaSalas.find(s => s.id === ticketSalaId);
                    const selectedOcc = selectedRoom?.occurrences.find(o => o.id === e.target.value);
                    if (selectedOcc) {
                      setTicketDescription(`Providenciar solução para: ${selectedOcc.description}`);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#ff2a6d]"
                >
                  <option value="">Selecione a ocorrência identificada...</option>
                  {ticketRondaSalas.find(s => s.id === ticketSalaId)?.occurrences.map(o => (
                    <option key={o.id} value={o.id}>
                      [{o.type.toUpperCase()}] {o.description.substring(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Ticket Description */}
            <div className="flex flex-col space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Ação de Solução Proposta *</label>
              <textarea
                required
                rows={4}
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                placeholder="Ex: Acionar prestador terceirizado de elétrica para substituição de fiação exposta e lâmpadas danificadas."
                className="w-full rounded-xl border border-slate-200 p-3 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#ff2a6d] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              
              <div className="flex flex-col space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Responsável / Supervisor</label>
                <input 
                  type="text"
                  value={ticketResponsible}
                  onChange={(e) => setTicketResponsible(e.target.value)}
                  placeholder="Nome do responsável..."
                  className="w-full rounded-xl border border-slate-200 p-3 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#ff2a6d]"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Status Inicial</label>
                <select
                  value={ticketStatus}
                  onChange={(e) => setTicketStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#ff2a6d]"
                >
                  <option value="Aberto">Aberto</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Concluido">Concluído</option>
                </select>
              </div>

            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2 justify-center">
              <EmojiButton
                iconKey="voltar"
                onClick={() => setRondaActiveSubView("dashboard")}
                size="md"
                variant="neutral"
              />
              <EmojiButton
                iconKey="salvar"
                type="submit"
                size="md"
                variant="primary"
              />
            </div>

          </form>

        </div>
      )}

      {/* ----------------- SUB-VIEW: RONDA DETAILED / CORPORATE REPORT VIEW (PRINT-FRIENDLY) ----------------- */}
      {rondaActiveSubView === "detail_view" && selectedRondaDetail && (
        <div className="space-y-6">
          
          {/* Action Header bar for export options (print:hidden) */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 print:hidden">
            <EmojiButton
              iconKey="voltar"
              onClick={() => setRondaActiveSubView("dashboard")}
              size="sm"
            />

            <div className="flex items-center gap-2">
              
              <EmojiButton
                iconKey="exportarWhatsApp"
                onClick={() => handleExportToWhatsApp(selectedRondaDetail)}
                size="sm"
                className="bg-emerald-50 hover:bg-[#25D366] hover:text-white border-emerald-100"
                variant="custom"
              />

              <EmojiButton
                iconKey="exportarEmail"
                onClick={() => handleExportToEmail(selectedRondaDetail)}
                size="sm"
                className="bg-blue-50 hover:bg-blue-600 hover:text-white border-blue-100"
                variant="custom"
              />

              <EmojiButton
                iconKey="imprimir"
                onClick={handlePrint}
                size="sm"
                variant="neutral"
              />

            </div>
          </div>

          {/* THE PRINTABLE REPORT BODY */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 sm:p-8 space-y-6 shadow-md print:shadow-none print:border-none print:p-0 print:text-[11px]/tight">
            
            {/* CORPORATE MODEL HEADER (replicating the Bellinati Perez look) */}
            <div className="border border-slate-400">
              
              {/* Row 1: Header title */}
              <div className="grid grid-cols-4 border-b border-slate-400 bg-[#4D4D4D] text-white p-3 items-center">
                <div className="col-span-1 flex flex-col justify-center">
                  <span className="font-display font-black text-[12px] sm:text-sm tracking-widest leading-none">Bellinati Perez</span>
                  <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">Facilities & Operações</span>
                </div>
                <div className="col-span-2 text-center">
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                    RELATÓRIO DE RONDA E VISTORIA PREDIAL
                  </h2>
                </div>
                <div className="col-span-1 text-right font-mono text-[11px] text-slate-300">
                  REF: {selectedRondaDetail.id}
                </div>
              </div>

              {/* Row 2: Metadata grid table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-400 text-[11px] font-semibold text-slate-700 bg-slate-50/50">
                <div className="p-2 space-y-0.5">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase">Data da Vistoria:</span>
                  <span className="font-extrabold text-slate-800">
                    {new Date(selectedRondaDetail.date).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="p-2 space-y-0.5">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase">Hora de Início:</span>
                  <span className="font-extrabold text-slate-800">
                    {new Date(selectedRondaDetail.date).toLocaleTimeString("pt-BR")}
                  </span>
                </div>
                <div className="p-2 space-y-0.5">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase">Filial Responsável:</span>
                  <span className="font-extrabold text-slate-[#ff2a6d] uppercase">
                    {selectedRondaDetail.filial}
                  </span>
                </div>
                <div className="p-2 space-y-0.5">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase">Responsável Operacional:</span>
                  <span className="font-extrabold text-slate-800 uppercase">
                    {selectedRondaDetail.user}
                  </span>
                </div>
              </div>

            </div>

            {/* SEÇÃO 1: OBJETIVO DO TRABALHO */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider underline decoration-[#ff2a6d] decoration-2 underline-offset-4">
                1. Objetivo e Parecer Técnico
              </h3>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed text-justify">
                Este documento oficial registra as conformidades e inconformidades físicas constatadas durante a ronda rotineira do profissional de Facilities no ambiente de trabalho. Visando a melhoria contínua da estrutura predial da Bellinati Perez, a prevenção de acidentes de trabalho e a conservação do patrimônio predial.
              </p>
            </div>

            {/* SEÇÃO 2: DADOS DAS SALAS VISITADAS */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider underline decoration-[#ff2a6d] decoration-2 underline-offset-4">
                2. Salas e Andares Inspecionados
              </h3>
              
              <div className="overflow-hidden border border-slate-300 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#4D4D4D] text-white font-black text-[11px] uppercase">
                      <th className="p-2.5 border-r border-slate-300">Sala / Ambiente Visitado</th>
                      <th className="p-2.5 border-r border-slate-300">Gestor Responsável</th>
                      <th className="p-2.5">Gerente de Carteira / Diretor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-semibold text-slate-700">
                    {selectedRondaDetail.salas.map((s, idx) => (
                      <tr key={s.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="p-2.5 border-r border-slate-300 uppercase font-black text-slate-800">{s.sala}</td>
                        <td className="p-2.5 border-r border-slate-300 uppercase">{s.gestorSala}</td>
                        <td className="p-2.5 uppercase">{s.gerenteCarteira}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO 3: REGISTRO DAS OCORRÊNCIAS */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider underline decoration-[#ff2a6d] decoration-2 underline-offset-4">
                3. Mapa de Inconformidades e Ocorrências
              </h3>

              <div className="space-y-4">
                {selectedRondaDetail.salas.map(s => {
                  const roomOccs = s.occurrences;
                  if (roomOccs.length === 0) {
                    return (
                      <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-500">
                        🏢 Ambiente: <span className="uppercase text-slate-800 font-black">{s.sala}</span> — Nenhuma ocorrência ou inconformidade registrada nesta sala.
                      </div>
                    );
                  }

                  return (
                    <div key={s.id} className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                      <div className="border-b pb-2 flex justify-between items-center bg-slate-50 -mx-4 -mt-4 p-3 rounded-t-xl border-slate-200">
                        <span className="font-black text-xs text-slate-800 uppercase">🏢 {s.sala}</span>
                        <span className="text-[11px] text-slate-500 font-bold">Gestor: {s.gestorSala}</span>
                      </div>

                      <div className="divide-y divide-slate-100 space-y-3 pt-1">
                        {roomOccs.map((o) => {
                          const badgeColor = 
                            o.type === "autuacao" 
                              ? "bg-red-50 text-[#ff2a6d] border-red-200" 
                              : o.type === "limpeza"
                              ? "bg-blue-50 text-blue-600 border-blue-200"
                              : "bg-amber-50 text-amber-600 border-amber-200";

                          return (
                            <div key={o.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row gap-3">
                              
                              {/* Left side details */}
                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeColor}`}>
                                    {o.type}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-semibold font-mono">
                                    🕒 {new Date(o.createdAt).toLocaleTimeString("pt-BR")}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-700 leading-normal">
                                  {o.description}
                                </p>
                              </div>

                              {/* Right side tiny previews for report inline visualization */}
                              {o.images.length > 0 && (
                                <div className="flex gap-1.5 shrink-0">
                                  {o.images.map((img, iIdx) => (
                                    <div key={iIdx} className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200">
                                      <img src={img} alt="Thumb" className="h-full w-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO 4: CHAMADOS DE SOLUÇÃO VINCULADOS */}
            {chamados.filter(c => c.rondaId === selectedRondaDetail.id).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider underline decoration-[#ff2a6d] decoration-2 underline-offset-4">
                  4. Ações Corretivas e Chamados Gerados
                </h3>
                
                <div className="overflow-hidden border border-slate-300 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#4D4D4D] text-white font-black text-[11px] uppercase">
                        <th className="p-2 border-r border-slate-300">Nº Chamado</th>
                        <th className="p-2 border-r border-slate-300">Ação Corretiva Proposta</th>
                        <th className="p-2 border-r border-slate-300">Responsável</th>
                        <th className="p-2">Status Atual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 font-semibold text-slate-700">
                      {chamados.filter(c => c.rondaId === selectedRondaDetail.id).map(c => (
                        <tr key={c.id}>
                          <td className="p-2 border-r border-slate-300 font-mono font-black">{c.id}</td>
                          <td className="p-2 border-r border-slate-300">{c.description}</td>
                          <td className="p-2 border-r border-slate-300 uppercase">{c.responsible}</td>
                          <td className="p-2 uppercase font-black text-slate-900">{c.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SEÇÃO 5: ANEXO FOTOGRÁFICO FINAL (Max 4 photos per page/row layout) */}
            {(() => {
              // Extract all images in this Ronda
              const allImages: { src: string; room: string; desc: string }[] = [];
              selectedRondaDetail.salas.forEach(s => {
                s.occurrences.forEach(o => {
                  o.images.forEach(img => {
                    allImages.push({
                      src: img,
                      room: s.sala,
                      desc: o.description
                    });
                  });
                });
              });

              if (allImages.length === 0) return null;

              return (
                <div className="space-y-3 pt-6 border-t border-slate-200 page-break-before">
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider underline decoration-[#ff2a6d] decoration-2 underline-offset-4">
                    5. Anexo Fotográfico Detalhado (Evidências)
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {allImages.map((img, index) => (
                      <div key={index} className="border border-slate-300 rounded-xl p-2 bg-white space-y-1.5 flex flex-col justify-between">
                        <div className="h-44 sm:h-52 w-full overflow-hidden rounded-lg bg-slate-100">
                          <img src={img.src} alt={`Evidência ${index + 1}`} className="h-full w-full object-cover" />
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold">
                          <span className="block font-black text-slate-800 uppercase truncate">Ambiente: {img.room}</span>
                          <span className="block italic truncate">{img.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* SIGNATURE FIELDS */}
            <div className="pt-12 grid grid-cols-2 gap-8 text-center text-[11px] font-bold text-slate-500 print:pt-6">
              <div className="space-y-1">
                <div className="border-t border-slate-400 w-full pt-1 uppercase">
                  {selectedRondaDetail.user}
                </div>
                <span>Responsável Técnico pela Ronda</span>
              </div>
              <div className="space-y-1">
                <div className="border-t border-slate-400 w-full pt-1">
                  GESTÃO DE FACILITIES BP
                </div>
                <span>Aprovação e Recebimento</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* -------------------- DRILL-DOWN MODAL & PORTAL ------------------------- */}
      {/* ========================================================================= */}
      {drillDownConfig && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-md border border-slate-100 animate-scale-up">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="bg-[#ff2a6d]/10 text-[#ff2a6d] font-black text-[11px] px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Módulo de Consulta Drill-Down
                </span>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mt-1">
                  <Clipboard className="h-5 w-5 text-[#ff2a6d]" /> {drillDownConfig.title}
                </h3>
              </div>
              <button 
                onClick={() => setDrillDownConfig(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content list */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
              
              {drillDownConfig.items.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <AlertTriangle className="h-8 w-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-500">Nenhum registro encontrado nesta categoria.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  
                  {/* TYPE: RONDAS */}
                  {drillDownConfig.type === "rondas" && drillDownConfig.items.map((r: Ronda) => (
                    <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-800 text-sm">{r.id}</span>
                          <span className="bg-slate-100 text-slate-600 font-extrabold text-[11px] px-2 py-0.5 rounded-full uppercase">
                            {r.filial}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Realizada por <strong className="text-slate-700">{r.user}</strong> em {new Date(r.date).toLocaleString("pt-BR")}
                        </p>
                        <p className="text-xs text-[#ff2a6d] font-black uppercase tracking-wider">
                          {r.salas.length} ambiente(s) vistoriado(s)
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedRondaId(r.id);
                            setRondaActiveSubView("detail_view");
                            setDrillDownConfig(null);
                          }}
                          className="px-3 py-1.5 bg-[#ff2a6d] hover:bg-[#c21e54] text-white font-black text-xs uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> Relatório
                        </button>
                        <button 
                          onClick={() => setEditingRonda(r)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                          title="Editar Ronda"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRonda(r.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                          title="Excluir Ronda"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* TYPE: OCCURRENCES */}
                  {drillDownConfig.type === "occurrences" && drillDownConfig.items.map((item) => {
                    const o: RondaOccurrence = item.occurrence;
                    const badgeColor = 
                      o.type === "autuacao" 
                        ? "bg-red-50 text-[#ff2a6d] border-red-200" 
                        : o.type === "limpeza"
                        ? "bg-blue-50 text-blue-600 border-blue-200"
                        : "bg-amber-50 text-amber-600 border-amber-200";

                    return (
                      <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-all">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-500">{item.rondaId}</span>
                            <span className="bg-slate-100 text-slate-600 font-bold text-[11px] px-2 py-0.5 rounded-full uppercase">
                              {item.rondaFilial}
                            </span>
                            <span className="text-slate-500">/</span>
                            <span className="font-bold text-xs text-slate-700 uppercase">Ambiente: {item.salaName}</span>
                          </div>
                          <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeColor}`}>
                            {o.type}
                          </span>
                        </div>
                        
                        <p className="text-xs font-semibold text-slate-700 leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {o.description}
                        </p>

                        {o.images && o.images.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto py-1">
                            {o.images.map((img: string, idx: number) => (
                              <div key={idx} className="h-16 w-16 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                                <img src={img} alt="Preview" className="h-full w-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold border-t border-slate-100 pt-2.5">
                          <span>Registrado por {item.rondaUser} em {new Date(o.createdAt).toLocaleString("pt-BR")}</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                handleOpenCreateChamado(item.rondaId, item.salaId, o.id);
                                setDrillDownConfig(null);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-[#ff2a6d]/10 hover:text-[#ff2a6d] text-slate-700 rounded-md transition-colors"
                            >
                              + Gerar Chamado
                            </button>
                            <button 
                              onClick={() => setEditingOccurrence({ rondaId: item.rondaId, salaId: item.salaId, occurrence: o })}
                              className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                              title="Editar Ocorrência"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => {
                                handleDeleteOccurrence(item.rondaId, item.salaId, o.id);
                                setDrillDownConfig(null);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors"
                              title="Excluir Ocorrência"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* TYPE: CHAMADOS */}
                  {drillDownConfig.type === "chamados" && drillDownConfig.items.map((c: RondaChamado) => (
                    <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-all">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-800 text-sm">{c.id}</span>
                          <span className="text-[11px] text-slate-500 font-bold">Ronda vinculada: {c.rondaId}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <select 
                            value={c.status}
                            onChange={(e) => handleUpdateChamadoStatus(c.id, e.target.value as any)}
                            className="text-[11px] font-black uppercase px-2 py-1 rounded-md border border-slate-200 bg-white focus:border-[#ff2a6d] outline-none"
                          >
                            <option value="Aberto">Aberto</option>
                            <option value="Em andamento">Em andamento</option>
                            <option value="Concluido">Concluído</option>
                          </select>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-slate-700 leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {c.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold border-t border-slate-100 pt-2.5">
                        <span>Responsável: <strong className="text-slate-600 uppercase">{c.responsible}</strong> — Criado em {new Date(c.createdAt).toLocaleDateString("pt-BR")}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setEditingChamado(c)}
                            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                            title="Editar Chamado"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteChamado(c.id)}
                            className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors"
                            title="Excluir Chamado"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50">
              <button 
                onClick={() => setDrillDownConfig(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-colors"
              >
                Fechar Consulta
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* -------------------- EDIT RONDA MODAL ----------------------------------- */}
      {/* ========================================================================= */}
      {editingRonda && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-md border border-slate-100 animate-scale-up">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Editar Identificação da Ronda</h3>
              <button onClick={() => setEditingRonda(null)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">ID da Ronda</label>
                <input type="text" disabled value={editingRonda.id} className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-xs font-mono font-bold text-slate-600" />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Filial</label>
                <select 
                  value={editingRonda.filial}
                  onChange={(e) => setEditingRonda({ ...editingRonda, filial: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:border-[#ff2a6d] outline-none"
                >
                  {FILIAIS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Data/Hora</label>
                <input 
                  type="datetime-local" 
                  value={new Date(editingRonda.date).toISOString().slice(0, 16)} 
                  onChange={(e) => setEditingRonda({ ...editingRonda, date: new Date(e.target.value).toISOString() })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:border-[#ff2a6d] outline-none" 
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button onClick={() => setEditingRonda(null)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase rounded-lg">Cancelar</button>
              <button onClick={() => handleSaveEditedRonda(editingRonda)} className="px-4 py-1.5 bg-[#ff2a6d] hover:bg-[#c21e54] text-white font-black text-xs uppercase rounded-lg">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* -------------------- EDIT SALA (AMBIENTE) MODAL ------------------------ */}
      {/* ========================================================================= */}
      {editingSala && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-md border border-slate-100 animate-scale-up">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Editar Ambiente Vistoriado</h3>
              <button onClick={() => setEditingSala(null)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Nome do Ambiente / Sala</label>
                <input 
                  type="text" 
                  value={editingSala.sala.sala} 
                  onChange={(e) => setEditingSala({ ...editingSala, sala: { ...editingSala.sala, sala: e.target.value } })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:border-[#ff2a6d] outline-none" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Gestor do Ambiente</label>
                <input 
                  type="text" 
                  value={editingSala.sala.gestorSala} 
                  onChange={(e) => setEditingSala({ ...editingSala, sala: { ...editingSala.sala, gestorSala: e.target.value } })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:border-[#ff2a6d] outline-none" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Gerente de Carteira</label>
                <input 
                  type="text" 
                  value={editingSala.sala.gerenteCarteira} 
                  onChange={(e) => setEditingSala({ ...editingSala, sala: { ...editingSala.sala, gerenteCarteira: e.target.value } })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:border-[#ff2a6d] outline-none" 
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button onClick={() => setEditingSala(null)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase rounded-lg">Cancelar</button>
              <button onClick={() => handleSaveEditedSala(editingSala.rondaId, editingSala.sala)} className="px-4 py-1.5 bg-[#ff2a6d] hover:bg-[#c21e54] text-white font-black text-xs uppercase rounded-lg">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* -------------------- ADD SALA TO RONDA MODAL ----------------------------- */}
      {/* ========================================================================= */}
      {addingSalaToRondaId && (() => {
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleAddSalaToRonda(
                addingSalaToRondaId, 
                fd.get("sala") as string, 
                fd.get("gestor") as string, 
                fd.get("gerente") as string
              );
            }} className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-md border border-slate-100 animate-scale-up">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Adicionar Novo Ambiente</h3>
                <button type="button" onClick={() => setAddingSalaToRondaId(null)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Nome do Ambiente / Sala</label>
                  <input type="text" name="sala" required placeholder="Ex: Recepção principal, Sala de Reunião 2" className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:border-[#ff2a6d] outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Gestor do Ambiente</label>
                  <input type="text" name="gestor" placeholder="Ex: Maria Rodrigues" className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:border-[#ff2a6d] outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Gerente de Carteira</label>
                  <input type="text" name="gerente" placeholder="Ex: Diego Machado" className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:border-[#ff2a6d] outline-none" />
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
                <button type="button" onClick={() => setAddingSalaToRondaId(null)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-[#ff2a6d] hover:bg-[#c21e54] text-white font-black text-xs uppercase rounded-lg">Adicionar</button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* -------------------- EDIT OCCURRENCE MODAL (WITH VOICE & PASTE IMAGE) --- */}
      {/* ========================================================================= */}
      {editingOccurrence && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-md border border-slate-100 animate-scale-up">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-[#ff2a6d]" /> Editar Ocorrência Registrada
              </h3>
              <button onClick={() => setEditingOccurrence(null)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><X className="h-4 w-4" /></button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Tipo de Ocorrência</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["autuacao", "limpeza", "manutencao"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditingOccurrence({
                        ...editingOccurrence,
                        occurrence: { ...editingOccurrence.occurrence, type: t }
                      })}
                      className={`py-2 px-3 text-xs font-black rounded-lg uppercase tracking-wider border transition-all ${
                        editingOccurrence.occurrence.type === t
                          ? t === "autuacao"
                            ? "bg-red-500 text-white border-red-500"
                            : t === "limpeza"
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-amber-500 text-white border-amber-500"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black uppercase text-slate-500">Descrição Detalhada</label>
                  <button
                    type="button"
                    onClick={() => handleStartVoiceRecording((newVal) => {
                      setEditingOccurrence(prev => {
                        if (!prev) return null;
                        const currentVal = typeof newVal === 'function' ? newVal(prev.occurrence.description) : newVal;
                        return {
                          ...prev,
                          occurrence: { ...prev.occurrence, description: currentVal }
                        };
                      });
                    })}
                    className={`inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-1 rounded-md transition-colors ${
                      isRecording ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <Mic className="h-3 w-3" /> {isRecording ? "Gravando..." : "Ditado de Voz (pt-BR)"}
                  </button>
                </div>
                
                {speechError && (
                  <p className="text-[11px] font-bold text-red-500 mb-2 bg-red-50 p-2 rounded-lg border border-red-100">{speechError}</p>
                )}

                <textarea
                  value={editingOccurrence.occurrence.description}
                  onChange={(e) => setEditingOccurrence({
                    ...editingOccurrence,
                    occurrence: { ...editingOccurrence.occurrence, description: e.target.value }
                  })}
                  onPaste={(e) => handlePasteEventGeneric(e, (newVal) => {
                    setEditingOccurrence(prev => {
                      if (!prev) return null;
                      const images = typeof newVal === 'function' ? newVal(prev.occurrence.images) : newVal;
                      return {
                        ...prev,
                        occurrence: { ...prev.occurrence, images }
                      };
                    });
                  })}
                  rows={4}
                  placeholder="Descreva o problem observado ou use o botão de ditado por voz. Cole imagens diretamente com Ctrl+V ou colar."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 focus:border-[#ff2a6d] outline-none"
                />
                <span className="block text-[11px] text-slate-500 font-semibold mt-1">Dica: Cole um arquivo de imagem direto na caixa acima para anexar.</span>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">Fotos Anexadas ({editingOccurrence.occurrence.images.length})</label>
                
                {editingOccurrence.occurrence.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 border border-slate-100 bg-slate-50/50 p-2.5 rounded-xl">
                    {editingOccurrence.occurrence.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={img} alt="Anexo" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const filteredImages = editingOccurrence.occurrence.images.filter((_, i) => i !== idx);
                            setEditingOccurrence({
                              ...editingOccurrence,
                              occurrence: { ...editingOccurrence.occurrence, images: filteredImages }
                            });
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                          title="Remover Foto"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2.5">
                  <label className="relative flex items-center justify-center border border-dashed border-slate-300 rounded-xl p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                    <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                      <Image className="h-4 w-4 text-slate-500" /> Anexar novas fotos (Upload local)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files) return;
                        Array.from(files).forEach((file: File) => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === "string") {
                              const resultString = reader.result;
                              setEditingOccurrence(prev => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  occurrence: {
                                    ...prev.occurrence,
                                    images: [...prev.occurrence.images, resultString]
                                  }
                                };
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        });
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button onClick={() => setEditingOccurrence(null)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase rounded-lg">Cancelar</button>
              <button onClick={() => handleSaveEditedOccurrence(editingOccurrence.rondaId, editingOccurrence.salaId, editingOccurrence.occurrence)} className="px-4 py-1.5 bg-[#ff2a6d] hover:bg-[#c21e54] text-white font-black text-xs uppercase rounded-lg">Salvar Ocorrência</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* -------------------- ADD OCCURRENCE TO SALA MODAL ------------------------ */}
      {/* ========================================================================= */}
      {addingOccToSala && (() => {
        const [occType, setOccType] = useState<"autuacao" | "limpeza" | "manutencao">("limpeza");
        const [occDesc, setOccDesc] = useState("");
        const [occImages, setOccImages] = useState<string[]>([]);

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          if (!occDesc.trim()) {
            alert("Preencha a descrição da ocorrência!");
            return;
          }
          handleAddOccToSala(addingOccToSala.rondaId, addingOccToSala.salaId, occType, occDesc, occImages);
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-md border border-slate-100 animate-scale-up">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Registrar Ocorrência</h3>
                <button type="button" onClick={() => setAddingOccToSala(null)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><X className="h-4 w-4" /></button>
              </div>
              
              <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Tipo de Ocorrência</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["autuacao", "limpeza", "manutencao"] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setOccType(t)}
                        className={`py-2 px-3 text-xs font-black rounded-lg uppercase tracking-wider border transition-all ${
                          occType === t
                            ? t === "autuacao"
                              ? "bg-red-500 text-white border-red-500"
                              : t === "limpeza"
                              ? "bg-blue-500 text-white border-blue-500"
                              : "bg-amber-500 text-white border-amber-500"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-black uppercase text-slate-500">Descrição Detalhada</label>
                    <button
                      type="button"
                      onClick={() => handleStartVoiceRecording(setOccDesc)}
                      className={`inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-1 rounded-md transition-colors ${
                        isRecording ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      <Mic className="h-3 w-3" /> {isRecording ? "Gravando..." : "Ditado de Voz (pt-BR)"}
                    </button>
                  </div>
                  
                  {speechError && (
                    <p className="text-[11px] font-bold text-red-500 mb-2 bg-red-50 p-2 rounded-lg border border-red-100">{speechError}</p>
                  )}

                  <textarea
                    value={occDesc}
                    onChange={(e) => setOccDesc(e.target.value)}
                    onPaste={(e) => handlePasteEventGeneric(e, setOccImages)}
                    rows={4}
                    placeholder="Descreva o problema observado..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 focus:border-[#ff2a6d] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">Fotos Anexadas ({occImages.length})</label>
                  
                  {occImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 border border-slate-100 bg-slate-50/50 p-2.5 rounded-xl">
                      {occImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                          <img src={img} alt="Anexo" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setOccImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-2.5">
                    <label className="relative flex items-center justify-center border border-dashed border-slate-300 rounded-xl p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                      <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Image className="h-4 w-4 text-slate-500" /> Upload de Imagem local
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files) return;
                          Array.from(files).forEach((file: File) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === "string") {
                                setOccImages(prev => [...prev, reader.result as string]);
                              }
                            };
                            reader.readAsDataURL(file);
                          });
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
                <button type="button" onClick={() => setAddingOccToSala(null)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-[#ff2a6d] hover:bg-[#c21e54] text-white font-black text-xs uppercase rounded-lg">Registrar</button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* -------------------- EDIT CHAMADO MODAL --------------------------------- */}
      {/* ========================================================================= */}
      {editingChamado && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-md border border-slate-100 animate-scale-up">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Editar Chamado Técnico</h3>
              <button onClick={() => setEditingChamado(null)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Ação Corretiva Proposta</label>
                <textarea 
                  value={editingChamado.description} 
                  onChange={(e) => setEditingChamado({ ...editingChamado, description: e.target.value })}
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-700 focus:border-[#ff2a6d] outline-none" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Responsável pela Resolução</label>
                <input 
                  type="text" 
                  value={editingChamado.responsible} 
                  onChange={(e) => setEditingChamado({ ...editingChamado, responsible: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:border-[#ff2a6d] outline-none" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Status</label>
                <select 
                  value={editingChamado.status}
                  onChange={(e) => setEditingChamado({ ...editingChamado, status: e.target.value as any })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:border-[#ff2a6d] outline-none"
                >
                  <option value="Aberto">Aberto</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Concluido">Concluído</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button onClick={() => setEditingChamado(null)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase rounded-lg">Cancelar</button>
              <button onClick={() => handleSaveEditedChamado(editingChamado)} className="px-4 py-1.5 bg-[#ff2a6d] hover:bg-[#c21e54] text-white font-black text-xs uppercase rounded-lg">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* ASSISTÊNCIA DE IMPRESSÃO PARA AMBIENTE SANDBOX / IFRAME */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-md border-2 border-[#ff2a6d] flex flex-col gap-5 animate-scale-in text-slate-800 relative">
            <button 
              onClick={() => setShowPrintModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-600 transition-colors cursor-pointer"
              title="Fechar ajuda de impressão"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center space-y-1.5">
              <div className="h-11 w-11 rounded-full bg-red-50 flex items-center justify-center text-[#ff2a6d] mx-auto border border-red-100 animate-pulse">
                <Printer className="h-5.5 w-5.5" />
              </div>
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">
                Guia para Impressão do Relatório
              </h3>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                Restrição de Segurança do Google AI Studio
              </p>
            </div>

            <div className="space-y-3 text-[11px] text-slate-600 leading-relaxed font-semibold">
              <p>
                Por estar executando em uma janela de testes integrada (iframe do AI Studio), o navegador bloqueia a abertura direta do diálogo de impressão.
              </p>
              <p className="p-2.5 rounded-xl border border-red-100 bg-red-50/40 text-[#ff2a6d] font-bold">
                Para gerar o PDF ou imprimir com perfeição gráfica, por favor use uma das alternativas abaixo:
              </p>
              
              <div className="space-y-2.5 pl-1.5 list-none">
                <div className="flex items-start gap-2">
                  <span className="h-4 w-4 rounded-full bg-slate-150 flex items-center justify-center text-slate-600 text-[11px] font-bold shrink-0 mt-0.5">1</span>
                  <p>
                    <strong>Abrir em Nova Guia (Recomendado):</strong> Clique no botão vermelho abaixo para carregar o aplicativo em tela cheia e, em seguida, abra o relatório e clique em imprimir normalmente.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="h-4 w-4 rounded-full bg-slate-150 flex items-center justify-center text-slate-600 text-[11px] font-bold shrink-0 mt-0.5">2</span>
                  <p>
                    <strong>Atalho do Teclado:</strong> Simplesmente pressione <strong>Ctrl + P</strong> (ou <strong>⌘ + P</strong> no Mac) em seu teclado agora para abrir o painel de impressão nativo!
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShowPrintModal(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#ff2a6d] hover:bg-[#c21e54] text-white py-3 text-[11px] font-black tracking-wider uppercase shadow-md hover:shadow-lg transition-all cursor-pointer text-center"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir App em Nova Aba para Imprimir
                </a>
                <div className="flex justify-center">
                  <EmojiButton
                    iconKey="fechar"
                    onClick={() => setShowPrintModal(false)}
                    size="md"
                    variant="neutral"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}
