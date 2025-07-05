# MCP Project Template v2

A production-ready architecture pattern for building robust Model Context Protocol (MCP) projects with proper error handling, observability, and scalability.

## Core Architecture

### Project Structure

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

## Key Components

### 1. Enhanced Tool Registry (`src/tools/registry.js`)

```javascript
import { logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.versions = new Map();
    this.middleware = [];
  }

  register(tool) {
    const { name, version = '1.0.0' } = tool;
    
    // Version tracking
    if (this.tools.has(name)) {
      const existingVersion = this.tools.get(name).version;
      logger.warn(`Overriding tool ${name} v${existingVersion} with v${version}`);
    }
    
    this.tools.set(name, tool);
    this.versions.set(`${name}@${version}`, tool);
    
    logger.info(`Registered tool: ${name} v${version}`);
    return this;
  }

  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }

  async execute(toolName, args, context = {}) {
    const tool = this.tools.get(toolName);
    if (!tool) throw new ToolNotFoundError(toolName);
    
    // Apply middleware chain
    let handler = tool.handler;
    for (const mw of this.middleware.reverse()) {
      handler = mw(handler, tool);
    }
    
    const startTime = Date.now();
    try {
      const result = await handler(args, context);
      metrics.toolCalls.inc({ tool: toolName, status: 'success' });
      metrics.toolDuration.observe({ tool: toolName }, Date.now() - startTime);
      return result;
    } catch (error) {
      metrics.toolCalls.inc({ tool: toolName, status: 'error' });
      throw error;
    }
  }

  getTools() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      version: tool.version,
      description: tool.description,
      deprecated: tool.deprecated || false,
      schema: tool.schema
    }));
  }
}

export const registry = new ToolRegistry();
```

### 2. Base Tool Class (`src/core/base-tool.js`)

```javascript
import { z } from 'zod';
import { MCPError } from '../errors/index.js';

export class BaseTool {
  constructor(config) {
    this.name = config.name;
    this.version = config.version || '1.0.0';
    this.description = config.description;
    this.deprecated = config.deprecated || false;
    this.schema = config.schema;
    this.permissions = config.permissions || [];
    this.rateLimit = config.rateLimit || null;
    this.timeout = config.timeout || 30000;
  }

  // Pure function to be implemented by tools
  async execute(args, context) {
    throw new Error('execute() must be implemented');
  }

  // MCP handler with validation and error handling
  get handler() {
    return async (args, context = {}) => {
      try {
        // Validate input
        const validated = this.schema ? this.schema.parse(args) : args;
        
        // Check permissions
        if (this.permissions.length > 0) {
          await this.checkPermissions(context);
        }
        
        // Execute with timeout
        const result = await this.withTimeout(
          this.execute(validated, context),
          this.timeout
        );
        
        return {
          content: [{ 
            type: "text", 
            text: typeof result === 'string' ? result : JSON.stringify(result)
          }],
          metadata: { version: this.version }
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new MCPError('Validation failed', 'VALIDATION_ERROR', error.errors);
        }
        throw error;
      }
    };
  }

  async checkPermissions(context) {
    // Override in subclasses
  }

  async withTimeout(promise, ms) {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new MCPError('Tool timeout', 'TIMEOUT')), ms)
    );
    return Promise.race([promise, timeout]);
  }

  toMCPDefinition() {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.schema?.shape || {},
      handler: this.handler
    };
  }
}
```

### 3. Middleware System (`src/core/middleware.js`)

```javascript
import { logger } from '../observability/logger.js';

// Logging middleware
export const withLogging = (handler, tool) => async (args, context) => {
  const requestId = context.requestId || crypto.randomUUID();
  logger.info('Tool invocation', { tool: tool.name, args, requestId });
  
  try {
    const result = await handler(args, context);
    logger.info('Tool success', { tool: tool.name, requestId });
    return result;
  } catch (error) {
    logger.error('Tool error', { tool: tool.name, error: error.message, requestId });
    throw error;
  }
};

// Rate limiting middleware
export const withRateLimit = (handler, tool) => {
  const limits = new Map();
  
  return async (args, context) => {
    if (!tool.rateLimit) return handler(args, context);
    
    const key = context.userId || 'anonymous';
    const now = Date.now();
    const windowStart = now - tool.rateLimit.window;
    
    const requests = limits.get(key) || [];
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= tool.rateLimit.max) {
      throw new MCPError('Rate limit exceeded', 'RATE_LIMIT');
    }
    
    recentRequests.push(now);
    limits.set(key, recentRequests);
    
    return handler(args, context);
  };
};

// Retry middleware
export const withRetry = (handler, tool) => async (args, context) => {
  const maxRetries = context.maxRetries || 3;
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await handler(args, context);
    } catch (error) {
      lastError = error;
      if (i < maxRetries && error.retryable !== false) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError;
};
```

