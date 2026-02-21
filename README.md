# MCP Servers

This repository contains Model Context Protocol (MCP) servers. At the moment it includes a Confluence MCP server under `confluence_mcp/`.

## Project structure

- `confluence_mcp/`
  - `package.json` – Node package definition for the Confluence MCP server
  - `package-lock.json` – Locked dependency tree for reproducible installs
  - `index.js` – MCP server implementation that exposes Confluence search capabilities
- `.gitignore` – Standard Git ignore rules

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

## Getting started

### Prerequisites

- Node.js (recommended: LTS version)
- Access to an Atlassian Confluence instance
- A Confluence API token

### Installation

From the repository root:

```bash
cd confluence_mcp
npm install
```

### Configuration

The server reads configuration from environment variables (typically via a `.env` file in `confluence_mcp/`). The following variables are expected:

- `CONFLUENCE_BASE_URL` – Base URL of your Confluence site, e.g. `https://your-domain.atlassian.net`
- `CONFLUENCE_EMAIL` – Email address associated with your Atlassian account
- `CONFLUENCE_API_TOKEN` – API token generated for your Atlassian account

Example `.env` file:

```env
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net
CONFLUENCE_EMAIL=you@example.com
CONFLUENCE_API_TOKEN=your-api-token
```

### Running the server

The server is implemented in `confluence_mcp/index.js` and uses `StdioServerTransport` from the MCP SDK, so it is typically run by an MCP-compatible host (such as an IDE or AI assistant) rather than directly.

A minimal direct run (for testing) could look like:

```bash
cd confluence_mcp
node index.js
```

Refer to your MCP host’s documentation for how to register this server.

## `search_confluence` tool

The `search_confluence` tool is registered on the MCP server with the following behavior:

- **Inputs**:
  - `pageId` (string, optional) – ID of a Confluence page to fetch
  - `query` (string, optional) – Search keywords for Confluence
  - `limit` (number, optional) – Maximum number of search results (default: 10)
- **Constraints**:
  - You must provide **either** `pageId` **or** `query` (if neither is provided, the server throws an error).

When called:

- If `pageId` is provided, the server fetches that specific page’s content from Confluence and returns it via the MCP protocol.
- If `query` is provided, the server performs a search against Confluence, builds a list of result objects (including `id`, `title`, `url`, and an excerpt), and returns them as JSON text.

## Contributing

- Fork or clone this repository.
- Create a feature branch (e.g. `feat/new-server` or `chore/maintenance-task`).
- Make your changes and add tests or examples where appropriate.
- Open a pull request against `main` with a clear description of the change.

## License

This project is licensed under the ISC license (see `confluence_mcp/package.json` for details).