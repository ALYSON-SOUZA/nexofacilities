import { createClient } from "@supabase/supabase-js";

// Read from Vite env vars (.env file). Do NOT hardcode credentials.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables. Check your .env file."
  );
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || "",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Robust database sync helpers for the clean-quotes app.
 * Fallbacks to localStorage are transparently managed.
 */

import { ArchivedQuote, Category, Measurement, MeiContractData } from "./types";
import { ArchivedFile } from "./utils/fileDb";

export interface DBKnownSupplier {
  name: string;
  phone?: string;
  vendedor?: string;
}

// 1. Quotes CRUD
export async function dbFetchQuotes(): Promise<ArchivedQuote[]> {
  try {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Error fetching quotes from Supabase, using localStorage fallback:", error);
      throw error;
    }

    if (!data) return [];

    // Map database snake_case structure to CamelCase TS types
    return data.map((q: any) => ({
      id: q.id,
      title: q.title || "",
      quoteDate: q.quote_date,
      userName: q.user_name,
      userCpf: q.user_cpf,
      savedAt: q.saved_at,
      suppliers: q.suppliers || [],
      items: q.items || [],
      capacityRows: q.capacity_rows || [],
      summary: q.summary || {},
      categoryId: q.category_id,
      categoryName: q.category_name,
      chamadoNumber: q.chamado_number || "",
    }));
  } catch (err) {
    const local = localStorage.getItem("clean_quotes_archived");
    return local ? JSON.parse(local) : [];
  }
}

export async function dbUpsertQuote(quote: ArchivedQuote): Promise<boolean> {
  try {
    const payload = {
      id: quote.id,
      title: quote.title || "",
      quote_date: quote.quoteDate,
      user_name: quote.userName,
      user_cpf: quote.userCpf,
      saved_at: quote.savedAt,
      suppliers: quote.suppliers,
      items: quote.items,
      capacity_rows: quote.capacityRows,
      summary: quote.summary,
      category_id: quote.categoryId,
      category_name: quote.categoryName,
      chamado_number: quote.chamadoNumber || "",
    };

    const { error } = await supabase
      .from("quotes")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("Failed to upsert quote in Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Network error on Supabase upsert:", err);
    return false;
  }
}

export async function dbDeleteQuote(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete quote in Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Network error on Supabase delete:", err);
    return false;
  }
}

export async function dbClearAllQuotes(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("quotes")
      .delete()
      .neq("id", "PROBABLY_NOT_EXISTING_ID_SO_CLEAR_ALL_BUT_BE_SAFE_OR_USING_TRUE_QUERY");

    return !error;
  } catch (err) {
    return false;
  }
}

// 2. Categories Sync
export async function dbFetchCategories(): Promise<Category[] | null> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*");

    if (error) {
      console.warn("Could not retrieve categories from Supabase, using defaults:", error);
      return null;
    }

    if (!data || data.length === 0) return null;

    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      items: c.items || [],
    }));
  } catch (err) {
    return null;
  }
}

export async function dbUpsertCategory(category: Category): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("categories")
      .upsert({
        id: category.id,
        name: category.name,
        items: category.items,
      }, { onConflict: "id" });

    return !error;
  } catch (err) {
    return false;
  }
}

// 3. Known Suppliers Sync
export async function dbFetchKnownSuppliers(): Promise<DBKnownSupplier[]> {
  try {
    const { data, error } = await supabase
      .from("known_suppliers")
      .select("name, phone, vendedor");

    if (error) {
      console.warn("Could not retrieve known suppliers from Supabase:", error);
      const saved = localStorage.getItem("clean_quotes_known_suppliers");
      return saved ? JSON.parse(saved) : [];
    }

    return data || [];
  } catch (err) {
    const saved = localStorage.getItem("clean_quotes_known_suppliers");
    return saved ? JSON.parse(saved) : [];
  }
}

export async function dbUpsertKnownSupplier(supplier: DBKnownSupplier): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("known_suppliers")
      .upsert({
        name: supplier.name,
        phone: supplier.phone || null,
        vendedor: supplier.vendedor || null,
      }, { onConflict: "name" });

    return !error;
  } catch (err) {
    return false;
  }
}

// 4. Measurements Sync
export async function dbFetchMeasurements(): Promise<Measurement[]> {
  try {
    const { data, error } = await supabase
      .from("measurements")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Could not retrieve measurements from Supabase:", error);
      const saved = localStorage.getItem("clean_quotes_stock_measurements");
      return saved ? JSON.parse(saved) : [];
    }

    return (data || []).map((m: any) => ({
      id: m.id,
      date: m.date,
      balances: m.balances || {},
    }));
  } catch (err) {
    const saved = localStorage.getItem("clean_quotes_stock_measurements");
    return saved ? JSON.parse(saved) : [];
  }
}

