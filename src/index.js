import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SerpClient } from "./api-client.js";
import { AuthManager } from "./auth.js";

const server = new McpServer({
  name: "dastyar-serp-mcp",
  version: "1.0.0"
});

// Helper for formatting JSON responses
const jsonResponse = (data) => ({
  content: [
    {
      type: "text",
      text: typeof data === "string" ? data : JSON.stringify(data, null, 2)
    }
  ]
});

// Helper for error responses
const errorResponse = (err) => ({
  content: [
    {
      type: "text",
      text: `Error: ${err.message || String(err)}`
    }
  ],
  isError: true
});

// ==========================================
// 0. RAW GRAPHQL (THE ULTIMATE ESCAPE HATCH)
// ==========================================
server.tool(
  "serp_raw_graphql_query",
  "Execute ANY arbitrary GraphQL query or mutation against https://serp.dastyar.io/api/graphql. Provides 100% direct coverage for any custom query or mutation.",
  {
    query: z.string().describe("The GraphQL query or mutation string"),
    variables: z.record(z.any()).optional().describe("Variables dictionary for the GraphQL query")
  },
  async ({ query, variables }) => {
    try {
      const result = await SerpClient.rawGraphql(query, variables || {});
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 1. AUTHENTICATION & PROFILE
// ==========================================
server.tool(
  "serp_auth_status",
  "Check current Dastyar SERP authentication status, active session identity, and server connection.",
  {},
  async () => {
    try {
      const token = AuthManager.getToken();
      if (!token && !AuthManager.hasCredentials()) {
        return jsonResponse({
          authenticated: false,
          message: "No active session token found. Use serp_auth_login or set SERP_SESSION_TOKEN."
        });
      }
      const profile = await AuthManager.getProfile();
      return jsonResponse({
        authenticated: true,
        user: profile,
        tokenPreview: token ? `${token.slice(0, 15)}...${token.slice(-10)}` : 'Auto-renew'
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_auth_login",
  "Authenticate with Dastyar SERP panel using email and password.",
  {
    email: z.string().email().describe("Admin email address"),
    password: z.string().describe("Admin password")
  },
  async ({ email, password }) => {
    try {
      const res = await AuthManager.login(email, password);
      return jsonResponse({
        success: true,
        message: "Successfully logged in and session saved.",
        user: res.user
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 2. OVERVIEW & TELEMETRY
// ==========================================
server.tool(
  "serp_get_overview_stats",
  "Get high-level summary statistics of Dastyar SERP (promotions, chatbot ads, pending review queue, pending intent merges, recent queries).",
  {},
  async () => {
    try {
      const stats = await SerpClient.getOverviewStats();
      return jsonResponse(stats);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 3. PROMOTIONS
// ==========================================
server.tool(
  "serp_list_promotions",
  "List and search promotions on Dastyar SERP with filters (take, skip, search term, active status).",
  {
    take: z.number().optional().default(20).describe("Number of items to fetch (default: 20)"),
    skip: z.number().optional().default(0).describe("Number of items to skip"),
    isActive: z.boolean().optional().describe("Filter by active/inactive status"),
    search: z.string().optional().describe("Search in promotion name or keywords")
  },
  async ({ take, skip, isActive, search }) => {
    try {
      const where = {};
      if (typeof isActive === "boolean") {
        where.isActive = { equals: isActive };
      }
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { keywordsNew: { contains: search } }
        ];
      }
      const result = await SerpClient.listPromotions({ take, skip, where });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_promotion_details",
  "Get full details of a specific promotion by ID (rich text, keywords, Adplat sync info).",
  {
    id: z.string().describe("Promotion ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.getPromotionDetails(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_create_promotion",
  "Create a new promotion on Dastyar SERP.",
  {
    name: z.string().describe("Promotion title / name"),
    keywordsNew: z.string().describe("Comma-separated list of keywords"),
    content: z.string().optional().describe("Markdown / text content"),
    richTextNew: z.string().optional().describe("HTML / rich text for rendering"),
    isActive: z.boolean().optional().default(true).describe("Whether promotion is active"),
    adplatCampaignId: z.string().optional().describe("Linked Adplat campaign ID"),
    adplatClusterId: z.string().optional().describe("Linked Adplat search cluster ID")
  },
  async (payload) => {
    try {
      const result = await SerpClient.createPromotion(payload);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_bulk_create_promotions",
  "Batch create multiple promotions on Dastyar SERP.",
  {
    promotions: z.array(
      z.object({
        name: z.string(),
        keywordsNew: z.string(),
        content: z.string().optional(),
        richTextNew: z.string().optional(),
        isActive: z.boolean().optional().default(true)
      })
    ).describe("List of promotion objects to create")
  },
  async ({ promotions }) => {
    try {
      const result = await SerpClient.bulkCreatePromotions(promotions);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_update_promotion",
  "Update an existing promotion by ID.",
  {
    id: z.string().describe("Promotion ID"),
    name: z.string().optional().describe("Promotion title"),
    keywordsNew: z.string().optional().describe("Comma-separated keywords"),
    content: z.string().optional().describe("Text content"),
    richTextNew: z.string().optional().describe("Rich text content"),
    isActive: z.boolean().optional().describe("Active status"),
    adplatCampaignId: z.string().optional().describe("Linked Adplat campaign ID"),
    adplatClusterId: z.string().optional().describe("Linked Adplat cluster ID")
  },
  async ({ id, ...data }) => {
    try {
      const result = await SerpClient.updatePromotion(id, data);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_bulk_update_promotions",
  "Update multiple promotions in a single batch request.",
  {
    updates: z.array(
      z.object({
        id: z.string(),
        data: z.record(z.any())
      })
    ).describe("Array of update directives: [{ id, data }]")
  },
  async ({ updates }) => {
    try {
      const formatted = updates.map(u => ({ where: { id: u.id }, data: u.data }));
      const result = await SerpClient.bulkUpdatePromotions(formatted);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_toggle_promotion_status",
  "Quickly activate or deactivate a promotion.",
  {
    id: z.string().describe("Promotion ID"),
    isActive: z.boolean().describe("True to activate, False to pause/deactivate")
  },
  async ({ id, isActive }) => {
    try {
      const result = await SerpClient.togglePromotionStatus(id, isActive);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_delete_promotion",
  "Delete a promotion by ID.",
  {
    id: z.string().describe("Promotion ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.deletePromotion(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_bulk_delete_promotions",
  "Bulk delete multiple promotions by their IDs.",
  {
    ids: z.array(z.string()).describe("Array of promotion IDs to delete")
  },
  async ({ ids }) => {
    try {
      const result = await SerpClient.bulkDeletePromotions(ids);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 4. CHATBOT ADS (تبلیغات هوشنگ)
// ==========================================
server.tool(
  "serp_list_chatbot_ads",
  "List Hooshang AI Chatbot Ads (تبلیغات هوشنگ) with filters.",
  {
    take: z.number().optional().default(20).describe("Number of items to fetch"),
    skip: z.number().optional().default(0).describe("Number of items to skip"),
    status: z.string().optional().describe("Filter by status (e.g. active, paused)"),
    search: z.string().optional().describe("Search in title or internal title")
  },
  async ({ take, skip, status, search }) => {
    try {
      const where = {};
      if (status) where.status = { equals: status };
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { internalTitle: { contains: search } }
        ];
      }
      const result = await SerpClient.listChatbotAds({ take, skip, where });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_chatbot_ad_details",
  "Get full details of a Hooshang Chatbot Ad by ID.",
  {
    id: z.string().describe("Chatbot Ad ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.getChatbotAdDetails(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_create_chatbot_ad",
  "Create a new Hooshang Chatbot Ad banner.",
  {
    internalTitle: z.string().describe("Internal administrative title"),
    title: z.string().describe("Public display banner title"),
    bodyText: z.string().optional().describe("Banner description (max 160 characters)"),
    bannerImage: z.string().optional().describe("Image URL / asset key"),
    ctaText: z.string().optional().describe("CTA button text (e.g. خرید با تخفیف)"),
    ctaUrl: z.string().optional().describe("CTA destination URL"),
    brandId: z.string().optional().describe("Associated brand ID"),
    adType: z.string().optional().default("post_answer").describe("Ad type (post_answer, sponsored_followup)"),
    status: z.string().optional().default("active").describe("Status (active/paused)"),
    targetKeywords: z.string().optional().describe("Target keywords for triggering"),
    minConfidenceOverride: z.number().optional().describe("Minimum confidence override")
  },
  async ({ brandId, ...data }) => {
    try {
      const payload = { ...data };
      if (brandId) {
        payload.brand = { connect: { id: brandId } };
      }
      const result = await SerpClient.createChatbotAd(payload);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_update_chatbot_ad",
  "Update a Hooshang Chatbot Ad by ID.",
  {
    id: z.string().describe("Chatbot Ad ID"),
    internalTitle: z.string().optional().describe("Internal administrative title"),
    title: z.string().optional().describe("Public display title"),
    bodyText: z.string().optional().describe("Banner description"),
    ctaText: z.string().optional().describe("CTA button text"),
    ctaUrl: z.string().optional().describe("CTA link"),
    status: z.string().optional().describe("Status (active/paused)"),
    targetKeywords: z.string().optional().describe("Target keywords"),
    minConfidenceOverride: z.number().optional().describe("Confidence override")
  },
  async ({ id, ...data }) => {
    try {
      const result = await SerpClient.updateChatbotAd(id, data);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_toggle_chatbot_ad_status",
  "Toggle status of a Chatbot Ad between active and paused.",
  {
    id: z.string().describe("Chatbot Ad ID"),
    status: z.enum(["active", "paused"]).describe("New status")
  },
  async ({ id, status }) => {
    try {
      const result = await SerpClient.toggleChatbotAdStatus(id, status);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_delete_chatbot_ad",
  "Delete a Hooshang Chatbot Ad by ID.",
  {
    id: z.string().describe("Chatbot Ad ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.deleteChatbotAd(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_bulk_delete_chatbot_ads",
  "Bulk delete multiple Hooshang Chatbot Ads by ID.",
  {
    ids: z.array(z.string()).describe("Array of Chatbot Ad IDs")
  },
  async ({ ids }) => {
    try {
      const result = await SerpClient.bulkDeleteChatbotAds(ids);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 5. AD LINES & REVIEW QUEUE (داوری کریتیو)
// ==========================================
server.tool(
  "serp_list_ad_lines",
  "List ad lines across campaigns, search clusters, and placements.",
  {
    take: z.number().optional().default(20).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset"),
    creativeStatus: z.string().optional().describe("Filter by creative status (review, approved, rejected)"),
    campaignId: z.string().optional().describe("Filter by Adplat Campaign UUID"),
    adplatClusterId: z.string().optional().describe("Filter by Adplat Search Cluster UUID")
  },
  async ({ take, skip, creativeStatus, campaignId, adplatClusterId }) => {
    try {
      const where = {};
      if (creativeStatus) where.creativeStatus = { equals: creativeStatus };
      if (campaignId) where.campaignId = { equals: campaignId };
      if (adplatClusterId) where.adplatClusterId = { equals: adplatClusterId };
      const result = await SerpClient.listAdLines({ take, skip, where });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_ad_line_details",
  "Get full details of an ad line including creative assets, rendered blocks, lint results, and judge status.",
  {
    id: z.string().describe("Ad Line ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.getAdLineDetails(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_ad_review_queue",
  "Get the queue of ad lines currently awaiting human / admin review (creativeStatus = 'review').",
  {
    take: z.number().optional().default(20).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset")
  },
  async ({ take, skip }) => {
    try {
      const result = await SerpClient.getAdReviewQueue({ take, skip });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_ad_review_rejected",
  "Get the list of rejected ad lines with rejection reasons.",
  {
    take: z.number().optional().default(20).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset")
  },
  async ({ take, skip }) => {
    try {
      const result = await SerpClient.getAdReviewRejected({ take, skip });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_approve_ad_line",
  "Approve a creative ad line in the review queue.",
  {
    id: z.string().describe("Ad Line ID"),
    note: z.string().optional().describe("Optional approval note / comment")
  },
  async ({ id, note }) => {
    try {
      const judge = {
        approved: true,
        note: note || "Approved via MCP Agent",
        timestamp: new Date().toISOString()
      };
      const result = await SerpClient.approveAdLine(id, judge);
      return jsonResponse({
        success: true,
        message: `Ad line ${id} approved successfully.`,
        adLine: result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_reject_ad_line",
  "Reject a creative ad line in the review queue with a specific reason.",
  {
    id: z.string().describe("Ad Line ID"),
    reason: z.string().describe("Reason for rejection (e.g. 'غلط املایی در بنر', 'لینک نامعتبر')"),
    note: z.string().optional().describe("Additional note")
  },
  async ({ id, reason, note }) => {
    try {
      const judge = {
        approved: false,
        reason,
        note: note || "",
        timestamp: new Date().toISOString()
      };
      const result = await SerpClient.rejectAdLine(id, reason, judge);
      return jsonResponse({
        success: true,
        message: `Ad line ${id} rejected.`,
        adLine: result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_bulk_approve_ad_lines",
  "Bulk approve multiple ad lines in the review queue.",
  {
    ids: z.array(z.string()).describe("Array of Ad Line IDs"),
    note: z.string().optional().default("Bulk Approved via MCP Agent")
  },
  async ({ ids, note }) => {
    try {
      const result = await SerpClient.bulkApproveAdLines(ids, note);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_bulk_reject_ad_lines",
  "Bulk reject multiple ad lines in the review queue with a common reason.",
  {
    ids: z.array(z.string()).describe("Array of Ad Line IDs"),
    reason: z.string().describe("Rejection reason")
  },
  async ({ ids, reason }) => {
    try {
      const result = await SerpClient.bulkRejectAdLines(ids, reason);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_toggle_ad_line_manual_pause",
  "Manually pause or resume an ad line.",
  {
    id: z.string().describe("Ad Line ID"),
    manualPause: z.boolean().describe("True to pause, False to resume")
  },
  async ({ id, manualPause }) => {
    try {
      const result = await SerpClient.toggleAdLineManualPause(id, manualPause);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 6. INTENT MERGE & SEARCH TRENDS
// ==========================================
server.tool(
  "serp_list_search_trends",
  "List search trends and search volume clusters on Dastyar.",
  {
    take: z.number().optional().default(20).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset"),
    search: z.string().optional().describe("Search trend name / keyword"),
    status: z.string().optional().describe("Filter by status")
  },
  async ({ take, skip, search, status }) => {
    try {
      const where = {};
      if (search) where.name = { contains: search };
      if (status) where.status = { equals: status };
      const result = await SerpClient.listSearchTrends({ take, skip, where });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_search_trend_details",
  "Get details of a specific search trend (volume, sample queries, ad shown count, cluster ID).",
  {
    id: z.string().describe("Search Trend ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.getSearchTrendDetails(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_create_search_trend",
  "Create a new search trend / intent manually.",
  {
    name: z.string().describe("Intent name / trend title"),
    volume: z.number().optional().default(100).describe("Monthly search volume estimate"),
    source: z.string().optional().default("manual").describe("Source of the trend"),
    status: z.string().optional().default("active").describe("Status")
  },
  async (payload) => {
    try {
      const result = await SerpClient.createSearchTrend(payload);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_update_search_trend",
  "Update a search trend by ID.",
  {
    id: z.string().describe("Search Trend ID"),
    name: z.string().optional().describe("Name"),
    volume: z.number().optional().describe("Volume"),
    status: z.string().optional().describe("Status")
  },
  async ({ id, ...data }) => {
    try {
      const result = await SerpClient.updateSearchTrend(id, data);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_delete_search_trend",
  "Delete a search trend by ID.",
  {
    id: z.string().describe("Search Trend ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.deleteSearchTrend(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_list_intent_suggestions",
  "List AI-generated intent merge suggestions (pending, approved, rejected).",
  {
    status: z.enum(["pending", "approved", "rejected"]).optional().default("pending").describe("Suggestion status"),
    take: z.number().optional().default(20).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset")
  },
  async ({ status, take, skip }) => {
    try {
      const result = await SerpClient.listIntentSuggestions({ status, take, skip });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_approve_intent_suggestion",
  "Approve an intent merge suggestion to combine keyword trends.",
  {
    id: z.string().describe("Intent Merge Suggestion ID"),
    loserIds: z.array(z.number()).optional().describe("Optional list of loser intent IDs to merge into survivor")
  },
  async ({ id, loserIds }) => {
    try {
      const result = await SerpClient.approveIntentSuggestion(id, loserIds);
      return jsonResponse({
        success: true,
        message: "Intent suggestion approved.",
        suggestion: result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_reject_intent_suggestion",
  "Reject an intent merge suggestion.",
  {
    id: z.string().describe("Intent Merge Suggestion ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.rejectIntentSuggestion(id);
      return jsonResponse({
        success: true,
        message: "Intent suggestion rejected.",
        suggestion: result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_request_intent_merge",
  "Manually request merging two or more search intents (survivor intent absorbing loser intents).",
  {
    survivorId: z.number().describe("The primary intent ID that will survive"),
    loserIds: z.array(z.number()).describe("Array of intent IDs that will be merged into the survivor")
  },
  async ({ survivorId, loserIds }) => {
    try {
      const result = await SerpClient.requestIntentMerge(survivorId, loserIds);
      return jsonResponse({
        success: true,
        message: "Manual merge request created and approved.",
        merge: result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_list_intent_events",
  "List audit events for intent lifecycle changes (merges, relabels, split actions).",
  {
    intentId: z.string().optional().describe("Filter by intent ID"),
    take: z.number().optional().default(50).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset")
  },
  async (params) => {
    try {
      const result = await SerpClient.listIntentEvents(params);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_create_intent_event",
  "Log an administrative intent event in the audit trail.",
  {
    intentId: z.number().describe("Associated intent ID"),
    type: z.string().describe("Event type (e.g. merge, relabel, split)"),
    actor: z.string().optional().default("admin").describe("Actor name / ID"),
    payload: z.record(z.any()).optional().describe("Event metadata payload")
  },
  async (payload) => {
    try {
      const result = await SerpClient.createIntentEvent(payload);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_list_query_forms",
  "List query text variations (Query Forms) and their mapped intents with search frequencies.",
  {
    take: z.number().optional().default(50).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset"),
    queryText: z.string().optional().describe("Search within query text"),
    intentId: z.number().optional().describe("Filter by mapped intent ID")
  },
  async ({ take, skip, queryText, intentId }) => {
    try {
      const where = {};
      if (queryText) where.text = { contains: queryText };
      if (intentId) where.intentId = { equals: intentId };
      const result = await SerpClient.listQueryForms({ take, skip, where });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_query_form_details",
  "Get details of a query form.",
  {
    id: z.string().describe("Query form ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.getQueryFormDetails(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_create_query_form",
  "Create a new query form mapped to an intent.",
  {
    text: z.string().describe("Query text"),
    intentId: z.number().describe("Target intent ID"),
    hash: z.string().optional().describe("Unique query hash"),
    confidence: z.number().optional().default(1.0).describe("Mapping confidence"),
    pinned: z.boolean().optional().default(false).describe("Whether the form is pinned")
  },
  async (payload) => {
    try {
      const result = await SerpClient.createQueryForm(payload);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_update_query_form",
  "Update an existing query form mapping or confidence.",
  {
    id: z.string().describe("Query Form ID"),
    intentId: z.number().optional().describe("New intent ID"),
    confidence: z.number().optional().describe("Confidence score"),
    pinned: z.boolean().optional().describe("Pinned state")
  },
  async ({ id, ...data }) => {
    try {
      const result = await SerpClient.updateQueryForm(id, data);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_pin_query_form",
  "Pin or unpin a query form to lock its intent assignment.",
  {
    id: z.string().describe("Query Form ID"),
    pinned: z.boolean().describe("True to pin, False to unpin")
  },
  async ({ id, pinned }) => {
    try {
      const result = await SerpClient.pinQueryForm(id, pinned);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_delete_query_form",
  "Delete a query form.",
  {
    id: z.string().describe("Query Form ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.deleteQueryForm(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 7. AI CLUSTERING JOBS
// ==========================================
server.tool(
  "serp_list_clustering_jobs",
  "List background clustering jobs, progress, and logs.",
  {
    take: z.number().optional().default(20).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset")
  },
  async ({ take, skip }) => {
    try {
      const result = await SerpClient.listClusteringJobs({ take, skip });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_clustering_job_details",
  "Get details, progress, and execution logs of an AI clustering job.",
  {
    id: z.string().describe("Clustering Job ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.getClusteringJobDetails(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_create_clustering_job",
  "Queue a new query clustering job.",
  {
    type: z.string().optional().default("manual").describe("Job type (e.g. manual, cron)"),
    status: z.string().optional().default("pending").describe("Initial status"),
    queryCount: z.number().optional().default(1000).describe("Target query batch count")
  },
  async (payload) => {
    try {
      const result = await SerpClient.createClusteringJob(payload);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_update_clustering_job_status",
  "Cancel or update status of a clustering job.",
  {
    id: z.string().describe("Job ID"),
    status: z.string().describe("New status (e.g. completed, failed, cancelled)")
  },
  async ({ id, status }) => {
    try {
      const result = await SerpClient.updateClusteringJobStatus(id, status);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 8. KEYWORDS & GROUPS
// ==========================================
server.tool(
  "serp_list_keywords",
  "List keywords on Dastyar SERP with match type (phrase, exact, broad) and group associations.",
  {
    take: z.number().optional().default(50).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset"),
    search: z.string().optional().describe("Keyword search filter"),
    type: z.enum(["phrase", "exact", "broad"]).optional().describe("Match type")
  },
  async ({ take, skip, search, type }) => {
    try {
      const where = {};
      if (search) where.name = { contains: search };
      if (type) where.type = { equals: type };
      const result = await SerpClient.listKeywords({ take, skip, where });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_keyword_details",
  "Get details of a single keyword.",
  {
    id: z.string().describe("Keyword ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.getKeywordDetails(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_create_keyword",
  "Create a new keyword on Dastyar SERP.",
  {
    name: z.string().describe("Keyword text"),
    type: z.enum(["phrase", "exact", "broad"]).optional().default("phrase").describe("Match type"),
    groupIds: z.array(z.string()).optional().describe("Group IDs to attach to")
  },
  async ({ name, type, groupIds }) => {
    try {
      const result = await SerpClient.createKeyword({ name, type, groupIds });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_bulk_create_keywords",
  "Import a batch of keywords into Dastyar SERP.",
  {
    keywords: z.array(
      z.object({
        name: z.string().describe("Keyword text"),
        type: z.enum(["phrase", "exact", "broad"]).optional().default("phrase")
      })
    ).describe("Array of keywords to create")
  },
  async ({ keywords }) => {
    try {
      const result = await SerpClient.bulkCreateKeywords(keywords);
      return jsonResponse({
        total: keywords.length,
        results: result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_update_keyword",
  "Update a keyword's text or match type.",
  {
    id: z.string().describe("Keyword ID"),
    name: z.string().optional().describe("Keyword text"),
    type: z.enum(["phrase", "exact", "broad"]).optional().describe("Match type")
  },
  async ({ id, ...data }) => {
    try {
      const result = await SerpClient.updateKeyword(id, data);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_delete_keyword",
  "Delete a keyword by ID.",
  {
    id: z.string().describe("Keyword ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.deleteKeyword(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_bulk_delete_keywords",
  "Bulk delete multiple keywords by ID.",
  {
    ids: z.array(z.string()).describe("Array of keyword IDs")
  },
  async ({ ids }) => {
    try {
      const result = await SerpClient.bulkDeleteKeywords(ids);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_list_groups",
  "List keyword groups / categories.",
  {
    take: z.number().optional().default(50).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset"),
    name: z.string().optional().describe("Filter by group name")
  },
  async ({ take, skip, name }) => {
    try {
      const where = {};
      if (name) where.name = { contains: name };
      const result = await SerpClient.listGroups({ take, skip, where });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_create_group",
  "Create a new keyword category / group.",
  {
    name: z.string().describe("Group name")
  },
  async ({ name }) => {
    try {
      const result = await SerpClient.createGroup(name);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_update_group",
  "Update a keyword group name.",
  {
    id: z.string().describe("Group ID"),
    name: z.string().describe("New group name")
  },
  async ({ id, name }) => {
    try {
      const result = await SerpClient.updateGroup(id, name);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_delete_group",
  "Delete a keyword group by ID.",
  {
    id: z.string().describe("Group ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.deleteGroup(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 9. LIVE TELEMETRY & USER QUERIES
// ==========================================
server.tool(
  "serp_list_user_search_queries",
  "Inspect live user search queries on Dastyar in real-time, whether an ad was shown, match score, and reason.",
  {
    take: z.number().optional().default(50).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset"),
    adShown: z.boolean().optional().describe("Filter by whether an ad was shown or not"),
    search: z.string().optional().describe("Filter query text contains")
  },
  async ({ take, skip, adShown, search }) => {
    try {
      const where = {};
      if (typeof adShown === "boolean") where.adShown = { equals: adShown };
      if (search) where.query = { contains: search };
      const result = await SerpClient.listUserSearchQueries({ take, skip, where });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_user_search_query_details",
  "Get complete details of a single user search query (match score, reason, linked promotion or service).",
  {
    id: z.string().describe("User Search Query ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.getUserSearchQueryDetails(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_unmatched_user_queries",
  "Find queries where NO ad was shown (adShown: false) to uncover untapped commercial demand.",
  {
    take: z.number().optional().default(50).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset"),
    search: z.string().optional().describe("Optional keyword search")
  },
  async (params) => {
    try {
      const result = await SerpClient.getUnmatchedUserQueries(params);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_delete_user_search_query",
  "Delete a user search query log.",
  {
    id: z.string().describe("Query ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.deleteUserSearchQuery(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_list_ad_events",
  "List ad interaction events (impressions, clicks, conversation triggers, sentiment scores).",
  {
    take: z.number().optional().default(50).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset"),
    eventType: z.string().optional().describe("Event type filter (e.g. impression, click)"),
    adId: z.string().optional().describe("Filter by ad ID")
  },
  async ({ take, skip, eventType, adId }) => {
    try {
      const where = {};
      if (eventType) where.eventType = { equals: eventType };
      if (adId) where.adId = { equals: adId };
      const result = await SerpClient.listAdEvents({ take, skip, where });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_ad_settings",
  "Get global advertising matching settings (globalMinConfidence, keywordWeight, semanticWeight, sentimentThreshold).",
  {},
  async () => {
    try {
      const settings = await SerpClient.getAdSettings();
      return jsonResponse(settings);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_update_ad_settings",
  "Update global advertising matching parameters and weights.",
  {
    id: z.string().describe("AdSettings ID"),
    globalMinConfidence: z.number().optional().describe("Minimum confidence score for matching"),
    keywordWeight: z.number().optional().describe("Weight given to exact keyword matching"),
    semanticWeight: z.number().optional().describe("Weight given to AI semantic similarity"),
    sentimentThreshold: z.number().optional().describe("Sentiment threshold"),
    priorityOrder: z.string().optional().describe("Priority order rules")
  },
  async ({ id, ...data }) => {
    try {
      const result = await SerpClient.updateAdSettings(id, data);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 10. PERFORMANCE STATS & ANALYTICS
// ==========================================
server.tool(
  "serp_get_adline_daily_stats",
  "Get daily performance telemetry (impressions, clicks) by ad line ID or campaign ID.",
  {
    lineId: z.string().optional().describe("Ad line ID"),
    campaignId: z.string().optional().describe("Campaign UUID"),
    day: z.string().optional().describe("Date in YYYY-MM-DD format"),
    take: z.number().optional().default(50).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset")
  },
  async (params) => {
    try {
      const result = await SerpClient.getAdLineDailyStats(params);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_adline_query_daily_stats",
  "Get daily query-level performance breakdown (impressions, clicks per query text).",
  {
    lineId: z.string().optional().describe("Ad line ID"),
    queryText: z.string().optional().describe("Search within query string"),
    day: z.string().optional().describe("Date in YYYY-MM-DD format"),
    take: z.number().optional().default(50).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset")
  },
  async (params) => {
    try {
      const result = await SerpClient.getAdLineQueryDailyStats(params);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_intent_daily_stats",
  "Get daily search and ad shown metrics per intent ID.",
  {
    intentId: z.string().optional().describe("Intent ID"),
    day: z.string().optional().describe("Date in YYYY-MM-DD format"),
    take: z.number().optional().default(50).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset")
  },
  async (params) => {
    try {
      const result = await SerpClient.getIntentDailyStats(params);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 11. BRANDS & SERVICES DIRECTORY
// ==========================================
server.tool(
  "serp_list_brands",
  "List advertising brands and enterprise clients on Dastyar.",
  {
    take: z.number().optional().default(20).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset"),
    search: z.string().optional().describe("Brand name search")
  },
  async ({ take, skip, search }) => {
    try {
      const where = {};
      if (search) where.name = { contains: search };
      const result = await SerpClient.listBrands({ take, skip, where });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_brand_details",
  "Get full profile of a brand (about, logo, services, chatbot ads, tone & trigger keywords).",
  {
    id: z.string().describe("Brand ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.getBrandDetails(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_create_brand",
  "Create a new brand profile.",
  {
    name: z.string().describe("Brand name"),
    about: z.string().optional().describe("About description"),
    descriptionShort: z.string().optional().describe("Short description (max 200 chars)"),
    pageUrl: z.string().optional().describe("In-app page URL"),
    toneKeywords: z.string().optional().describe("Keywords for semantic matching"),
    triggerKeywords: z.string().optional().describe("Keywords for exact triggering"),
    status: z.string().optional().default("active").describe("Brand status")
  },
  async (payload) => {
    try {
      const result = await SerpClient.createBrand(payload);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_update_brand",
  "Update an existing brand profile.",
  {
    id: z.string().describe("Brand ID"),
    name: z.string().optional().describe("Brand name"),
    about: z.string().optional().describe("About description"),
    descriptionShort: z.string().optional().describe("Short description"),
    pageUrl: z.string().optional().describe("In-app page URL"),
    toneKeywords: z.string().optional().describe("Tone keywords"),
    triggerKeywords: z.string().optional().describe("Trigger keywords"),
    status: z.string().optional().describe("Status")
  },
  async ({ id, ...data }) => {
    try {
      const result = await SerpClient.updateBrand(id, data);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_delete_brand",
  "Delete a brand profile by ID.",
  {
    id: z.string().describe("Brand ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.deleteBrand(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_list_services",
  "List services associated with brands.",
  {
    take: z.number().optional().default(20).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset"),
    search: z.string().optional().describe("Service name search")
  },
  async ({ take, skip, search }) => {
    try {
      const where = {};
      if (search) where.name = { contains: search };
      const result = await SerpClient.listServices({ take, skip, where });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_service_details",
  "Get details of a specific service.",
  {
    id: z.string().describe("Service ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.getServiceDetails(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_create_service",
  "Create a new service listing under a brand.",
  {
    name: z.string().describe("Service name"),
    brandId: z.string().describe("Associated brand ID"),
    description: z.string().optional().describe("Service description"),
    keywords: z.string().optional().describe("Service keywords"),
    url: z.string().optional().describe("Landing page URL"),
    ctaText: z.string().optional().describe("CTA button text"),
    trustRate: z.number().optional().describe("Trust rate (e.g. 95)"),
    industry: z.string().optional().describe("Industry category")
  },
  async ({ brandId, ...data }) => {
    try {
      const payload = {
        ...data,
        brand: { connect: { id: brandId } }
      };
      const result = await SerpClient.createService(payload);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_update_service",
  "Update service details.",
  {
    id: z.string().describe("Service ID"),
    name: z.string().optional().describe("Name"),
    description: z.string().optional().describe("Description"),
    keywords: z.string().optional().describe("Keywords"),
    url: z.string().optional().describe("URL"),
    ctaText: z.string().optional().describe("CTA Text"),
    trustRate: z.number().optional().describe("Trust rate")
  },
  async ({ id, ...data }) => {
    try {
      const result = await SerpClient.updateService(id, data);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_delete_service",
  "Delete a service listing.",
  {
    id: z.string().describe("Service ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.deleteService(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 12. IMAGES (ASSETS)
// ==========================================
server.tool(
  "serp_list_images",
  "List uploaded media assets and icons.",
  {
    take: z.number().optional().default(20).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset")
  },
  async (params) => {
    try {
      const result = await SerpClient.listImages(params);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_image_details",
  "Get details and direct S3 URL of an image asset.",
  {
    id: z.string().describe("Image ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.getImageDetails(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_delete_image",
  "Delete an image asset by ID.",
  {
    id: z.string().describe("Image ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.deleteImage(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 13. USERS (ADMIN TEAM)
// ==========================================
server.tool(
  "serp_list_users",
  "List administrative users of Dastyar SERP.",
  {
    take: z.number().optional().default(20).describe("Number of items"),
    skip: z.number().optional().default(0).describe("Offset")
  },
  async (params) => {
    try {
      const result = await SerpClient.listUsers(params);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_get_user_details",
  "Get details of a user/admin account.",
  {
    id: z.string().describe("User ID")
  },
  async ({ id }) => {
    try {
      const result = await SerpClient.getUserDetails(id);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_create_user",
  "Create a new administrative user.",
  {
    name: z.string().describe("Full name"),
    email: z.string().email().describe("Email address"),
    password: z.string().describe("Password"),
    isAdmin: z.boolean().optional().default(true).describe("Admin privilege")
  },
  async (payload) => {
    try {
      const result = await SerpClient.createUser(payload);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "serp_update_user",
  "Update a user's details or admin status.",
  {
    id: z.string().describe("User ID"),
    name: z.string().optional().describe("Name"),
    email: z.string().email().optional().describe("Email"),
    isAdmin: z.boolean().optional().describe("Admin status")
  },
  async ({ id, ...data }) => {
    try {
      const result = await SerpClient.updateUser(id, data);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// START SERVER
// ==========================================
export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dastyar SERP MCP Server is running on stdio");
}

if (process.argv[1] && (process.argv[1].endsWith('src/index.js') || process.argv[1].endsWith('index.js'))) {
  runServer().catch((error) => {
    console.error("Fatal error starting Dastyar SERP MCP server:", error);
    process.exit(1);
  });
}
