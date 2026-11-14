# CampusLoop — Future AI Features

## 1. Position today

CampusLoop ships **no AI features**. What exists is an architecture that makes them addable without rewriting the marketplace.

- Eight typed capability interfaces live in `backend/app/services/ai/base.py`.
- Feature flags and a registry live in `backend/app/services/ai/__init__.py`.
- `GET /api/v1/ai/features` reports each capability as `disabled`, `available`, or `enabled but no model provider configured`.
- `GET /api/v1/ai/pricing-method` states plainly that price guidance is `rule_based_v1` and **not** machine learning.
- There are no external AI calls, no fabricated predictions, and no private data exports.

The current price guide (`app/services/pricing.py`) is deterministic: category base, condition multiplier, age depreciation, brand adjustment, comparable listings. It is intentionally isolated so an ML predictor can replace it behind the same route.

---

## 2. The eight planned capabilities

| # | Capability | Enum / flag | Interface | Intended value |
| --- | --- | --- | --- | --- |
| 1 | AI price prediction | `price_prediction` / `AI_PRICE_PREDICTION_ENABLED` | `PricePredictor.predict(**payload)` | Better resale estimates from completed transactions |
| 2 | Personalized recommendations | `recommendations` / `AI_RECOMMENDATIONS_ENABLED` | `Recommender.recommend(user_id, limit)` | Relevant listings on home/dashboard |
| 3 | Semantic search | `semantic_search` / `AI_SEMANTIC_SEARCH_ENABLED` | `SemanticSearch.search(query)` | Natural-language queries with filters |
| 4 | AI listing assistant | `listing_assistant` / `AI_LISTING_ASSISTANT_ENABLED` | `ListingAssistant.draft(title, details)` | Titles, descriptions, keywords, category suggestion |
| 5 | Image classification | `image_classification` / `AI_IMAGE_CLASSIFICATION_ENABLED` | `ImageClassifier.classify(image_bytes)` | Category suggestions from photos |
| 6 | Fraud and anomaly detection | `fraud_detection` / `AI_FRAUD_DETECTION_ENABLED` | `FraudDetector.score_listing(product_id)` | Flag suspicious pricing, spam, abuse |
| 7 | Duplicate listing detection | `duplicate_detection` / `AI_DUPLICATE_DETECTION_ENABLED` | `DuplicateDetector.find_duplicates(product_id)` | Find reposted/duplicated items |
| 8 | Marketplace assistant | `marketplace_assistant` / `AI_ASSISTANT_ENABLED` | `MarketplaceAssistant.answer(question)` | Explain the product and help navigate |

Each adapter inherits `AIService`:

```python
class AIService:
    feature: AIFeature
    enabled: bool

    @property
    def available(self) -> bool:
        return self.enabled and self._provider_configured()

    def _require(self) -> None:
        if not self.available:
            raise AIUnavailableError(...)
```

A real implementation overrides `_provider_configured()` and the capability method. Until a provider is configured, calls raise `AIUnavailableError` — they never return invented data.

---

## 3. Proposed request/response contracts

These schemas are the recommended shape when implementations land; they are not yet exposed as endpoints.

### 3.1 Price prediction

```json
POST /api/v1/ai/price-prediction
{
  "category_id": "…",
  "condition": "good",
  "brand": "Dell",
  "age_months": 30,
  "original_price": 52000,
  "comparable_ids": ["…"]
}
```

```json
{
  "suggested_price": 26500,
  "min_price": 24000,
  "max_price": 29000,
  "confidence": "medium",
  "model": "price-rf-v1",
  "is_ai": true,
  "factors": ["condition:good", "age:30m", "3 comparables"],
  "explanation": "…"
}
```

Keep `method`, `is_ai`, `factors` and `explanation` mandatory. The UI must label AI output differently from the rule-based guide.

### 3.2 Recommendations

```json
{ "items": [{ "product_id": "…", "score": 0.87, "reason": "Similar to your saved laptops" }] }
```

### 3.3 Semantic search

```json
POST /api/v1/ai/search
{ "query": "good second-hand laptop under ₹25,000 near my college", "limit": 20 }
```

```json
{ "filters": { "category": "laptops", "max_price": 25000, "condition": ["good", "like_new"] }, "product_ids": ["…"] }
```

The LLM extracts filters; the existing SQL query executes them. This keeps results grounded in real inventory.

### 3.4 Listing assistant

```json
{ "title": "…", "description": "…", "keywords": ["…"], "suggested_category_id": "…", "confidence": 0.82 }
```

Always require seller review before saving; never publish generated text automatically.

### 3.5 Image classification

```json
{ "labels": [{ "category_id": "…", "label": "Laptop", "confidence": 0.91 }] }
```

### 3.6 Fraud score

```json
{ "risk_score": 0.72, "signals": ["price 70% below category median", "new account", "duplicate photos"], "recommended_action": "manual_review" }
```

Never auto-ban from a model score alone; route to the admin queue.

