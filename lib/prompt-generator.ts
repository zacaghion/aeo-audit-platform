interface HotelInfo {
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

const CATEGORY_TEMPLATES: Record<string, string[]> = {
  Discovery: [
    "What are the best {type} hotels in {location}?",
    "Can you recommend a good hotel in {location} for {useCase}?",
    "Where should I stay in {location}?",
    "What hotels in {location} have the best reviews?",
    "I'm looking for a hotel in {location} with {feature}. Any suggestions?",
    "Top rated hotels in {location} under {price} per night",
    "Best places to stay in {location} for first-time visitors",
    "Which {location} hotel should I book for a {duration} stay?",
    "Recommend a hotel near {area} in {location}",
    "What's the best value hotel in {location}?",
  ],
  Comparison: [
    "How does {hotel} compare to {competitor} in {location}?",
    "{hotel} vs {competitor} — which is better for {useCase}?",
    "Is {hotel} better than {competitor}?",
    "What are the pros and cons of {hotel} vs {competitor}?",
    "Should I stay at {hotel} or {competitor} in {location}?",
    "Compare the top boutique hotels in {location}",
    "Which hotel in {location} has better service, {hotel} or {competitor}?",
    "Best alternative to {competitor} in {location}",
  ],
  Brand: [
    "Tell me about {hotel} in {location}",
    "What is {hotel} known for?",
    "Is {hotel} a good hotel? What do people say about it?",
    "What are the reviews like for {hotel}?",
    "Is {hotel} worth the price?",
    "What makes {hotel} special compared to other hotels in {location}?",
    "Has {hotel} won any awards?",
    "Describe the experience of staying at {hotel}",
  ],
  Location: [
    "Best hotels near {area} in {location}",
    "Where to stay in {area}, {location}?",
    "Hotels in {location} with easy access to {attraction}",
    "What's the best neighborhood to stay in {location}?",
    "Hotels in {location} close to public transport",
  ],
  Experience: [
    "Best {location} hotels for {useCase}",
    "Romantic hotels in {location} for couples",
    "Hotels in {location} with the best rooftop bars",
    "Where to stay in {location} for nightlife?",
    "Best hotels in {location} for a luxury weekend",
    "Unique hotel experiences in {location}",
    "Instagram-worthy hotels in {location}",
    "Best hotels in {location} with a pool",
  ],
  Amenity: [
    "Hotels in {location} with {amenity}",
    "Best hotel {amenity} in {location}",
    "{location} hotels with free {amenity}",
    "Which hotels in {location} have the best {amenity}?",
    "Hotels in {location} with in-room {amenity}",
  ],
  Practical: [
    "How much does it cost to stay in {location}?",
    "Best time to visit {location} and where to stay",
    "How to book a hotel in {location}?",
    "Is {location} expensive for hotels?",
    "Tips for booking hotels in {location}",
  ],
  Dining: [
    "Hotels in {location} with great restaurants",
    "Best hotel breakfast in {location}",
    "Hotels in {location} known for their food",
    "Where to stay in {location} for food lovers?",
    "Hotels in {location} near the best street food",
  ],
};

const USE_CASES = ["a honeymoon", "business travel", "a family vacation", "solo travel", "a weekend getaway", "a special occasion"];
const DURATIONS = ["3-night", "week-long", "weekend", "5-night"];
const AMENITIES = ["pool", "spa", "gym", "breakfast", "wifi", "airport shuttle", "rooftop bar", "concierge"];

function extractAreas(location: string): string[] {
  const city = location.split(",")[0].trim();
  const genericAreas = [`downtown ${city}`, `the city center`, `the old town`, `the business district`];
  return genericAreas;
}

function extractAttractions(location: string): string[] {
  const city = location.split(",")[0].trim();
  return [`major attractions in ${city}`, `shopping areas`, `the main temples`, `the river`];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractFeatures(features: string): string[] {
  return features.split(/[,;]/).map(f => f.trim()).filter(Boolean);
}

function extractCompetitors(competitors: string): string[] {
  return competitors.split(/[,;]/).map(c => c.trim()).filter(Boolean);
}

function fillTemplate(template: string, hotel: HotelInfo): string {
  const comps = extractCompetitors(hotel.competitors);
  const feats = extractFeatures(hotel.features);
  const areas = extractAreas(hotel.location);
  const attractions = extractAttractions(hotel.location);

  return template
    .replace(/\{hotel\}/g, hotel.name)
    .replace(/\{location\}/g, hotel.location)
    .replace(/\{type\}/g, hotel.type || "boutique")
    .replace(/\{competitor\}/g, comps.length > 0 ? pickRandom(comps) : "other popular hotels")
    .replace(/\{feature\}/g, feats.length > 0 ? pickRandom(feats) : "great amenities")
    .replace(/\{useCase\}/g, pickRandom(USE_CASES))
    .replace(/\{duration\}/g, pickRandom(DURATIONS))
    .replace(/\{area\}/g, pickRandom(areas))
    .replace(/\{attraction\}/g, pickRandom(attractions))
    .replace(/\{amenity\}/g, pickRandom(AMENITIES))
    .replace(/\{price\}/g, hotel.priceRange || "$200");
}

export function generatePrompts(
  hotel: HotelInfo,
  distribution: Record<string, number>
): GeneratedPrompt[] {
  const prompts: GeneratedPrompt[] = [];
  let promptNumber = 1;

  for (const [category, count] of Object.entries(distribution)) {
    const templates = CATEGORY_TEMPLATES[category] || CATEGORY_TEMPLATES.Discovery;

    for (let i = 0; i < count; i++) {
      const template = templates[i % templates.length];
      const promptText = fillTemplate(template, hotel);
      const mentionsHotel = promptText.toLowerCase().includes(hotel.name.toLowerCase());

      prompts.push({
        promptNumber,
        promptText,
        category,
        intent: `${category} query about hotels in ${hotel.location}`,
        expectedMention: mentionsHotel ? "yes" : "maybe",
      });
      promptNumber++;
    }
  }

  return prompts;
}
