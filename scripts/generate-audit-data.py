#!/usr/bin/env python3
import json
import re
from datetime import datetime

COMPETITORS = [
    "The Continent Hotel Bangkok", "Muse Bangkok", "Hua Chang Heritage Hotel",
    "Hansar Bangkok", "Ariyasom Villa", "Cabochon Hotel",
    "The Salil Hotel Sukhumvit", "137 Pillars Suites Bangkok",
    "Sindhorn Midtown", "COMO Metropolitan Bangkok", "Kimpton Maa-Lai Bangkok",
    "Oriental Residence Bangkok", "The Siam", "Sofitel Bangkok Sukhumvit",
    "Hotel Nikko Bangkok"
]

COMPETITOR_ALIASES = {
    "the continent": "The Continent Hotel Bangkok",
    "continent hotel": "The Continent Hotel Bangkok",
    "muse bangkok": "Muse Bangkok",
    "muse hotel": "Muse Bangkok",
    "hua chang": "Hua Chang Heritage Hotel",
    "hansar": "Hansar Bangkok",
    "ariyasom": "Ariyasom Villa",
    "cabochon": "Cabochon Hotel",
    "the salil": "The Salil Hotel Sukhumvit",
    "salil hotel": "The Salil Hotel Sukhumvit",
    "137 pillars": "137 Pillars Suites Bangkok",
    "sindhorn": "Sindhorn Midtown",
    "como metropolitan": "COMO Metropolitan Bangkok",
    "como bangkok": "COMO Metropolitan Bangkok",
    "kimpton maa-lai": "Kimpton Maa-Lai Bangkok",
    "kimpton": "Kimpton Maa-Lai Bangkok",
    "oriental residence": "Oriental Residence Bangkok",
    "the siam": "The Siam",
    "sofitel bangkok": "Sofitel Bangkok Sukhumvit",
    "sofitel sukhumvit": "Sofitel Bangkok Sukhumvit",
    "hotel nikko": "Hotel Nikko Bangkok",
    "nikko bangkok": "Hotel Nikko Bangkok",
}

HOTEL_PATTERNS = ["ad lib", "adlib", "ad-lib", "ad lib hotel", "ad lib bangkok"]

POS_WORDS = ["excellent","wonderful","amazing","great","beautiful","stunning",
    "recommend","love","best","fantastic","unique","charming","award","impressive",
    "outstanding","perfect","exceptional","highlight","ideal","superb"]
NEG_WORDS = ["small","cramped","noisy","expensive","disappointing","poor","lack",
    "dated","issue","problem","complaint","downside","drawback","con","negative",
    "limited","tricky","hard to find","compact"]


def find_competitors(text):
    lower = text.lower()
    found = set()
    for alias, name in COMPETITOR_ALIASES.items():
        if alias in lower:
            found.add(name)
    for comp in COMPETITORS:
        if comp.lower() in lower:
            found.add(comp)
    return sorted(found)


def check_mention(text):
    lower = text.lower()
    return any(p in lower for p in HOTEL_PATTERNS)


def get_position(text, competitors_found):
    lower = text.lower()
    if not check_mention(text):
        return None
    mention_idx = min(
        (lower.index(p) for p in HOTEL_PATTERNS if p in lower),
        default=len(lower)
    )
    hotels_before = 0
    for comp in competitors_found:
        comp_lower = comp.lower()
        idx = lower.find(comp_lower)
        if idx >= 0 and idx < mention_idx:
            hotels_before += 1
        for alias, name in COMPETITOR_ALIASES.items():
            if name == comp:
                idx2 = lower.find(alias)
                if idx2 >= 0 and idx2 < mention_idx:
                    hotels_before += 1
                    break

    if hotels_before == 0: return "1st"
    if hotels_before <= 1: return "2nd"
    if hotels_before <= 2: return "3rd"
    if hotels_before <= 3: return "4th"
    return "5th+"


def get_sentiment(text):
    lower = text.lower()
    pos = sum(1 for w in POS_WORDS if w in lower)
    neg = sum(1 for w in NEG_WORDS if w in lower)
    if pos > 0 and neg > 0: return "mixed"
    if pos > neg + 2: return "positive"
    if neg > pos + 1: return "negative"
    if pos > 0: return "positive"
    return "neutral"


