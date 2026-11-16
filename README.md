# Dastyar SERP MCP Server
### Autonomous AI Bridge for Dastyar Search Engine, SERP Promotions & Hooshang Chatbot Ads

[![MIT License](https://img.shields.io/badge/License-MIT-10b981.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-3b82f6.svg)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Standard%202024--11--05-8b5cf6.svg)](https://modelcontextprotocol.io/)

---

## 💡 Overview

**Dastyar SERP MCP** is an enterprise-grade Model Context Protocol (MCP) server connecting AI agents (Claude Desktop, Cursor, Google Antigravity, Windsurf) directly to **[serp.dastyar.io](https://serp.dastyar.io)** — the central search intelligence, SERP ad management, and Hooshang Chatbot advertising backend for the **Dastyar** browser platform.

Built on the open [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) standard, it equips LLMs with over **40 production-ready tools** for end-to-end administration:

- **SERP Promotions:** Query, create, update, and toggle active status of promotions and rich-text search ad results connected to Adplat campaigns (`adplatCampaignId`, `adplatClusterId`).
- **Hooshang Chatbot Ads (تبلیغات هوشنگ):** Configure contextual conversational banners displayed after AI responses, tuning sentiment scores, trust ratings, and CTA triggers.
- **Creative Review Queue (داوری کریتیو):** Inspect pending ad lines (`AdLine`), review generated blocks and lint checks, and approve (`serp_approve_ad_line`) or reject (`serp_reject_ad_line`) with structured audit feedback.
- **Intent Discovery & Merging:** Real-time search trend volumes, AI intent suggestions, manual intent merging, and query form clustering.
- **Live Search Telemetry:** Monitor live user search queries in real time, inspecting match scores, triggered ads, and match reasons.
- **Keywords & Categories:** Manage phrase, exact, and broad match keywords, bulk import keywords, and organize keyword groups.
- **Analytics & Daily Telemetry:** Track impressions and clicks by ad line, query text, and intent ID.

---

## ⚡ Quickstart

### 1. Installation

```bash
cd "/Users/hesam/🍏 My Mac/🧨 Projects/dastyar-serp-mcp"
npm install
```

### 2. Authentication

You can authenticate either via interactive CLI or by placing your session token in `.env`:

```bash
# Check status
npm run status

# Interactive login
npm run login

# Run live audit tests
npm run audit
```

---

## 🛠️ MCP Configuration

### Google Antigravity & Claude Desktop

Add the following to your `mcp_config.json` (or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "dastyar-serp": {
      "command": "node",
      "args": [
        "/Users/hesam/🍏 My Mac/🧨 Projects/dastyar-serp-mcp/bin/cli.js"
      ],
      "env": {
        "SERP_SESSION_TOKEN": "YOUR_KEYSTONEJS_SESSION_COOKIE"
      }
    }
  }
}
```

---

## 📋 Available MCP Tools

### 1. Authentication & System Health
- `serp_auth_status`: Check current session and identity (`Admin - admin@dastyar.io`).
- `serp_auth_login`: Authenticate with email & password.
- `serp_get_overview_stats`: Global summary metrics (promotions, ads, queue counts).

### 2. Promotions & Search Ads
- `serp_list_promotions`: Search & list promotions with pagination.
- `serp_get_promotion_details`: Deep inspection of a promotion and Adplat sync state.
- `serp_create_promotion`: Create a new promotion with keywords and rich text.
- `serp_update_promotion`: Modify promotion details.
- `serp_toggle_promotion_status`: Quick toggle active/inactive.
- `serp_delete_promotion`: Remove a promotion.

### 3. Hooshang Chatbot Ads (تبلیغات هوشنگ)
- `serp_list_chatbot_ads`: List chatbot ad banners.
- `serp_get_chatbot_ad_details`: Detailed config, CTA, trust rate, and sentiment threshold.
- `serp_create_chatbot_ad`: Create a new conversational ad banner.
- `serp_update_chatbot_ad`: Edit copy, banner image, and keywords.
- `serp_delete_chatbot_ad`: Delete a chatbot ad.

### 4. Creative Review Queue & Ad Lines
- `serp_list_ad_lines`: List ad lines across campaigns and placements.
- `serp_get_ad_line_details`: Inspect raw creative, rendered blocks, lint, and judge.
- `serp_get_ad_review_queue`: View pending ad lines awaiting review.
- `serp_get_ad_review_rejected`: View rejected ad lines and reasons.
- `serp_approve_ad_line`: Approve an ad line in the queue.
- `serp_reject_ad_line`: Reject an ad line with reason.
- `serp_toggle_ad_line_manual_pause`: Manually pause or resume an ad line.

### 5. Intent Merging & Search Trends
- `serp_list_search_trends`: Search query volumes and trend clusters.
- `serp_get_search_trend_details`: Sample queries and cluster points.
- `serp_list_intent_suggestions`: Pending AI intent merge recommendations.
- `serp_approve_intent_suggestion`: Approve intent merge suggestion.
- `serp_reject_intent_suggestion`: Reject intent merge suggestion.
- `serp_request_intent_merge`: Manually merge search intents (survivor + losers).
- `serp_list_query_forms`: Query text variations and mapping frequencies.
- `serp_list_clustering_jobs`: AI background clustering jobs and logs.

### 6. Keywords & Groups
- `serp_list_keywords`: Search keywords by phrase/exact/broad match.
- `serp_create_keyword`: Create single keyword.
- `serp_bulk_create_keywords`: Batch keyword importer.
- `serp_delete_keyword`: Delete a keyword.
- `serp_list_groups`: List keyword groups.
- `serp_create_group`: Create a keyword category group.

### 7. Live Telemetry & Ad Settings
- `serp_list_user_search_queries`: Stream of real user searches on Dastyar.
- `serp_get_user_search_query_details`: Inspect match score, reason, and ad shown.
- `serp_list_ad_events`: Impressions, clicks, and relevance/sentiment events.
- `serp_get_ad_settings`: Global weights (keyword vs semantic vs sentiment).
- `serp_update_ad_settings`: Adjust global matching weights.

### 8. Analytics & Telemetry
- `serp_get_adline_daily_stats`: Daily impressions and clicks by ad line.
- `serp_get_adline_query_daily_stats`: Daily breakdown per search query.
- `serp_get_intent_daily_stats`: Daily search volume and ads shown per intent.

### 9. Brands & Services
- `serp_list_brands`: List advertiser brands.
- `serp_get_brand_details`: Brand profile, trigger keywords, and linked services.
- `serp_create_brand`: Create new brand.
- `serp_update_brand`: Update brand metadata.
- `serp_list_services`: List brand services and trust rates.
- `serp_get_service_details`: Get service details.

---

## 🛡️ License

MIT License © 2026 Hesam Mousavi (Hesvm)
