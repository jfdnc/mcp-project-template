# MCP Project Template

Spin up a production-ready MCP server via cli helper, optionally ingest your project planning doc.

## What's This?

This repo contains everything you need to prompt a local LLM (like Claude Code) to generate a complete MCP server from scratch. Think of it as a smart template that your AI assistant can read and implement.

### Default project layout:
```
project-root/
├── src/
│   ├── core/
│   │   ├── server.js          # Enhanced MCP server with middleware
│   │   ├── client.js          # MCP client with retry logic
│   │   ├── middleware.js      # Request/response interceptors
│   │   └── base-tool.js       # Base tool class
│   ├── tools/
│   │   ├── registry.js        # Tool registry with versioning
│   │   ├── index.js           # Tool exports
│   │   └── [domain]/          # Domain-specific tools
│   │       └── [tool-name].js
│   ├── services/              # Business logic
│   ├── config/
│   │   ├── index.js           # Configuration management
│   │   └── schemas.js         # Config validation
│   ├── errors/
│   │   └── index.js           # Error taxonomy
│   ├── observability/
│   │   ├── logger.js          # Structured logging
│   │   └── metrics.js         # Metrics collection
│   └── utils/
│       └── validation.js      # Shared validators
├── test/
│   ├── fixtures/
│   └── test-utils.js          # Testing utilities
├── examples/                  # Example implementations
├── package.json
├── tsconfig.json             # Optional TypeScript config
└── .env.example
```

## The Pieces

- **[MCP-PROJECT-TEMPLATE.md](./.setup/MCP-PROJECT-TEMPLATE.md)** - The full architectural blueprint with code examples
  - Code entities intentionally live in this doc rather than being pre-made at the root so you can configure via consulting with your LLM assistant on parts you do and don't want to generate.
- **[MCP-SEED-PROMPT-TEMPLATE.md](./.setup/MCP-SEED-PROMPT-TEMPLATE.md)** - A fill-in-the-blank prompt template
- **[MCP-SEED-PROMPT-EXAMPLES.md](./.setup/MCP-SEED-PROMPT-EXAMPLES.md)** - Real examples of prompts that work
- **[setup.js](.setup/setup.js)** - Interactive CLI to generate custom prompt.

## How to Use

0. **(Optional) Planning doc setup** - Fill out [planning.md](./planning.md) with your MCP project details
1. **Run the setup CLI** - `npm run setup` (or `npm start`)
2. **Answer the prompts** - Tell it what domain you want to build and any specific requirements
3. **Get your custom prompt** - The CLI generates a tailored prompt and copies it to your clipboard
4. **Feed it to your LLM** - Paste into Claude Code, Cursor, or whatever local AI you're using
5. **Get a working MCP server** - Your AI will generate a complete implementation following the production-ready patterns

## Why This Is Helpful

Instead of starting from scratch, your LLM gets:
- A complete architectural pattern with middleware, error handling, and observability
- Working code examples for tools, services, and configuration
- Testing utilities and best practices
- Clear patterns for scaling and maintaining the codebase

## Quick Start

**Option 1: Use the CLI (recommended)**
```bash
# Run the setup script
npm run setup

# Or if you install globally:
npm install -g .
mcp-setup
```

**Option 2: Manual setup**
```bash
# Copy the seed prompt template
cp .setup/MCP-SEED-PROMPT-TEMPLATE.md my-prompt.md

# Edit it with your domain info
# Then paste the whole thing into your AI assistant
```

This will allow your LLM assistant to generate a complete MCP server with proper structure, error handling, and all the production-ready stuff you'd want but don't want to write by hand.

## Examples

Check out [MCP-SEED-PROMPT-EXAMPLES.md](./.setup/MCP-SEED-PROMPT-EXAMPLES.md) for specific prompts that generate:
- GitHub repo management servers
- Data processing pipelines  
- File system automation
- API monitoring tools
- Multi-service integrations

The template handles the scaffolding. You focus on the business logic.

## TODO
- [ ] TypeScript template
- [ ] Other language templates
  - [ ] Extend setup script to nuke node-specific parts for non-JS projects
