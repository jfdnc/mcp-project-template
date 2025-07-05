# MCP Project Generation Prompts

Here are some effective prompts to generate working MCP projects from [the project template](./MCP-PROJECT-TEMPLATE.md). Check out [the seed prompt template](./MCP-SEED-PROMPT-TEMPLATE.md) to get your local codegen assistant (Claude Code, etc), to help spin up a template for your application:

## Basic Project Generation

### 1. Domain-Specific MCP Server
```markdown
Using the MCP template provided, create a working MCP server for managing GitHub repositories.

**Tools needed:**
- `listRepos`: List user's repositories with filtering options
- `createRepo`: Create a new repository
- `deleteRepo`: Delete a repository (with confirmation)
- `getRepoStats`: Get statistics for a repository

Use the GitHub REST API. Each tool should follow the BaseTool pattern from the template. Include proper error handling and rate limiting.
```

### 2. Integration-Focused Project
```markdown
Based on the MCP template, build an MCP server that integrates Slack and Google Calendar.

**Requirements:**
- Tool to post Slack messages to specific channels
- Tool to create calendar events from Slack message content
- Tool to list today's calendar events and post summary to Slack
- Composition tool that chains the above operations

Follow the template's service pattern for Slack/Google API abstractions. Include OAuth token management in the config.
```

## Advanced Generation Prompts

### 3. Full-Stack with Client Usage
```markdown
Create a complete MCP project using the template for a personal task automation system:

**Server tools:**
- File system operations (read, write, move files)
- Process execution with timeout
- Schedule tasks with cron expressions

**Also create:**
- A CLI client using the MCPClient from the template
- Example scripts showing tool composition
- Docker setup for deployment
- Integration tests using the test utilities

Ensure all tools extend BaseTool and implement proper permissions.
```

### 4. Data Processing Pipeline
```markdown
Using the MCP template, implement a data processing pipeline MCP server:

**Core tools:**
- `csvImport`: Import CSV with schema validation
- `dataTransform`: Apply transformations (filter, map, aggregate)
- `exportData`: Export to multiple formats (JSON, CSV, Parquet)
- `schedulePipeline`: Schedule recurring pipelines

**Additional requirements:**
- Use the action queue pattern from the template for pipeline execution
- Implement progress tracking via observability metrics
- Add resume capability for failed pipelines
- Tool composition for multi-step pipelines

Include example pipelines in the examples/ directory.
```

## Specific Pattern Implementation

### 5. Middleware-Focused Implementation
```markdown
Create an MCP server for API monitoring using the template:

**Base tools:**
- `addEndpoint`: Register API endpoint to monitor
- `checkHealth`: Perform health check
- `getMetrics`: Retrieve monitoring metrics

**Middleware requirements:**
- Custom middleware for API key validation
- Caching middleware for metrics (5-minute TTL)
- Circuit breaker middleware for failing endpoints
- Audit logging middleware for all tool calls

Show how each middleware integrates with the registry pattern.
```

### 6. Migration from Existing Code
```markdown
I have this existing code for managing AWS resources:
```
[paste existing code]
```

Refactor this into an MCP server using the provided template:
- Extract each function as a separate tool extending BaseTool
- Move AWS SDK calls to services/aws.js
- Add proper error handling using the error taxonomy
- Implement retry logic for transient AWS errors
- Add CloudWatch metrics integration
- Create comprehensive tests using test-utils.js
```

## Targeted Component Generation

### 7. Tool-Specific Generation
```markdown
Using the BaseTool class from the template, create a tool for:

**Name:** `generateReport`
**Description:** Generate PDF reports from JSON data

**Input schema:**
- `templateId`: string (required)
- `data`: object (required)
- `format`: enum ['pdf', 'html'] (optional, default: pdf)
- `options`: object with pageSize, margins (optional)

**Requirements:**
- 10-second timeout for generation
- Rate limit: 10 reports per minute
- Permissions: ['reports:generate']
- Store generated reports in services/storage.js
- Return signed URL valid for 1 hour
```

### 8. Service Layer Generation
```markdown
Create a service module (`src/services/database.js`) following the template pattern:

**Requirements:**
- PostgreSQL connection pooling
- Query builder abstraction
- Transaction support
- Migration runner
- Query result caching

**Then create these tools using the service:**
- `executeQuery`: Run parameterized queries
- `beginTransaction`/`commitTransaction`/`rollbackTransaction`
- `runMigrations`: Execute pending migrations

Follow the platform abstraction pattern from the template.
```

## Testing-Focused Prompts

### 9. Test Suite Generation
```markdown
Using the test utilities from the template, create comprehensive tests for an email MCP server with these tools:
- `sendEmail`
- `getInbox`
- `markAsRead`

**Test requirements:**
- Unit tests for each tool's execute method
- Integration tests using MockMCPServer
- Error scenario tests (network failures, invalid recipients)
- Rate limit testing
- Permission testing
- Performance benchmarks
```

## Configuration Variants

### 10. Multi-Environment Setup
```markdown
Extend the template's configuration system for a payment processing MCP server:

**Environments needed:**
- Development (mock payment provider)
- Staging (test payment credentials)
- Production (live credentials with stricter rate limits)

**Tools:** `processPayment`, `refundPayment`, `getTransactionStatus`

**Show how to:**
- Structure environment-specific configs
- Implement provider abstraction in services/
- Add appropriate middleware for each environment
- Setup monitoring differently per environment
```

## Best Prompt Practices

1. **Specify the domain clearly** - Be explicit about what the MCP server will do
2. **List specific tools** - Name each tool and its basic function
3. **Include constraints** - Mention rate limits, timeouts, permissions
4. **Reference template patterns** - "Follow the BaseTool pattern", "Use the service abstraction"
5. **Request examples** - Ask for example usage or test cases
6. **Specify integrations** - Name external services/APIs to integrate
