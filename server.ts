import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

// --- Rate Limiting (in-memory, per IP) ---
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }
  next();
}

// Periodically clean up stale entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS * 2);

// Apply rate limiter to all AI endpoints
app.use("/api/gemini", rateLimiter);

app.use(express.json({ limit: "50mb" })); // Ensure large base64 uploads are accepted
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Supabase server-side safely from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("[server] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

// Initialize Gemini client server-side safely
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined. AI suggestions will run in fallback simulation mode.");
  } else {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
} catch (e) {
  console.error("Failed to initialize GoogleGenAI client:", e);
}

// REST API for Gemini AI Quote suggestions and consistency check
app.post("/api/gemini/analyze-quote", async (req, res) => {
  try {
    const { items, categoryName, historicalQuotes, suppliers } = req.body;

    // Standardize input data
    const inputItems = Array.isArray(items) ? items : [];
    const inputSuppliers = Array.isArray(suppliers) ? suppliers : [];
    const inputHistory = Array.isArray(historicalQuotes) ? historicalQuotes : [];

    if (inputItems.length === 0) {
      return res.json({
        consistencyIssues: [
          {
            itemName: "Geral",
            issueType: "inconsistency",
            description: "Nenhum item está preenchido na tabela de cotação atual.",
            severity: "low",
            suggestedFix: "Adicione ao menos um item de limpeza na tabela para iniciar uma análise de IA."
          }
        ],
        savingSuggestions: [
          {
            title: "Crie uma lista de compras",
            description: "Insira os materiais e as quantidades estimadas. O consultor poderá avaliar e otimizar as embalagens.",
            estimatedSavings: "0%"
          }
        ],
        serviceRecommendations: [
          {
            serviceName: "Gestão Predial Integrada",
            description: "Sistemas de dispensação controlada para banheiros e copas evitam desperdícios no dia a dia.",
            whyItFits: "Reduz o consumo médio de insumos descartáveis em até 30%."
          }
        ]
      });
    }

    // Check if Gemini API client is active
    if (!ai) {
      // Return a high-quality simulated diagnostic if GEMINI_API_KEY is missing
      // (This prevents frontend crashes during local/non-configured runs while retaining highly responsive mocks)
      return res.json({
        consistencyIssues: inputItems.map((item, idx) => {
          const alerts = [];
          
          // Basic rules for mock verification so the app has high utility even before configuration
          const averagePrice = item.averagePrice || 0;
          const prices = (item.prices || []).map((p: any) => p?.value).filter((v: any) => v !== undefined && v !== null && v > 0);
          
          if (prices.length > 0) {
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            if (max / min > 1.4) {
              alerts.push({
                itemName: item.name,
                issueType: "price_alert",
                description: `Discrepância acentuada encontrada nos preços deste item: menor oferta R$ ${min.toFixed(2)} vs maior R$ ${max.toFixed(2)} (variação de ${Math.round((max/min - 1) * 100)}%).`,
                severity: "medium",
                suggestedFix: "Verifique com os fornecedores se as marcas cotadas correspondem à mesma qualidade ou se há substituições de embalagem no lote."
              });
            }
          }

          if (!item.unit || item.unit === "-" || item.unit === "") {
            alerts.push({
              itemName: item.name,
              issueType: "unit_warning",
              description: "Este item não possui uma unidade de medida especificada (e.g. Litro, Unid, Pacote).",
              severity: "high",
              suggestedFix: "Defina claramente a unidade de medida para garantir que todos os orçamentos usam a mesma base comercial."
            });
          }

          return alerts;
        }).filter(a => a.length > 0).flat().slice(0, 4),
        savingSuggestions: [
          {
            title: "Otimização volumétrica para Detergentes/Limpadores",
            description: `Foi detectada a cotação de itens de consumo de alto giro individualizados. Substituir por embalagens de galão concentrado (5 Litros) e implantar diluidores economiza insumos e reduz frete.`,
            estimatedSavings: "18% a 25%",
            alternatives: ["Galão Concentrado 5 Litros", "Kit Diluidor de Parede Inteligente"]
          },
          {
            title: "Padronização de Marcas e Homogeneização de Lotes",
            description: `Verifique se todos os fornecedores estão orçando as marcas solicitadas no edital básico de compras de Facilities.`,
            estimatedSavings: "8% a 12%",
            alternatives: ["Marcas Premium (e.g., Kimberly, Unilever)", "Marcas de combate qualificadas nacionalmente"]
          }
        ],
        serviceRecommendations: [
          {
            serviceName: "Dispensadores de Sabonete e Papel Toalha",
            description: "Instalação de dispensers inteligentes com comodato na compra de insumos de higiene e limpeza no atacado.",
            whyItFits: "Controla a liberação por acionamento, minimizando o uso excessivo de materiais pelos colaboradores."
          },
          {
            serviceName: "Agenda de Dedetização & Sanitização Preventiva",
            description: "Programar rotinas preventivas mensais reduz a contaminação cruzada e otimiza a frequência necessária de faxina pesada nos sanitários.",
            whyItFits: "Otimiza os custos operacionais do pessoal de facilities envolvido na limpeza diária."
          }
        ]
      });
    }

    const payloadHistory = inputHistory.map(q => ({
      id: q.id,
      date: q.quoteDate,
      category: q.categoryName,
      mixedTotal: q.summary?.mixedTotal || 0,
    }));

    const prompt = `Você é o "Consultor de IA para Facilities & Compras da BP-COMPRAS". Sua missão é validar uma lista de cotação de preços de produtos para garantir a integridade da compra e sugerir reduções de custo, correções comerciais ou melhores práticas de facilities.

DADOS DA COTAÇÃO ATUAL:
- Categoria Ativa: "${categoryName || "Geral"}"
- Itens e Preços: ${JSON.stringify(
      inputItems.map((item, index) => ({
        index,
        name: item.name,
        unit: item.unit || "N/A",
        quantity: item.quantity,
        prices: Object.entries(item.prices || {}).map(([supId, val]) => {
          const foundSup = inputSuppliers.find((s: any) => s.id === supId);
          return {
            supplierName: foundSup ? foundSup.name : "Anônimo",
            priceValue: val || 0
          };
        })
      }))
    )}
- Fornecedores Participantes: ${JSON.stringify(inputSuppliers.map(s => ({ name: s.name, vendedor: s.vendedor })))}
- Histórico Breve de Compras Recentes: ${JSON.stringify(payloadHistory)}

SUAS TAREFAS:
1. Verificação de Consistência e Alertas de Preço (consistencyIssues):
   - Alerta de Preço Exorbitante ou Extremamente Baixo: Verifique se existe algum fornecedor cobrando um preço muito fora da média para o mesmo item (ex: se um cobra R$ 5 e outro R$ 45, isso pode ser erro de digitação ou diferença de litragem/embalagem).
   - Unidades de Medida Ausentes ou Estranhas: Alerte se o usuário inseriu um item sem unidade (e.g. vazio, "-") ou se parece inconsistente.
   - Defina para cada alerta:itemName, issueType (deve ser literamente 'price_alert', 'unit_warning', 'inconsistency' ou 'missing_price'), description (breve, amigável e explicativo em Português), severity ('low', 'medium' ou 'high') e suggestedFix (o que o comprador deve fazer para resolver).

2. Otimização de Custos e Sugestões de Ajustes (savingSuggestions):
   - Apresente ideias de como comprar melhor esses itens de limpeza/higiene. Exemplo clássico: trocar galões comuns por concentrados, trocar papel toalha folha simples por folha dupla de alta absorção para reduzir desperdício, etc.
   - Forneça: title, description, estimatedSavings (ex: "15% - 20%") e alternatives (links fictícios/tags de alternativas, e.g. ["Embalagem Atacado 12x1", "Papel Toalha Interfolha 100% Celulose"]).

3. Recomendações e Indicação de Fornecimento Extra / Serviços (serviceRecommendations):
   - Recomende soluções e serviços de Facilities agregados úteis para o almoxarifado/portaria/escritório (e.g. Contratação de serviço de sanitização, instalação de dispensers em comodato, gestão de resíduos recicláveis, terceirização de lavanderia de panos de microfibra, etc.).
   - Forneça: serviceName, description e whyItFits (por que se encaixa no padrão de quem está fazendo essa compra).

RETORNE EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO obedecendo exatamente a seguinte e estrita estrutura das propriedades (utilize strings em português):
{
  "consistencyIssues": [
    {
      "itemName": "Nome do Item",
      "issueType": "price_alert" | "unit_warning" | "inconsistency" | "missing_price",
      "description": "Explicação amigável em Português",
      "severity": "low" | "medium" | "high",
      "suggestedFix": "Como consertar"
    }
  ],
  "savingSuggestions": [
    {
      "title": "Título curto da sugestão",
      "description": "Texto rico com a dica comercial de economia",
      "estimatedSavings": "Economia estimada %",
      "alternatives": ["Alt 1", "Alt 2"]
    }
  ],
  "serviceRecommendations": [
    {
      "serviceName": "Serviço sugerido",
      "description": "Explicação do serviço",
      "whyItFits": "Justificativa de conveniência de compra integrada"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            consistencyIssues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  itemName: { type: Type.STRING },
                  issueType: { 
                    type: Type.STRING,
                    description: "Categoria do problema: 'price_alert' (preço alto/incomum), 'unit_warning' (unidade/volume estranho), 'inconsistency' (incompatibilidade), 'missing_price' (preço faltante)."
                  },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING, description: "low, medium, high" },
                  suggestedFix: { type: Type.STRING }
                },
                required: ["itemName", "issueType", "description", "severity", "suggestedFix"]
              }
            },
            savingSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  estimatedSavings: { type: Type.STRING },
                  alternatives: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["title", "description", "estimatedSavings"]
              }
            },
            serviceRecommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  serviceName: { type: Type.STRING },
                  description: { type: Type.STRING },
                  whyItFits: { type: Type.STRING }
                },
                required: ["serviceName", "description", "whyItFits"]
              }
            }
          },
          required: ["consistencyIssues", "savingSuggestions", "serviceRecommendations"]
        }
      }
    });

    const text = response.text;
    res.json(JSON.parse(text || "{}"));
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error?.message || "Erro ao consultar o assistente de IA da BP-COMPRAS." });
  }
});

// Helper heuristic parser for quote items in case Gemini is not available
function parseQuoteItemsLocally(rawText: string): { name: string; quantity: number }[] {
  const lines = rawText.split(/\r?\n/);
  const items: { name: string; quantity: number }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip column headers
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("item") || lower.startsWith("nome") || lower.startsWith("produto") || lower.startsWith("quantidade") || lower.startsWith("qtd") || lower.startsWith("descri")) {
      continue;
    }

    // Attempt to parse
    let name = "";
    let quantity = 1;

    // Check tab, semicolon, pipe delimiters
    const parts = trimmed.split(/[;\t|]+/);
    if (parts.length >= 2) {
      const firstNum = parseInt(parts[0].trim().replace(/\./g, "").replace(",", "."), 10);
      const lastNum = parseInt(parts[parts.length - 1].trim().replace(/\./g, "").replace(",", "."), 10);

      if (!isNaN(firstNum) && parts[0].trim().match(/^\d+$/)) {
        name = parts.slice(1).join(" ").trim();
        quantity = firstNum;
      } else if (!isNaN(lastNum) && parts[parts.length - 1].trim().match(/^\d+$/)) {
        name = parts.slice(0, -1).join(" ").trim();
        quantity = lastNum;
      }
    }

    // Check comma delimiter
    if (!name) {
      const commaParts = trimmed.split(",");
      if (commaParts.length >= 2) {
        const lastPart = commaParts[commaParts.length - 1].trim();
        const qty = parseInt(lastPart, 10);
        if (!isNaN(qty) && lastPart.match(/^\d+$/)) {
          name = commaParts.slice(0, -1).join(",").trim();
          quantity = qty;
        }
      }
    }

    // Check regex: "10x Item" or "10 x Item"
    if (!name) {
      const xMatch = trimmed.match(/^(\d+)\s*[xX]\s*(.+)$/);
      if (xMatch) {
        quantity = parseInt(xMatch[1], 10);
        name = xMatch[2].trim();
      }
    }

    // Check regex: "10 Item"
    if (!name) {
      const leadingMatch = trimmed.match(/^(\d+)\s+([a-zA-Z\u00C0-\u00FF].+)$/);
      if (leadingMatch) {
        quantity = parseInt(leadingMatch[1], 10);
        name = leadingMatch[2].trim();
      }
    }

    // Check regex: "Item 10"
    if (!name) {
      const trailingMatch = trimmed.match(/^(.+?)\s+(\d+)$/);
      if (trailingMatch) {
        const qty = parseInt(trailingMatch[2], 10);
        if (trailingMatch[1].trim().length > 1) {
          name = trailingMatch[1].trim();
          quantity = qty;
        }
      }
    }

    // Default fallback
    if (!name && trimmed.length > 2) {
      name = trimmed;
      quantity = 1;
    }

    if (name) {
      items.push({ name, quantity });
    }
  }

  return items;
}

// REST API endpoint to parse quote documents (images, pdfs, sheets, word, text) via AI
app.post("/api/gemini/parse-quote-document", async (req, res) => {
  try {
    const { fileType, base64Data, fileName } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "O conteúdo do arquivo em formato Base64 é obrigatório." });
    }

    // Helper to extract clean base64 data and mimeType if a data URI is passed
    const getPayload = (rawB64: string, fallbackMime: string) => {
      const match = rawB64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], data: match[2] };
      }
      return { mimeType: fallbackMime, data: rawB64 };
    };

    let extractedTextContent = "";
    let isMultimodal = false;
    let multimodalPart: any = null;

    if (fileType === "image") {
      const { mimeType, data } = getPayload(base64Data, "image/png");
      isMultimodal = true;
      multimodalPart = {
        inlineData: {
          mimeType,
          data
        }
      };
    } else if (fileType === "pdf") {
      const { mimeType, data } = getPayload(base64Data, "application/pdf");
      isMultimodal = true;
      multimodalPart = {
        inlineData: {
          mimeType,
          data
        }
      };
    } else if (fileType === "text" || fileType === "csv") {
      const { data } = getPayload(base64Data, "text/plain");
      extractedTextContent = Buffer.from(data, "base64").toString("utf-8");
    } else if (fileType === "excel") {
      const { data } = getPayload(base64Data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      const buffer = Buffer.from(data, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      let sheetText = "";
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        sheetText += `Aba: ${sheetName}\n${csv}\n\n`;
      }
      extractedTextContent = sheetText;
    } else if (fileType === "docx") {
      const { data } = getPayload(base64Data, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      const buffer = Buffer.from(data, "base64");
      const mammothResult = await mammoth.extractRawText({ buffer });
      extractedTextContent = mammothResult.value;
    } else {
      return res.status(400).json({ error: "Formato de arquivo não suportado para extração por IA." });
    }

    // If Gemini client is not initialized, run the fallback local parser
    if (!ai) {
      console.warn("GEMINI_API_KEY is not defined. Using offline heuristic extraction for quote items.");
      if (isMultimodal) {
        return res.json({
          items: [],
          warning: "A extração de imagens ou PDFs requer a chave de API do Gemini configurada. Por favor, utilize um formato de texto (TXT, CSV ou Excel) para processamento offline."
        });
      } else {
        const items = parseQuoteItemsLocally(extractedTextContent);
        return res.json({ items });
      }
    }

    // Call Gemini to structure the quote beautifully
    const systemInstruction = `Você é um robô de IA assistente especializado em compras e facilities da BP-COMPRAS.
Sua missão é extrair todos os produtos, materiais ou itens listados no documento anexado (seja imagem, PDF, planilha ou texto de orçamento) e organizá-los estruturadamente.

Para cada item identificado, você DEVE extrair:
1. "name": O nome completo e descritivo do material/produto (ex: "Álcool em Gel 70% 500ml" ou "Saco de Lixo Preto 100 Litros"). Normalize o nome para ficar limpo e sem códigos de controle confusos.
2. "quantity": A quantidade solicitada. Se não houver quantidade explícita informada, use o valor padrão de 1.

Regras Estritas:
- Ignore linhas vazias, termos contratuais, assinaturas, nomes de fornecedores, CNPJs, preços unitários, preços totais ou cabeçalhos. Concentre-se exclusivamente em listar os itens de consumo e suas quantidades.
- Retorne EXCLUSIVAMENTE um objeto JSON válido contendo a chave "items" que é uma lista desses objetos descritos.
- Não retorne markdown, não use tags de código, e não dê explicações adicionais.`;

    const promptString = isMultimodal 
      ? `Por favor, analise a imagem ou PDF anexado e extraia a lista completa de materiais/produtos e suas respectivas quantidades, gerando o JSON de acordo com as instruções.`
      : `Por favor, analise o texto estruturado abaixo e extraia a lista completa de materiais/produtos e suas respectivas quantidades:
---
${extractedTextContent}
---`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: isMultimodal 
        ? { parts: [multimodalPart, { text: promptString }] }
        : promptString,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.INTEGER }
                },
                required: ["name", "quantity"]
              }
            }
          },
          required: ["items"]
        }
      }
    });

    const responseText = response.text?.trim() || "{}";
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error("Error in AI Quote Document parsing endpoint:", error);
    res.status(500).json({ error: error?.message || "Ocorreu um erro ao processar o documento do orçamento por IA." });
  }
});

// Helper heuristic parser for supplier proposal extraction in case Gemini is not available
function parseSupplierProposalLocally(rawText: string): any {
  const lines = rawText.split(/\r?\n/);
  let supplierName = "FORNECEDOR EXTRAÍDO LOCAL";
  let cnpj = "";
  let phone = "";
  let vendedor = "";
  const items: any[] = [];

  // Try to find supplier name, cnpj, phone, vendedor in the first few lines
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("fornecedor:") || lower.startsWith("empresa:") || lower.startsWith("nome:") || lower.startsWith("razao:") || lower.startsWith("razão:")) {
      supplierName = line.replace(/^(fornecedor:|empresa:|nome:|razao:|razão:)/i, "").trim().toUpperCase();
    } else if (lower.startsWith("cnpj:")) {
      cnpj = line.replace(/^cnpj:/i, "").trim();
    } else if (lower.startsWith("telefone:") || lower.startsWith("tel:") || lower.startsWith("fone:")) {
      phone = line.replace(/^(telefone:|tel:|fone:)/i, "").trim();
    } else if (lower.startsWith("vendedor:") || lower.startsWith("contato:") || lower.startsWith("atendente:")) {
      vendedor = line.replace(/^(vendedor:|contato:|atendente:)/i, "").trim();
    }
  }

  // Parse lines for products with quantity and price
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    // Skip headers
    if (
      lower.startsWith("fornecedor:") || 
      lower.startsWith("cnpj:") || 
      lower.startsWith("telefone:") || 
      lower.startsWith("vendedor:") || 
      lower.startsWith("tel:") || 
      lower.startsWith("item") || 
      lower.startsWith("produto") ||
      lower.startsWith("quantidade") ||
      lower.startsWith("descri")
    ) {
      continue;
    }

    let name = "";
    let quantity = 1;
    let unitPrice = 0;
    let pendingReview = false;
    let reviewReason = "";

    // Try finding price (e.g. "R$ 35,00", "35,00")
    const priceMatch = trimmed.match(/(?:R\$?\s*)?(\d+(?:\.\d{3})*(?:,\d{2}))/i);
    if (priceMatch) {
      unitPrice = parseFloat(priceMatch[1].replace(/\./g, "").replace(",", "."));
    }

    // Try finding quantity (e.g. "10x", "5 un", "3 pacotes")
    const qtyMatch = trimmed.match(/(\d+)\s*(?:x|un|pct|pacote|frasco|caixa|litro|kg|g|unidades?)/i);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
    }

    // Isolate description by cleaning out the price and quantity substrings
    let cleanDesc = trimmed;
    if (priceMatch && priceMatch[0]) {
      cleanDesc = cleanDesc.replace(priceMatch[0], "");
    }
    if (qtyMatch && qtyMatch[0]) {
      cleanDesc = cleanDesc.replace(qtyMatch[0], "");
    }
    name = cleanDesc.replace(/[-|;:\t]+/g, " ").replace(/\s+/g, " ").trim();

    if (unitPrice === 0) {
      pendingReview = true;
      reviewReason = "Preço unitário não identificado. Por favor, revise manualmente.";
    }

    if (!name || name.length < 2) {
      name = trimmed.slice(0, 45);
      pendingReview = true;
      reviewReason = "Descrição do item ilegível ou ambígua.";
    }

    if (name) {
      items.push({
        name,
        quantity: quantity || 1,
        unitPrice: unitPrice || 0,
        pendingReview,
        reviewReason
      });
    }
  }

  // If no items were parsed, add a fallback blank row for user manual entry
  if (items.length === 0) {
    items.push({
      name: "Item Revisar",
      quantity: 1,
      unitPrice: 0,
      pendingReview: true,
      reviewReason: "Não foi possível extrair nenhum item de forma automatizada do texto."
    });
  }

  return {
    suppliers: [
      {
        name: supplierName || "FORNECEDOR NOVO EXTRAÍDO",
        cnpj,
        phone,
        vendedor,
        items
      }
    ]
  };
}

// REST API endpoint to parse supplier proposals via AI (Gemini 3.5 Flash) with multimodal support
app.post("/api/gemini/parse-supplier-proposal", async (req, res) => {
  try {
    const { fileType, base64Data, fileName } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "O conteúdo do arquivo em formato Base64 é obrigatório." });
    }

    // Helper to extract clean base64 data and mimeType if a data URI is passed
    const getPayload = (rawB64: string, fallbackMime: string) => {
      const match = rawB64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], data: match[2] };
      }
      return { mimeType: fallbackMime, data: rawB64 };
    };

    let extractedTextContent = "";
    let isMultimodal = false;
    let multimodalPart: any = null;

    if (fileType === "image") {
      const { mimeType, data } = getPayload(base64Data, "image/png");
      isMultimodal = true;
      multimodalPart = {
        inlineData: {
          mimeType,
          data
        }
      };
    } else if (fileType === "pdf") {
      const { mimeType, data } = getPayload(base64Data, "application/pdf");
      isMultimodal = true;
      multimodalPart = {
        inlineData: {
          mimeType,
          data
        }
      };
    } else if (fileType === "text" || fileType === "csv") {
      const { data } = getPayload(base64Data, "text/plain");
      extractedTextContent = Buffer.from(data, "base64").toString("utf-8");
    } else if (fileType === "excel") {
      const { data } = getPayload(base64Data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      const buffer = Buffer.from(data, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      let sheetText = "";
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        sheetText += `Aba: ${sheetName}\n${csv}\n\n`;
      }
      extractedTextContent = sheetText;
    } else if (fileType === "docx") {
      const { data } = getPayload(base64Data, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      const buffer = Buffer.from(data, "base64");
      const mammothResult = await mammoth.extractRawText({ buffer });
      extractedTextContent = mammothResult.value;
    } else {
      return res.status(400).json({ error: "Formato de arquivo não suportado para extração por IA." });
    }

    // If Gemini client is not initialized, run the offline heuristic parser
    if (!ai) {
      console.warn("GEMINI_API_KEY is not defined. Using offline heuristic extraction for proposals.");
      if (isMultimodal) {
        return res.json({
          suppliers: [],
          warning: "A leitura inteligente de imagens ou PDFs requer a chave de API do Gemini ativa. Por favor, utilize um formato de texto (TXT, CSV ou Excel) para processamento local offline."
        });
      } else {
        const proposal = parseSupplierProposalLocally(extractedTextContent);
        return res.json(proposal);
      }
    }

    // Call Gemini to structure the supplier proposal beautifully
    const systemInstruction = `Você é um robô de IA assistente especializado em compras e compras corporativas da BP-COMPRAS.
Sua missão é extrair as propostas comerciais de fornecedores presentes no documento anexado (seja imagem, PDF, planilha ou texto de orçamento) e organizá-las estruturadamente.

O documento pode vir em dois formatos principais:
1. ORÇAMENTO INDIVIDUAL: Um orçamento de um único fornecedor contendo uma lista de produtos, quantidades e preços unitários.
2. QUADRO COMPARATIVO / TABELA COMPARATIVA (MÚLTIPLOS FORNECEDORES): Uma tabela onde as linhas são os produtos (e suas respectivas quantidades) e as colunas representam fornecedores diferentes com seus preços.
   
   COMO INTERPRETAR O QUADRO COMPARATIVO (MUITO IMPORTANTE - CONFORME A IMAGEM ANEXADA):
   - EIXO HORIZONTAL (LINHAS): Cada linha horizontal da tabela representa um produto/material (coluna "ITENS A COTAR") e sua respectiva quantidade física (coluna "QTD"). Exemplo: "Massa Corrida 3,5lt" com quantidade "1".
   - EIXO VERTICAL (COLUNAS): Cada coluna principal no cabeçalho superior representa um Fornecedor diferente (exemplo: "VIP CONSTR (LJ MARIANO)" ou "SOL CONSTR"). Sob cada um desses fornecedores, existem subcolunas verticais como "Unit (R$)" (valor unitário) e "Total (R$)" (valor total do item para aquele fornecedor).
   
   REGRAS DE EXTRAÇÃO E ASSOCIAÇÃO:
   - Para cada linha de produto/material (horizontal), você deve identificar o nome do produto e a quantidade.
   - Para cada fornecedor (coluna vertical):
     1. Identifique o nome do fornecedor no cabeçalho da coluna (ex: "VIP CONSTR (LJ MARIANO)").
     2. Extraia o preço unitário do cruzamento da linha do produto com a coluna vertical do fornecedor, sob a subcoluna "Unit (R$)" ou dividindo o "Total (R$)" pela quantidade daquela linha.
     3. Crie um objeto de fornecedor em "suppliers" e associe a ele este item com o nome do produto, quantidade da linha e o respectivo preço unitário extraído.
     4. ATENÇÃO EXTREMA: Nunca misture os preços! O preço da coluna do "VIP CONSTR" deve ir estritamente para o "VIP CONSTR" (ex: 39.0). O preço da coluna do "SOL CONSTR" deve ir estritamente para o "SOL CONSTR" (ex: 44.90).
     5. Se um fornecedor não apresentar preço para um item (célula vazia, com traço ou riscada), defina o unitPrice como 0 ou ignore esse item para esse fornecedor.

Para cada proposta comercial ou orçamento de fornecedor identificado no arquivo, você DEVE extrair:
1. O nome do fornecedor (mantenha o nome comercial legível em maiúsculas).
2. O CNPJ (ou CPF) do fornecedor se estiver visível no documento.
3. O Telefone do fornecedor se disponível.
4. O nome do Vendedor ou contato se disponível.
5. A lista de produtos/itens cotados na proposta, contendo para cada item:
   - "name": O nome completo, limpo e descritivo do material/produto (ex: "Álcool em Gel 70% 500ml", "Saco de Lixo Preto 100 Litros"). Normalize o nome.
   - "quantity": A quantidade física cotada ou informada na linha horizontal ("QTD"). Caso não haja quantidade explícita, use o valor padrão de 1.
   - "unitPrice": O valor unitário exato do produto como número decimal (ex: 29.90). NUNCA mude, abrevie ou arredonde valores decimais (ex: se for R$ 44,90, deve ser exatamente 44.90; se for R$ 39,00, deve ser exactamente 39.0). Se no documento constar apenas o valor total e a quantidade, calcule o valor unitário dividindo o total pela quantidade. Se não for possível extrair o preço de forma alguma, defina-o como 0.
   - "pendingReview": Defina como true se a descrição do item estiver extremamente ambígua, se o preço unitário não foi encontrado de forma legível ou se faltarem informações estruturais cruciais. Se você suspeitar de algum valor ou leitura confusa, marque como true e coloque o motivo no "reviewReason".
   - "reviewReason": Explicação curta e em português do porquê o item foi marcado como "pendingReview".

Regras Estritas:
- Suporte a múltiplos fornecedores (RN09): Caso o arquivo contenha orçamentos de fornecedores diferentes (como colunas separadas), separe-os corretamente na lista do JSON.
- Retorne EXCLUSIVAMENTE um objeto JSON válido contendo a chave "suppliers" que é uma lista desses objetos descritos.
- Não retorne markdown, não use tags de código, e não dê explicações adicionais.`;

    const promptString = isMultimodal 
      ? `Por favor, analise a proposta comercial de fornecedores anexada (imagem ou PDF), extraia as informações cadastrais de cada fornecedor e liste todos os produtos com quantidade e preço unitário, gerando o JSON estruturado.`
      : `Por favor, analise o texto da proposta abaixo e extraia as informações cadastrais e itens cotados de cada fornecedor com quantidade e valor unitário:
---
${extractedTextContent}
---`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: isMultimodal 
        ? { parts: [multimodalPart, { text: promptString }] }
        : promptString,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suppliers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  cnpj: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  vendedor: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        quantity: { type: Type.INTEGER },
                        unitPrice: { type: Type.NUMBER },
                        pendingReview: { type: Type.BOOLEAN },
                        reviewReason: { type: Type.STRING }
                      },
                      required: ["name", "quantity", "unitPrice"]
                    }
                  }
                },
                required: ["name", "items"]
              }
            }
          },
          required: ["suppliers"]
        }
      }
    });

    const responseText = response.text?.trim() || "{}";
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error("Error in AI Supplier Proposal parsing endpoint:", error);
    res.status(500).json({ error: error?.message || "Ocorreu um erro ao extrair os dados da proposta por IA." });
  }
});

// Helper function to split text into overlapping chunks
function chunkText(text: string, size: number = 1000, overlap: number = 200): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

// 1. Endpoint to upload and process documents with OCR, Summarization and pgvector Embeddings
app.post("/api/docs/upload", async (req, res) => {
  try {
    const { fileName, fileType, base64Data, userResponsible, themeTag } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "Dados do arquivo em base64 são necessários." });
    }

    const cleanFileName = fileName || `doc_${Date.now()}`;
    const cleanUser = userResponsible || "Sistema";
    const cleanTag = themeTag || "Geral";

    let extractedText = "";
    let isMultimodal = false;
    let mimeType = "application/octet-stream";

    // Standardize mimetype & extract content
    if (fileType === "image") {
      isMultimodal = true;
      mimeType = "image/png";
    } else if (fileType === "pdf") {
      isMultimodal = true;
      mimeType = "application/pdf";
    } else if (fileType === "text" || fileType === "csv") {
      mimeType = "text/plain";
      const buffer = Buffer.from(base64Data, "base64");
      extractedText = buffer.toString("utf-8");
    } else if (fileType === "excel") {
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const buffer = Buffer.from(base64Data, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      let sheetText = "";
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        sheetText += `Aba: ${sheetName}\n${csv}\n\n`;
      }
      extractedText = sheetText;
    } else if (fileType === "docx") {
      mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const buffer = Buffer.from(base64Data, "base64");
      const mammothResult = await mammoth.extractRawText({ buffer });
      extractedText = mammothResult.value;
    } else {
      return res.status(400).json({ error: `Tipo de arquivo '${fileType}' não é suportado.` });
    }

    // Call Gemini for PDF/Image OCR if needed
    if (isMultimodal) {
      if (ai) {
        const ocrPart = {
          inlineData: {
            mimeType,
            data: base64Data
          }
        };
        const ocrPrompt = "Extraia de forma literal e verbatim todo o texto, tabelas, dados numéricos e conteúdos legíveis deste documento em Português (OCR Completo). Preserve a estrutura o máximo possível.";
        
        try {
          const ocrResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [ocrPart, { text: ocrPrompt }] }
          });
          extractedText = ocrResponse.text || "";
        } catch (ocrErr: any) {
          console.error("Gemini OCR extraction failed:", ocrErr);
          return res.status(500).json({ error: `Falha no OCR por IA: ${ocrErr?.message}` });
        }
      } else {
        return res.status(400).json({ error: "A extração OCR de imagens ou PDFs requer a chave API do Gemini configurada." });
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      extractedText = `Documento vazio ou ilegível carregado em ${new Date().toLocaleDateString("pt-BR")}`;
    }

    // Generate a professional structured summary using Gemini 3.5 Flash
    let summary = "";
    if (ai) {
      const summaryPrompt = `Você é um robô de IA especialista em compras, contratos, planilhas e facilities da BP-COMPRAS (Bellinati Perez).
Gerar um resumo extremamente detalhado, estruturado e útil deste documento contendo:
- Principais itens descritos ou listados
- Valores totais ou unitários importantes se houver
- Prazos, SLAs, datas ou regras relevantes
- Observações críticas para facilities e compras
- Temas e tags associados ao assunto

Retorne apenas o resumo formatado em Markdown legível com negritos e marcadores:

CONTEÚDO DO DOCUMENTO:
---
${extractedText.slice(0, 45000)}
---`;

      try {
        const summaryResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: summaryPrompt
        });
        summary = summaryResponse.text || "Falha ao gerar o resumo.";
      } catch (sumErr) {
        console.error("Failed to generate summary:", sumErr);
        summary = "Erro ao gerar resumo inteligível por IA.";
      }
    } else {
      summary = `Resumo automático offline para o documento '${cleanFileName}'. (Chave Gemini indisponível).`;
    }

    // Store in Supabase Storage with fallback
    const timestamp = Date.now();
    const originalPath = `documents/original_${timestamp}_${cleanFileName}`;
    const summaryTxtPath = `documents/summary_${timestamp}_${cleanFileName.replace(/\.[^/.]+$/, "")}_resumo.txt`;

    try {
      // Try to list buckets & create documents bucket if not present
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.some(b => b.name === "documents")) {
        await supabase.storage.createBucket("documents", { public: true });
      }

      // Upload original file
      await supabase.storage
        .from("documents")
        .upload(originalPath, Buffer.from(base64Data, "base64"), {
          contentType: mimeType,
          upsert: true,
        });

      // Upload summary TXT file
      await supabase.storage
        .from("documents")
        .upload(summaryTxtPath, Buffer.from(summary, "utf-8"), {
          contentType: "text/plain",
          upsert: true,
        });
    } catch (storageErr) {
      console.warn("Supabase Storage bucket upload warning (proceeding with db record):", storageErr);
    }

    // Insert Document Record into DB
    const { data: insertedDoc, error: dbError } = await supabase
      .from("documents")
      .insert({
        name: cleanFileName,
        file_type: fileType,
        file_size: Math.round(base64Data.length * 0.75), // approximate byte size
        user_responsible: cleanUser,
        theme_tag: cleanTag,
        original_file_path: originalPath,
        summary_txt_path: summaryTxtPath,
        extracted_text: extractedText,
        summary: summary,
      })
      .select("*")
      .single();

    if (dbError) {
      console.error("DB insertion error:", dbError);
      return res.status(500).json({ error: `Erro ao registrar documento no banco: ${dbError.message}` });
    }

    const docId = insertedDoc.id;

    // Chunk extracted text and generate vector embeddings
    const textChunks = chunkText(`${cleanFileName}\n\nTema: ${cleanTag}\n\nTexto original:\n${extractedText}\n\nResumo:\n${summary}`);
    
    // Process embeddings sequentially or in parallel batches
    const chunkPromises = textChunks.map(async (chunk) => {
      let embedding: number[] | null = null;
      if (ai) {
        try {
          const embedRes: any = await ai.models.embedContent({
            model: "text-embedding-004", // Standard 768-dim model for Gemini embeddings
            contents: chunk
          });
          embedding = embedRes.embedding?.values || embedRes.embeddings?.values || null;
        } catch (embedErr) {
          console.error("Gemini embedding error for chunk:", embedErr);
        }
      }

      return supabase.from("document_chunks").insert({
        document_id: docId,
        content: chunk,
        embedding: embedding
      });
    });

    await Promise.all(chunkPromises);

    res.json({
      success: true,
      documentId: docId,
      name: cleanFileName,
      summary: summary,
      themeTag: cleanTag,
      originalFilePath: originalPath
    });
  } catch (error: any) {
    console.error("Error in /api/docs/upload:", error);
    res.status(500).json({ error: error?.message || "Erro no servidor ao processar o documento." });
  }
});

// 2. Endpoint to list all registered documents
app.get("/api/docs/list", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("uploaded_at", { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error("Error listing documents:", error);
    res.status(500).json({ error: error?.message || "Erro ao listar documentos arquivados." });
  }
});

// 3. Endpoint to delete a document and its references
app.delete("/api/docs/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch paths first to delete from storage
    const { data: doc } = await supabase
      .from("documents")
      .select("original_file_path, summary_txt_path")
      .eq("id", id)
      .single();

    if (doc) {
      try {
        await supabase.storage.from("documents").remove([doc.original_file_path, doc.summary_txt_path]);
      } catch (storageErr) {
        console.warn("Storage deletion warning:", storageErr);
      }
    }

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    res.json({ success: true, message: "Documento excluído com sucesso." });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: error?.message || "Erro ao excluir documento." });
  }
});

// 4. NotebookLM smart chat Q&A endpoint using pgvector and Gemini
app.post("/api/docs/chat", async (req, res) => {
  try {
    const { question, documentId } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: "Sua pergunta não pode estar vazia." });
    }

    // 1. Generate embedding for the question
    let questionEmbedding: number[] | null = null;
    if (ai) {
      try {
        const embedRes: any = await ai.models.embedContent({
          model: "text-embedding-004",
          contents: question
        });
        questionEmbedding = embedRes.embedding?.values || embedRes.embeddings?.values || null;
      } catch (embedErr) {
        console.error("Failed to generate embedding for question:", embedErr);
      }
    }

    // 2. Query matching chunks
    let matchingChunks: any[] = [];
    if (ai && questionEmbedding) {
      try {
        const { data, error } = await supabase.rpc("match_document_chunks", {
          query_embedding: questionEmbedding,
          match_threshold: 0.15,
          match_count: 5
        });

        if (!error && data) {
          matchingChunks = data;
        } else if (error) {
          console.warn("pgvector match_document_chunks function failed or not found, falling back:", error);
        }
      } catch (rpcErr) {
        console.warn("RPC vector match failed, using text fallback:", rpcErr);
      }
    }

    // Fallback: term overlap matching in Node if pgvector is missing or fails
    if (matchingChunks.length === 0) {
      let queryBuilder = supabase.from("document_chunks").select("*, documents(id, name)");
      
      if (documentId) {
        queryBuilder = queryBuilder.eq("document_id", documentId);
      }

      const { data: allChunks } = await queryBuilder.limit(30);

      if (allChunks) {
        const queryTerms = question.toLowerCase().split(/\s+/).filter((t: string) => t.length > 2);
        
        matchingChunks = allChunks.map((chunk: any) => {
          let score = 0;
          const contentLower = chunk.content.toLowerCase();
          for (const term of queryTerms) {
            if (contentLower.includes(term)) score += 1;
          }
          return { ...chunk, score };
        })
        .filter((chunk: any) => chunk.score > 0 || queryTerms.length === 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);

        if (matchingChunks.length === 0 && allChunks.length > 0) {
          matchingChunks = allChunks.slice(0, 3);
        }
      }
    }

    // If still no content in the system
    if (matchingChunks.length === 0) {
      return res.json({
        answer: "### 📭 Repositório Vazio\nDesculpe, não há nenhum documento ou informação arquivada no sistema para que eu possa responder à sua dúvida. Por favor, faça o upload de arquivos na aba **DOCS** primeiro!",
        citations: []
      });
    }

    // Filter by specific document if required
    if (documentId) {
      matchingChunks = matchingChunks.filter(c => c.document_id === documentId);
    }

    // Retrieve document details for citations
    const docIds = [...new Set(matchingChunks.map(c => c.document_id))];
    const { data: docs } = await supabase.from("documents").select("id, name, theme_tag").in("id", docIds);
    const docsMap = docs ? new Map(docs.map(d => [d.id, d])) : new Map();

    const citations = matchingChunks.map(c => {
      const doc = docsMap.get(c.document_id);
      return {
        documentName: doc ? doc.name : "Documento Desconhecido",
        tag: doc ? doc.theme_tag : "Geral",
        snippet: c.content.slice(0, 150) + "..."
      };
    });

    // Deduplicate citations
    const uniqueCitations = citations.filter((v, i, a) => a.findIndex(t => t.documentName === v.documentName) === i);

    const contextText = matchingChunks.map((c, idx) => {
      const doc = docsMap.get(c.document_id);
      const name = doc ? doc.name : "Documento Desconhecido";
      return `Trecho ${idx + 1} (Fonte: ${name}):\n${c.content}`;
    }).join("\n\n");

    let answer = "";
    if (ai) {
      const systemInstruction = `Você é o assistente inteligente NotebookLM da BP-COMPRAS (Bellinati Perez).
Sua missão é responder à dúvida do usuário baseando-se estritamente e exclusivamente no conteúdo dos trechos de documentos fornecidos como contexto abaixo.

Regras Estritas de Conduta:
1. Responda apenas com base no contexto fornecido. Não use conhecimentos externos nem invente fatos, prazos, nomes ou valores.
2. Se a resposta não puder ser deduzida do contexto, diga educadamente: "Desculpe, mas não encontrei essa informação nos documentos arquivados."
3. Sempre cite explicitamente a fonte da informação, indicando de qual documento ela foi extraída no formato "[Documento: Nome_do_Arquivo.pdf]".
4. Responda em Português do Brasil de forma extremamente amigável, clara, estruturada e profissional, utilizando formatação rica Markdown (tópicos, tabelas, negritos).`;

      const prompt = `Dúvida do Usuário: "${question}"

Contexto dos Documentos Arquivados:
${contextText}

Responda à dúvida de forma precisa baseando-se unicamente nas fontes acima:`;

      try {
        const chatResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            systemInstruction
          }
        });
        answer = chatResponse.text || "Não obtive resposta do assistente inteligente.";
      } catch (genErr: any) {
        console.error("Gemini Q&A generation error:", genErr);
        answer = `Erro de processamento da IA: ${genErr?.message || genErr}`;
      }
    } else {
      // Offline heuristic answer
      answer = `### 💻 Assistente Offline
Você está executando sem chave de API do Gemini ativa.
Aqui está o contexto extraído heuristicamente por relevância de termos:

${contextText.slice(0, 1000)}...

_Habilite a chave de API do Gemini para respostas e resumos completos._`;
    }

    res.json({
      answer,
      citations: uniqueCitations
    });
  } catch (error: any) {
    console.error("Error in NotebookLM chat:", error);
    res.status(500).json({ error: error?.message || "Erro no servidor ao responder à dúvida." });
  }
});

// 5. Endpoint to generate a structured slide presentation from search/summaries
app.post("/api/docs/presentation", async (req, res) => {
  try {
    const { documentId, topic } = req.body;

    let query = supabase.from("documents").select("name, summary, extracted_text");
    if (documentId) {
      query = query.eq("id", documentId);
    }

    const { data: docs } = await query.limit(5);

    if (!docs || docs.length === 0) {
      return res.status(404).json({ error: "Nenhum documento encontrado para gerar a apresentação." });
    }

    const aggregatedContent = docs.map(d => `Documento: ${d.name}\nResumo:\n${d.summary}\nTrecho de Conteúdo:\n${(d.extracted_text || "").slice(0, 3000)}`).join("\n\n---\n\n");

    let presentationMarkdown = "";
    if (ai) {
      const prompt = `Você é um consultor executivo de inteligência empresarial especializado em Facilities e Compras da BP-COMPRAS.
Sua missão é criar uma APRESENTAÇÃO DE SLIDES corporativa, estruturada e altamente profissional baseando-se exclusivamente no conteúdo dos documentos resumidos abaixo.
O tópico de interesse solicitado é: "${topic || "Visão Geral e Insights do Repositório"}".

Regras de Estruturação:
1. Monte de 4 a 6 slides bem delineados.
2. Cada slide deve ser delimitado por uma linha divisória horizontal "---" e possuir:
   - Um título atraente e profissional em nível 2 (##)
   - 3 a 5 pontos-chave (bullet points) explicativos com negritos (não economize na profundidade dos dados reais contidos nos documentos)
   - Uma seção de Rodapé citando os documentos de origem
3. Utilize fontes, métricas, valores e datas reais trazidos nos documentos. Não invente.
4. Formate em Markdown limpo para ser renderizado elegantemente na tela.

DOCUMENTOS DISPONÍVEIS:
${aggregatedContent}

Crie a estrutura dos slides em Markdown:`;

      try {
        const slidesRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });
        presentationMarkdown = slidesRes.text || "Falha ao gerar os slides.";
      } catch (slidesErr) {
        console.error("Failed to generate slides:", slidesErr);
        presentationMarkdown = "Erro ao estruturar slides executivos por IA.";
      }
    } else {
      presentationMarkdown = `## Slide 1: Repositório Offline
- Chave de API do Gemini não configurada.
- Não foi possível gerar os slides por IA estruturada.
- Habilite sua chave para montar designs de relatórios e slides.`;
    }

    res.json({ presentation: presentationMarkdown });
  } catch (error: any) {
    console.error("Error generating presentation:", error);
    res.status(500).json({ error: error?.message || "Erro ao processar a apresentação corporativa." });
  }
});

// Helper heuristic parser for MEI/Autônomo data extraction in case AI is missing or fails

function parseTextHeuristically(rawText: string) {
  const result = {
    nomeCompleto: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cep: "",
    cidade: "",
    uf: "",
    dataNascimento: "",
    naturalidade: "",
    naturalidadeUf: "",
    sexo: "" as "M" | "F" | "",
    grauInstrucao: "" as any,
    estadoCivil: "",
    dataCasamento: "",
    nomeConjuge: "",
    racaCor: "" as any,
    funcaoAtividade: "",
    cpf: "",
    pis: "",
    pix: "",
    banco: ""
  };

  const lines = rawText.split(/\r?\n/);
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    const lower = cleanLine.toLowerCase();
    
    // Nome Completo
    if (lower.startsWith("nome completo:") || lower.startsWith("nome:")) {
      result.nomeCompleto = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    } else if (lower.startsWith("nome completo") && cleanLine.length > 13) {
      result.nomeCompleto = cleanLine.substring(13).trim().replace(/^[:=-]/, "").trim();
    } else if (lower.startsWith("nome ") && !lower.includes("mae") && !lower.includes("mãe") && !lower.includes("pai") && cleanLine.length > 5 && cleanLine.includes(":")) {
      result.nomeCompleto = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    }
    
    // Endereço
    if (lower.startsWith("endereço:") || lower.startsWith("endereco:") || lower.startsWith("rua:") || lower.startsWith("avenida:")) {
      result.endereco = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    } else if (lower.startsWith("endereço") && cleanLine.length > 8) {
      result.endereco = cleanLine.substring(8).trim().replace(/^[:=-]/, "").trim();
    } else if (lower.startsWith("endereco") && cleanLine.length > 8) {
      result.endereco = cleanLine.substring(8).trim().replace(/^[:=-]/, "").trim();
    }
    
    // Número
    if (lower.startsWith("número:") || lower.startsWith("numero:") || lower.startsWith("nº:") || lower.startsWith("n°:")) {
      result.numero = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    } else if (lower.startsWith("número") && cleanLine.length > 6) {
      result.numero = cleanLine.substring(6).trim().replace(/^[:=-]/, "").trim();
    } else if (lower.startsWith("numero") && cleanLine.length > 6) {
      result.numero = cleanLine.substring(6).trim().replace(/^[:=-]/, "").trim();
    }
    
    // Complemento
    if (lower.startsWith("complemento:") || lower.startsWith("compl:")) {
      result.complemento = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    } else if (lower.startsWith("complemento") && cleanLine.length > 11) {
      result.complemento = cleanLine.substring(11).trim().replace(/^[:=-]/, "").trim();
    } else if (cleanLine.toLowerCase() === "complemento") {
      result.complemento = "";
    }
    
    // Bairro
    if (lower.startsWith("bairro:")) {
      result.bairro = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    } else if (lower.startsWith("bairro") && cleanLine.length > 6) {
      result.bairro = cleanLine.substring(6).trim().replace(/^[:=-]/, "").trim();
    }
    
    // CEP
    if (lower.startsWith("cep:")) {
      result.cep = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    } else if (lower.startsWith("cep") && cleanLine.length > 3) {
      result.cep = cleanLine.substring(3).trim().replace(/^[:=-]/, "").trim();
    }
    
    // Cidade
    if (lower.startsWith("cidade:")) {
      result.cidade = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    } else if (lower.startsWith("cidade") && cleanLine.length > 6) {
      result.cidade = cleanLine.substring(6).trim().replace(/^[:=-]/, "").trim();
    }
    
    // UF
    if (lower.startsWith("uf (estado):") || lower.startsWith("uf:")) {
      result.uf = cleanLine.substring(cleanLine.indexOf(":") + 1).trim().toUpperCase();
    } else if (lower.startsWith("uf (estado)") && cleanLine.length > 11) {
      result.uf = cleanLine.substring(11).trim().replace(/^[:=-]/, "").trim().toUpperCase();
    } else if (lower.startsWith("uf ") && cleanLine.length > 3) {
      result.uf = cleanLine.substring(3).trim().replace(/^[:=-]/, "").trim().toUpperCase();
    }
    
    // Data de Nascimento
    if (lower.startsWith("data de nascimento:") || lower.startsWith("data nascimento:") || lower.startsWith("data de nascimento") || lower.startsWith("data nascimento") || lower.startsWith("nascimento:")) {
      const match = cleanLine.match(/\d{2}\/\d{2}\/\d{4}/);
      if (match) result.dataNascimento = match[0];
    }
    
    // Naturalidade
    if (lower.includes("naturalidade")) {
      const idx = cleanLine.indexOf(":");
      if (idx !== -1) {
        result.naturalidade = cleanLine.substring(idx + 1).trim();
      } else {
        const parts = cleanLine.split(/naturalidade\s*\(onde\s*nasceu\)\s*/i);
        if (parts.length > 1) {
          result.naturalidade = parts[1].trim();
        } else {
          const parts2 = cleanLine.split(/naturalidade\s*/i);
          if (parts2.length > 1) result.naturalidade = parts2[1].trim();
        }
      }
    }
    
    // Naturalidade UF / UF de Nascimento
    if (lower.includes("uf de nascimento") || lower.includes("uf nascimento")) {
      const match = cleanLine.match(/\b([A-Z]{2})\b/i);
      if (match) {
        result.naturalidadeUf = match[1].toUpperCase();
      }
    }
    
    // Sexo
    if (lower.startsWith("sexo")) {
      const value = cleanLine.substring(cleanLine.indexOf(":") + 1 || 4).trim().toUpperCase();
      if (value.includes("M") || value.startsWith("MASC")) {
        result.sexo = "M";
      } else if (value.includes("F") || value.startsWith("FEM")) {
        result.sexo = "F";
      }
    } else if (cleanLine === "M" || cleanLine === "Masculino") {
      result.sexo = "M";
    } else if (cleanLine === "F" || cleanLine === "Feminino") {
      result.sexo = "F";
    }
    
    // Grau de Instrução / Escolaridade
    if (lower.includes("escolaridade") || lower.includes("grau de instrução") || lower.includes("grau de instrucao") || lower.includes("grau de instu") || lower.includes("instrução")) {
      const value = cleanLine.substring(cleanLine.indexOf(")") + 1 || cleanLine.indexOf(":") + 1 || 12).trim();
      if (value) {
        const valLower = value.toLowerCase();
        if (valLower.includes("superior completo") || valLower.includes("superior") && valLower.includes("completo")) {
          result.grauInstrucao = "Superior (completo)";
        } else if (valLower.includes("superior cursando") || valLower.includes("superior")) {
          result.grauInstrucao = "Superior (cursando)";
        } else if (valLower.includes("2º grau completo") || valLower.includes("médio completo") || valLower.includes("medio completo")) {
          result.grauInstrucao = "2º Grau (completo)";
        } else if (valLower.includes("2º grau") || valLower.includes("médio") || valLower.includes("medio")) {
          result.grauInstrucao = "2º Grau (cursando)";
        } else if (valLower.includes("1º grau") || valLower.includes("fundamental")) {
          result.grauInstrucao = "1º Grau";
        }
      }
    }
    
    // Estado Civil
    if (lower.startsWith("estado civil:") || lower.startsWith("est. civil:")) {
      result.estadoCivil = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    } else if (lower.startsWith("estado civil") && cleanLine.length > 12) {
      result.estadoCivil = cleanLine.substring(12).trim().replace(/^[:=-]/, "").trim();
    }
    
    // Data Casamento
    if (lower.startsWith("data casamento:") || lower.startsWith("data de casamento:")) {
      result.dataCasamento = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    }
    
    // Nome Cônjuge
    if (lower.startsWith("nome cônjuge:") || lower.startsWith("nome conjuge:") || lower.startsWith("cônjuge:") || lower.startsWith("conjuge:")) {
      result.nomeConjuge = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    }
    
    // Raça / Cor
    if (lower.startsWith("raça/cor:") || lower.startsWith("raca/cor:") || lower.startsWith("raça:") || lower.startsWith("raca:")) {
      const val = cleanLine.substring(cleanLine.indexOf(":") + 1).trim().toLowerCase();
      if (val.includes("pret")) result.racaCor = "Preta";
      else if (val.includes("amar")) result.racaCor = "Amarela";
      else if (val.includes("pard")) result.racaCor = "Parda";
      else if (val.includes("branc")) result.racaCor = "Branca";
    }
    
    // Função / Atividade
    if (lower.startsWith("função:") || lower.startsWith("funcao:") || lower.startsWith("atividade:") || lower.startsWith("cargo:") || lower.startsWith("função/atividade:")) {
      result.funcaoAtividade = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    } else if (lower.startsWith("função e/ou atividade") && cleanLine.length > 21) {
      result.funcaoAtividade = cleanLine.substring(21).trim().replace(/^[:=-]/, "").trim();
    }
    
    // CPF
    if (lower.startsWith("cpf:") || lower.includes("cpf ")) {
      const match = cleanLine.match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/);
      if (match) {
        result.cpf = match[1];
      } else {
        const afterColon = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
        if (afterColon && afterColon.replace(/[^\d]/g, "").length >= 11) result.cpf = afterColon;
      }
    }
    
    // PIS
    if (lower.startsWith("pis:") || lower.startsWith("nit:") || lower.startsWith("pasep:")) {
      result.pis = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    }
    
    // PIX
    if (lower.startsWith("pix:") || lower.startsWith("chave pix:")) {
      result.pix = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    }
    
    // Banco
    if (lower.startsWith("banco:") || lower.startsWith("dados bancários:") || lower.startsWith("dados bancarios:")) {
      result.banco = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    }
  }

  // Second pass: loose matches for lines without colons
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    const lower = cleanLine.toLowerCase();

    if (!result.nomeCompleto && (lower.includes("nome completo") || lower.includes("nome:")) && cleanLine.includes(":")) {
      result.nomeCompleto = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
    }
    if (!result.cpf) {
      const match = cleanLine.match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/);
      if (match) result.cpf = match[1];
    }
    if (!result.cep) {
      const match = cleanLine.match(/(\d{5}-?\d{3})/);
      if (match) result.cep = match[1];
    }
    if (!result.dataNascimento) {
      const match = cleanLine.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (match) result.dataNascimento = match[0];
    }
    if (!result.bairro && lower.includes("bairro")) {
      const parts = cleanLine.split(/\s+/);
      const bIdx = parts.findIndex(p => p.toLowerCase().includes("bairro"));
      if (bIdx !== -1 && bIdx + 1 < parts.length) {
        result.bairro = parts.slice(bIdx + 1).join(" ");
      } else if (cleanLine.toLowerCase().startsWith("bairro")) {
        result.bairro = cleanLine.substring(6).trim().replace(/^[:=-]/, "").trim();
      }
    }
    if (!result.cidade && lower.includes("cidade")) {
      const parts = cleanLine.split(/\s+/);
      const cIdx = parts.findIndex(p => p.toLowerCase().includes("cidade"));
      if (cIdx !== -1 && cIdx + 1 < parts.length) {
        result.cidade = parts.slice(cIdx + 1).join(" ");
      } else if (cleanLine.toLowerCase().startsWith("cidade")) {
        result.cidade = cleanLine.substring(6).trim().replace(/^[:=-]/, "").trim();
      }
    }
    if (!result.endereco && (lower.includes("endereço") || lower.includes("endereco"))) {
      const parts = cleanLine.split(/\s+/);
      const eIdx = parts.findIndex(p => p.toLowerCase().includes("endereço") || p.toLowerCase().includes("endereco"));
      if (eIdx !== -1 && eIdx + 1 < parts.length) {
        result.endereco = parts.slice(eIdx + 1).join(" ");
      }
    }
    if (!result.numero && (lower.includes("número") || lower.includes("numero"))) {
      const match = cleanLine.match(/(?:número|numero)\s+(\d+)/i);
      if (match) result.numero = match[1];
    }
    if (!result.uf && (lower.includes("uf") || lower.includes("estado"))) {
      const match = cleanLine.match(/\b([A-Z]{2})\b/);
      if (match) result.uf = match[1];
    }
  }

  return {
    nomeCompleto: result.nomeCompleto || "",
    endereco: result.endereco || "",
    numero: result.numero || "",
    complemento: result.complemento || "",
    bairro: result.bairro || "",
    cep: result.cep || "",
    cidade: result.cidade || "",
    uf: result.uf || "",
    dataNascimento: result.dataNascimento || "",
    naturalidade: result.naturalidade || "",
    naturalidadeUf: result.naturalidadeUf || "",
    sexo: result.sexo || "",
    grauInstrucao: result.grauInstrucao || "",
    estadoCivil: result.estadoCivil || "",
    dataCasamento: result.dataCasamento || "",
    nomeConjuge: result.nomeConjuge || "",
    racaCor: result.racaCor || "",
    funcaoAtividade: result.funcaoAtividade || "",
    cpf: result.cpf || "",
    pis: result.pis || "",
    pix: result.pix || "",
    banco: result.banco || ""
  };
}

// REST API to extract personal/professional/banking information for MEI/Autônomo
app.post("/api/gemini/extract-mei-contract", async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || typeof rawText !== "string") {
      return res.status(400).json({ error: "O texto bruto para extração é obrigatório." });
    }

    if (!ai) {
      // If AI is not configured, run our ultra-robust heuristic extractor
      const extracted = parseTextHeuristically(rawText);
      return res.json(extracted);
    }

    const prompt = `Analise o texto abaixo que contém informações pessoais, profissionais e bancárias de um profissional autônomo ou MEI para preenchimento de uma ficha de contratação. Extraia o máximo de informações possíveis e preencha os campos correspondentes.

TEXTO BRUTO FORNECIDO:
"${rawText}"

Instruções importantes:
- Preencha "sexo" apenas com "M" (Masculino), "F" (Feminino) ou "" se não encontrado.
- Preencha "grauInstrucao" com uma das opções exatas: "1º Grau", "2º Grau (cursando)", "2º Grau (completo)", "Superior (cursando)", "Superior (completo)" ou "" se não identificado.
- Preencha "racaCor" com uma das opções exatas: "Branca", "Preta", "Amarela", "Parda" ou "" se não identificado.
- Para datas, use o formato DD/MM/YYYY.
- Para UFs, use a sigla de 2 letras em maiúsculo (ex: SP, RJ, MG).
- Formate CPFs, CEPs e PIS se possível.
- Deixe os campos em branco ("") caso não existam informações correspondentes no texto bruto.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nomeCompleto: { type: Type.STRING },
              endereco: { type: Type.STRING },
              numero: { type: Type.STRING },
              complemento: { type: Type.STRING },
              bairro: { type: Type.STRING },
              cep: { type: Type.STRING },
              cidade: { type: Type.STRING },
              uf: { type: Type.STRING },
              dataNascimento: { type: Type.STRING },
              naturalidade: { type: Type.STRING },
              naturalidadeUf: { type: Type.STRING },
              sexo: { type: Type.STRING },
              grauInstrucao: { type: Type.STRING },
              estadoCivil: { type: Type.STRING },
              dataCasamento: { type: Type.STRING },
              nomeConjuge: { type: Type.STRING },
              racaCor: { type: Type.STRING },
              funcaoAtividade: { type: Type.STRING },
              cpf: { type: Type.STRING },
              pis: { type: Type.STRING },
              pix: { type: Type.STRING },
              banco: { type: Type.STRING }
            },
            required: [
              "nomeCompleto", "endereco", "numero", "complemento", "bairro", "cep", "cidade", "uf",
              "dataNascimento", "naturalidade", "naturalidadeUf", "sexo", "grauInstrucao", "estadoCivil",
              "dataCasamento", "nomeConjuge", "racaCor", "funcaoAtividade", "cpf", "pis", "pix", "banco"
            ]
          }
        }
      });

      const text = response.text;
      return res.json(JSON.parse(text || "{}"));
    } catch (aiError) {
      console.warn("Gemini AI API call failed, falling back to heuristic parsing:", aiError);
      const extracted = parseTextHeuristically(rawText);
      return res.json(extracted);
    }
  } catch (error: any) {
    console.error("Gemini MEI Extraction Error:", error);
    res.status(500).json({ error: error?.message || "Erro ao processar e extrair os dados do autônomo." });
  }
});