### 3.7 Duplicate detection

```json
{ "duplicates": [{ "product_id": "…", "similarity": 0.94, "kind": "image+text" }] }
```

### 3.8 Marketplace assistant

```json
{ "answer": "…", "citations": [{ "product_id": "…" }], "suggested_actions": ["open_listing"] }
```

The assistant must answer only from public listings and product documentation. It must not read conversations, verification documents, emails or phone numbers.

---

## 4. Data requirements and preparation

| Feature | Data needed | Availability today |
| --- | --- | --- |
| Price prediction | Completed transactions, asking prices, condition, age, brand, category | Transactions and listings exist but volume is low; needs more history |
| Recommendations | Views, wishlist, searches, conversations (aggregated, consented) | Views/wishlists exist; search logs are not persisted yet |
| Semantic search | Listing titles/descriptions + embeddings | Text exists; embeddings and vector index do not |
| Listing assistant | Public category taxonomy and example listings | Categories and listings exist |
| Image classification | Product images + category labels | Images exist when uploaded; no labelled set |
| Fraud detection | Historical reports, moderation decisions, pricing distributions | Reports/audit logs exist; needs labelled outcomes |
| Duplicate detection | Image hashes/embeddings, text similarity | Images and text exist |
| Assistant | Public listing index + help content | Public data exists; no retrieval index |

**Minimum viable order:** semantic search and listing assistant first (low risk, immediately useful), then duplicate/fraud scoring as admin aids, then price prediction once enough completed transactions exist, then recommendations and the conversational assistant.

---

## 5. Architecture guidance

1. **Keep AI out of core services.** Add `app/services/ai/providers/<provider>.py` implementing the interfaces; call them from new `api/v1/ai.py` routes or from a background job, never inline in offer/transaction logic.
2. **Degrade gracefully.** If a provider times out, fall back to the rule-based guide or plain SQL search and tell the user which mode was used.
3. **Ground generated answers.** Retrieval-augmented generation over public listings and help docs; no free-form claims about prices or safety.
4. **Persist decisions, not prompts.** Store model name/version, inputs hash, output and confidence for auditability. Do not store private documents or chat content in model logs.
5. **Human in the loop.** Fraud and duplicate flags create admin review items; they do not delete listings or suspend accounts.
6. **Feature flags per environment.** Extend `AI_*` flags; default all to `false`.
7. **Cost controls.** Per-user daily quotas, caching, max token limits, and a circuit breaker for provider outages.
8. **Versioning.** Record `model` and `prompt_version` in responses; never silently change pricing behaviour.

---

## 6. Privacy, consent and safety

- **Never send** passwords, JWTs, student ID documents, email addresses, phone numbers or private conversations to an external provider.
- Use only public listing text/images and aggregated, de-identified interaction signals.
- Obtain explicit consent before using a student's images for model training; provide an opt-out.
- Disclose when a result is AI-generated and whether it is a suggestion or a decision.
- Apply provider data-retention settings that disable training on submitted data where available.
- Keep a data-processing record for the academic report; document the provider, purpose and retention.
- Follow the institution's ethics/IRB requirements before collecting interaction logs for recommendations.

---

## 7. Evaluation plan

| Capability | Metrics | Acceptable first release |
| --- | --- | --- |
| Price prediction | MAE / MAPE vs completed prices; calibration of range | MAE within ~15% on held-out completed sales; never below a floor |
| Recommendations | CTR, wishlist rate, diversity | Lift over “newest first” in an A/B test |
| Semantic search | Recall@20, zero-result rate, filter-extraction accuracy | ≥80% filter accuracy on a labelled query set |
| Listing assistant | Seller acceptance rate, edit distance, time to publish | Most drafts used with light edits; no policy violations |
| Image classification | Top-1/top-3 accuracy | Top-3 ≥85% on a labelled campus set |
| Fraud detection | Precision/recall on moderator-confirmed cases | High precision preferred; low false-positive rate |
| Duplicate detection | Precision@k | ≥90% precision on admin-confirmed duplicates |
| Assistant | Answer accuracy, citation validity, refusal rate on private data | No unsupported claims; refuses private-data requests |

Add offline evaluation scripts and a small labelled dataset before any feature is enabled for users.

---

## 8. Rollout checklist

- [ ] Provider chosen and credentials stored server-side only.
- [ ] Interface implemented; provider timeout and fallback behaviour tested.
- [ ] Feature flag off by default; enabled per environment.
- [ ] `/ai/features` reports the true availability string.
- [ ] UI labels AI output and explains limitations.
- [ ] Privacy review completed; no private data in requests or logs.
- [ ] Rate limits/quotas enforced per user.
- [ ] Admin review path exists for fraud/duplicate flags.
- [ ] Evaluation results recorded in the project report.
- [ ] Rollback plan: disable the flag; core marketplace unaffected.

Until these are complete, CampusLoop continues to report all AI capabilities as disabled — by design, not as a missing feature.
