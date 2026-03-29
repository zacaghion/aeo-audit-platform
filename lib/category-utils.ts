const LEGACY_CATEGORIES: Record<string, string> = {
  Amenity: "Features (legacy)",
  Dining: "Dining (legacy)",
  Location: "Location (legacy)",
  Experience: "Experience (legacy)",
  Practical: "Practical (legacy)",
  Menu: "Menu (legacy)",
  Ambiance: "Ambiance (legacy)",
  Cuisine: "Cuisine (legacy)",
  Integration: "Integration (legacy)",
  Support: "Support (legacy)",
  Security: "Security (legacy)",
  Pricing: "Value (legacy)",
  Products: "Features (legacy)",
  Services: "Features (legacy)",
  Facilities: "Features (legacy)",
  Programs: "Features (legacy)",
  Specialization: "Features (legacy)",
};

export function displayCategory(cat: string): string {
  return LEGACY_CATEGORIES[cat] || cat;
}

export const INTENT_COLORS: Record<string, string> = {
  discovery: "#6366F1",
  comparison: "#F59E0B",
  transactional: "#10B981",
  navigational: "#8B5CF6",
};

export const VALID_INTENTS = ["discovery", "comparison", "transactional", "navigational"];

export function hasIntentData(prompts: Array<{ intent?: string }>): boolean {
  return prompts.some((p) => p.intent && VALID_INTENTS.includes(p.intent.toLowerCase()));
}

export function intentBadgeClass(intent: string): string {
  switch (intent.toLowerCase()) {
    case "discovery": return "bg-indigo-500/20 text-indigo-400 border-transparent";
    case "comparison": return "bg-amber-500/20 text-amber-400 border-transparent";
    case "transactional": return "bg-emerald-500/20 text-emerald-400 border-transparent";
    case "navigational": return "bg-violet-500/20 text-violet-400 border-transparent";
    default: return "bg-gray-500/20 text-gray-400 border-transparent";
  }
}