// REST API to extract personal/school/contracting information for young apprentices (Aprendizes)
app.post("/api/gemini/extract-aprendiz-contract", async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || typeof rawText !== "string") {
      return res.status(400).json({ error: "O texto bruto para extração é obrigatório." });
    }

    if (!ai) {
      const extracted = parseAprendizHeuristically(rawText);
      return res.json(extracted);
    }

    const prompt = `Analise o texto abaixo que contém informações de um Jovem Aprendiz para preenchimento de uma Ficha Cadastral e de Contratação de Aprendizagem. Extraia o máximo de informações e organize em formato JSON.

TEXTO BRUTO FORNECIDO:
"${rawText}"

Instruções importantes:
- Preencha "turnoEscolar" com uma das opções exatas: "Manhã", "Tarde", "Noite" ou "" se não identificado.
- Para datas, use o formato DD/MM/YYYY.
- Para UFs, use a sigla de 2 letras em maiúsculo (ex: CE, SP, RJ).
- Formate CPFs, CEPs e RGs se possível.
- Deixe os campos em branco ("") caso não existam informações correspondentes no texto bruto.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nomeCompleto: { type: Type.STRING },
              dataNascimento: { type: Type.STRING },
              idade: { type: Type.STRING },
              cpf: { type: Type.STRING },
              rg: { type: Type.STRING },
              nomeMae: { type: Type.STRING },
              nomePai: { type: Type.STRING },
              telefone: { type: Type.STRING },
              email: { type: Type.STRING },
              endereco: { type: Type.STRING },
              numero: { type: Type.STRING },
              complemento: { type: Type.STRING },
              bairro: { type: Type.STRING },
              cep: { type: Type.STRING },
              cidade: { type: Type.STRING },
              uf: { type: Type.STRING },
              nomeResponsavel: { type: Type.STRING },
              cpfResponsavel: { type: Type.STRING },
              rgResponsavel: { type: Type.STRING },
              parentescoResponsavel: { type: Type.STRING },
              telefoneResponsavel: { type: Type.STRING },
              instituicaoEnsino: { type: Type.STRING },
              cursoGrau: { type: Type.STRING },
              turnoEscolar: { type: Type.STRING },
              serieAno: { type: Type.STRING },
              dataAdmissao: { type: Type.STRING },
              dataTermino: { type: Type.STRING },
              entidadeQualificadora: { type: Type.STRING },
              cursoAprendizagem: { type: Type.STRING },
              tutorSupervisor: { type: Type.STRING },
              setorAlocacao: { type: Type.STRING },
              horarioTrabalho: { type: Type.STRING },
              banco: { type: Type.STRING },
              agencia: { type: Type.STRING },
              conta: { type: Type.STRING },
              pix: { type: Type.STRING }
            },
            required: [
              "nomeCompleto", "dataNascimento", "idade", "cpf", "rg", "nomeMae", "nomePai", "telefone", "email",
              "endereco", "numero", "complemento", "bairro", "cep", "cidade", "uf",
              "nomeResponsavel", "cpfResponsavel", "rgResponsavel", "parentescoResponsavel", "telefoneResponsavel",
              "instituicaoEnsino", "cursoGrau", "turnoEscolar", "serieAno",
              "dataAdmissao", "dataTermino", "entidadeQualificadora", "cursoAprendizagem", "tutorSupervisor", "setorAlocacao", "horarioTrabalho",
              "banco", "agencia", "conta", "pix"
            ]
          }
        }
      });

      const text = response.text;
      return res.json(JSON.parse(text || "{}"));
    } catch (aiError) {
      console.warn("Gemini AI API call failed for Aprendiz, falling back to heuristic parsing:", aiError);
      const extracted = parseAprendizHeuristically(rawText);
      return res.json(extracted);
    }
  } catch (error: any) {
    console.error("Gemini Aprendiz Extraction Error:", error);
    res.status(500).json({ error: error?.message || "Erro ao processar e extrair os dados do aprendiz." });
  }
});

function parseAprendizHeuristically(rawText: string) {
  const result: any = {};
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const parts = line.split(":");
    if (parts.length >= 2) {
      const key = parts[0].toLowerCase().trim();
      const val = parts.slice(1).join(":").trim();

      if (key.includes("nome") || key.includes("aprendiz") || key === "nome completo") {
        if (!result.nomeCompleto) result.nomeCompleto = val;
      } else if (key.includes("nascimento") || key.includes("data de nasc")) {
        if (!result.dataNascimento) result.dataNascimento = val;
      } else if (key.includes("idade")) {
        if (!result.idade) result.idade = val;
      } else if (key.includes("mãe") || key.includes("mae")) {
        if (!result.nomeMae) result.nomeMae = val;
      } else if (key.includes("pai")) {
        if (!result.nomePai) result.nomePai = val;
      } else if (key.includes("telefone") || key.includes("tel") || key.includes("celular")) {
        if (!result.telefone) result.telefone = val;
      } else if (key.includes("email") || key.includes("e-mail")) {
        if (!result.email) result.email = val;
      } else if (key.includes("endereco") || key.includes("endereço") || key === "rua") {
        if (!result.endereco) result.endereco = val;
      } else if (key === "numero" || key === "nº" || key === "número") {
        if (!result.numero) result.numero = val;
      } else if (key.includes("complemento")) {
        if (!result.complemento) result.complemento = val;
      } else if (key.includes("bairro")) {
        if (!result.bairro) result.bairro = val;
      } else if (key.includes("cep")) {
        if (!result.cep) result.cep = val;
      } else if (key.includes("cidade")) {
        if (!result.cidade) result.cidade = val;
      } else if (key.includes("uf") || key === "estado") {
        if (!result.uf) result.uf = val;
      } else if (key.includes("responsavel") || key.includes("responsável")) {
        if (!result.nomeResponsavel) result.nomeResponsavel = val;
      } else if (key.includes("parentesco") || key.includes("grau de par")) {
        if (!result.parentescoResponsavel) result.parentescoResponsavel = val;
      } else if (key.includes("escola") || key.includes("instituição") || key.includes("ensino")) {
        if (!result.instituicaoEnsino) result.instituicaoEnsino = val;
      } else if (key.includes("curso") && (key.includes("escolar") || key.includes("ensino"))) {
        if (!result.cursoGrau) result.cursoGrau = val;
      } else if (key.includes("turno")) {
        if (!result.turnoEscolar) {
          if (val.toLowerCase().includes("manhã") || val.toLowerCase().includes("manha")) result.turnoEscolar = "Manhã";
          else if (val.toLowerCase().includes("tarde")) result.turnoEscolar = "Tarde";
          else if (val.toLowerCase().includes("noite")) result.turnoEscolar = "Noite";
        }
      } else if (key.includes("série") || key.includes("serie") || key.includes("ano")) {
        if (!result.serieAno) result.serieAno = val;
      } else if (key.includes("admissão") || key.includes("admissao") || key.includes("data de adm")) {
        if (!result.dataAdmissao) result.dataAdmissao = val;
      } else if (key.includes("término") || key.includes("termino") || key.includes("fim")) {
        if (!result.dataTermino) result.dataTermino = val;
      } else if (key.includes("qualificadora") || key.includes("instituição formadora") || key.includes("ciee") || key.includes("senac")) {
        if (!result.entidadeQualificadora) result.entidadeQualificadora = val;
      } else if (key.includes("curso de aprendizagem") || key.includes("atividade de aprend")) {
        if (!result.cursoAprendizagem) result.cursoAprendizagem = val;
      } else if (key.includes("tutor") || key.includes("supervisor")) {
        if (!result.tutorSupervisor) result.tutorSupervisor = val;
      } else if (key.includes("setor") || key.includes("departamento")) {
        if (!result.setorAlocacao) result.setorAlocacao = val;
      } else if (key.includes("horário") || key.includes("horario")) {
        if (!result.horarioTrabalho) result.horarioTrabalho = val;
      } else if (key.includes("banco")) {
        if (!result.banco) result.banco = val;
      } else if (key.includes("agência") || key.includes("agencia")) {
        if (!result.agencia) result.agencia = val;
      } else if (key.includes("conta")) {
        if (!result.conta) result.conta = val;
      } else if (key.includes("pix")) {
        if (!result.pix) result.pix = val;
      }
    }
  }

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!result.cpf) {
      const match = cleanLine.match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/);
      if (match) {
        if (cleanLine.toLowerCase().includes("responsavel") || cleanLine.toLowerCase().includes("responsável")) {
          result.cpfResponsavel = match[1];
        } else {
          result.cpf = match[1];
        }
      }
    }
    if (!result.rg) {
      const match = cleanLine.match(/(\d{1,2}\.?\d{3}\.?\d{3}-?[\dX])/i);
      if (match) {
        if (cleanLine.toLowerCase().includes("responsavel") || cleanLine.toLowerCase().includes("responsável")) {
          result.rgResponsavel = match[1];
        } else {
          result.rg = match[1];
        }
      }
    }
    if (!result.cep) {
      const match = cleanLine.match(/(\d{5}-?\d{3})/);
      if (match) result.cep = match[1];
    }
    if (!result.dataNascimento) {
      const match = cleanLine.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (match) result.dataNascimento = match[0];
    }
  }

  return {
    nomeCompleto: result.nomeCompleto || "",
    dataNascimento: result.dataNascimento || "",
    idade: result.idade || "",
    cpf: result.cpf || "",
    rg: result.rg || "",
    nomeMae: result.nomeMae || "",
    nomePai: result.nomePai || "",
    telefone: result.telefone || "",
    email: result.email || "",
    endereco: result.endereco || "",
    numero: result.numero || "",
    complemento: result.complemento || "",
    bairro: result.bairro || "",
    cep: result.cep || "",
    cidade: result.cidade || "",
    uf: result.uf || "",
    nomeResponsavel: result.nomeResponsavel || "",
    cpfResponsavel: result.cpfResponsavel || "",
    rgResponsavel: result.rgResponsavel || "",
    parentescoResponsavel: result.parentescoResponsavel || "",
    telefoneResponsavel: result.telefoneResponsavel || "",
    instituicaoEnsino: result.instituicaoEnsino || "",
    cursoGrau: result.cursoGrau || "",
    turnoEscolar: result.turnoEscolar || "",
    serieAno: result.serieAno || "",
    dataAdmissao: result.dataAdmissao || "",
    dataTermino: result.dataTermino || "",
    entidadeQualificadora: result.entidadeQualificadora || "CIEE",
    cursoAprendizagem: result.cursoAprendizagem || "Assistente Administrativo",
    tutorSupervisor: result.tutorSupervisor || "",
    setorAlocacao: result.setorAlocacao || "",
    horarioTrabalho: result.horarioTrabalho || "08:00 às 12:00",
    banco: result.banco || "",
    agencia: result.agencia || "",
    conta: result.conta || "",
    pix: result.pix || ""
  };
}

// Helper heuristic parser for Terms of Responsibility data extraction
function parseTermsHeuristically(rawText: string, termType: string) {
  const result = {
    termType: termType || "chaves",
    nomeCompleto: "",
    cargo: "",
    setor: "",
    cpf: "",
    rg: "",
    telefone: "",
    email: "",
    nomeChavePorta: "",
    codigoChave: "",
    localPorta: "",
    observacaoChaves: "",
    descricaoEquipamento: "",
    marcaModelo: "",
    numeroSerie: "",
    patrimonio: "",
    estadoConservacao: "",
    valorEstimado: "",
    modeloVeiculo: "",
    placaVeiculo: "",
    renavamVeiculo: "",
    corVeiculo: "",
    kmInicial: "",
    nivelCombustivel: "",
    numeroCartao: "",
    bandeiraCartao: "",
    limiteMensal: "",
    finalidadeCartao: ""
  };

  const lines = rawText.split(/\r?\n/);
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    const lower = cleanLine.toLowerCase();

    if (lower.includes("nome:") || lower.includes("nome completo:") || lower.includes("responsável:") || lower.includes("colaborador:")) {
      result.nomeCompleto = cleanLine.replace(/^(nome completo|nome|responsável|colaborador):\s*/i, "").trim();
    } else if (lower.includes("cargo:")) {
      result.cargo = cleanLine.replace(/^cargo:\s*/i, "").trim();
    } else if (lower.includes("setor:") || lower.includes("departamento:") || lower.includes("área:") || lower.includes("area:")) {
      result.setor = cleanLine.replace(/^(setor|departamento|área|area):\s*/i, "").trim();
    } else if (lower.includes("cpf:")) {
      const match = cleanLine.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
      result.cpf = match ? match[0] : cleanLine.replace(/^cpf:\s*/i, "").trim();
    } else if (lower.includes("rg:")) {
      result.rg = cleanLine.replace(/^rg:\s*/i, "").trim();
    } else if (lower.includes("telefone:") || lower.includes("celular:") || lower.includes("tel:")) {
      result.telefone = cleanLine.replace(/^(telefone|celular|tel):\s*/i, "").trim();
    } else if (lower.includes("email:") || lower.includes("e-mail:")) {
      result.email = cleanLine.replace(/^(email|e-mail):\s*/i, "").trim();
    }

    if (termType === "chaves") {
      if (lower.includes("chave:") || lower.includes("porta:") || lower.includes("sala:")) {
        result.nomeChavePorta = cleanLine.replace(/^(chave|porta|sala):\s*/i, "").trim();
      } else if (lower.includes("codigo:") || lower.includes("código:")) {
        result.codigoChave = cleanLine.replace(/^(codigo|código):\s*/i, "").trim();
      } else if (lower.includes("local:") || lower.includes("filial:") || lower.includes("sala/local:")) {
        result.localPorta = cleanLine.replace(/^(local|filial|sala\/local):\s*/i, "").trim();
      } else if (lower.includes("obs:") || lower.includes("observação:") || lower.includes("observacao:")) {
        result.observacaoChaves = cleanLine.replace(/^(obs|observação|observacao):\s*/i, "").trim();
      }
    } else if (termType === "equipamentos") {
      if (lower.includes("equipamento:") || lower.includes("notebook:") || lower.includes("computador:")) {
        result.descricaoEquipamento = cleanLine.replace(/^(equipamento|notebook|computador):\s*/i, "").trim();
      } else if (lower.includes("marca:") || lower.includes("modelo:") || lower.includes("marca/modelo:")) {
        result.marcaModelo = cleanLine.replace(/^(marca|modelo|marca\/modelo):\s*/i, "").trim();
      } else if (lower.includes("série:") || lower.includes("serie:") || lower.includes("serial:") || lower.includes("ns:")) {
        result.numeroSerie = cleanLine.replace(/^(série|serie|serial|n\/s|ns):\s*/i, "").trim();
      } else if (lower.includes("patrimonio:") || lower.includes("patrimônio:")) {
        result.patrimonio = cleanLine.replace(/^(patrimonio|patrimônio):\s*/i, "").trim();
      } else if (lower.includes("estado:") || lower.includes("conservação:") || lower.includes("conservacao:")) {
        result.estadoConservacao = cleanLine.replace(/^(estado|conservação|conservacao):\s*/i, "").trim();
      } else if (lower.includes("valor:") || lower.includes("estimado:") || lower.includes("valor estimado:")) {
        result.valorEstimado = cleanLine.replace(/^(valor|valor estimado|estimado):\s*/i, "").trim();
      }
    } else if (termType === "veiculos") {
      if (lower.includes("veiculo:") || lower.includes("veículo:") || lower.includes("carro:") || lower.includes("modelo:")) {
        result.modeloVeiculo = cleanLine.replace(/^(veiculo|veículo|carro|modelo):\s*/i, "").trim();
      } else if (lower.includes("placa:")) {
        result.placaVeiculo = cleanLine.replace(/^placa:\s*/i, "").trim();
      } else if (lower.includes("renavam:")) {
        result.renavamVeiculo = cleanLine.replace(/^renavam:\s*/i, "").trim();
      } else if (lower.includes("cor:")) {
        result.corVeiculo = cleanLine.replace(/^cor:\s*/i, "").trim();
      } else if (lower.includes("km:") || lower.includes("quilometragem:") || lower.includes("km inicial:")) {
        result.kmInicial = cleanLine.replace(/^(km|quilometragem|km inicial):\s*/i, "").trim();
      } else if (lower.includes("combustivel:") || lower.includes("combustível:") || lower.includes("nível combustível:")) {
        result.nivelCombustivel = cleanLine.replace(/^(combustivel|combustível|nível combustível):\s*/i, "").trim();
      }
    } else if (termType === "cartao") {
      if (lower.includes("cartão:") || lower.includes("cartao:") || lower.includes("número:") || lower.includes("numero:") || lower.includes("nº cartão:")) {
        result.numeroCartao = cleanLine.replace(/^(cartão|cartao|número|numero|nº cartão):\s*/i, "").trim();
      } else if (lower.includes("bandeira:")) {
        result.bandeiraCartao = cleanLine.replace(/^bandeira:\s*/i, "").trim();
      } else if (lower.includes("limite:") || lower.includes("limite mensal:")) {
        result.limiteMensal = cleanLine.replace(/^(limite|limite mensal):\s*/i, "").trim();
      } else if (lower.includes("finalidade:") || lower.includes("uso:")) {
        result.finalidadeCartao = cleanLine.replace(/^(finalidade|uso):\s*/i, "").trim();
      }
    }
  }

  if (!result.nomeCompleto && lines.length > 0) {
    const firstNonKey = lines.find(l => l.trim() && !l.includes(":") && l.length > 3 && l.length < 50);
    if (firstNonKey) {
      result.nomeCompleto = firstNonKey.trim();
    }
  }

  return result;
}

// Fallback helper for creating dynamic terms
function fallbackCreateTermStructure(termName: string, rawText: string) {
  const slug = termName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  return {
    id: slug || "termo-personalizado",
    label: termName,
    fields: [
      { key: "itemDescrito", label: "Item/Objeto", placeholder: "EX: DESCRIÇÃO DO ITEM OU SERVIÇO" },
      { key: "detalhesAdicionais", label: "Detalhes Adicionais", placeholder: "EX: INFORMAÇÕES COMPLEMENTARES" },
      { key: "dataVigencia", label: "Vigência", placeholder: "EX: DD/MM/AAAA" },
      { key: "localizacao", label: "Local / Setor", placeholder: "EX: FILIAL MATRIZ" }
    ],
    clauses: [
      "1. O colaborador assume plena responsabilidade legal pela guarda e conservação do objeto descrito sob os termos do regulamento interno.",
      "2. É vedada a cessão, transferência ou empréstimo do objeto a terceiros sem prévia autorização por escrito do setor de compras/diretoria.",
      "3. Eventuais perdas, avarias ou danos por negligência ou mau uso serão de responsabilidade do assinante, autorizando descontos legais.",
      "4. Compromete-se a devolver o objeto em perfeito estado de conservação no término do acordo ou caso de desligamento laboral."
    ]
  };
}

// REST API to extract terms of responsibility
app.post("/api/gemini/extract-terms-responsibility", async (req, res) => {
  try {
    const { rawText, termType } = req.body;
    if (!rawText || typeof rawText !== "string") {
      return res.status(400).json({ error: "O texto bruto para extração é obrigatório." });
    }

    const type = termType || "chaves";

    if (!ai) {
      const extracted = parseTermsHeuristically(rawText, type);
      return res.json(extracted);
    }

    const prompt = `Analise o texto abaixo que contém informações de um colaborador e de um termo de responsabilidade do tipo "${type}". Extraia o máximo de informações possíveis e preencha os campos correspondentes.