### 4. Enhanced MCP Server (`src/core/server.js`)

```javascript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registry } from "../tools/registry.js";
import { config } from "../config/index.js";
import { logger } from "../observability/logger.js";
import { withLogging, withRateLimit, withRetry } from "./middleware.js";

export class MCPServer {
  constructor(options = {}) {
    this.server = new McpServer({
      name: options.name || config.server.name,
      version: options.version || config.server.version,
      capabilities: { tools: {} },
    });
    
    this.setupMiddleware();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    registry
      .use(withLogging)
      .use(withRateLimit)
      .use(withRetry);
  }

  setupErrorHandling() {
    process.on('unhandledRejection', (error) => {
      logger.error('Unhandled rejection', { error });
    });
    
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await this.shutdown();
    });
  }

  registerTools() {
    const tools = registry.getTools();
    
    tools.forEach(tool => {
      if (tool.deprecated && !config.server.allowDeprecated) {
        logger.warn(`Skipping deprecated tool: ${tool.name}`);
        return;
      }
      
      this.server.tool(
        tool.name,
        tool.description,
        tool.schema,
        async (args) => registry.execute(tool.name, args)
      );
    });
    
    logger.info(`Registered ${tools.length} tools`);
  }

  async start() {
    this.registerTools();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logger.info('MCP Server started', {
      name: config.server.name,
      version: config.server.version,
      tools: registry.getTools().length
    });
  }

  async shutdown() {
    // Cleanup logic
    logger.info('Server shutdown complete');
    process.exit(0);
  }
}
```

### 5. Configuration Management (`src/config/index.js`)

```javascript
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  server: z.object({
    name: z.string().default('mcp-server'),
    version: z.string().default('1.0.0'),
    timeout: z.number().default(30000),
    allowDeprecated: z.boolean().default(false),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    format: z.enum(['json', 'pretty']).default('json'),
  }),
  metrics: z.object({
    enabled: z.boolean().default(true),
    port: z.number().default(9090),
  }),
  development: z.object({
    hotReload: z.boolean().default(false),
    debugMode: z.boolean().default(false),
  }),
});

const rawConfig = {
  server: {
    name: process.env.MCP_SERVER_NAME,
    version: process.env.MCP_VERSION,
    timeout: Number(process.env.MCP_TIMEOUT),
    allowDeprecated: process.env.MCP_ALLOW_DEPRECATED === 'true',
  },
  logging: {
    level: process.env.LOG_LEVEL,
    format: process.env.LOG_FORMAT,
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    port: Number(process.env.METRICS_PORT),
  },
  development: {
    hotReload: process.env.HOT_RELOAD === 'true',
    debugMode: process.env.DEBUG === 'true',
  },
};

export const config = configSchema.parse(rawConfig);
```

### 6. Error Taxonomy (`src/errors/index.js`)

```javascript
export class MCPError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.retryable = details.retryable ?? true;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

export class ToolNotFoundError extends MCPError {
  constructor(toolName) {
    super(`Tool not found: ${toolName}`, 'TOOL_NOT_FOUND', { toolName, retryable: false });
  }
}

export class ValidationError extends MCPError {
  constructor(errors) {
    super('Validation failed', 'VALIDATION_ERROR', { errors, retryable: false });
  }
}

export class PermissionError extends MCPError {
  constructor(permission) {
    super('Permission denied', 'PERMISSION_DENIED', { permission, retryable: false });
  }
}

export class TimeoutError extends MCPError {
  constructor(timeout) {
    super(`Operation timed out after ${timeout}ms`, 'TIMEOUT', { timeout });
  }
}
```

### 7. Tool Implementation Example (`src/tools/example/data-processor.js`)

