#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { exec } from 'child_process';
import { promisify } from 'util';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// Colors for better UX
const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function ask(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

async function copyToClipboard(text) {
  try {
    // Try different clipboard commands based on platform
    if (process.platform === 'darwin') {
      await execAsync(`echo ${JSON.stringify(text)} | pbcopy`);
    } else if (process.platform === 'linux') {
      await execAsync(`echo ${JSON.stringify(text)} | xclip -selection clipboard`);
    } else if (process.platform === 'win32') {
      await execAsync(`echo ${JSON.stringify(text)} | clip`);
    }
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  log('🚀 MCP Project Template Setup', 'bold');
  log('='.repeat(40), 'cyan');

  // Read the template
  let template;
  try {
    template = readFileSync(__dirname + '/.setup/MCP-SEED-PROMPT-TEMPLATE.md', 'utf8');
  } catch (error) {
    log('❌ Error: Could not read .setup/MCP-SEED-PROMPT-TEMPLATE.md', 'red');
    log('Make sure you\'re running this from the project root directory.', 'yellow');
    process.exit(1);
  }

  log('\nI\'ll help you generate a prompt for your local LLM to create an MCP server.\n', 'green');

  // Get domain info
  const domain = await ask(colors.cyan + 'What domain/service do you want to build? (e.g., "GitHub repository management", "file processing", "API monitoring"): ' + colors.reset);

  if (!domain.trim()) {
    log('❌ Domain is required. Exiting.', 'red');
    process.exit(1);
  }

  // Get additional requirements
  const requirements = await ask(colors.cyan + 'Any specific requirements? (e.g., "needs authentication", "must handle large files", or press Enter to skip): ' + colors.reset);

  // Fill the template
  let filledTemplate = template
    .replace(/\[DOMAIN\]/g, domain)
    .replace(/\[INFO ABOUT YOUR DOMAIN HERE\]/g, domain)
    .replace(/\[ANY SPECIFIC NEEDS\]/g, requirements || 'Standard MCP server implementation');

  log('\n' + '='.repeat(60), 'green');
  log('✅ Generated your MCP project prompt!', 'bold');
  log('='.repeat(60), 'green');

  // Try to copy to clipboard
  const copied = await copyToClipboard(filledTemplate);
  if (copied) {
    log('📋 Copied to clipboard! Just paste it into your AI assistant.', 'green');
  } else {
    log('⚠️  Could not copy to clipboard. Here\'s your prompt:', 'yellow');
    log('\n' + '─'.repeat(60), 'cyan');
    console.log(filledTemplate);
    log('─'.repeat(60), 'cyan');
  }

  log('\n📝 Next steps:', 'bold');
  log('1. Paste this prompt into Claude Code, Cursor, or your favorite AI assistant');
  log('2. Your AI will generate a complete MCP server implementation');
  log('3. Follow the generated setup instructions');

  log('\n✨ Ready to generate another MCP project? Just run this script again!', 'green');
}

main().catch(error => {
  log('❌ Error: ' + error.message, 'red');
  process.exit(1);
});