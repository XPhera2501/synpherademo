"""
================================================================================
SEMANTIC BUSINESS CLASSIFIER - PYTHON 3.14 COMPATIBLE
================================================================================

KEY FEATURES:
1. Native Tokenization: Replaces spaCy with native regex and suffix-stripping
   to bypass Pydantic V1/Python 3.14 compatibility errors.
2. Suffix Stemming: Implements a custom stemmer to handle 'reducing', 'savings',
   and 'automated' without external NLP models.
3. Weighted Scoring: Maintains the TF-IDF proxy weights for high accuracy.
4. Top-3 Distribution: Provides multi-label classification for overlapping goals.
5. Expanded Taxonomy: Includes Procurement, Logistics, ESG, and Financial Risk
   keywords mapped to overarching business outcomes.

LIBRARIES USED:
- matplotlib: For categorical analysis visualization.
- pandas: For structured data export.
- re: For advanced text sanitization.
================================================================================
"""

import argparse
import json
import os
import re
from collections import Counter

import matplotlib.pyplot as plt
import pandas as pd


class LightweightStemmer:
    """A minimal rule-based stemmer to replace spaCy lemmatization in Python 3.14."""

    def __init__(self):
        # Common business suffixes to strip to reach the semantic 'root'
        self.suffixes = ["ing", "ed", "s", "ion", "ive", "ment", "ly", "ability"]

    def stem(self, word):
        word = word.lower()
        if len(word) <= 3:
            return word
        for suffix in self.suffixes:
            if word.endswith(suffix):
                return word[: -len(suffix)]
        return word