```javascript
import { BaseTool } from '../../core/base-tool.js';
import { z } from 'zod';

class DataProcessorTool extends BaseTool {
  constructor() {
    super({
      name: 'processData',
      version: '2.0.0',
      description: 'Process data with advanced options',
      schema: z.object({
        data: z.array(z.any()),
        operation: z.enum(['filter', 'map', 'reduce']),
        options: z.object({
          field: z.string().optional(),
          value: z.any().optional(),
        }).optional(),
      }),
      permissions: ['data:read', 'data:write'],
      rateLimit: { max: 100, window: 60000 }, // 100 req/min
      timeout: 5000,
    });
  }

  async execute({ data, operation, options }, context) {
    // Business logic implementation
    switch (operation) {
      case 'filter':
        return data.filter(item => item[options.field] === options.value);
      case 'map':
        return data.map(item => item[options.field]);
      case 'reduce':
        return data.reduce((acc, item) => acc + (item[options.field] || 0), 0);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
}

// Export for registry
export const dataProcessorTool = new DataProcessorTool();

// Export pure function for composition
export const processDataFunc = (args) => dataProcessorTool.execute(args);
```

### 8. Testing Utilities (`test/test-utils.js`)

```javascript
import { MCPServer } from '../src/core/server.js';
import { registry } from '../src/tools/registry.js';

export class MockMCPServer {
  constructor() {
    this.tools = new Map();
    this.calls = [];
  }

  registerTool(tool) {
    this.tools.set(tool.name, tool);
  }

  async callTool(name, args) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    
    this.calls.push({ tool: name, args, timestamp: Date.now() });
    return tool.handler(args, { test: true });
  }

  getCalls(toolName) {
    return this.calls.filter(call => call.tool === toolName);
  }

  reset() {
    this.calls = [];
  }
}

export const createTestContext = (overrides = {}) => ({
  requestId: 'test-request-id',
  userId: 'test-user',
  test: true,
  ...overrides,
});

export const waitForCondition = async (condition, timeout = 5000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return true;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timeout waiting for condition');
};
```

### 9. Observability (`src/observability/logger.js`)

```javascript
import winston from 'winston';
import { config } from '../config/index.js';

const format = config.logging.format === 'json'
  ? winston.format.json()
  : winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    );

export const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    format
  ),
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
});

// Development mode enhancements
if (config.development.debugMode) {
  logger.add(new winston.transports.File({ 
    filename: 'debug.log',
    level: 'debug' 
  }));
}
```

### 10. Main Entry Point (`src/main.js`)

```javascript
#!/usr/bin/env node
import { MCPServer } from './core/server.js';
import { logger } from './observability/logger.js';

// Import and register all tools
import './tools/index.js';

async function main() {
  try {
    const server = new MCPServer();
    await server.start();
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Handle process errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

main();
```

## Usage Guide

### 1. Quick Start

```bash
# Clone template
git clone <template-repo> my-mcp-project
cd my-mcp-project

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run in development
npm run dev

# Run tests
npm test
```

### 2. Adding a New Tool

```javascript
// src/tools/my-domain/my-tool.js
import { BaseTool } from '../../core/base-tool.js';
import { z } from 'zod';

class MyTool extends BaseTool {
  constructor() {
    super({
      name: 'myTool',
      description: 'Tool description',
      schema: z.object({
        param: z.string(),
      }),
    });
  }

  async execute({ param }) {
    // Implementation
    return `Result: ${param}`;
  }
}

export const myTool = new MyTool();
```

```javascript
// src/tools/index.js
import { registry } from './registry.js';
import { myTool } from './my-domain/my-tool.js';

registry.register(myTool);
```

### 3. TypeScript Support

```typescript
// src/tools/types.ts
import { z } from 'zod';

export interface ToolContext {
  requestId: string;
  userId?: string;
  permissions?: string[];
}

export interface ToolDefinition<T extends z.ZodType> {
  name: string;
  version?: string;
  description: string;
  schema: T;
  execute: (args: z.infer<T>, context: ToolContext) => Promise<any>;
}
```

### 4. Development Workflow

```json
// package.json scripts
{
  "scripts": {
    "dev": "nodemon --exec node src/main.js",
    "start": "node src/main.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  }
}
```

## Best Practices

### Tool Design
- Keep tools focused on single responsibilities
- Use composition for complex workflows
- Version tools when making breaking changes

### Error Handling
- Use specific error types
- Include actionable error messages
- Set retryable appropriately

### Performance
- Set appropriate timeouts
- Implement rate limiting for expensive operations
- Use connection pooling for external services

### Security
- Validate all inputs
- Implement permission checks
- Sanitize outputs
- Never expose sensitive configuration

### Testing
- Test pure functions separately from MCP layer
- Use mock server for integration tests
- Test error scenarios and edge cases

This template provides a production-ready foundation for MCP projects with proper structure, error handling, observability, and scalability built in.