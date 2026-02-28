#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const GITLAB_URL = process.env.GITLAB_URL || "https://gitlab.com";
const GITLAB_TOKEN = process.env.GITLAB_TOKEN;

if (!GITLAB_TOKEN) {
  console.error("Error: GITLAB_TOKEN environment variable is required");
  process.exit(1);
}

async function gitlabRequest(path, options = {}) {
  const url = `${GITLAB_URL}/api/v4${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "PRIVATE-TOKEN": GITLAB_TOKEN,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitLab API error ${response.status}: ${error}`);
  }

  return response.json();
}

const server = new Server(
  { name: "gitlab-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_groups",
      description: "List GitLab groups",
      inputSchema: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search term to filter groups" },
          per_page: { type: "number", description: "Number of results per page (default 20)" },
        },
      },
    },
    {
      name: "list_projects",
      description: "List GitLab projects accessible to the authenticated user",
      inputSchema: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search term to filter projects" },
          owned: { type: "boolean", description: "Only return owned projects" },
          group_id: { type: "string", description: "Filter by group ID or URL-encoded path" },
          per_page: { type: "number", description: "Number of results per page (default 20)" },
        },
      },
    },
    {
      name: "get_project",
      description: "Get details of a specific GitLab project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID or URL-encoded path (e.g. 'group/repo')" },
        },
        required: ["project_id"],
      },
    },
    {
      name: "list_repository_files",
      description: "List files and directories in a repository path",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID or URL-encoded path" },
          path: { type: "string", description: "The path inside the repository (default: root)" },
          ref: { type: "string", description: "Branch, tag or commit (default: main)" },
        },
        required: ["project_id"],
      },
    },
    {
      name: "get_file_content",
      description: "Get the content of a file in a repository",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID or URL-encoded path" },
          file_path: { type: "string", description: "Full path to the file" },
          ref: { type: "string", description: "Branch, tag or commit (default: main)" },
        },
        required: ["project_id", "file_path"],
      },
    },
    {
      name: "list_branches",
      description: "List branches of a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID or URL-encoded path" },
          search: { type: "string", description: "Filter branches by name" },
        },
        required: ["project_id"],
      },
    },
    {
      name: "list_merge_requests",
      description: "List merge requests for a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID or URL-encoded path" },
          state: { type: "string", enum: ["opened", "closed", "locked", "merged", "all"], description: "Filter by state (default: opened)" },
          per_page: { type: "number", description: "Number of results per page (default 20)" },
        },
        required: ["project_id"],
      },
    },
    {
      name: "get_merge_request",
      description: "Get details of a specific merge request",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID or URL-encoded path" },
          mr_iid: { type: "number", description: "Merge request internal ID" },
        },
        required: ["project_id", "mr_iid"],
      },
    },
    {
      name: "create_merge_request",
      description: "Create a new merge request",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID or URL-encoded path" },
          source_branch: { type: "string", description: "Source branch name" },
          target_branch: { type: "string", description: "Target branch name" },
          title: { type: "string", description: "Merge request title" },
          description: { type: "string", description: "Merge request description" },
          assignee_id: { type: "number", description: "User ID to assign the MR to" },
          labels: { type: "string", description: "Comma-separated labels" },
          remove_source_branch: { type: "boolean", description: "Remove source branch after merge" },
          squash: { type: "boolean", description: "Squash commits on merge" },
        },
        required: ["project_id", "source_branch", "target_branch", "title"],
      },
    },
    {
      name: "update_merge_request",
      description: "Update an existing merge request",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID or URL-encoded path" },
          mr_iid: { type: "number", description: "Merge request internal ID" },
          title: { type: "string", description: "New title" },
          description: { type: "string", description: "New description" },
          state_event: { type: "string", enum: ["close", "reopen"], description: "Close or reopen the MR" },
          assignee_id: { type: "number", description: "User ID to assign" },
          labels: { type: "string", description: "Comma-separated labels" },
          target_branch: { type: "string", description: "New target branch" },
        },
        required: ["project_id", "mr_iid"],
      },
    },
    {
      name: "merge_merge_request",
      description: "Accept and merge a merge request",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID or URL-encoded path" },
          mr_iid: { type: "number", description: "Merge request internal ID" },
          merge_commit_message: { type: "string", description: "Custom merge commit message" },
          squash: { type: "boolean", description: "Squash commits on merge" },
          should_remove_source_branch: { type: "boolean", description: "Remove source branch after merge" },
        },
        required: ["project_id", "mr_iid"],
      },
    },
    {
      name: "get_merge_request_diff",
      description: "Get the diff/changes of a merge request",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID or URL-encoded path" },
          mr_iid: { type: "number", description: "Merge request internal ID" },
        },
        required: ["project_id", "mr_iid"],
      },
    },
    {
      name: "add_merge_request_comment",
      description: "Add a comment/note to a merge request",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID or URL-encoded path" },
          mr_iid: { type: "number", description: "Merge request internal ID" },
          body: { type: "string", description: "Comment text" },
        },
        required: ["project_id", "mr_iid", "body"],
      },
    },
    {
      name: "list_commits",
      description: "List commits in a project",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID or URL-encoded path" },
          ref_name: { type: "string", description: "Branch/tag/commit to list commits for" },
          per_page: { type: "number", description: "Number of results (default 20)" },
        },
        required: ["project_id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case "list_groups": {
        const params = new URLSearchParams();
        if (args.search) params.set("search", args.search);
        params.set("per_page", String(args.per_page || 100));
        result = await gitlabRequest(`/groups?${params}`);
        result = result.map(g => ({
          id: g.id,
          name: g.name,
          path: g.path,
          full_path: g.full_path,
          description: g.description,
          visibility: g.visibility,
          web_url: g.web_url,
        }));
        break;
      }

      case "list_projects": {
        const params = new URLSearchParams();
        if (args.search) params.set("search", args.search);
        if (args.owned) params.set("owned", "true");
        params.set("per_page", String(args.per_page || 100)); // Increased default to 100
        
        let path = "/projects";
        if (args.group_id) {
          path = `/groups/${encodeURIComponent(args.group_id)}/projects`;
        }
        
        result = await gitlabRequest(`${path}?${params}`);
        result = result.map(p => ({
          id: p.id,
          name: p.name,
          path_with_namespace: p.path_with_namespace,
          description: p.description,
          default_branch: p.default_branch,
          visibility: p.visibility,
          web_url: p.web_url,
          last_activity_at: p.last_activity_at,
        }));
        break;
      }

      case "get_project": {
        const pid = encodeURIComponent(args.project_id);
        result = await gitlabRequest(`/projects/${pid}`);
        break;
      }

      case "list_repository_files": {
        const pid = encodeURIComponent(args.project_id);
        const params = new URLSearchParams();
        if (args.path) params.set("path", args.path);
        if (args.ref) params.set("ref", args.ref);
        result = await gitlabRequest(`/projects/${pid}/repository/tree?${params}`);
        break;
      }

      case "get_file_content": {
        const pid = encodeURIComponent(args.project_id);
        const filePath = encodeURIComponent(args.file_path);
        const ref = args.ref || "main";
        const data = await gitlabRequest(`/projects/${pid}/repository/files/${filePath}?ref=${ref}`);
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        result = { file_path: data.file_path, ref: data.ref, size: data.size, content };
        break;
      }

      case "list_branches": {
        const pid = encodeURIComponent(args.project_id);
        const params = new URLSearchParams();
        if (args.search) params.set("search", args.search);
        result = await gitlabRequest(`/projects/${pid}/repository/branches?${params}`);
        result = result.map(b => ({
          name: b.name,
          merged: b.merged,
          protected: b.protected,
          default: b.default,
          commit: { id: b.commit.id, message: b.commit.message, authored_date: b.commit.authored_date },
        }));
        break;
      }

      case "list_merge_requests": {
        const pid = encodeURIComponent(args.project_id);
        const params = new URLSearchParams();
        params.set("state", args.state || "opened");
        params.set("per_page", String(args.per_page || 20));
        result = await gitlabRequest(`/projects/${pid}/merge_requests?${params}`);
        result = result.map(mr => ({
          iid: mr.iid,
          title: mr.title,
          state: mr.state,
          author: mr.author?.name,
          assignee: mr.assignee?.name,
          source_branch: mr.source_branch,
          target_branch: mr.target_branch,
          created_at: mr.created_at,
          web_url: mr.web_url,
        }));
        break;
      }

      case "get_merge_request": {
        const pid = encodeURIComponent(args.project_id);
        result = await gitlabRequest(`/projects/${pid}/merge_requests/${args.mr_iid}`);
        break;
      }

      case "create_merge_request": {
        const pid = encodeURIComponent(args.project_id);
        const body = {
          source_branch: args.source_branch,
          target_branch: args.target_branch,
          title: args.title,
          ...(args.description && { description: args.description }),
          ...(args.assignee_id && { assignee_id: args.assignee_id }),
          ...(args.labels && { labels: args.labels }),
          ...(args.remove_source_branch !== undefined && { remove_source_branch: args.remove_source_branch }),
          ...(args.squash !== undefined && { squash: args.squash }),
        };
        result = await gitlabRequest(`/projects/${pid}/merge_requests`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        break;
      }

      case "update_merge_request": {
        const pid = encodeURIComponent(args.project_id);
        const { project_id, mr_iid, ...updateFields } = args;
        result = await gitlabRequest(`/projects/${pid}/merge_requests/${mr_iid}`, {
          method: "PUT",
          body: JSON.stringify(updateFields),
        });
        break;
      }

      case "merge_merge_request": {
        const pid = encodeURIComponent(args.project_id);
        const { project_id, mr_iid, ...mergeOptions } = args;
        result = await gitlabRequest(`/projects/${pid}/merge_requests/${mr_iid}/merge`, {
          method: "PUT",
          body: JSON.stringify(mergeOptions),
        });
        break;
      }

      case "get_merge_request_diff": {
        const pid = encodeURIComponent(args.project_id);
        result = await gitlabRequest(`/projects/${pid}/merge_requests/${args.mr_iid}/diffs`);
        break;
      }

      case "add_merge_request_comment": {
        const pid = encodeURIComponent(args.project_id);
        result = await gitlabRequest(`/projects/${pid}/merge_requests/${args.mr_iid}/notes`, {
          method: "POST",
          body: JSON.stringify({ body: args.body }),
        });
        break;
      }

      case "list_commits": {
        const pid = encodeURIComponent(args.project_id);
        const params = new URLSearchParams();
        if (args.ref_name) params.set("ref_name", args.ref_name);
        params.set("per_page", String(args.per_page || 20));
        result = await gitlabRequest(`/projects/${pid}/repository/commits?${params}`);
        result = result.map(c => ({
          id: c.id,
          short_id: c.short_id,
          title: c.title,
          author_name: c.author_name,
          authored_date: c.authored_date,
          message: c.message,
          web_url: c.web_url,
        }));
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("GitLab MCP server running on stdio");