TEXTO BRUTO FORNECIDO:
"${rawText}"

Instruções importantes:
- Preencha os campos do colaborador (nomeCompleto, cargo, setor, cpf, rg, telefone, email).
- Preencha os campos específicos do tipo "${type}" correspondente.
- Deixe os campos não relacionados vazios ("") caso não existam informações correspondentes.
- Para datas, use o formato DD/MM/YYYY.
- Formate CPFs e RGs se possível.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nomeCompleto: { type: Type.STRING },
              cargo: { type: Type.STRING },
              setor: { type: Type.STRING },
              cpf: { type: Type.STRING },
              rg: { type: Type.STRING },
              telefone: { type: Type.STRING },
              email: { type: Type.STRING },
              
              nomeChavePorta: { type: Type.STRING },
              codigoChave: { type: Type.STRING },
              localPorta: { type: Type.STRING },
              observacaoChaves: { type: Type.STRING },
              
              descricaoEquipamento: { type: Type.STRING },
              marcaModelo: { type: Type.STRING },
              numeroSerie: { type: Type.STRING },
              patrimonio: { type: Type.STRING },
              estadoConservacao: { type: Type.STRING },
              valorEstimado: { type: Type.STRING },
              
              modeloVeiculo: { type: Type.STRING },
              placaVeiculo: { type: Type.STRING },
              renavamVeiculo: { type: Type.STRING },
              corVeiculo: { type: Type.STRING },
              kmInicial: { type: Type.STRING },
              nivelCombustivel: { type: Type.STRING },
              
              numeroCartao: { type: Type.STRING },
              bandeiraCartao: { type: Type.STRING },
              limiteMensal: { type: Type.STRING },
              finalidadeCartao: { type: Type.STRING }
            },
            required: [
              "nomeCompleto", "cargo", "setor", "cpf", "rg", "telefone", "email",
              "nomeChavePorta", "codigoChave", "localPorta", "observacaoChaves",
              "descricaoEquipamento", "marcaModelo", "numeroSerie", "patrimonio", "estadoConservacao", "valorEstimado",
              "modeloVeiculo", "placaVeiculo", "renavamVeiculo", "corVeiculo", "kmInicial", "nivelCombustivel",
              "numeroCartao", "bandeiraCartao", "limiteMensal", "finalidadeCartao"
            ]
          }
        }
      });

      const text = response.text;
      const parsed = JSON.parse(text || "{}");
      parsed.termType = type;
      return res.json(parsed);
    } catch (aiError) {
      console.warn("Gemini AI API call for Terms failed, falling back to heuristic parsing:", aiError);
      const extracted = parseTermsHeuristically(rawText, type);
      return res.json(extracted);
    }
  } catch (error: any) {
    console.error("Gemini Terms Extraction Error:", error);
    res.status(500).json({ error: error?.message || "Erro ao processar e extrair os dados do termo de responsabilidade." });
  }
});

