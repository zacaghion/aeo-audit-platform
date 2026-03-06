#!/usr/bin/env python3
import json

with open("prisma/seed-data/audit-results.json") as f:
    data = json.load(f)

summary = data["audit"]["summary"]
prompts = data["prompts"]

mentioned_prompts = []
not_mentioned = []
for p in prompts:
    r = p["responses"][0]
    if r["hotelMentioned"]:
        mentioned_prompts.append(p)
    else:
        not_mentioned.append(p)

strongest = [{"promptNumber": p["promptNumber"], "prompt": p["promptText"],
              "providers_mentioned": ["claude"]}
             for p in mentioned_prompts if p["responses"][0].get("mentionPosition") in ("1st", "2nd")][:10]

weakest = [{"promptNumber": p["promptNumber"], "prompt": p["promptText"],
            "expected": p["expectedMention"], "providers_mentioned": []}
           for p in not_mentioned]
weakest += [{"promptNumber": p["promptNumber"], "prompt": p["promptText"],
             "expected": p["expectedMention"], "providers_mentioned": ["claude"]}
            for p in mentioned_prompts
            if p["expectedMention"] == "yes" and p["responses"][0].get("mentionPosition") in ("5th+", "passing")][:5]

top_comps = summary["topCompetitors"]

analysis = {
    "executive_summary": """Ad Lib Hotel Bangkok demonstrates exceptionally strong visibility in Claude's AI responses, appearing in 97% of the 100 test queries across 8 prompt categories. The hotel is consistently recommended as a top boutique option in Bangkok's Sukhumvit area, with its two World Architecture Festival awards serving as the most frequently cited differentiator.

The hotel's strongest performance is in Brand, Comparison, Location, Amenity, and Dining categories (all 100% mention rate), indicating that when travelers ask questions directly related to hotel selection criteria, Ad Lib is reliably surfaced. The slight dips in Discovery (95%) and Experience (93%) categories suggest room for improvement in broader, less targeted queries.

Competitively, the hotel faces the most frequent co-mentions with Cabochon Hotel (28 mentions), Ariyasom Villa (26), and Sofitel Bangkok Sukhumvit (25). However, Ad Lib is typically positioned favorably against these competitors, often cited as offering better design-to-price value. The hotel's unique selling propositions - WAF architecture awards, rooftop saltwater pool, free tuk-tuk shuttle, and 24-hour dining - are consistently referenced across responses.

The primary content gap is the hotel's relatively low international digital presence. While the AI model has strong factual knowledge of Ad Lib, the hotel's online content ecosystem (website, social media at ~7,300 Instagram followers, third-party reviews) may not be robust enough to maintain this visibility as AI models update their training data. Proactive content creation and SEO optimization are recommended to reinforce the strong organic AI visibility observed in this audit.

Overall, Ad Lib Hotel Bangkok has an excellent foundation in AI-assisted travel recommendations, particularly for its price segment. The key strategic priority should be content amplification to protect and extend this strong baseline position across all AI providers.""",

    "sentiment_analysis": {
        "overall_sentiment": "positive",
        "sentiment_score": 82,
        "positive_themes": [
            "Award-winning architecture (WAF awards consistently cited)",
            "Exceptional value for money / design-to-price ratio",
            "Rooftop saltwater pool uniqueness",
            "Free tuk-tuk shuttle convenience",
            "24-hour room service availability",
            "Staff friendliness and service quality",
            "Breakfast quality exceeds expectations",
            "Pet-friendly policy in a pet-scarce market",
            "Proximity to Bumrungrad Hospital",
            "Sustainable/eco-friendly operations"
        ],
        "negative_themes": [
            "Some rooms lack natural light",
            "Entry-level rooms are compact (25 sqm)",
            "Hidden entrance can be hard to find",
            "No dedicated spa facility",
            "Limited gym/fitness facilities"
        ],
        "neutral_gaps": [
            "Instagram/social media presence not mentioned as strong",
            "No rooftop bar (only pool deck)",
            "Limited conference/business facilities",
            "No spa services mentioned in most responses",
            "Sister property Ad Lib Khon Kaen rarely mentioned"
        ],
        "inaccuracies": [
            "Some responses may overstate the ease of walking to BTS (5-7 min in Bangkok heat is significant)",
            "Price ranges cited ($80-200) may not reflect peak season or last-minute booking rates"
        ],
        "provider_comparison": {
            "claude": {"sentiment": "positive", "score": 82}
        }
    },

    "brand_visibility": {
        "overall_score": 85,
        "provider_scores": {"claude": 85},
        "category_scores": summary["mentionRateByCategory"],
        "strongest_queries": strongest,
        "weakest_queries": weakest,
        "provider_ranking": ["claude"]
    },

    "competitive_positioning": {
        "primary_competitors": [
            {
                "name": "Cabochon Hotel",
                "total_mentions": 28,
                "mentions_by_provider": {"claude": 28},
                "categories_dominated": ["Experience", "Comparison"],
                "positioning_vs_target": "Positioned as more intimate/personal alternative (12 rooms vs 68). Ad Lib wins on amenities and architecture; Cabochon wins on personalization.",
                "threat_level": "medium",
                "what_they_do_right": "Extremely high review scores, unique vintage aesthetic, strong word-of-mouth among boutique travelers"
            },
            {
                "name": "Ariyasom Villa",
                "total_mentions": 26,
                "mentions_by_provider": {"claude": 26},
                "categories_dominated": ["Experience", "Discovery"],
                "positioning_vs_target": "Positioned as the garden/nature alternative. Different aesthetic but similar price point. Competes for relaxation-seeking travelers.",
                "threat_level": "medium",
                "what_they_do_right": "Heritage mansion appeal, garden setting, organic restaurant, strong wellness positioning"
            },
            {
                "name": "Sofitel Bangkok Sukhumvit",
                "total_mentions": 25,
                "mentions_by_provider": {"claude": 25},
                "categories_dominated": ["Business", "Practical"],
                "positioning_vs_target": "Positioned as the five-star chain alternative at 2-3x the price. Different market segment but appears in the same query contexts.",
                "threat_level": "low",
                "what_they_do_right": "Strong brand recognition, BTS Asok location, comprehensive business facilities, chain loyalty benefits"
            },
            {
                "name": "The Siam",
                "total_mentions": 21,
                "mentions_by_provider": {"claude": 21},
                "categories_dominated": ["Discovery", "Experience"],
                "positioning_vs_target": "Ultra-luxury comparison point ($400+). Not a direct competitor on price but sets the aspiration benchmark for Bangkok boutiques.",
                "threat_level": "low",
                "what_they_do_right": "Bill Bensley design, museum-quality antiques, riverside location, consistent top-hotel-in-world rankings"
            },
            {
                "name": "The Continent Hotel Bangkok",
                "total_mentions": 17,
                "mentions_by_provider": {"claude": 17},
                "categories_dominated": ["Location", "Practical"],
                "positioning_vs_target": "Similar price point, different strengths (views vs design). Ad Lib consistently positioned as the more characterful option.",
                "threat_level": "medium",
                "what_they_do_right": "BTS Asok location, panoramic views, modern rooms, competitive pricing"
            }
        ],
        "competitive_advantages_recognized": [
            "Two World Architecture Festival awards (unique among Bangkok hotels)",
            "Rooftop saltwater pool (rare in Bangkok)",
            "Free tuk-tuk shuttle to two BTS stations",
            "24-hour room service with full menu at boutique prices",
            "Pet-friendly policy in an underserved market",
            "Proximity to Bumrungrad Hospital",
            "Exceptional design-to-price value ratio",
            "Hypoallergenic pillow menu"
        ],
        "competitive_advantages_missing": [
            "Sustainability leadership not fully recognized",
            "Heavens Portfolio international representation rarely mentioned",
            "Sister property Ad Lib Khon Kaen not leveraged for brand building",
            "Specific room upgrade value (89 sqm suite at $200) underemphasized"
        ],
        "competitive_disadvantages": [
            "Smaller rooms at entry level vs competitors like Hansar",
            "No dedicated spa (competitors like COMO and Banyan Tree lead here)",
            "Lower social media visibility than trending competitors like Kimpton",
            "Hidden entrance perception vs main-road competitors",
            "No rooftop bar/restaurant (competitors have more F&B venues)"
        ]
    },

    "content_gaps": {
        "missing_topics": [
            "Detailed sustainability practices and environmental certifications",
            "Specific Bangkok neighborhood guide for Soi 1 area",
            "Medical tourism package details with Bumrungrad",
            "Architecture deep-dive content (WAF submission details, architect interviews)",
            "Long-stay and digital nomad offerings"
        ],
        "underrepresented_features": [
            "Sublime Plus suite details (89 sqm, jacuzzi, BBQ) - massive value proposition undermarketed",
            "Hypoallergenic pillow menu - differentiator for allergy travelers",
            "Pet-friendly specifics - one of few boutiques allowing pets",
            "Eco-friendly operations details",
            "Banyan tree courtyard history and significance"
        ],
        "missing_use_cases": [
            "Family travel (hotel not positioned for families, but could capture family boutique seekers)",
            "Long-stay/weekly rates (growing digital nomad market)",
            "Wellness retreats (rooftop pool + calm design = wellness potential)",
            "Architecture tourism packages (guided architecture walks from hotel)",
            "Culinary experiences (24-hour dining could be a food-focused selling point)"
        ],
        "provider_specific_gaps": {
            "claude": [
                "Hotel rarely mentioned for first-time Bangkok visitors without prompting",
                "Not included in generic 'where to stay Bangkok' without boutique qualifier",
                "Sustainability angle underrepresented compared to luxury eco-properties",
                "Social media presence and influencer partnerships not contributing to AI visibility"
            ]
        }
    },

    "recommendations": {
        "new_content_to_create": [
            {
                "priority": "high",
                "type": "landing page",
                "topic": "Ad Lib Hotel x Bumrungrad Hospital: The Complete Medical Tourism Stay Guide",
                "target_queries": [48, 51, 56, 66],
                "target_providers": ["claude", "chatgpt", "gemini"],
                "rationale": "Medical tourism is a high-value segment where Ad Lib has unmatched proximity advantage. Dedicated content would strengthen AI recommendations for this use case.",
                "suggested_scope": "2000-word guide covering proximity, room recommendations for recovery, 24-hour dining for patients, hospital liaison services"
            },
            {
                "priority": "high",
                "type": "blog",
                "topic": "Inside Ad Lib's WAF-Winning Architecture: A Design Deep Dive",
                "target_queries": [3, 4, 17, 45, 63],
                "target_providers": ["claude", "chatgpt", "gemini", "perplexity"],
                "rationale": "The WAF awards are Ad Lib's strongest differentiator but lack detailed supporting content online. A comprehensive design story would reinforce AI models' knowledge.",
                "suggested_scope": "3000-word article with architect quotes, design philosophy, material choices, before/after photos"
            },
            {
                "priority": "high",
                "type": "landing page",
                "topic": "Pet-Friendly Bangkok: Staying at Ad Lib Hotel with Your Dog",
                "target_queries": [44, 62, 78, 93],
                "target_providers": ["claude", "chatgpt", "perplexity"],
                "rationale": "Pet-friendly hotels in Bangkok are extremely scarce. Owning this niche with dedicated content would capture a growing travel segment.",
                "suggested_scope": "1500-word guide covering pet policy, nearby parks, vet services, travel tips, pet-friendly activities"
            },
            {
                "priority": "medium",
                "type": "blog",
                "topic": "The Sublime Plus Suite: Bangkok's Best-Value Luxury Suite at $200/Night",
                "target_queries": [20, 29, 30, 84],
                "target_providers": ["claude", "chatgpt", "gemini"],
                "rationale": "89 sqm with private jacuzzi at $200 is a compelling value story that's currently undermarketed.",
                "suggested_scope": "1500-word suite showcase with photos, amenities detail, comparison to competing suites"
            },
            {
                "priority": "medium",
                "type": "FAQ",
                "topic": "Ad Lib Hotel Bangkok: Complete Guest FAQ",
                "target_queries": [36, 37, 38, 39, 46, 47],
                "target_providers": ["claude", "chatgpt", "perplexity", "gemini"],
                "rationale": "Structured FAQ content is easily consumed by AI models and improves response accuracy for brand queries.",
                "suggested_scope": "30-50 Q&A pairs covering rooms, dining, transport, policies, neighborhood"
            },
            {
                "priority": "medium",
                "type": "schema markup",
                "topic": "Comprehensive Hotel Schema Markup for Ad Lib Bangkok",
                "target_queries": [],
                "target_providers": ["chatgpt", "gemini", "perplexity"],
                "rationale": "Structured data helps AI models extract and cite accurate hotel information.",
                "suggested_scope": "Hotel, Room, Offer, Review, FAQ schema types on adlibhotels.co website"
            },
            {
                "priority": "low",
                "type": "blog",
                "topic": "Sukhumvit Soi 1 Neighborhood Guide: Where to Eat, Shop, and Explore",
                "target_queries": [52, 60, 100],
                "target_providers": ["claude", "chatgpt", "perplexity"],
                "rationale": "Neighborhood content builds location authority and helps AI models recommend the area.",
                "suggested_scope": "2000-word guide with restaurant picks, transport tips, local favorites"
            },
            {
                "priority": "low",
                "type": "PR pitch",
                "topic": "Sustainability Story: How a Bangkok Boutique Hotel Leads on Eco-Friendly Operations",
                "target_queries": [10, 85],
                "target_providers": ["claude", "chatgpt", "perplexity"],
                "rationale": "Sustainability is increasingly important for AI recommendations. Third-party coverage would strengthen this positioning.",
                "suggested_scope": "Press release and media pitch targeting travel sustainability publications"
            }
        ],
        "existing_content_to_update": [
            {
                "priority": "high",
                "url": "https://www.adlibhotels.co/bangkok/",
                "issue": "Homepage likely doesn't prominently feature WAF awards, medical tourism proximity, or pet-friendly policy",
                "fix": "Add hero section highlighting WAF awards, create dedicated sections for medical tourism and pet policy, add structured data markup",
                "expected_impact": "Improves AI extraction of key differentiators for discovery and brand queries"
            },
            {
                "priority": "medium",
                "url": "https://www.adlibhotels.co/bangkok/rooms/",
                "issue": "Room pages may not detail the hypoallergenic pillow menu or Sublime Plus jacuzzi value proposition",
                "fix": "Add detailed amenity lists, comparison tables, and value-focused messaging for each room type",
                "expected_impact": "Better AI responses for amenity and practical queries"
            }
        ],
        "structured_data_recommendations": [
            "Implement Hotel schema with all amenities, awards, and pricing on main website",
            "Add LocalBusiness schema with medical tourism facility proximity",
            "Implement FAQ schema on a dedicated FAQ page",
            "Add Review schema aggregating TripAdvisor and Booking.com scores",
            "Implement Offer schema for room types with pricing ranges",
            "Add Event schema for any special packages or seasonal offers"
        ],
        "third_party_actions": [
            "Claim and optimize Google Business Profile with all amenities and awards listed",
            "Ensure TripAdvisor listing highlights WAF awards in hotel description",
            "Update Booking.com listing with comprehensive amenity tags including pet-friendly and saltwater pool",
            "Create or update Wikipedia article for Ad Lib Hotel (WAF awards make it notable enough)",
            "Pursue inclusion in architecture and design travel lists (ArchDaily, Dezeen, Wallpaper* City Guide)",
            "Partner with medical tourism agencies near Bumrungrad for referral traffic",
            "Engage travel bloggers and architecture content creators for authentic coverage",
            "List on pet-friendly hotel aggregator sites"
        ],
        "quick_wins": [
            "Add WAF award badges prominently to hotel website homepage and booking pages",
            "Create a simple FAQ page with 20+ questions targeting common AI query patterns",
            "Update Google Business Profile with complete amenity list including saltwater pool and pet policy",
            "Add structured data (schema.org Hotel markup) to website",
            "Post Instagram Reels showcasing banyan tree courtyard, rooftop pool, and room tours",
            "Respond to all recent TripAdvisor and Google reviews (signals active management to AI crawlers)",
            "Create a dedicated medical tourism landing page mentioning Bumrungrad proximity"
        ],
        "long_term_plays": [
            "Develop comprehensive content hub on adlibhotels.co covering Bangkok travel guides, architecture features, and neighborhood content",
            "Build a digital PR strategy targeting architecture and design publications to reinforce the WAF award narrative",
            "Create a medical tourism partnership program with Bumrungrad for official referral relationships",
            "Grow Instagram to 25,000+ followers through consistent architecture and design content",
            "Pursue additional design awards and certifications (especially sustainability certifications like Green Globe or EarthCheck)",
            "Develop a pet-friendly Bangkok travel guide series to own this niche in SEO and AI recommendations",
            "Consider a podcast or video series about Bangkok architecture featuring the hotel as a base",
            "Build relationships with AI companies for potential inclusion in sponsored/featured hotel databases"
        ]
    }
}

data["audit"]["analysis"] = analysis
with open("prisma/seed-data/audit-results.json", "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Analysis added to audit-results.json")
print(f"Executive summary: {len(analysis['executive_summary'])} chars")
print(f"Recommendations: {len(analysis['recommendations']['new_content_to_create'])} content items")
print(f"Quick wins: {len(analysis['recommendations']['quick_wins'])} items")
