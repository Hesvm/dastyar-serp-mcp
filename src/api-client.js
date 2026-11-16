import axios from 'axios';
import { AuthManager } from './auth.js';

const BASE_URL = process.env.SERP_BASE_URL || 'https://serp.dastyar.io';

export class SerpClient {
  static getAxios(customTimeout = 45000) {
    const cookie = AuthManager.getCookieHeader();

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (cookie) {
      headers['Cookie'] = cookie;
    }

    return axios.create({
      baseURL: BASE_URL,
      headers,
      timeout: customTimeout
    });
  }

  static async graphql(query, variables = {}, timeout = 45000, retryCount = 0) {
    await AuthManager.ensureAuthenticated();
    const client = this.getAxios(timeout);

    try {
      const response = await client.post('/api/graphql', { query, variables });
      
      if (response.data.errors && response.data.errors.length > 0) {
        const err = response.data.errors[0];
        const msg = err.message || JSON.stringify(err);
        
        // Handle unauthorized / session expiry in Keystone
        if ((msg.toLowerCase().includes('access denied') || msg.toLowerCase().includes('not authenticated')) && AuthManager.hasCredentials() && retryCount < 1) {
          console.error('[SerpClient] Session expired. Attempting auto-login with credentials...');
          await AuthManager.autoLogin();
          return await this.graphql(query, variables, timeout, retryCount + 1);
        }
        
        throw new Error(`GraphQL Error: ${msg}`);
      }

      return response.data.data;
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const errData = error.response.data;
        const msg = errData?.errors?.[0]?.message || errData?.message || JSON.stringify(errData) || error.message;

        if (status === 401 && AuthManager.hasCredentials() && retryCount < 1) {
          console.error('[SerpClient] 401 Unauthorized. Auto-renewing session...');
          await AuthManager.autoLogin();
          return await this.graphql(query, variables, timeout, retryCount + 1);
        }

        throw new Error(`SERP Server Error (${status}): ${msg}`);
      }
      throw error;
    }
  }

  // ==========================================
  // 1. OVERVIEW & TELEMETRY
  // ==========================================
  static async getOverviewStats() {
    const query = `
      query {
        promotionsCount
        activePromotionsCount: promotionsCount(where: { isActive: { equals: true } })
        chatbotAdsCount
        pendingAdReviewCount: adLinesCount(where: { creativeStatus: { equals: "review" } })
        pendingIntentMergeCount: intentMergeSuggestionsCount(where: { status: { equals: "pending" } })
        recentQueriesCount: userSearchQueriesCount
        searchTrendsCount
        brandsCount
      }
    `;
    return await this.graphql(query);
  }

  // ==========================================
  // 2. PROMOTIONS
  // ==========================================
  static async listPromotions({ take = 20, skip = 0, where = {}, orderBy = [{ id: 'desc' }] } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!, $where: PromotionWhereInput, $orderBy: [PromotionOrderByInput!]) {
        promotions(take: $take, skip: $skip, where: $where, orderBy: $orderBy) {
          id
          name
          keywordsNew
          isActive
          adplatCampaignId
          adplatClusterId
          adplatPlatform
          adplatPlacement
          adplatStatus
          richTextNew
        }
        promotionsCount(where: $where)
      }
    `;
    return await this.graphql(query, { take, skip, where, orderBy });
  }

  static async getPromotionDetails(id) {
    const query = `
      query ($id: ID!) {
        promotion(where: { id: $id }) {
          id
          name
          content
          richTextNew
          keywordsNew
          isActive
          adplatCampaignId
          adplatClusterId
          adplatPlatform
          adplatPlacement
          adplatStatus
          adplatSnapshot
        }
      }
    `;
    const res = await this.graphql(query, { id: String(id) });
    return res.promotion;
  }

  static async createPromotion(data) {
    const query = `
      mutation ($data: PromotionCreateInput!) {
        createPromotion(data: $data) {
          id
          name
          isActive
          keywordsNew
          adplatCampaignId
          adplatClusterId
        }
      }
    `;
    return (await this.graphql(query, { data })).createPromotion;
  }

  static async updatePromotion(id, data) {
    const query = `
      mutation ($id: ID!, $data: PromotionUpdateInput!) {
        updatePromotion(where: { id: $id }, data: $data) {
          id
          name
          isActive
          keywordsNew
          adplatCampaignId
          adplatClusterId
        }
      }
    `;
    return (await this.graphql(query, { id: String(id), data })).updatePromotion;
  }

  static async togglePromotionStatus(id, isActive) {
    return await this.updatePromotion(id, { isActive: Boolean(isActive) });
  }

  static async deletePromotion(id) {
    const query = `
      mutation ($id: ID!) {
        deletePromotion(where: { id: $id }) {
          id
          name
        }
      }
    `;
    return (await this.graphql(query, { id: String(id) })).deletePromotion;
  }

  // ==========================================
  // 3. CHATBOT ADS (تبلیغات هوشنگ)
  // ==========================================
  static async listChatbotAds({ take = 20, skip = 0, where = {}, orderBy = [{ id: 'desc' }] } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!, $where: ChatbotAdWhereInput, $orderBy: [ChatbotAdOrderByInput!]) {
        chatbotAds(take: $take, skip: $skip, where: $where, orderBy: $orderBy) {
          id
          internalTitle
          title
          adType
          status
          ctaText
          ctaUrl
          targetKeywords
          minConfidenceOverride
          brand {
            id
            name
          }
        }
        chatbotAdsCount(where: $where)
      }
    `;
    return await this.graphql(query, { take, skip, where, orderBy });
  }

  static async getChatbotAdDetails(id) {
    const query = `
      query ($id: ID!) {
        chatbotAd(where: { id: $id }) {
          id
          internalTitle
          title
          bodyText
          bannerImage
          footerText
          ctaText
          ctaUrl
          adType
          status
          targetKeywords
          minConfidenceOverride
          brand {
            id
            name
            pageUrl
          }
          adplatCampaignId
          adplatClusterId
          adplatPlatform
          adplatPlacement
          adplatStatus
          createdAt
          updatedAt
        }
      }
    `;
    const res = await this.graphql(query, { id: String(id) });
    return res.chatbotAd;
  }

  static async createChatbotAd(data) {
    const query = `
      mutation ($data: ChatbotAdCreateInput!) {
        createChatbotAd(data: $data) {
          id
          internalTitle
          title
          status
        }
      }
    `;
    return (await this.graphql(query, { data })).createChatbotAd;
  }

  static async updateChatbotAd(id, data) {
    const query = `
      mutation ($id: ID!, $data: ChatbotAdUpdateInput!) {
        updateChatbotAd(where: { id: $id }, data: $data) {
          id
          internalTitle
          title
          status
          ctaUrl
        }
      }
    `;
    return (await this.graphql(query, { id: String(id), data })).updateChatbotAd;
  }

  static async deleteChatbotAd(id) {
    const query = `
      mutation ($id: ID!) {
        deleteChatbotAd(where: { id: $id }) {
          id
          internalTitle
        }
      }
    `;
    return (await this.graphql(query, { id: String(id) })).deleteChatbotAd;
  }

  // ==========================================
  // 4. AD LINES & REVIEW QUEUE (داوری کریتیو)
  // ==========================================
  static async listAdLines({ take = 20, skip = 0, where = {}, orderBy = [{ id: 'desc' }] } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!, $where: AdLineWhereInput, $orderBy: [AdLineOrderByInput!]) {
        adLines(take: $take, skip: $skip, where: $where, orderBy: $orderBy) {
          id
          lineKey
          campaignId
          adplatClusterId
          intentId
          placementKey
          clusterLabel
          creativeStatus
          status
          servable
          manualPause
          destinationUrl
          trackingUrl
          adplatState
          live
          startsOn
          endsOn
        }
        adLinesCount(where: $where)
      }
    `;
    return await this.graphql(query, { take, skip, where, orderBy });
  }

  static async getAdLineDetails(id) {
    const query = `
      query ($id: ID!) {
        adLine(where: { id: $id }) {
          id
          lineKey
          campaignId
          adplatClusterId
          intentId
          placementKey
          clusterLabel
          keywords
          destinationUrl
          trackingUrl
          adplatState
          live
          startsOn
          endsOn
          creativeRaw
          creative
          blocks
          lint
          judge
          creativeHash
          creativeStatus
          status
          servable
          statusReason
          manualPause
          version
          lastSeenAt
          createdAt
          updatedAt
        }
      }
    `;
    const res = await this.graphql(query, { id: String(id) });
    return res.adLine;
  }

  static async getAdReviewQueue({ take = 20, skip = 0 } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!) {
        adLines(where: { creativeStatus: { equals: "review" } }, take: $take, skip: $skip, orderBy: [{ id: desc }]) {
          id
          lineKey
          campaignId
          clusterLabel
          destinationUrl
          creative
          blocks
          lint
          judge
          creativeStatus
          createdAt
        }
        adLinesCount(where: { creativeStatus: { equals: "review" } })
      }
    `;
    return await this.graphql(query, { take, skip });
  }

  static async getAdReviewRejected({ take = 20, skip = 0 } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!) {
        adLines(where: { creativeStatus: { equals: "rejected" } }, take: $take, skip: $skip, orderBy: [{ id: desc }]) {
          id
          lineKey
          campaignId
          clusterLabel
          creativeStatus
          statusReason
          judge
          createdAt
        }
        adLinesCount(where: { creativeStatus: { equals: "rejected" } })
      }
    `;
    return await this.graphql(query, { take, skip });
  }

  static async approveAdLine(id, judge = { approved: true, timestamp: new Date().toISOString() }) {
    const query = `
      mutation ($id: ID!, $judge: JSON) {
        updateAdLine(
          where: { id: $id }
          data: {
            creativeStatus: "approved"
            judge: $judge
          }
        ) {
          id
          lineKey
          creativeStatus
          judge
        }
      }
    `;
    return (await this.graphql(query, { id: String(id), judge })).updateAdLine;
  }

  static async rejectAdLine(id, reason = 'Rejected by Admin', judge = {}) {
    const fullJudge = {
      approved: false,
      reason,
      timestamp: new Date().toISOString(),
      ...judge
    };
    const query = `
      mutation ($id: ID!, $judge: JSON, $reason: String) {
        updateAdLine(
          where: { id: $id }
          data: {
            creativeStatus: "rejected"
            statusReason: $reason
            judge: $judge
          }
        ) {
          id
          lineKey
          creativeStatus
          statusReason
          judge
        }
      }
    `;
    return (await this.graphql(query, { id: String(id), judge: fullJudge, reason })).updateAdLine;
  }

  static async toggleAdLineManualPause(id, manualPause) {
    const query = `
      mutation ($id: ID!, $manualPause: Boolean!) {
        updateAdLine(
          where: { id: $id }
          data: { manualPause: $manualPause }
        ) {
          id
          lineKey
          manualPause
        }
      }
    `;
    return (await this.graphql(query, { id: String(id), manualPause: Boolean(manualPause) })).updateAdLine;
  }

  // ==========================================
  // 5. INTENT MERGE & SEARCH TRENDS
  // ==========================================
  static async listSearchTrends({ take = 20, skip = 0, where = {}, orderBy = [{ volume: 'desc' }] } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!, $where: SearchTrendWhereInput, $orderBy: [SearchTrendOrderByInput!]) {
        searchTrends(take: $take, skip: $skip, where: $where, orderBy: $orderBy) {
          id
          name
          volume
          adShownCount
          status
          source
          sampleQueries
          lastSeenAt
        }
        searchTrendsCount(where: $where)
      }
    `;
    return await this.graphql(query, { take, skip, where, orderBy });
  }

  static async getSearchTrendDetails(id) {
    const query = `
      query ($id: ID!) {
        searchTrend(where: { id: $id }) {
          id
          name
          source
          volume
          adShownCount
          clusterPointId
          sampleQueries
          lastSeenAt
          createdAt
          status
        }
      }
    `;
    const res = await this.graphql(query, { id: String(id) });
    return res.searchTrend;
  }

  static async listIntentSuggestions({ status = 'pending', take = 20, skip = 0 } = {}) {
    const query = `
      query ($status: String!, $take: Int!, $skip: Int!) {
        intentMergeSuggestions(where: { status: { equals: $status } }, take: $take, skip: $skip, orderBy: [{ id: desc }]) {
          id
          key
          kind
          status
          source
          survivorId
          survivorName
          loserIds
          members
          volume
        }
        intentMergeSuggestionsCount(where: { status: { equals: $status } })
      }
    `;
    return await this.graphql(query, { status, take, skip });
  }

  static async approveIntentSuggestion(id, loserIds = null) {
    const query = `
      mutation ($id: ID!, $loserIds: JSON) {
        updateIntentMergeSuggestion(
          where: { id: $id }
          data: {
            status: "approved"
            loserIds: $loserIds
          }
        ) {
          id
          status
          survivorId
          loserIds
        }
      }
    `;
    return (await this.graphql(query, { id: String(id), loserIds })).updateIntentMergeSuggestion;
  }

  static async rejectIntentSuggestion(id) {
    const query = `
      mutation ($id: ID!) {
        updateIntentMergeSuggestion(
          where: { id: $id }
          data: { status: "rejected" }
        ) {
          id
          status
        }
      }
    `;
    return (await this.graphql(query, { id: String(id) })).updateIntentMergeSuggestion;
  }

  static async requestIntentMerge(survivorId, loserIds) {
    const query = `
      mutation ($survivorId: Int!, $loserIds: JSON!) {
        createIntentMergeSuggestion(
          data: {
            survivorId: $survivorId
            loserIds: $loserIds
            kind: "manual"
            status: "approved"
          }
        ) {
          id
          status
          kind
          survivorId
          loserIds
        }
      }
    `;
    return (await this.graphql(query, { survivorId: parseInt(survivorId), loserIds })).createIntentMergeSuggestion;
  }

  static async listQueryForms({ take = 50, skip = 0, where = {}, orderBy = [{ searchCount: 'desc' }] } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!, $where: QueryFormWhereInput, $orderBy: [QueryFormOrderByInput!]) {
        queryForms(take: $take, skip: $skip, where: $where, orderBy: $orderBy) {
          id
          hash
          text
          source
          searchCount
          adShownCount
          intentId
          assignedBy
          confidence
          pinned
        }
        queryFormsCount(where: $where)
      }
    `;
    return await this.graphql(query, { take, skip, where, orderBy });
  }

  static async listClusteringJobs({ take = 20, skip = 0, where = {}, orderBy = [{ createdAt: 'desc' }] } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!, $where: ClusteringJobWhereInput, $orderBy: [ClusteringJobOrderByInput!]) {
        clusteringJobs(take: $take, skip: $skip, where: $where, orderBy: $orderBy) {
          id
          type
          status
          queryCount
          processingProgress
          processedCount
          logs
          createdAt
        }
        clusteringJobsCount(where: $where)
      }
    `;
    return await this.graphql(query, { take, skip, where, orderBy });
  }

  // ==========================================
  // 6. KEYWORDS & GROUPS
  // ==========================================
  static async listKeywords({ take = 50, skip = 0, where = {}, orderBy = [{ id: 'desc' }] } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!, $where: KeywordWhereInput, $orderBy: [KeywordOrderByInput!]) {
        keywords(take: $take, skip: $skip, where: $where, orderBy: $orderBy) {
          id
          name
          type
          groups {
            id
            name
          }
        }
        keywordsCount(where: $where)
      }
    `;
    return await this.graphql(query, { take, skip, where, orderBy });
  }

  static async createKeyword({ name, type = 'phrase', groupIds = [] }) {
    const data = {
      name,
      type
    };
    if (groupIds && groupIds.length > 0) {
      data.groups = {
        connect: groupIds.map(id => ({ id: String(id) }))
      };
    }
    const query = `
      mutation ($data: KeywordCreateInput!) {
        createKeyword(data: $data) {
          id
          name
          type
        }
      }
    `;
    return (await this.graphql(query, { data })).createKeyword;
  }

  static async bulkCreateKeywords(keywordsList) {
    const results = [];
    for (const kw of keywordsList) {
      try {
        const item = await this.createKeyword(kw);
        results.push({ success: true, item });
      } catch (err) {
        results.push({ success: false, name: kw.name, error: err.message });
      }
    }
    return results;
  }

  static async deleteKeyword(id) {
    const query = `
      mutation ($id: ID!) {
        deleteKeyword(where: { id: $id }) {
          id
          name
        }
      }
    `;
    return (await this.graphql(query, { id: String(id) })).deleteKeyword;
  }

  static async listGroups({ take = 50, skip = 0, where = {} } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!, $where: GroupWhereInput) {
        groups(take: $take, skip: $skip, where: $where) {
          id
          name
          keywordsCount
        }
        groupsCount(where: $where)
      }
    `;
    return await this.graphql(query, { take, skip, where });
  }

  static async createGroup(name) {
    const query = `
      mutation ($name: String!) {
        createGroup(data: { name: $name }) {
          id
          name
        }
      }
    `;
    return (await this.graphql(query, { name })).createGroup;
  }

  // ==========================================
  // 7. USER SEARCH QUERIES & LIVE TELEMETRY
  // ==========================================
  static async listUserSearchQueries({ take = 50, skip = 0, where = {}, orderBy = [{ createdAt: 'desc' }] } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!, $where: UserSearchQueryWhereInput, $orderBy: [UserSearchQueryOrderByInput!]) {
        userSearchQueries(take: $take, skip: $skip, where: $where, orderBy: $orderBy) {
          id
          query
          source
          adShown
          adId
          matchScore
          reason
          conversationId
          createdAt
        }
        userSearchQueriesCount(where: $where)
      }
    `;
    return await this.graphql(query, { take, skip, where, orderBy });
  }

  static async getUserSearchQueryDetails(id) {
    const query = `
      query ($id: ID!) {
        userSearchQuery(where: { id: $id }) {
          id
          query
          source
          adShown
          adId
          matchScore
          reason
          conversationId
          createdAt
          promotion {
            id
            name
          }
          service {
            id
            name
          }
        }
      }
    `;
    const res = await this.graphql(query, { id: String(id) });
    return res.userSearchQuery;
  }

  static async listAdEvents({ take = 50, skip = 0, where = {}, orderBy = [{ id: 'desc' }] } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!, $where: AdEventWhereInput, $orderBy: [AdEventOrderByInput!]) {
        adEvents(take: $take, skip: $skip, where: $where, orderBy: $orderBy) {
          id
          eventType
          surface
          adId
          brandId
          conversationId
          messageIndex
          relevanceScore
          sentimentScore
          metadata
          createdAt
        }
        adEventsCount(where: $where)
      }
    `;
    return await this.graphql(query, { take, skip, where, orderBy });
  }

  static async getAdSettings() {
    const query = `
      query {
        adSettingsItems(take: 1) {
          id
          globalMinConfidence
          priorityOrder
          keywordWeight
          semanticWeight
          sentimentThreshold
          createdAt
        }
      }
    `;
    const res = await this.graphql(query);
    return res.adSettingsItems?.[0] || null;
  }

  static async updateAdSettings(id, data) {
    const query = `
      mutation ($id: ID!, $data: AdSettingsUpdateInput!) {
        updateAdSettings(where: { id: $id }, data: $data) {
          id
          globalMinConfidence
          priorityOrder
          keywordWeight
          semanticWeight
          sentimentThreshold
        }
      }
    `;
    return (await this.graphql(query, { id: String(id), data })).updateAdSettings;
  }

  // ==========================================
  // 8. STATS & ANALYTICS
  // ==========================================
  static async getAdLineDailyStats({ lineId = null, campaignId = null, day = null, take = 50, skip = 0 } = {}) {
    const where = {};
    if (lineId) where.lineId = { equals: parseInt(lineId) };
    if (campaignId) where.campaignId = { equals: String(campaignId) };
    if (day) where.day = { equals: String(day) };

    const query = `
      query ($where: AdLineDailyStatWhereInput, $take: Int!, $skip: Int!) {
        adLineDailyStats(where: $where, take: $take, skip: $skip, orderBy: [{ day: desc }]) {
          id
          statKey
          lineId
          campaignId
          adplatClusterId
          intentId
          placementKey
          day
          impressions
          clicks
        }
        adLineDailyStatsCount(where: $where)
      }
    `;
    return await this.graphql(query, { where, take, skip });
  }

  static async getAdLineQueryDailyStats({ lineId = null, queryText = null, day = null, take = 50, skip = 0 } = {}) {
    const where = {};
    if (lineId) where.lineId = { equals: parseInt(lineId) };
    if (queryText) where.query = { contains: String(queryText) };
    if (day) where.day = { equals: String(day) };

    const query = `
      query ($where: AdLineQueryDailyStatWhereInput, $take: Int!, $skip: Int!) {
        adLineQueryDailyStats(where: $where, take: $take, skip: $skip, orderBy: [{ day: desc }]) {
          id
          statKey
          lineId
          campaignId
          adplatClusterId
          day
          formHash
          query
          impressions
          clicks
        }
        adLineQueryDailyStatsCount(where: $where)
      }
    `;
    return await this.graphql(query, { where, take, skip });
  }

  static async getIntentDailyStats({ intentId = null, day = null, take = 50, skip = 0 } = {}) {
    const where = {};
    if (intentId) where.intentId = { equals: parseInt(intentId) };
    if (day) where.day = { equals: String(day) };

    const query = `
      query ($where: IntentDailyStatWhereInput, $take: Int!, $skip: Int!) {
        intentDailyStats(where: $where, take: $take, skip: $skip, orderBy: [{ day: desc }]) {
          id
          statKey
          intentId
          day
          source
          searches
          adsShown
        }
        intentDailyStatsCount(where: $where)
      }
    `;
    return await this.graphql(query, { where, take, skip });
  }

  // ==========================================
  // 9. BRANDS & SERVICES
  // ==========================================
  static async listBrands({ take = 20, skip = 0, where = {}, orderBy = [{ id: 'desc' }] } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!, $where: BrandWhereInput, $orderBy: [BrandOrderByInput!]) {
        brands(take: $take, skip: $skip, where: $where, orderBy: $orderBy) {
          id
          name
          about
          descriptionShort
          pageUrl
          status
          toneKeywords
          triggerKeywords
          servicesCount
          chatbotAdsCount
        }
        brandsCount(where: $where)
      }
    `;
    return await this.graphql(query, { take, skip, where, orderBy });
  }

  static async getBrandDetails(id) {
    const query = `
      query ($id: ID!) {
        brand(where: { id: $id }) {
          id
          name
          about
          logo
          descriptionShort
          pageUrl
          toneKeywords
          triggerKeywords
          status
          services {
            id
            name
            trustRate
          }
          chatbotAds {
            id
            title
            status
          }
        }
      }
    `;
    const res = await this.graphql(query, { id: String(id) });
    return res.brand;
  }

  static async createBrand(data) {
    const query = `
      mutation ($data: BrandCreateInput!) {
        createBrand(data: $data) {
          id
          name
          status
        }
      }
    `;
    return (await this.graphql(query, { data })).createBrand;
  }

  static async updateBrand(id, data) {
    const query = `
      mutation ($id: ID!, $data: BrandUpdateInput!) {
        updateBrand(where: { id: $id }, data: $data) {
          id
          name
          status
        }
      }
    `;
    return (await this.graphql(query, { id: String(id), data })).updateBrand;
  }

  static async listServices({ take = 20, skip = 0, where = {}, orderBy = [{ id: 'desc' }] } = {}) {
    const query = `
      query ($take: Int!, $skip: Int!, $where: ServiceWhereInput, $orderBy: [ServiceOrderByInput!]) {
        services(take: $take, skip: $skip, where: $where, orderBy: $orderBy) {
          id
          name
          description
          keywords
          url
          ctaText
          trustRate
          industry
          brand {
            id
            name
          }
        }
        servicesCount(where: $where)
      }
    `;
    return await this.graphql(query, { take, skip, where, orderBy });
  }

  static async getServiceDetails(id) {
    const query = `
      query ($id: ID!) {
        service(where: { id: $id }) {
          id
          name
          description
          keywords
          url
          ctaText
          trustRate
          industry
          brand {
            id
            name
          }
        }
      }
    `;
    const res = await this.graphql(query, { id: String(id) });
    return res.service;
  }
}
