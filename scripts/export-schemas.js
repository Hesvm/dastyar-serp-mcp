import fs from 'fs';
import path from 'path';
import os from 'os';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target directory for Antigravity MCP schemas
const TARGET_DIR = path.join(os.homedir(), '.gemini/antigravity/mcp/dastyar-serp');
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Read index.js to extract tool definitions
const indexPath = path.join(__dirname, '../src/index.js');
const indexContent = fs.readFileSync(indexPath, 'utf-8');

// Parse server.tool calls
const toolRegex = /server\.tool\(\s*["']([^"']+)["'],\s*["']([^"']+)["'],\s*({[\s\S]*?\}),\s*async/g;

let match;
let count = 0;

while ((match = toolRegex.exec(indexContent)) !== null) {
  const toolName = match[1];
  const description = match[2];
  
  // Basic properties extractor
  const schema = {
    name: toolName,
    description: description,
    parameters: {
      $schema: "http://json-schema.org/draft-07/schema#",
      properties: {},
      type: "object"
    }
  };

  const filePath = path.join(TARGET_DIR, `${toolName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(schema, null, 2), 'utf-8');
  count++;
}

console.log(`✅ Successfully exported ${count} tool schemas to ${TARGET_DIR}`);
