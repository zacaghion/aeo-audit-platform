import { BUSINESS_PRESETS, type BusinessType } from "./business-presets";

interface BrandInfo {
  name: string;
  location: string;
  type: string;
  features: string;
  competitors: string;
  priceRange: string | null;
}

interface GeneratedPrompt {
  promptNumber: number;
  promptText: string;
  category: string;
  intent: string;
  expectedMention: string;
}

const USE_CASES = ["a honeymoon", "business travel", "a family vacation", "solo travel", "a weekend getaway", "a special occasion", "a date night", "a corporate event"];
const DURATIONS = ["3-night", "week-long", "weekend", "5-night"];
const AMENITIES = ["pool", "spa", "gym", "breakfast", "wifi", "airport shuttle", "rooftop bar", "concierge"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractList(csv: string): string[] {
  return csv.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
}

function extractAreas(location: string): string[] {
  const city = location.split(",")[0].trim();
  return [`downtown ${city}`, `the city center`, `the old town`, `the business district`];
}

function extractAttractions(location: string): string[] {
  const city = location.split(",")[0].trim();
  return [`major attractions in ${city}`, `shopping areas`, `the main landmarks`, `popular tourist spots`];
}

function resolveBusinessType(typeStr: string): BusinessType {
  const lower = typeStr.toLowerCase();
  if (lower.includes("hotel") || lower.includes("hostel") || lower.includes("resort") || lower.includes("hospitality")) return "hotel";
  if (lower.includes("restaurant") || lower.includes("cafe") || lower.includes("bar") || lower.includes("food") || lower.includes("f&b")) return "restaurant";
  if (lower.includes("saas") || lower.includes("software") || lower.includes("app") || lower.includes("platform") || lower.includes("tech")) return "saas";
  if (lower.includes("retail") || lower.includes("shop") || lower.includes("store") || lower.includes("ecommerce") || lower.includes("e-commerce")) return "retail";
  if (lower.includes("clinic") || lower.includes("medical") || lower.includes("dental") || lower.includes("health") || lower.includes("doctor")) return "clinic";
  if (lower.includes("gym") || lower.includes("fitness") || lower.includes("yoga") || lower.includes("crossfit") || lower.includes("pilates")) return "fitness";
  return "other";
}

function fillTemplate(template: string, brand: BrandInfo): string {
  const comps = extractList(brand.competitors);
  const feats = extractList(brand.features);
  const areas = extractAreas(brand.location);
  const attractions = extractAttractions(brand.location);

  return template
    .replace(/\{brand\}/g, brand.name)
    .replace(/\{location\}/g, brand.location)
    .replace(/\{type\}/g, brand.type || "business")
    .replace(/\{competitor\}/g, comps.length > 0 ? pickRandom(comps) : "competitors")
    .replace(/\{feature\}/g, feats.length > 0 ? pickRandom(feats) : "great service")
    .replace(/\{useCase\}/g, pickRandom(USE_CASES))
    .replace(/\{duration\}/g, pickRandom(DURATIONS))
    .replace(/\{area\}/g, pickRandom(areas))
    .replace(/\{attraction\}/g, pickRandom(attractions))
    .replace(/\{amenity\}/g, pickRandom(AMENITIES))
    .replace(/\{price\}/g, brand.priceRange || "$200");
}

export function generatePrompts(
  brand: BrandInfo,
  distribution: Record<string, number>
): GeneratedPrompt[] {
  const businessType = resolveBusinessType(brand.type);
  const preset = BUSINESS_PRESETS[businessType];
  const prompts: GeneratedPrompt[] = [];
  let promptNumber = 1;

  for (const [category, count] of Object.entries(distribution)) {
    const templates = preset.templates[category] || preset.templates[Object.keys(preset.templates)[0]] || [];
    if (templates.length === 0) continue;

    for (let i = 0; i < count; i++) {
      const template = templates[i % templates.length];
      const promptText = fillTemplate(template, brand);
      const mentionsBrand = promptText.toLowerCase().includes(brand.name.toLowerCase());

      prompts.push({
        promptNumber,
        promptText,
        category,
        intent: `${category} query about ${brand.type || "businesses"} in ${brand.location}`,
        expectedMention: mentionsBrand ? "yes" : "maybe",
      });
      promptNumber++;
    }
  }

  return prompts;
}
