import { useState, useEffect, useRef } from "react";
import { ArchivedQuote, Category } from "../types";
import { supabase, dbFetchQuotes, dbFetchCategories } from "../supabaseClient";
import { migrateCategories } from "../categoryMigration";

export type SyncStatus = "synced" | "syncing" | "error" | "offline";

/**
 * Handles bidirectional Supabase sync for quotes and categories.
 * Manages loading from cloud on mount, debounced autosave on changes,
 * and provides sync status for UI display.
 */
export function useSupabaseSync(
  archivedQuotes: ArchivedQuote[],
  setArchivedQuotes: React.Dispatch<React.SetStateAction<ArchivedQuote[]>>,
  categories: Category[],
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>
) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("syncing");
  const isLoadedFromCloudRef = useRef(false);

  // 1. Load from Supabase on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        setSyncStatus("syncing");
        const [cloudQuotes, cloudCategories] = await Promise.all([
          dbFetchQuotes(),
          dbFetchCategories(),
        ]);

        if (cloudQuotes && cloudQuotes.length > 0) {
          setArchivedQuotes(cloudQuotes);
        }

        if (cloudCategories && cloudCategories.length > 0) {
          setCategories(migrateCategories(cloudCategories));
        } else {
          setCategories((prev) => migrateCategories(prev));
        }

        isLoadedFromCloudRef.current = true;
        setSyncStatus("synced");
      } catch (err) {
        console.error("Failed to load initial Supabase data:", err);
        setSyncStatus("offline");
      }
    }
    loadInitialData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Debounced autosave for quotes
  useEffect(() => {
    if (!isLoadedFromCloudRef.current) return;

    setSyncStatus("syncing");
    const syncTimeout = setTimeout(async () => {
      try {
        // Delete remote quotes no longer present locally
        const { data: remoteData, error: fetchErr } = await supabase
          .from("quotes")
          .select("id");

        if (!fetchErr && remoteData) {
          const remoteIds = remoteData.map((r: { id: string }) => r.id);
          const localIds = archivedQuotes.map((q) => q.id);
          const deletedIds = remoteIds.filter((id) => !localIds.includes(id));

          if (deletedIds.length > 0) {
            await supabase.from("quotes").delete().in("id", deletedIds);
          }
        }

        // Upsert all local quotes
        if (archivedQuotes.length > 0) {
          const payloads = archivedQuotes.map((q) => ({
            id: q.id,
            title: q.title || "",
            quote_date: q.quoteDate,
            user_name: q.userName,
            user_cpf: q.userCpf,
            saved_at: q.savedAt,
            suppliers: q.suppliers,
            items: q.items,
            capacity_rows: q.capacityRows,
            summary: q.summary,
            category_id: q.categoryId,
            category_name: q.categoryName,
            chamado_number: q.chamadoNumber || "",
          }));

          let { error: upsertErr } = await supabase
            .from("quotes")
            .upsert(payloads, { onConflict: "id" });

          // Fallback for legacy schema without title/chamado_number columns
          if (
            upsertErr &&
            (upsertErr.message?.includes("chamado_number") ||
              upsertErr.message?.includes("title") ||
              upsertErr.code === "PGRST204")
          ) {
            console.warn("Retrying sync with legacy payload (missing columns).");
            const legacyPayloads = archivedQuotes.map((q) => ({
              id: q.id,
              quote_date: q.quoteDate,
              user_name: q.userName,
              user_cpf: q.userCpf,
              saved_at: q.savedAt,
              suppliers: q.suppliers,
              items: q.items,
              capacity_rows: q.capacityRows,
              summary: q.summary,
              category_id: q.categoryId,
              category_name: q.categoryName,
            }));
            const { error: retryErr } = await supabase
              .from("quotes")
              .upsert(legacyPayloads, { onConflict: "id" });
            upsertErr = retryErr;
          }

          if (upsertErr) throw upsertErr;
        }

        setSyncStatus("synced");
      } catch (err) {
        console.error("Autosync with Supabase failed:", err);
        setSyncStatus("error");
      }
    }, 1200);

    return () => clearTimeout(syncTimeout);
  }, [archivedQuotes]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Debounced autosave for categories
  useEffect(() => {
    if (!isLoadedFromCloudRef.current) return;

    const syncTimeout = setTimeout(async () => {
      try {
        if (categories.length > 0) {
          const payloads = categories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            items: cat.items,
          }));
          await supabase.from("categories").upsert(payloads, { onConflict: "id" });
        }
      } catch (err) {
        console.error("Failed to sync categories to Supabase:", err);
      }
    }, 2000);

    return () => clearTimeout(syncTimeout);
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  return { syncStatus };
}