// REST API for intelligent parsing and marking items as bought
app.post("/api/gemini/analyze-purchase-items", async (req, res) => {
  try {
    const { rawText, imageBase64, imageMimeType, items } = req.body;
    const inputItems = Array.isArray(items) ? items : [];

    // Fallback heuristic function
    const runHeuristicFallback = () => {
      const matchedItemIds: string[] = [];
      const textToSearch = (rawText || "").toLowerCase();
      
      inputItems.forEach((item: any) => {
        if (!item.id || !item.name) return;
        const itemNameLower = item.name.toLowerCase();
        
        // Simple token matching: if any substantial part of the item name is in the text
        const words = itemNameLower.split(/\s+/).filter((w: string) => w.length > 3);
        const isMatched = words.some((word: string) => textToSearch.includes(word)) || textToSearch.includes(itemNameLower);
        
        if (isMatched && words.length > 0) {
          matchedItemIds.push(item.id);
        }
      });

      const matchedNames = inputItems
        .filter((it: any) => matchedItemIds.includes(it.id))
        .map((it: any) => it.name);

      return {
        summary: matchedNames.length > 0 
          ? `[Heurístico] Identificados e marcados como comprado: ${matchedNames.join(", ")}.` 
          : "Nenhum item correspondente pôde ser identificado no texto enviado de forma automática.",
        matchedItemIds
      };
    };

    if (!ai) {
      return res.json(runHeuristicFallback());
    }

    const prompt = `Você é o Assistente de Inteligência BP-COMPRAS para Gestão de Estoque e Compras de Facilities.
O usuário enviou uma nota fiscal, lista de compras, ou imagem de comprovante contendo itens comprados.
Ele também forneceu a lista de itens ativos na cotação para realizarmos o cruzamento.

LISTA DE ITENS DA COTAÇÃO:
${JSON.stringify(inputItems.map((it: any) => ({ id: it.id, name: it.name })))}

SUA TAREFA:
1. Analise as informações textuais ou visuais do comprovante/lista fornecido.
2. Identifique quais itens foram de fato "comprados" ou "adquiridos".
3. Tente cruzar cada item identificado com a Lista de Itens da Cotação usando correspondência semântica inteligente (ex: "Água Sanitária" combina com "Água Sanitária 5L"; "Papel Toalha" combina com "Papel Toalha Interfolha 100% Celulose").
4. Monte um resumo profissional descrevendo detalhadamente os itens identificados, quantidades e marcas.
5. Retorne a lista de IDs de todos os itens da cotação que foram identificados como comprados.

RETORNE EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO obedecendo exatamente a seguinte e estrita estrutura das propriedades:
{
  "summary": "Um parágrafo de resumo bem redigido em Português descrevendo os itens e quantidades identificados como comprados e que foram cruzados com a planilha.",
  "matchedItemIds": ["id_do_item_1", "id_do_item_2"]
}`;

    const parts: any[] = [{ text: prompt }];

    if (rawText && typeof rawText === "string" && rawText.trim()) {
      parts.push({ text: `CONTEÚDO TEXTUAL DO COMPROVANTE:\n"${rawText}"` });
    }

    if (imageBase64 && typeof imageBase64 === "string" && imageMimeType) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64
        }
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              matchedItemIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["summary", "matchedItemIds"]
          }
        }
      });

      const textResult = response.text;
      const parsed = JSON.parse(textResult || "{}");
      return res.json(parsed);
    } catch (aiError) {
      console.warn("Gemini call failed for analyze-purchase-items, falling back:", aiError);
      return res.json(runHeuristicFallback());
    }
  } catch (err: any) {
    console.error("Error in analyze-purchase-items:", err);
    res.status(500).json({ error: err?.message || "Erro ao processar e ler inteligência de itens comprados." });
  }
});