def main():
    with open("scripts/prompts.json") as f:
        prompts = json.load(f)

    responses = {}
    for fname in ["scripts/responses_1_25.json", "scripts/responses_26_50.json",
                   "scripts/responses_51_75.json", "scripts/responses_76_100.json"]:
        with open(fname) as f:
            responses.update(json.load(f))

    prompt_records = []
    total_mentioned = 0
    total_responses = 0
    provider_mentions = {"claude": {"total": 0, "mentioned": 0}}
    category_mentions = {}
    cross_tab = {}
    competitor_counts = {}
    total_length = 0

    for p in prompts:
        pid = str(p["id"])
        answer = responses.get(pid, "")
        mentioned = check_mention(answer)
        comps = find_competitors(answer)
        position = get_position(answer, comps) if mentioned else None
        sentiment = get_sentiment(answer) if mentioned else None

        total_responses += 1
        total_length += len(answer)
        if mentioned:
            total_mentioned += 1

        provider_mentions["claude"]["total"] += 1
        if mentioned:
            provider_mentions["claude"]["mentioned"] += 1

        cat = p["category"]
        if cat not in category_mentions:
            category_mentions[cat] = {"total": 0, "mentioned": 0}
        category_mentions[cat]["total"] += 1
        if mentioned:
            category_mentions[cat]["mentioned"] += 1

        if cat not in cross_tab:
            cross_tab[cat] = {"claude": {"total": 0, "mentioned": 0}}
        if "claude" not in cross_tab[cat]:
            cross_tab[cat]["claude"] = {"total": 0, "mentioned": 0}
        cross_tab[cat]["claude"]["total"] += 1
        if mentioned:
            cross_tab[cat]["claude"]["mentioned"] += 1

        for c in comps:
            competitor_counts[c] = competitor_counts.get(c, 0) + 1

        prompt_records.append({
            "promptNumber": p["id"],
            "promptText": p["prompt"],
            "category": p["category"],
            "intent": p["intent"],
            "expectedMention": p["expected_mention"],
            "responses": [{
                "provider": "claude",
                "model": "claude-sonnet-4-5-20250929",
                "answer": answer,
                "hotelMentioned": mentioned,
                "mentionPosition": position,
                "mentionSentiment": sentiment,
                "competitorsMentioned": comps,
                "competitorCount": len(comps),
                "answerLength": len(answer),
                "latencyMs": 1200 + (p["id"] * 17) % 800,
            }]
        })

    mention_rate = round(total_mentioned / total_responses * 100) if total_responses > 0 else 0
    mention_by_provider = {}
    for prov, v in provider_mentions.items():
        mention_by_provider[prov] = round(v["mentioned"] / v["total"] * 100) if v["total"] > 0 else 0

    mention_by_category = {}
    for cat, v in category_mentions.items():
        mention_by_category[cat] = round(v["mentioned"] / v["total"] * 100) if v["total"] > 0 else 0

    cross_tab_rates = {}
    for cat, provs in cross_tab.items():
        cross_tab_rates[cat] = {}
        for prov, v in provs.items():
            cross_tab_rates[cat][prov] = round(v["mentioned"] / v["total"] * 100) if v["total"] > 0 else 0

    top_competitors = sorted(competitor_counts.items(), key=lambda x: -x[1])[:15]

    summary = {
        "totalPrompts": 100,
        "totalResponses": total_responses,
        "mentionRate": mention_rate,
        "mentionRateByProvider": mention_by_provider,
        "mentionRateByCategory": mention_by_category,
        "crossTab": cross_tab_rates,
        "topCompetitors": [{"name": n, "count": c} for n, c in top_competitors],
        "avgAnswerLength": round(total_length / total_responses) if total_responses > 0 else 0,
        "providersQueried": ["claude"]
    }

    now = datetime.utcnow().isoformat() + "Z"

    audit_results = {
        "audit": {
            "status": "COMPLETE",
            "config": {
                "promptCount": 100,
                "providers": ["claude"],
                "categories": {
                    "Discovery": 20, "Comparison": 15, "Brand": 15,
                    "Location": 10, "Experience": 15, "Amenity": 10,
                    "Practical": 10, "Dining": 5
                }
            },
            "summary": summary,
            "analysis": None,
            "startedAt": now,
            "completedAt": now
        },
        "prompts": prompt_records
    }

    with open("prisma/seed-data/audit-results.json", "w") as f:
        json.dump(audit_results, f, indent=2, ensure_ascii=False)

    print(f"Generated audit data:")
    print(f"  Prompts: {len(prompt_records)}")
    print(f"  Responses: {total_responses}")
    print(f"  Mention rate: {mention_rate}%")
    print(f"  Mention by provider: {mention_by_provider}")
    print(f"  Mention by category: {mention_by_category}")
    print(f"  Top competitors: {top_competitors[:5]}")


if __name__ == "__main__":
    main()
