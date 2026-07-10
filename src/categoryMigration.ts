import { Category } from "./types";
import { DEFAULT_CATEGORIES } from "./data";

/**
 * Ensures the "material_limpeza" category exists and has up-to-date items.
 * Handles schema migration for legacy localStorage data.
 */
export function migrateCategories(cats: Category[]): Category[] {
  const defaultLimpeza = DEFAULT_CATEGORIES.find((c) => c.id === "material_limpeza");
  if (!defaultLimpeza) return cats;

  let hasLimpeza = false;
  const migrated = cats.map((cat) => {
    if (cat.id === "material_limpeza") {
      hasLimpeza = true;
      const isOutdated =
        !cat.items.includes("Álcool em gel 70% - 5L - Pedido SESMET") ||
        cat.items.length < 30;
      if (isOutdated) {
        return {
          ...cat,
          name: "MATERIAL DE LIMPEZA",
          items: [...defaultLimpeza.items],
        };
      }
    }
    return cat;
  });

  if (!hasLimpeza) {
    migrated.push({
      id: "material_limpeza",
      name: "MATERIAL DE LIMPEZA",
      items: [...defaultLimpeza.items],
    });
  }

  return migrated;
}