class BusinessOutcomeAnalyzer:
    def __init__(self):
        self.stemmer = LightweightStemmer()

        # Integrated Weights: Overarching categories with mapped sub-category keywords
        self.category_weights = {
            "Cost Savings": {
                # General & Operations
                "budget": 1.5,
                "overhead": 2.0,
                "expens": 1.8,
                "reduc": 1.0,
                "cost": 1.9,
                "roi": 1.5,
                "sav": 1.5,
                "spend": 1.2,
                "econom": 1.5,
                "tco": 2.5,
                "resale": 1.5,
                "fuel": 1.5,
                "consumpt": 1.5,
                "resin": 2.0,
                "ppv": 2.5,
                # Procurement & Logistics
                "discount": 1.8,
                "consolidat": 1.5,
                "enterpris": 1.5,
                "agreement": 1.2,
                "rate": 1.3,
                "card": 1.2,
                "overpay": 2.0,
                "negotiat": 1.5,
                "spot": 1.5,
                "market": 1.2,
                "contract": 1.5,
                "mile": 1.2,
                "backhaul": 2.0,
                "parcel": 1.5,
                "packag": 1.5,
                "optim": 1.8,
                # Labor & Legal
                "blend": 1.2,
                "hour": 1.0,
                "senior": 1.5,
                "junior": 1.5,
                "bill": 1.5,
            },
            "Compliance Improvement": {
                # General & Policy
                "regulat": 2.5,
                "audit": 2.0,
                "gdpr": 3.0,
                "hipaa": 3.0,
                "pdpa": 3.0,
                "policy": 1.5,
                "govern": 2.0,
                "complian": 2.5,
                "legal": 1.8,
                "travel": 1.5,
                "leakage": 2.0,
                "untrack": 2.0,
                "duplicat": 2.0,
                # Accounting & Intercompany
                "journal": 2.0,
                "entrie": 1.8,
                "trial": 2.0,
                "balance": 2.0,
                "deactivat": 2.0,
                "gl": 2.5,
                "variance": 1.5,
                "report": 1.2,
                "capit": 1.5,
                "fx": 2.5,
                "translat": 1.8,
                "miss": 1.2,
                "ar": 2.0,
                "ap": 2.0,
                "close": 1.5,
                # Contractual
                "sow": 2.5,
                "credit": 1.5,
                "sla": 2.5,
                "invoice": 1.8,
                "manual": 1.2,
                "plug": 1.5,
            },
            "Operational Velocity Improvement": {
                # General & Process
                "automat": 1.8,
                "throughput": 2.5,
                "bottleneck": 2.5,
                "workflow": 1.5,
                "cycl": 2.0,
                "speed": 1.2,
                "streamlin": 1.8,
                "efficien": 1.2,
                "resolut": 1.5,
                "window": 1.2,
                "late": 1.2,
                "deadlin": 1.5,
                # Production & Supply Chain
                "machine": 1.5,
                "line": 1.2,
                "clog": 2.0,
                "lead": 1.5,
                "time": 1.0,
                "capac": 1.5,
                "floor": 1.5,
                "moq": 2.5,
                "order": 1.5,
                "frequen": 1.5,
            },
            "Risk Level Reduction": {
                # General & Financial
                "mitigat": 2.5,
                "threat": 2.0,
                "vulnerab": 2.5,
                "secur": 1.5,
                "exposur": 2.0,
                "liabil": 2.0,
                "risk": 1.0,
                "safeguard": 2.0,
                "obsolet": 2.0,
                "inventori": 1.5,
                "reserv": 1.5,
                "sensit": 1.8,
                "curren": 1.5,
                "cta": 2.5,
                # ESG, Safety & Maintenance
                "ecovadi": 3.0,
                "esg": 3.0,
                "safeti": 2.0,
                "carbon": 2.5,
                "tax": 1.8,
                "footprint": 2.0,
                "anomali": 2.0,
                "telemat": 2.5,
                "brak": 2.0,
                "transaction": 1.5,
                "churn": 2.5,
                "qualit": 1.5,
                "log": 1.2,
                "predict": 1.8,
            },
            "Revenue Increase": {
                # General & Growth
                "growth": 1.5,
                "upsell": 2.5,
                "sale": 2.0,
                "monetiz": 3.0,
                "convers": 2.0,
                "profit": 1.8,
                "acquisit": 1.8,
                "revenu": 1.5,
                "green": 1.8,
                "transit": 1.5,
                "recycl": 1.8,
                "quot": 1.5,
                "bid": 1.5,
                # Pricing & Profitability
                "margin": 2.0,
                "price": 1.8,
                "notif": 1.5,
                "raw": 1.5,
                "claus": 1.5,
                "unit": 1.2,
                "ebitda": 3.0,
                "impact": 1.2,
                "net": 1.0,
                "target": 1.5,
            },
        }
        self.categories = list(self.category_weights.keys())
        self.category_phrases = {
            "Cost Savings": {
                "total cost of ownership": 3.0,
                "cost reduction": 2.5,
                "spend consolidation": 2.2,
                "fuel consumption": 2.0,
                "supplier discount": 2.0,
            },
            "Compliance Improvement": {
                "audit readiness": 3.0,
                "invoice reconciliation": 2.5,
                "trial balance": 2.5,
                "month end close": 2.2,
                "policy compliance": 2.8,
            },
            "Operational Velocity Improvement": {
                "cycle time": 2.8,
                "lead time": 2.5,
                "workflow automation": 2.5,
                "process bottleneck": 2.8,
                "throughput improvement": 2.6,
            },
            "Risk Level Reduction": {
                "supplier risk": 2.8,
                "carbon footprint": 2.8,
                "security exposure": 2.5,
                "inventory obsolescence": 2.5,
                "customer churn": 2.5,
            },
            "Revenue Increase": {
                "revenue growth": 3.0,
                "price optimization": 2.6,
                "margin improvement": 2.8,
                "customer acquisition": 2.4,
                "upsell opportunity": 2.8,
            },
        }
        self.domain_keywords = {
            "Finance": {
                "invoice",
                "journal",
                "trial",
                "balance",
                "gl",
                "ar",
                "ap",
                "fx",
                "ebitda",
            },
            "Procurement": {
                "supplier",
                "contract",
                "discount",
                "spend",
                "agreement",
                "negotiat",
                "sow",
            },
            "Logistics": {
                "freight",
                "parcel",
                "mile",
                "backhaul",
                "route",
                "packag",
                "fleet",
            },
            "Operations": {
                "workflow",
                "throughput",
                "bottleneck",
                "cycl",
                "lead",
                "machine",
                "capac",
            },
            "Risk & Security": {
                "risk",
                "mitigat",
                "threat",
                "vulnerab",
                "secur",
                "exposur",
                "safeguard",
            },
            "ESG": {
                "esg",
                "carbon",
                "footprint",
                "tax",
                "ecovadi",
                "recycl",
                "green",
            },
            "Sales": {
                "sale",
                "quot",
                "bid",
                "upsell",
                "margin",
                "price",
                "revenu",
                "growth",
            },
        }
        self.stop_words = {
            "the",
            "and",
            "for",
            "with",
            "that",
            "this",
            "from",
            "into",
            "your",
            "you",
            "are",
            "was",
            "were",
            "will",
            "have",
            "has",
            "had",
            "our",
            "their",
            "them",
            "about",
            "help",
            "need",
            "want",
            "please",
            "could",
            "would",
            "should",
        }

    def _normalize_text(self, text):
        return re.sub(r"\s+", " ", text.strip().lower())

    def _tokenize(self, text):
        """Native tokenization and stemming."""
        # Remove punctuation and split
        words = re.findall(r"\b\w+\b", text.lower())
        # Stem and filter short/noise words
        return [self.stemmer.stem(w) for w in words if len(w) > 2 and w not in self.stop_words]

    def _match_phrases(self, text):
        normalized_text = self._normalize_text(text)
        matches = []
        for category, phrases in self.category_phrases.items():
            for phrase, weight in phrases.items():
                if phrase in normalized_text:
                    matches.append(
                        {
                            "type": "phrase",
                            "signal": phrase,
                            "category": category,
                            "weight": weight,
                        }
                    )
        return matches

    def _score_prompt(self, text):
        tokens = self._tokenize(text)
        scores = {cat: 0.0 for cat in self.categories}
        matched_signals = []

        for token in tokens:
            for category, weights in self.category_weights.items():
                if token in weights:
                    weight = weights[token]
                    scores[category] += weight
                    matched_signals.append(
                        {
                            "type": "token",
                            "signal": token,
                            "category": category,
                            "weight": weight,
                        }
                    )

        for match in self._match_phrases(text):
            scores[match["category"]] += match["weight"]
            matched_signals.append(match)

        return tokens, scores, matched_signals

    def _detect_domains(self, tokens):
        domain_counts = Counter()
        for token in tokens:
            for domain, keywords in self.domain_keywords.items():
                if token in keywords:
                    domain_counts[domain] += 1
        return [
            {"domain": domain, "count": count} for domain, count in domain_counts.most_common(3)
        ]

    def _build_guidance(self, tokens, ranked_results):
        if not ranked_results or ranked_results[0][0] == "Unclassified":
            return (
                "Clarify the intended business outcome. Add one action, one target process, "
                "and one measurable benefit such as cost, cycle time, compliance, risk, or revenue."
            )

        top_category, top_confidence = ranked_results[0]
        if len(ranked_results) > 1 and abs(top_confidence - ranked_results[1][1]) <= 0.12:
            return (
                "The prompt mixes multiple outcomes. Make the primary intent explicit by stating whether the goal is "
                "cost reduction, compliance improvement, operational speed, risk reduction, or revenue growth."
            )

        category_guidance = {
            "Cost Savings": "State the spend area and expected savings driver, such as overhead, contract spend, or fuel usage.",
            "Compliance Improvement": "Name the control, audit, policy, or reporting requirement the prompt should improve.",
            "Operational Velocity Improvement": "Specify the process stage and the speed metric, such as throughput, cycle time, or lead time.",
            "Risk Level Reduction": "Name the exposure to reduce, such as supplier risk, security exposure, or ESG risk.",
            "Revenue Increase": "Call out the growth lever, such as pricing, upsell, margin, conversion, or acquisition.",
        }

        if len(tokens) < 6:
            return (
                category_guidance[top_category]
                + " Add more operational detail so the classifier has stronger signal."
            )

        return category_guidance[top_category]

    def classify_prompt_detailed(self, text):
        tokens, scores, matched_signals = self._score_prompt(text)
        total = sum(scores.values())

        if total == 0:
            ranked_results = [("Unclassified", 0.0)]
            primary_benefit = "Unclassified"
            primary_confidence = 0.0
        else:
            ranked_results = [
                (category, round(score / total, 3))
                for category, score in sorted(scores.items(), key=lambda item: item[1], reverse=True)
                if score > 0
            ][:3]
            primary_benefit, primary_confidence = ranked_results[0]

        ambiguity_flag = (
            len(ranked_results) > 1
            and ranked_results[0][0] != "Unclassified"
            and abs(ranked_results[0][1] - ranked_results[1][1]) <= 0.12
        )

        return {
            "original_prompt": text,
            "normalized_tokens": tokens,
            "matched_signals": matched_signals,
            "category_scores": scores,
            "benefit_ranking": [
                {"category": category, "confidence": confidence}
                for category, confidence in ranked_results
            ],
            "primary_benefit": primary_benefit,
            "primary_confidence": primary_confidence,
            "domain_signals": self._detect_domains(tokens),
            "ambiguity_flag": ambiguity_flag,
            "guidance": self._build_guidance(tokens, ranked_results),
        }

    def classify_prompt(self, text):
        details = self.classify_prompt_detailed(text)
        return [(item["category"], item["confidence"]) for item in details["benefit_ranking"]]

    def classify_prompt_for_authoring(self, text, output_file=None):
        details = self.classify_prompt_detailed(text)
        if output_file:
            with open(output_file, "w", encoding="utf-8") as file_obj:
                json.dump(details, file_obj, indent=2)
        return details

    def print_prompt_authoring_summary(self, text, output_file=None):
        details = self.classify_prompt_for_authoring(text, output_file=output_file)
        print("\n--- Prompt Benefit Classification ---")
        print(f"Prompt: {details['original_prompt']}")
        print(
            f"Primary Benefit: {details['primary_benefit']} ({details['primary_confidence'] * 100:.1f}%)"
        )

        if details["benefit_ranking"] and details["benefit_ranking"][0]["category"] != "Unclassified":
            print("Top Outcomes:")
            for item in details["benefit_ranking"]:
                print(f"- {item['category']}: {item['confidence'] * 100:.1f}%")

        if details["matched_signals"]:
            print("Matched Signals:")
            for signal in details["matched_signals"]:
                print(
                    f"- {signal['signal']} -> {signal['category']} "
                    f"({signal['type']}, weight={signal['weight']})"
                )

        if details["domain_signals"]:
            print("Domain Signals:")
            for domain in details["domain_signals"]:
                print(f"- {domain['domain']}: {domain['count']} match(es)")

        print(f"Ambiguous Outcome Mix: {'Yes' if details['ambiguity_flag'] else 'No'}")
        print(f"Guidance: {details['guidance']}")

        if output_file:
            print(f"Structured Output: {output_file}")

    def run_analysis(self, input_file):
        if not os.path.exists(input_file):
            print(f"Error: {input_file} not found.")
            return

        with open(input_file, "r", encoding="utf-8") as file_obj:
            prompts = [
                line.strip("- ").strip()
                for line in file_obj
                if len(line.strip()) > 10 and not line.startswith("#")
            ]

        final_data = []
        for text in prompts:
            details = self.classify_prompt_detailed(text)
            top_3 = [(item["category"], item["confidence"]) for item in details["benefit_ranking"]]
            row = {
                "Original Prompt": text,
                "Primary Benefit": details["primary_benefit"],
                "Primary Confidence": round(details["primary_confidence"] * 100, 1),
                "Ambiguity Flag": details["ambiguity_flag"],
                "Domain Signals": ", ".join(
                    domain["domain"] for domain in details["domain_signals"]
                ),
            }
            for i in range(3):
                if i < len(top_3):
                    cat, conf = top_3[i]
                    row[f"Rank_{i + 1}"] = f"{cat} ({conf * 100:.1f}%)"
                else:
                    row[f"Rank_{i + 1}"] = None
            final_data.append(row)

        df = pd.DataFrame(final_data)
        df.to_csv("analysis_results.csv", index=False)
        self._plot_results(final_data)

        print("\n--- Analysis Finished (Python 3.14 Native) ---")
        print("Categories Enhanced: 5 Core Outcomes")
        print(f"File Processed: {input_file}")
        print("Output: analysis_results.csv & outcome_distribution.png")

    def _plot_results(self, data):
        primaries = [d["Rank_1"].split(" (")[0] for d in data if d["Rank_1"]]
        counts = Counter(primaries)
        plt.figure(figsize=(10, 6))
        plt.bar(counts.keys(), counts.values(), color="#3498db")
        plt.title("Business Outcome Distribution", fontsize=14)
        plt.xticks(rotation=45, ha="right")
        plt.tight_layout()
        plt.savefig("outcome_distribution.png")


def parse_args():
    parser = argparse.ArgumentParser(description="Classify business prompts into benefit categories.")
    parser.add_argument("--file", help="Path to a markdown or text file containing prompts to analyze.")
    parser.add_argument("--prompt", help="A single prompt to classify at creation time.")
    parser.add_argument("--json-out", help="Optional JSON file path for structured single-prompt output.")
    return parser.parse_args()


if __name__ == "__main__":
    analyzer = BusinessOutcomeAnalyzer()
    args = parse_args()

    if args.prompt:
        analyzer.print_prompt_authoring_summary(args.prompt, output_file=args.json_out)
    elif args.file:
        analyzer.run_analysis(args.file)
    else:
        mode = input("Choose mode ('prompt' or 'file'): ").strip().lower()
        if mode == "prompt":
            prompt_text = input("Enter the prompt to classify: ")
            json_output = input("Optional JSON output file (press Enter to skip): ").strip() or None
            analyzer.print_prompt_authoring_summary(prompt_text, output_file=json_output)
        else:
            filename = input("Enter the .md file name: ")
            analyzer.run_analysis(filename)