export async function dbUpsertMeasurements(measurements: Measurement[]): Promise<boolean> {
  try {
    if (measurements.length === 0) return true;
    const payloads = measurements.map((m) => ({
      id: m.id,
      date: m.date,
      balances: m.balances,
    }));

    const { error } = await supabase
      .from("measurements")
      .upsert(payloads, { onConflict: "id" });

    return !error;
  } catch (err) {
    return false;
  }
}

export async function dbDeleteMeasurement(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("measurements")
      .delete()
      .eq("id", id);

    return !error;
  } catch (err) {
    return false;
  }
}

// 5. MEI/Autônomo Suppliers CRUD
export async function dbFetchMeiSuppliers(): Promise<MeiContractData[]> {
  try {
    const { data, error } = await supabase
      .from("mei_suppliers")
      .select("*")
      .order("nome_completo", { ascending: true });

    if (error) {
      console.warn("Error fetching MEI suppliers from Supabase, using localStorage fallback:", error);
      throw error;
    }

    if (!data) return [];

    return data.map((item: any) => ({
      nomeCompleto: item.nome_completo || "",
      endereco: item.endereco || "",
      numero: item.numero || "",
      complemento: item.complemento || "",
      bairro: item.bairro || "",
      cep: item.cep || "",
      cidade: item.cidade || "",
      uf: item.uf || "",
      dataNascimento: item.data_nascimento || "",
      naturalidade: item.naturalidade || "",
      naturalidadeUf: item.naturalidade_uf || "",
      sexo: item.sexo || "",
      grauInstrucao: item.grau_instrucao || "",
      estadoCivil: item.estado_civil || "",
      dataCasamento: item.data_casamento || "",
      nomeConjuge: item.nome_conjuge || "",
      racaCor: item.raca_cor || "",
      funcaoAtividade: item.funcao_atividade || "",
      cpf: item.cpf || "",
      pis: item.pis || "",
      pix: item.pix || "",
      banco: item.banco || "",
      cnpj: item.cnpj || "",
      agencia: item.agencia || "",
      conta: item.conta || "",
    }));
  } catch (err) {
    const local = localStorage.getItem("bp_saved_mei_suppliers");
    return local ? JSON.parse(local) : [];
  }
}

export async function dbUpsertMeiSupplier(supplier: MeiContractData): Promise<boolean> {
  try {
    const payload = {
      nome_completo: supplier.nomeCompleto,
      endereco: supplier.endereco,
      numero: supplier.numero,
      complemento: supplier.complemento,
      bairro: supplier.bairro,
      cep: supplier.cep,
      cidade: supplier.cidade,
      uf: supplier.uf,
      data_nascimento: supplier.dataNascimento,
      naturalidade: supplier.naturalidade,
      naturalidade_uf: supplier.naturalidadeUf,
      sexo: supplier.sexo,
      grau_instrucao: supplier.grauInstrucao,
      estado_civil: supplier.estadoCivil,
      data_casamento: supplier.dataCasamento,
      nome_conjuge: supplier.nomeConjuge,
      raca_cor: supplier.racaCor,
      funcao_atividade: supplier.funcaoAtividade,
      cpf: supplier.cpf,
      pis: supplier.pis,
      pix: supplier.pix,
      banco: supplier.banco,
      cnpj: supplier.cnpj,
      agencia: supplier.agencia,
      conta: supplier.conta,
    };

    const { error } = await supabase
      .from("mei_suppliers")
      .upsert(payload, { onConflict: "nome_completo" });

    if (error) {
      console.error("Failed to upsert MEI supplier in Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Network error on Supabase MEI supplier upsert:", err);
    return false;
  }
}

export async function dbDeleteMeiSupplier(nomeCompleto: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("mei_suppliers")
      .delete()
      .eq("nome_completo", nomeCompleto);

    if (error) {
      console.error("Failed to delete MEI supplier in Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Network error on Supabase MEI supplier delete:", err);
    return false;
  }
}

// 6. Archived Files Sync (Base64 Table Strategy)
export async function dbFetchArchivedFiles(): Promise<ArchivedFile[]> {
  try {
    const { data, error } = await supabase
      .from("archived_files")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!data) return [];

    return data.map((f: any) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      description: f.description || "",
      type: f.type,
      size: f.size,
      dataUrl: f.data_url,
      createdAt: f.created_at
    }));
  } catch (err) {
    console.warn("Could not retrieve files from Supabase table 'archived_files':", err);
    throw err;
  }
}

export async function dbUpsertArchivedFile(file: ArchivedFile): Promise<boolean> {
  try {
    const payload = {
      id: file.id,
      name: file.name,
      category: file.category,
      description: file.description,
      type: file.type,
      size: file.size,
      data_url: file.dataUrl,
      created_at: file.createdAt
    };

    const { error } = await supabase
      .from("archived_files")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("Failed to upsert file in Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Network error on Supabase file upsert:", err);
    return false;
  }
}

export async function dbDeleteArchivedFile(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("archived_files")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete file in Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Network error on Supabase file delete:", err);
    return false;
  }
}