// REST API to create a dynamic custom term structure
app.post("/api/gemini/create-term-structure", async (req, res) => {
  try {
    const { termName, rawText } = req.body;
    if (!termName || typeof termName !== "string" || !termName.trim()) {
      return res.status(400).json({ error: "O nome do termo é obrigatório." });
    }

    if (!ai) {
      const structured = fallbackCreateTermStructure(termName, rawText || "");
      return res.json(structured);
    }

    const prompt = `Você é um assistente legal e de compras especializado em criação de termos de responsabilidade e comodatos corporativos.
O usuário quer criar um novo tipo de termo de responsabilidade chamado: "${termName}".
Ele forneceu as seguintes informações, cláusulas ou dados brutos para servirem de base de estrutura:
"${rawText || 'Sem descrição adicional'}"

Instruções importantes:
1. Identifique de 4 a 6 campos de dados específicos (por exemplo, se for 'Termo de Confidencialidade', campos úteis seriam 'projetoVinculado', 'nivelSigilo', 'dataAcordo'; se for 'Termo de Home Office', campos úteis seriam 'modeloRoteador', 'computadorFornecido', 'velocidadeInternet', 'dataEntrega').
2. Crie para cada campo:
   - key: em camelCase, contendo apenas letras sem caracteres especiais (ex: modeloEquipamento, nivelAcesso, placaVeiculo)
   - label: descrição amigável curta em português (ex: Modelo do Equipamento, Nível de Acesso, Placa do Veículo)
   - placeholder: exemplo prático de preenchimento (ex: EX: HP PROBOOK, EX: RESTRITO, EX: AAA-0A00)
3. Formule de 3 a 5 cláusulas ou regras legais claras, bem redigidas em português, baseadas nas diretrizes enviadas pelo usuário (ou gere cláusulas corporativas padrão excelentes e adequadas ao tipo de termo caso os dados fornecidos sejam muito curtos).
4. Crie um 'id' único em formato de slug minúsculo baseado no nome do termo.
5. Retorne o resultado estritamente no formato do JSON Schema solicitado abaixo. Não realize o preenchimento de dados de colaborador ou dos próprios objetos, pois isso será feito futuramente.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            label: { type: Type.STRING },
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  label: { type: Type.STRING },
                  placeholder: { type: Type.STRING }
                },
                required: ["key", "label", "placeholder"]
              }
            },
            clauses: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["id", "label", "fields", "clauses"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (err: any) {
    console.error("Gemini Create Term Structure Error:", err);
    try {
      const { termName, rawText } = req.body;
      const structured = fallbackCreateTermStructure(termName || "Termo de Responsabilidade", rawText || "");
      return res.json(structured);
    } catch {
      res.status(500).json({ error: err?.message || "Erro ao processar criação de termo." });
    }
  }
});

// REST API for corporate manual tutor/assistant
app.post("/api/gemini/normativa-tutor", async (req, res) => {
  try {
    const { question, chatHistory } = req.body;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "A dúvida/pergunta é obrigatória." });
    }

    const normalizedQuestion = question.toLowerCase();

    // High quality simulated response fallback if GEMINI_API_KEY is not defined or fails
    const runFallbackSimulation = () => {
      let answer = "";
      if (normalizedQuestion.includes("zeladora") || normalizedQuestion.includes("bonific") || normalizedQuestion.includes("alelo") || normalizedQuestion.includes("90")) {
        answer = `### 🧹 Bonificação de Zeladoras (Capítulo 08)
De acordo com a normativa, a bonificação mensal de **R$ 90,00** é paga no cartão **Alelo** para as Zeladoras de todas as filiais.

**Critérios obrigatórios para recebimento:**
1. **Assiduidade:** Sem faltas injustificadas. Atestados médicos só contam para horas parciais (atestado de dia inteiro desclassifica no mês).
2. **Banco de Horas:** Saldo negativo máximo de até **4 horas**.
3. **Conduta:** Nenhuma advertência ou medida disciplinar no período.
4. **Qualidade:** Nenhuma reclamação formal registrada pelas operações da unidade.
5. **Experiência:** Elegível apenas após o término dos **90 dias** de experiência inicial.

*A conferência é mensal pelo DP com base nos relatórios do escritório Gomes e validada com os Coordenadores locais.*`;
      } else if (normalizedQuestion.includes("correio") || normalizedQuestion.includes("postagem") || normalizedQuestion.includes("sgpweb") || normalizedQuestion.includes("carta")) {
        answer = `### 📬 Envio de Correspondências via Correios (Capítulo 09.1)
Para realizar envios físicos via Correios, proceda da seguinte forma:
1. **Abertura do chamado:** Abra no GLPI na categoria **Correio**.
2. **Autorização:** É obrigatório anexar o **D.A. (Documento de Autorização)** assinado por Gerente Executivo ou Diretor.
3. **Embalagem:** Embale com papel pardo ou plástico bolha (para itens frágeis).
4. **Postagem SGPWeb:** Acesse o portal [SGPWeb](https://novo.sgpweb.com.br) com o login \`adm.toronto@bellinatiperez.com.br\` para fazer a pré-postagem eletrônica (Carta Registrada - tarifa \`80810\` de 11x16cm) e emitir a etiqueta.
5. **Financeiro (Módulo 353):** Cadastre a despesa do recibo de envio no ERP (Fornecedor: Correio Curitiba - Código \`11865\` / CNPJ \`34.028.316/0020-76\`), preencha com a ID de faturamento e configure o vencimento em **D+2**.
6. **Arquivo Digital (Módulo 326):** Anexe o comprovante renomeado com a ID da despesa na pasta online.
7. **Finalização:** Mande a ID gerada no chamado do GLPI e solucione.`;
      } else if (normalizedQuestion.includes("uber") || normalizedQuestion.includes("corrida") || normalizedQuestion.includes("viagem")) {
        answer = `### 🚗 Uber Corporativo (Capítulo 09.2)
O Uber Corporativo possui 3 cenários de acesso:
* **Viagens:** Abrir chamado em 'Viagens', anexar cronograma e abrir outro chamado em 'Uber' informando o período exato (o perfil temporário será ativado só para as datas da viagem).
* **Demandas Externas:** Chamado em 'Uber' com a máscara preenchida e o D.A. do Gerente Executivo em anexo (liberado apenas para o dia).
* **Acesso Fixo:** Para uso recorrente, enviar e-mail com justificativa detalhada e aprovação D.A. da Superintendência.

**Faturamento e Cadastro no Módulo 353:**
1. Verifique as corridas no portal Uber Empresa. Registre na planilha financeira e use o código do fornecedor Uber (\`35745\` / CNPJ \`17.895.646/0001-87\`).
2. Digite no número da NF: **NF NÃO EMITIDA**.
3. Escolha sempre a filial **Maringá** para centralização fiscal.
4. Vencimento: configure para o dia **11 do mês seguinte** (cartão Itaú corporativo).
5. Salve o recibo faturado no **Módulo 326 (Arquivo Digital)** e anexe a ID financeira gerada no chamado do GLPI.`;
      } else if (normalizedQuestion.includes("home office") || normalizedQuestion.includes("379") || normalizedQuestion.includes("comodato") || normalizedQuestion.includes("recolhimento")) {
        answer = `### 🏠 Controle de Ativos de Home Office - Módulo 379 (Capítulo 09.3)
O **Módulo 379** do ERP é usado para monitorar a custódia de notebooks, periféricos e cadeiras fornecidos a colaboradores em teletrabalho.
* **Envio/Troca:** Cadastre os dados de contato do teletrabalhador no módulo 379, preencha a aba de 'Patrimônios' com todas as etiquetas de ativos de TI e emita o **Termo de Comodato/Responsabilidade** para assinatura digital do colaborador.
* **Recolhimento:** Em caso de desligamento ou retorno, consulte o CPF no submenu 'Relatórios' do Módulo 379, insira a data da entrega física dos bens e clique em **Confirmar Devolução** para liberar a custódia e finalizar o chamado no GLPI.`;
      } else if (normalizedQuestion.includes("compras") || normalizedQuestion.includes("410") || normalizedQuestion.includes("alçada") || normalizedQuestion.includes("alçadas")) {
        answer = `### 🛍️ Processamento de Compras — Módulo 410 (Capítulo 09.4)
Toda aquisição física deve ocorrer no **Módulo 410 (Compras)** do ERP (Novo Pedido). **É proibido abrir chamados de compras no GLPI.**

**Alçadas limites para aprovação:**
* **Gerente Administrativo / Facilities:** Até R$ 300,00
* **Gerente Executivo / Facilities:** Até R$ 300,00
* **Gerente de Compras:** Até R$ 3.000,00
* **Superintendente Administrativo(a):** Até R$ 9.999,00
* **Vice-Presidência e Presidência:** Qualquer valor

**SLAs de análise de Compras (seg–sex, das 9h às 18h):**
* Cadeiras / Informática / Materiais de Limpeza: **24 horas úteis**.
* Computadores / Notebooks: **48 horas úteis**.
* Móveis / Reformas / Dedetizações: **72 horas úteis** (exige 3 orçamentos comparativos).`;
      } else if (normalizedQuestion.includes("reserva") || normalizedQuestion.includes("salas") || normalizedQuestion.includes("treinamento") || normalizedQuestion.includes("auditório")) {
        answer = `### 📅 Reserva de Auditório e Salas de Treinamento (Capítulo 10.1)
Para utilizar esses espaços de treinamento ou reuniões ampliadas:
1. **Antecedência:** Abra chamado no GLPI com no mínimo **48 horas úteis**.
2. **Canal:** Categoria **Reserva**, especificando no título "Auditório" ou "Sala de Treinamento".
3. **Máscara:** Indique data, horário exato, finalidade e número estimado de participantes.
4. **Regras cruciais:**
   * Abra **um chamado individual por data de uso**. Não agrupe datas múltiplas no mesmo chamado.
   * Suporte de áudio/vídeo deve ser testado por Facilities **30 minutos antes** do início.
   * Facilities deve realizar vistoria e climatização da sala **20 minutos antes**.
   * Devolva o espaço organizado e com aparelhos desligados após o encerramento.`;
      } else if (normalizedQuestion.includes("almoço") || normalizedQuestion.includes("almoco") || normalizedQuestion.includes("voucher") || normalizedQuestion.includes("restaurante") || normalizedQuestion.includes("sale pepe")) {
        answer = `### 🍽️ Almoço com Contratantes e Emissão de Vouchers (Capítulo 10.3)
Para realizar almoços de negócios com representantes externos de carteiras:
1. **Solicitação:** Abra chamado no GLPI na categoria **Administrativo > Almoço** com pelo menos **24 horas de antecedência**.
2. **Documentação:** Anexe obrigatoriamente o **D.A. (Documento de Autorização)** assinado pela Superintendência Administrativa.
3. **Máscara:** Liste todos os participantes (colaboradores e contratantes), restaurante escolhido e justificativa.
4. **Voucher:** O ADM emite o voucher em PDF, envia um print para o gestor via WhatsApp/Teams e notifica o restaurante parceiro.
5. **Pagamento:** Pague com o cartão de crédito corporativo da empresa e emita a Nota Fiscal de Serviços com o CNPJ correto da Bellinati Perez.
6. **Prestação de Contas:** Deixe o chamado com status **Planejado**. Ao final do almoço, tire foto da Nota Fiscal, anexe ao chamado do GLPI para validação financeira e mude o status para solucionado.

**Restaurantes parceiros homologados em Curitiba:**
* *Sale Pepe Restaurante* (Mayara: 41 98879-0482)
* *Jokers Bar e Restaurante* (Denise: 41 99879-4596)
* *Pote Chopp* (Luciano: 41 99225-0042)
* *Restaurante Imperial* (Letícia)
* *Brasílico Restaurante* (Roberto: 41 99205-5332)`;
      } else if (normalizedQuestion.includes("glpi") || normalizedQuestion.includes("chamado") || normalizedQuestion.includes("perfil") || normalizedQuestion.includes("técnico")) {
        answer = `### 🖥️ GLPI — Sistema de Chamados (Capítulo 11)
O GLPI é acessado no link [servicedesk.bellinatiperez.com.br](https://servicedesk.bellinatiperez.com.br).
* **Login:** Acesse utilizando seu **CPF** no usuário e insira sua senha padrão.
* **Perfil Técnico:** Lembre-se de clicar na sua foto de perfil no canto superior direito e trocar de **Padrão** para **Técnico** para visualizar os chamados atribuídos ao seu grupo de atendimento.
* **Criação de chamados:** Preencha sempre o título técnico de forma clara, selecione a categoria correta e insira a localização exata (Filial, bloco, andar, PA) junto com a descrição da máscara técnica. Anexe fotos ou o D.A. de custo se aplicável.`;
      } else if (normalizedQuestion.includes("disciplinar") || normalizedQuestion.includes("advertência") || normalizedQuestion.includes("medida") || normalizedQuestion.includes("termo") || normalizedQuestion.includes("infração")) {
        answer = `### ⚖️ Medidas Disciplinares e Termos de Orientação (Capítulo 16)
Em caso de descumprimentos normativos por colaboradores (como violações de Mesa e Tela Limpa, uso de celulares na PA, furar catracas ou consumo de alimentos nas estações de trabalho):
1. Faça a abordagem educativa e recolha o CPF do funcionário.
2. Envie e-mail formal de solicitação de medida para os endereços:
   * \`medidasdisciplinares@bellinatiperez.com.br\`
   * \`adriel.korbela@bellinatiperez.com.br\`
3. Copie o respectivo gestor do colaborador e o Coordenador de Facilities.
4. Preencha o assunto como: *Solicitação de Termo de Orientação* ou *Solicitação de Medida Disciplinar*.
5. Forneça todos os dados (CPF, nome, infração, ocorrido, data, hora e turno de trabalho do funcionário).`;
      } else if (normalizedQuestion.includes("claro") || normalizedQuestion.includes("chip") || normalizedQuestion.includes("moai") || normalizedQuestion.includes("celular")) {
        answer = `### 📱 Linhas Corporativas e Chips (Capítulo 13)
As linhas de celulares corporativas Claro são gerenciadas pela consultoria terceirizada **MOAI Tecnologia**.
* **Abertura de Chamado:** Abra chamado no GLPI e envie e-mail de requisição direcionado a:
  * \`kelly.huzar@bellinatiperez.com.br\`
  * \`jean.siconha@bellinatiperez.com.br\`
  * Com cópia para: \`ricardo.zinke@bellinatiperez.com.br\`
* **Contatos diretos da MOAI (para auditorias, cancelamentos ou faturas):**
  * Cláudio Basso: \`claudio.basso@moaitecnologia.com\`
  * Valdirene Passos: \`valdirene.passos@moaitecnologia.com\``;
      } else if (normalizedQuestion.includes("vistoria") || normalizedQuestion.includes("ronda") || normalizedQuestion.includes("verificação") || normalizedQuestion.includes("fiscalização")) {
        answer = `### 🔍 Vistorias Diárias de Facilities (Capítulo 6.4)
A vistoria técnica predial ocorre diariamente e sem exceções em todos os andares e dependências físicas em dois períodos: às **9h00** e às **16h00**.

**Esferas auditadas de forma minuciosa:**
1. **Equipamentos gerais:** Bebedouros (vazamentos), ar-condicionado (temperatura), TVs de avisos operacionais, catracas de acesso.
2. **Limpeza predial:** Sanitários, soleiras, interruptores, coleta regular de lixos e suprimentos.
3. **Hábitos de PAs:** Coibir lixos, alimentos, papéis, canetas, casacos e pertences nas mesas (devem estar limpas e sem objetos particulares).
4. **Detecção preventiva:** Lâmpadas queimadas, sensores inativos, danos em pinturas ou portas.
5. **Segurança de informação:** Fiscalizar uso de aparelhos celulares ou gravações de dados corporativos nas PAs.`;
      } else if (normalizedQuestion.includes("organograma") || normalizedQuestion.includes("estrutura") || normalizedQuestion.includes("hierarquia")) {
        answer = `### 🏢 Estrutura Organizacional de Facilities (Capítulo 03)
A Carteira de Facilities reporta-se ao Departamento de Facilities e Infraestrutura, subordinado à Superintendência Administrativa da Bellinati Perez.

As frentes operacionais de atuação ativa dividem-se em:
1. **Manutenção Predial e de Infraestrutura** (Sistemas elétricos, hidráulicos, ar condicionado)
2. **Limpeza e Conservação** (Zeladoria terceirizada)
3. **Copa, Refeitório e Insumos** (Materiais de consumo, água, café)
4. **Recepção, Portaria e Controle de Acesso** (Catracas DIMEP/DMP)
5. **Layout e Mudanças de Espaços** (Controle patrimonial, almoxarifados)
6. **Contratos, Compras e Fornecedores** (Processamento no Módulo 410 e faturamento)`;
      } else {
        answer = `### 📘 Assistente de Dúvidas de Facilities BP-COMPRAS
Olá! Eu sou o **Tutor Inteligente de Facilities**. Fui treinado com o conteúdo completo da **Normativa e Manual de Treinamento Facilities 2026** da Bellinati Perez.

Posso esclarecer todas as suas dúvidas sobre os seguintes temas:
* **🧹 Bonificação de Zeladoras** (Regras e prazos do cartão Alelo)
* **📬 Envio de Correspondências** (Pré-postagem SGPWeb, faturamento no Módulo 353 e Módulo 326)
* **🚗 Uber Corporativo** (Regras de viagens, demandas e faturamento fiscal)
* **🏠 Ativos de Home Office** (Termos de comodato e devolução no Módulo 379)
* **🛍️ Compras prediais** (Abertura de pedidos no Módulo 410, alçadas e SLAs)
* **📅 Reserva de Auditório e Salas** (Prazos, regras e chamados de Reserva)
* **🍽️ Almoço com Contratantes** (Vouchers homologados e restaurantes parceiros)
* **🖥️ Operação no GLPI** (Acesso de perfil técnico e direcionamento de categorias)
* **⚖️ Medidas Disciplinares** (Mesa e tela limpa, uso de celulares e termos)
* **🔍 Vistorias Técnicas** (Rondas diárias às 9h e 16h)

**Como posso ajudar você a proceder hoje? Digite sua dúvida acima ou clique no microfone para falar!**`;
      }
      return answer;
    };

    if (!ai) {
      return res.json({ answer: runFallbackSimulation() });
    }

    // Prepare conversational prompt with complete manual integrated in context
    const chatContext = chatHistory && Array.isArray(chatHistory)
      ? chatHistory.map((h: any) => `${h.role === "user" ? "Usuário" : "Tutor"}: ${h.text}`).join("\n")
      : "";

    const systemPrompt = `Você é o "Tutor de IA da Normativa de Facilities da Bellinati Perez 2026". Sua única missão é responder a dúvidas de colaboradores e administradores sobre as regras, procedimentos, prazos, contatos e sistemas contidos no manual oficial de facilities da empresa.

MANUAL E NORMATIVA COMPLETA DA EMPRESA (CONTEXTO DE VERDADE):
---
${JSON.stringify(req.body.normativaContext || "")}
---

INSTRUÇÕES IMPORTANTES DE CONDUTA:
1. Responda de forma extremamente educada, objetiva, profissional e prática em Português do Brasil.
2. Baseie suas respostas estrita e exclusivamente nos fatos reais documentados no Manual acima. Nunca invente e-mails, CNPJs, prazos, e valores que não estejam no manual.
3. Se o usuário perguntar algo que não consta no manual, esclareça com educação que essa dúvida não está coberta na Normativa e instrua-o a procurar o Coordenador de Facilities local ou a Gerência Administrativa para orientação.
4. Use formatação Markdown rica (negritos, listas numeradas, blocos de código se úteis, etc.) para tornar as respostas perfeitamente legíveis, organizadas e agradáveis.
5. Se for solicitado um passo a passo (Ex: como lançar Uber, enviar correspondência ou emitir voucher), apresente as etapas numeradas exatas descritas no manual.
6. Sempre cite o capítulo/seção da normativa correspondente como referência (Ex: "De acordo com o Capítulo 9.2...").

HISTÓRICO DA CONVERSA ATUAL:
${chatContext}

NOVA DÚVIDA DO USUÁRIO:
"${question}"

Responda diretamente com a solução técnica apropriada para a dúvida em questão:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt,
    });

    res.json({ answer: response.text || "Desculpe, não consegui obter uma resposta adequada." });
  } catch (error: any) {
    console.error("Normativa Tutor Gemini Error:", error);
    res.status(500).json({ error: error?.message || "Erro interno ao consultar o Tutor de IA da Normativa." });
  }
});

// Route handlers for the static welcome screen and snapshot pages
app.get("/boas-vindas", (req, res) => {
  res.sendFile(path.join(process.cwd(), "boas-vindas.html"));
});

app.get("/boas-vindas.html", (req, res) => {
  res.sendFile(path.join(process.cwd(), "boas-vindas.html"));
});

app.get("/COMPRAS.html", (req, res) => {
  res.sendFile(path.join(process.cwd(), "COMPRAS.html"));
});

// Serve frontend assets and handle listens via bootstrap
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start development and production router listener
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Bootstrapping server failed:", err);
});
