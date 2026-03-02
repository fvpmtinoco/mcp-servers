import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";  // ← changed
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";  // ← add this (npm install zod)
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const server = new McpServer({   // ← no second argument needed
  name: "confluence-mcp",
  version: "1.0.0",
});

server.registerTool(
  "create_confluence_page",
  {
    title: "Create Confluence Page",
    description: "Creates a new page in a Confluence space",
    inputSchema: {
      spaceKey: z.string().describe("The space key to create the page in"),
      title: z.string().describe("The title of the new page"),
      content: z.string().describe("The storage format content (HTML) of the page"),
      parentId: z.string().optional().describe("The ID of the parent page")
    }
  },
  async ({ spaceKey, title, content, parentId }) => {
    const body = {
      type: "page",
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: content,
          representation: "storage"
        }
      }
    };

    if (parentId) {
      body.ancestors = [{ id: parentId }];
    }

    const response = await axios.post(
      `${process.env.CONFLUENCE_BASE_URL}/wiki/rest/api/content`,
      body,
      {
        auth: {
          username: process.env.CONFLUENCE_EMAIL,
          password: process.env.CONFLUENCE_API_TOKEN
        }
      }
    );

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
    };
  }
);

server.registerTool(
  "list_confluence_spaces",
  {
    title: "List Confluence Spaces",
    description: "Lists all spaces in Confluence",
    inputSchema: {
      limit: z.number().optional().describe("Max results to return (default 25)")
    }
  },
  async ({ limit = 25 }) => {
    const response = await axios.get(
      `${process.env.CONFLUENCE_BASE_URL}/wiki/rest/api/space`,
      {
        params: { limit },
        auth: {
          username: process.env.CONFLUENCE_EMAIL,
          password: process.env.CONFLUENCE_API_TOKEN
        }
      }
    );

    return {
      content: [{ type: "text", text: JSON.stringify(response.data.results, null, 2) }]
    };
  }
);

server.registerTool(
  "search_confluence",
  {
    title: "Search Confluence",
    description: "Fetches a Confluence page by ID or searches by keywords",
    inputSchema: {
      pageId: z.string().optional().describe("The Confluence page ID"),
      query: z.string().optional().describe("Keywords to search for"),
      limit: z.number().optional().describe("Max results to return when searching (default 10)")
    }
  },
  async ({ pageId, query, limit = 10 }) => {
    if (!pageId && !query) {
      throw new Error("Provide either a pageId or a search query.");
    }

    if (pageId) {
      const response = await axios.get(
        `${process.env.CONFLUENCE_BASE_URL}/wiki/rest/api/content/${pageId}?expand=body.storage`,
        {
          auth: {
            username: process.env.CONFLUENCE_EMAIL,
            password: process.env.CONFLUENCE_API_TOKEN
          }
        }
      );
      return {
        content: [{ type: "text", text: response.data.body.storage.value }]
      };
    }

    const response = await axios.get(
      `${process.env.CONFLUENCE_BASE_URL}/wiki/rest/api/content/search`,
      {
        params: {
          cql: `text ~ "${query}" AND type = page`,
          limit,
          expand: "body.storage"
        },
        auth: {
          username: process.env.CONFLUENCE_EMAIL,
          password: process.env.CONFLUENCE_API_TOKEN
        }
      }
    );

    const results = response.data.results.map(page => ({
      id: page.id,
      title: page.title,
      url: `${process.env.CONFLUENCE_BASE_URL}/wiki${page._links.webui}`,
      excerpt: page.body?.storage?.value?.slice(0, 500) ?? ""
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);