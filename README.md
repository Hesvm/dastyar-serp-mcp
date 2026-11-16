# Dastyar SERP MCP Server
### Autonomous AI Bridge for Dastyar Search Engine, SERP Promotions & Hooshang Chatbot Ads

[![MIT License](https://img.shields.io/badge/License-MIT-10b981.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-3b82f6.svg)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Standard%202024--11--05-8b5cf6.svg)](https://modelcontextprotocol.io/)
[![Live Audit](https://img.shields.io/badge/Live%20Audit-23%2F23%20Passed%20(100%25)-success.svg)](https://github.com/Hesvm/dastyar-serp-mcp)

---

## 💡 Overview

**Dastyar SERP MCP** is an enterprise-grade Model Context Protocol (MCP) server connecting AI agents (Claude Desktop, Cursor, Google Antigravity, Windsurf) directly to **[serp.dastyar.io](https://serp.dastyar.io)** — the central search intelligence, SERP ad management, and Hooshang Chatbot advertising backend for the **Dastyar** browser platform.

Equipped with **85 production-ready tools** and a **Raw GraphQL Engine**, it covers 100% of the platform's data models and administrative workflows.

---

## ⚡ Core Modules & Toolset (85 Tools)

### 0. The Ultimate Escape Hatch
- `serp_raw_graphql_query`: Execute ANY arbitrary Keystone GraphQL query or mutation with variables.

### 1. Authentication & System Health
- `serp_auth_status`: Real-time session verification and identity check.
- `serp_auth_login`: Direct email/password authentication.
- `serp_get_overview_stats`: Global counters across promotions, ads, queries, and intents.

### 2. Promotions & SERP Ads (9 Tools)
- `serp_list_promotions`: Filter and paginate search promotions.
- `serp_get_promotion_details`: Deep inspection (rich text, Adplat IDs, snapshot).
- `serp_create_promotion`: Create single promotion.
- `serp_bulk_create_promotions`: Create batches of promotions.
- `serp_update_promotion`: Modify promotion metadata.
- `serp_bulk_update_promotions`: Bulk update promotions.
- `serp_toggle_promotion_status`: Quick activate / deactivate.
- `serp_delete_promotion`: Delete single promotion.
- `serp_bulk_delete_promotions`: Batch delete promotions.

### 3. Hooshang Chatbot Ads (تبلیغات هوشنگ - 7 Tools)
- `serp_list_chatbot_ads`: List AI chatbot ad banners.
- `serp_get_chatbot_ad_details`: Detailed config, CTA, trust rate, and confidence override.
- `serp_create_chatbot_ad`: Create a new conversational ad banner.
- `serp_update_chatbot_ad`: Edit copy, banner image, and keywords.
- `serp_toggle_chatbot_ad_status`: Toggle between active and paused.
- `serp_delete_chatbot_ad`: Delete a chatbot ad.
- `serp_bulk_delete_chatbot_ads`: Bulk delete chatbot ads.

### 4. Creative Review Queue & Ad Lines (9 Tools)
- `serp_list_ad_lines`: List ad lines across campaigns and placements.
- `serp_get_ad_line_details`: Inspect raw creative, rendered blocks, lint, and judge.
- `serp_get_ad_review_queue`: View pending ad lines awaiting review.
- `serp_get_ad_review_rejected`: View rejected ad lines and reasons.
- `serp_approve_ad_line`: Approve an ad line in the queue.
- `serp_reject_ad_line`: Reject an ad line with reason.
- `serp_bulk_approve_ad_lines`: Bulk approve multiple ad lines.
- `serp_bulk_reject_ad_lines`: Bulk reject multiple ad lines.
- `serp_toggle_ad_line_manual_pause`: Manually pause or resume an ad line.

### 5. Search Trends & Intent Clusters (5 Tools)
- `serp_list_search_trends`: Search query volumes and trend clusters.
- `serp_get_search_trend_details`: Sample queries and cluster points.
- `serp_create_search_trend`: Manually create search trends.
- `serp_update_search_trend`: Update trend volume or status.
- `serp_delete_search_trend`: Delete a search trend.

### 6. Intent Merging & Lifecycle Audit (6 Tools)
- `serp_list_intent_suggestions`: Pending AI intent merge recommendations.
- `serp_approve_intent_suggestion`: Approve intent merge suggestion.
- `serp_reject_intent_suggestion`: Reject intent merge suggestion.
- `serp_request_intent_merge`: Manually merge search intents (survivor + losers).
- `serp_list_intent_events`: Audit trail of intent lifecycle changes.
- `serp_create_intent_event`: Log an administrative intent event.

### 7. Query Forms & Mapping (6 Tools)
- `serp_list_query_forms`: Query text variations and mapping frequencies.
- `serp_get_query_form_details`: Detailed query form inspection.
- `serp_create_query_form`: Map query text to an intent.
- `serp_update_query_form`: Update intent mapping or confidence.
- `serp_pin_query_form`: Lock or unlock query form mapping.
- `serp_delete_query_form`: Delete a query form.

### 8. AI Clustering Jobs (4 Tools)
- `serp_list_clustering_jobs`: AI background clustering jobs and logs.
- `serp_get_clustering_job_details`: Inspect progress, processed count, and logs.
- `serp_create_clustering_job`: Queue a new query clustering job.
- `serp_update_clustering_job_status`: Cancel or update status.

### 9. Keywords & Groups (11 Tools)
- `serp_list_keywords`: Search keywords by phrase/exact/broad match.
- `serp_get_keyword_details`: Keyword inspection.
- `serp_create_keyword`: Create single keyword.
- `serp_bulk_create_keywords`: Batch keyword importer.
- `serp_update_keyword`: Update keyword text or match type.
- `serp_delete_keyword`: Delete single keyword.
- `serp_bulk_delete_keywords`: Bulk delete keywords.
- `serp_list_groups`: List keyword groups.
- `serp_create_group`: Create a keyword category group.
- `serp_update_group`: Update group name.
- `serp_delete_group`: Delete a keyword group.

### 10. Live Telemetry & User Queries (5 Tools)
- `serp_list_user_search_queries`: Stream of real user searches on Dastyar.
- `serp_get_user_search_query_details`: Inspect match score, reason, and ad shown.
- `serp_get_unmatched_user_queries`: Discover untapped commercial demand (adShown = false).
- `serp_delete_user_search_query`: Delete a query log.
- `serp_list_ad_events`: Impressions, clicks, and relevance/sentiment events.

### 11. Global Ad Settings (2 Tools)
- `serp_get_ad_settings`: Global weights (keyword vs semantic vs sentiment).
- `serp_update_ad_settings`: Adjust global matching weights.

### 12. Performance Stats & Analytics (3 Tools)
- `serp_get_adline_daily_stats`: Daily impressions and clicks by ad line.
- `serp_get_adline_query_daily_stats`: Daily breakdown per search query.
- `serp_get_intent_daily_stats`: Daily search volume and ads shown per intent.

### 13. Brands & Services Directory (10 Tools)
- `serp_list_brands`: List advertiser brands.
- `serp_get_brand_details`: Brand profile, trigger keywords, and linked services.
- `serp_create_brand`: Create new brand.
- `serp_update_brand`: Update brand metadata.
- `serp_delete_brand`: Delete a brand.
- `serp_list_services`: List brand services and trust rates.
- `serp_get_service_details`: Get service details.
- `serp_create_service`: Create service listing.
- `serp_update_service`: Update service metadata.
- `serp_delete_service`: Delete service listing.

### 14. Media Assets & Images (3 Tools)
- `serp_list_images`: List uploaded media assets and icons.
- `serp_get_image_details`: Direct S3 URL and linked services.
- `serp_delete_image`: Delete an image asset.

### 15. User & Admin Management (4 Tools)
- `serp_list_users`: List administrative users.
- `serp_get_user_details`: Inspect account details and roles.
- `serp_create_user`: Create a new admin user.
- `serp_update_user`: Update user details or permissions.

---

## ⚡ Quickstart

```bash
cd "/Users/hesam/🍏 My Mac/🧨 Projects/dastyar-serp-mcp"
npm run status
npm run audit
```

## 🛡️ License

MIT License © 2026 Hesam Mousavi (Hesvm)
