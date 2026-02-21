# MCP Servers

This repository contains Model Context Protocol (MCP) servers: a **Confluence** MCP server and a **GitHub** MCP server.

## Project structure

- `confluence_mcp/`
  - `package.json` – Node package definition for the Confluence MCP server
  - `package-lock.json` – Locked dependency tree for reproducible installs
  - `index.js` – MCP server implementation that exposes Confluence search capabilities
- `github_mcp/`
  - `package.json` – Node package definition for the GitHub MCP server
  - `package-lock.json` – Locked dependency tree for reproducible installs
  - `index.js` – MCP server implementation that exposes GitHub API operations (repos, files, branches, PRs)
- `README.md` – This file
- `.gitignore` – Standard Git ignore rules

---

## Confluence MCP server

The Confluence MCP server exposes a single tool, `search_confluence`, which lets compatible MCP clients (such as AI assistants) search or fetch content from an Atlassian Confluence instance.

### Features

- Search Confluence pages by keywords
- Fetch a specific Confluence page by page ID
- Returns page content or search results in a structured, JSON-friendly format

### Technology stack

- **Runtime**: Node.js (ES modules)
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **HTTP client**: `axios`
- **Configuration**: `dotenv`
- **Validation**: `zod`

### Installation & configuration

```bash
cd confluence_mcp
npm install
```

Set these environment variables (e.g. in a `.env` file):

- `CONFLUENCE_BASE_URL` – Base URL of your Confluence site (e.g. `https://your-domain.atlassian.net`)
- `CONFLUENCE_EMAIL` – Email for your Atlassian account
- `CONFLUENCE_API_TOKEN` – Atlassian API token

### Tool: `search_confluence`

- **Inputs**: `pageId` (optional), `query` (optional), `limit` (optional, default 10). Provide either `pageId` or `query`.
- **Behavior**: Fetches a page by ID or searches by keywords and returns content or result list (id, title, url, excerpt).

---

## GitHub MCP server

The GitHub MCP server exposes tools to list repos, browse repo trees, read and write files, create branches, and open pull requests using the GitHub API.

### Features

- List repositories for the authenticated user or an organization
- Get file/folder structure of a repository
- Get file content from a repo
- Create or update a file on a branch
- Create a new branch from an existing one
- Create a pull request

### Technology stack

- **Runtime**: Node.js (ES modules)
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **HTTP client**: `axios`
- **Configuration**: `dotenv`
- **Validation**: `zod`

### Installation & configuration

```bash
cd github_mcp
npm install
```

Set this environment variable (e.g. in a `.env` file):

- `GITHUB_TOKEN` – GitHub personal access token with appropriate repo permissions (read for list/tree/file; write for create/update file, create branch, create PR)

### Tools

| Tool | Description |
|------|-------------|
| `list_repos` | Lists repos for the authenticated user or an org. Inputs: `org` (optional), `limit` (optional, default 30). |
| `get_repo_tree` | Gets the file/folder structure of a repository. Inputs: `owner`, `repo`, `branch` (optional, default main). |
| `get_file` | Gets the content of a file in a repo. Inputs: `owner`, `repo`, `path`, `branch` (optional). |
| `create_or_update_file` | Creates or updates a file on a branch. Inputs: `owner`, `repo`, `path`, `content`, `message`, `branch`. |
| `create_branch` | Creates a new branch from a base branch. Inputs: `owner`, `repo`, `branch`, `from_branch` (optional). |
| `create_pull_request` | Opens a PR from a branch into a base branch. Inputs: `owner`, `repo`, `title`, `body`, `head`, `base` (optional). |

---

## Running the servers

Each server uses `StdioServerTransport` and is typically run by an MCP-compatible host (e.g. IDE or AI assistant). For a minimal direct run:

```bash
# Confluence
cd confluence_mcp && node index.js

# GitHub
cd github_mcp && node index.js
```

Refer to your MCP host’s documentation for how to register and run these servers.

## Contributing

- Fork or clone this repository.
- Create a feature branch (e.g. `feat/new-server` or `chore/maintenance-task`).
- Make your changes and add tests or examples where appropriate.
- Open a pull request against `main` with a clear description of the change.

## License

This project is licensed under the ISC license (see each server’s `package.json` for details).
