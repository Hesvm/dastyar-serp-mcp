import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });

const CONFIG_PATH = path.join(os.homedir(), '.serp-session.json');
const BASE_URL = process.env.SERP_BASE_URL || 'https://serp.dastyar.io';

export class AuthManager {
  static getToken() {
    if (process.env.SERP_SESSION_TOKEN) {
      return process.env.SERP_SESSION_TOKEN.trim();
    }
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        if (data.sessionToken) {
          return data.sessionToken.trim();
        }
      } catch (e) {
        // ignore parse error
      }
    }
    return null;
  }

  static setToken(token, extra = {}) {
    if (!token) return;
    const cleanToken = token.trim();
    const payload = {
      sessionToken: cleanToken,
      updatedAt: new Date().toISOString(),
      ...extra
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    process.env.SERP_SESSION_TOKEN = cleanToken;

    // Update .env file if it exists
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      try {
        let content = fs.readFileSync(envPath, 'utf-8');
        if (content.includes('SERP_SESSION_TOKEN=')) {
          content = content.replace(/SERP_SESSION_TOKEN=.*/, `SERP_SESSION_TOKEN=${cleanToken}`);
        } else {
          content += `\nSERP_SESSION_TOKEN=${cleanToken}\n`;
        }
        fs.writeFileSync(envPath, content, 'utf-8');
      } catch (e) {
        // ignore error
      }
    }
  }

  static getCookieHeader() {
    const token = this.getToken();
    if (!token) return '';
    if (token.startsWith('keystonejs-session=')) {
      return token;
    }
    return `keystonejs-session=${token}`;
  }

  static hasCredentials() {
    return Boolean(
      (process.env.SERP_ADMIN_EMAIL || process.env.SERP_EMAIL) &&
      (process.env.SERP_ADMIN_PASSWORD || process.env.SERP_PASSWORD)
    );
  }

  static getCredentials() {
    return {
      email: process.env.SERP_ADMIN_EMAIL || process.env.SERP_EMAIL || 'admin@dastyar.io',
      password: process.env.SERP_ADMIN_PASSWORD || process.env.SERP_PASSWORD || ''
    };
  }

  static async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required for login.');
    }

    const query = `
      mutation ($email: String!, $password: String!) {
        authenticateUserWithPassword(email: $email, password: $password) {
          ... on UserAuthenticationWithPasswordSuccess {
            sessionToken
            item {
              id
              name
              email
              isAdmin
            }
          }
          ... on UserAuthenticationWithPasswordFailure {
            message
          }
        }
      }
    `;

    const response = await axios.post(
      `${BASE_URL}/api/graphql`,
      { query, variables: { email, password } },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0'
        },
        timeout: 20000
      }
    );

    const result = response.data?.data?.authenticateUserWithPassword;
    if (!result) {
      throw new Error('Invalid response from Keystone authentication.');
    }

    if (result.message) {
      throw new Error(`Authentication failed: ${result.message}`);
    }

    if (result.sessionToken) {
      // Check Set-Cookie if available
      let cookieToken = result.sessionToken;
      const setCookies = response.headers['set-cookie'];
      if (setCookies) {
        for (const cookieStr of setCookies) {
          if (cookieStr.includes('keystonejs-session=')) {
            const match = cookieStr.match(/keystonejs-session=([^;]+)/);
            if (match) {
              cookieToken = match[1];
              break;
            }
          }
        }
      }

      this.setToken(cookieToken, {
        email: result.item?.email,
        name: result.item?.name,
        userId: result.item?.id
      });

      return {
        success: true,
        sessionToken: cookieToken,
        user: result.item
      };
    }

    throw new Error('Authentication did not return a valid session.');
  }

  static async autoLogin() {
    const creds = this.getCredentials();
    if (!creds.email || !creds.password) {
      throw new Error('Auto-login failed: SERP_ADMIN_EMAIL or SERP_ADMIN_PASSWORD not set.');
    }
    return await this.login(creds.email, creds.password);
  }

  static async getProfile() {
    const cookieHeader = this.getCookieHeader();
    if (!cookieHeader) {
      throw new Error('No session cookie available.');
    }

    const query = `
      query {
        authenticatedItem {
          ... on User {
            id
            name
            email
            isAdmin
            createdAt
          }
        }
      }
    `;

    const response = await axios.post(
      `${BASE_URL}/api/graphql`,
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0'
        },
        timeout: 15000
      }
    );

    const user = response.data?.data?.authenticatedItem;
    if (!user) {
      throw new Error('Session is invalid or expired (authenticatedItem is null).');
    }

    return user;
  }

  static async ensureAuthenticated() {
    const token = this.getToken();
    if (!token && this.hasCredentials()) {
      await this.autoLogin();
    }
  }
}
