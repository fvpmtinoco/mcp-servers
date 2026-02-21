import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const server = new McpServer({
  name: "github-mcp",
  version: "1.0.0",
});

const github = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json"
  }
});

// --- List repos ---
server.registerTool(
  "list_repos",
  {
    title: "List Repos",
    description: "Lists all repositories for the authenticated user or an org",
    inputSchema: {
      org: z.string().optional().describe("Organization name (omit for personal repos)"),
      limit: z.number().optional().describe("Max repos to return (default 30)")
    }
  },
  async ({ org, limit = 30 }) => {
    const url = org ? `/orgs/${org}/repos` : "/user/repos";
    const response = await github.get(url, { params: { per_page: limit } });

    const repos = response.data.map(r => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      url: r.html_url,
      default_branch: r.default_branch
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(repos, null, 2) }]
    };
  }
);

// --- Get repo file tree ---
server.registerTool(
  "get_repo_tree",
  {
    title: "Get Repo Tree",
    description: "Gets the file/folder structure of a repository",
    inputSchema: {
      owner: z.string().describe("Repo owner (user or org)"),
      repo: z.string().describe("Repository name"),
      branch: z.string().optional().describe("Branch name (default: main)")
    }
  },
  async ({ owner, repo, branch = "main" }) => {
    const response = await github.get(
      `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    );

    const tree = response.data.tree
      .filter(item => item.type === "blob")
      .map(item => item.path);

    return {
      content: [{ type: "text", text: tree.join("\n") }]
    };
  }
);

// --- Get file content ---
server.registerTool(
  "get_file",
  {
    title: "Get File",
    description: "Gets the content of a file in a repository",
    inputSchema: {
      owner: z.string().describe("Repo owner"),
      repo: z.string().describe("Repository name"),
      path: z.string().describe("File path within the repo"),
      branch: z.string().optional().describe("Branch name (default: main)")
    }
  },
  async ({ owner, repo, path, branch = "main" }) => {
    const response = await github.get(
      `/repos/${owner}/${repo}/contents/${path}`,
      { params: { ref: branch } }
    );

    const content = Buffer.from(response.data.content, "base64").toString("utf-8");
    return {
      content: [{ type: "text", text: content }]
    };
  }
);

// --- Create or update a file (used to write the README) ---
server.registerTool(
  "create_or_update_file",
  {
    title: "Create or Update File",
    description: "Creates or updates a file in a repository on a given branch",
    inputSchema: {
      owner: z.string().describe("Repo owner"),
      repo: z.string().describe("Repository name"),
      path: z.string().describe("File path, e.g. README.md"),
      content: z.string().describe("Full file content"),
      message: z.string().describe("Commit message"),
      branch: z.string().describe("Branch to commit to")
    }
  },
  async ({ owner, repo, path, content, message, branch }) => {
    // Check if file exists to get its SHA (required for updates)
    let sha;
    try {
      const existing = await github.get(
        `/repos/${owner}/${repo}/contents/${path}`,
        { params: { ref: branch } }
      );
      sha = existing.data.sha;
    } catch {
      // File doesn't exist yet, sha stays undefined
    }

    await github.put(`/repos/${owner}/${repo}/contents/${path}`, {
      message,
      content: Buffer.from(content).toString("base64"),
      branch,
      ...(sha && { sha })
    });

    return {
      content: [{ type: "text", text: `File ${path} committed to ${branch}.` }]
    };
  }
);

// --- Create branch ---
server.registerTool(
  "create_branch",
  {
    title: "Create Branch",
    description: "Creates a new branch from an existing one",
    inputSchema: {
      owner: z.string().describe("Repo owner"),
      repo: z.string().describe("Repository name"),
      branch: z.string().describe("New branch name"),
      from_branch: z.string().optional().describe("Base branch (default: main)")
    }
  },
  async ({ owner, repo, branch, from_branch = "main" }) => {
    const baseRef = await github.get(`/repos/${owner}/${repo}/git/ref/heads/${from_branch}`);
    const sha = baseRef.data.object.sha;

    await github.post(`/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha
    });

    return {
      content: [{ type: "text", text: `Branch ${branch} created from ${from_branch}.` }]
    };
  }
);

// --- Create pull request ---
server.registerTool(
  "create_pull_request",
  {
    title: "Create Pull Request",
    description: "Opens a pull request from a branch into a base branch",
    inputSchema: {
      owner: z.string().describe("Repo owner"),
      repo: z.string().describe("Repository name"),
      title: z.string().describe("PR title"),
      body: z.string().describe("PR description"),
      head: z.string().describe("Branch with changes"),
      base: z.string().optional().describe("Target branch (default: main)")
    }
  },
  async ({ owner, repo, title, body, head, base = "main" }) => {
    const response = await github.post(`/repos/${owner}/${repo}/pulls`, {
      title,
      body,
      head,
      base
    });

    return {
      content: [{ type: "text", text: `PR created: ${response.data.html_url}` }]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);