// ============================================================
// 7. Ronda CRUD — inspection rounds, salas, occurrences, chamados
// ============================================================

// 7a. Collaborators (reference data)
export async function dbFetchRondaCollaborators(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("ronda_collaborators")
      .select("*")
      .order("nome", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Could not fetch ronda_collaborators:", err);
    return [];
  }
}

// 7b. Rondas (main round records)
export interface DBRonda {
  id: string;
  date: string;
  filial: string;
  user_name: string;
  completed: boolean;
}

export async function dbFetchRondas(): Promise<DBRonda[]> {
  try {
    const { data, error } = await supabase
      .from("rondas")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Could not fetch rondas:", err);
    return [];
  }
}

export async function dbUpsertRonda(ronda: {
  id: string;
  date: string;
  filial: string;
  user_name: string;
  completed: boolean;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("rondas")
      .upsert(ronda, { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to upsert ronda:", err);
    return false;
  }
}

export async function dbDeleteRonda(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("rondas")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to delete ronda:", err);
    return false;
  }
}

// 7c. Salas (rooms within a round)
export interface DBRondaSala {
  id: string;
  ronda_id: string;
  sala: string;
  gestor_sala: string;
  gerente_carteira: string;
}

export async function dbFetchRondaSalas(rondaId: string): Promise<DBRondaSala[]> {
  try {
    const { data, error } = await supabase
      .from("ronda_salas")
      .select("*")
      .eq("ronda_id", rondaId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Could not fetch ronda_salas:", err);
    return [];
  }
}

export async function dbUpsertRondaSala(sala: DBRondaSala): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("ronda_salas")
      .upsert(sala, { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to upsert ronda_sala:", err);
    return false;
  }
}

export async function dbDeleteRondaSalasByRondaId(rondaId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("ronda_salas")
      .delete()
      .eq("ronda_id", rondaId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to delete ronda_salas:", err);
    return false;
  }
}

// 7d. Occurrences (issues per room)
export interface DBRondaOccurrence {
  id: string;
  sala_id: string;
  type: string;
  description: string;
  images: string[];
  created_at?: string;
}

export async function dbFetchRondaOccurrences(salaId: string): Promise<DBRondaOccurrence[]> {
  try {
    const { data, error } = await supabase
      .from("ronda_occurrences")
      .select("*")
      .eq("sala_id", salaId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Could not fetch ronda_occurrences:", err);
    return [];
  }
}

export async function dbUpsertRondaOccurrence(occ: DBRondaOccurrence): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("ronda_occurrences")
      .upsert(occ, { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to upsert ronda_occurrence:", err);
    return false;
  }
}

export async function dbDeleteRondaOccurrencesBySalaId(salaId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("ronda_occurrences")
      .delete()
      .eq("sala_id", salaId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to delete ronda_occurrences:", err);
    return false;
  }
}

// 7e. Chamados (tickets)
export interface DBRondaChamado {
  id: string;
  ronda_id: string;
  sala_id: string;
  occurrence_id: string;
  description: string;
  responsible: string;
  status: string;
  created_at?: string;
}

export async function dbFetchRondaChamados(rondaId: string): Promise<DBRondaChamado[]> {
  try {
    const { data, error } = await supabase
      .from("ronda_chamados")
      .select("*")
      .eq("ronda_id", rondaId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Could not fetch ronda_chamados:", err);
    return [];
  }
}

export async function dbUpsertRondaChamado(chamado: DBRondaChamado): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("ronda_chamados")
      .upsert(chamado, { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to upsert ronda_chamado:", err);
    return false;
  }
}

export async function dbDeleteRondaChamadosByRondaId(rondaId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("ronda_chamados")
      .delete()
      .eq("ronda_id", rondaId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to delete ronda_chamados:", err);
    return false;
  }
}

// 7f. Storage — upload/download photos for occurrences
export async function dbUploadRondaPhoto(
  rondaId: string,
  salaId: string,
  occurrenceId: string,
  file: File
): Promise<string | null> {
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `rondas/${rondaId}/${salaId}/${occurrenceId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("ronda-photos")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("ronda-photos")
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (err) {
    console.error("Failed to upload ronda photo:", err);
    return null;
  }
}

export async function dbDeleteRondaPhotosByOccurrence(
  rondaId: string,
  salaId: string,
  occurrenceId: string
): Promise<boolean> {
  try {
    const folderPath = `rondas/${rondaId}/${salaId}/${occurrenceId}`;
    const { data: files, error: listError } = await supabase.storage
      .from("ronda-photos")
      .list(folderPath);

    if (listError) throw listError;
    if (!files || files.length === 0) return true;

    const paths = files.map((f) => `${folderPath}/${f.name}`);
    const { error } = await supabase.storage
      .from("ronda-photos")
      .remove(paths);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to delete ronda photos:", err);
    return false;
  }
}

