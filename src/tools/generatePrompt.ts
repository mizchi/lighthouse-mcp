/**
 * Generate Prompt Tool - Create initial analysis prompts for URLs
 */

import { generateMCPInitialPrompt } from '../prompts/lhUsages.js';

export interface GeneratePromptParams {
  url: string;
}

export interface GeneratePromptResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Tool definition for MCP
 */
export const generatePromptTool = {
  name: 'generate_prompt',
  description: 'Generate initial analysis prompt for a URL',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to generate prompt for',
      },
    },
    required: ['url'],
  },
};

/**
 * Execute the generate_prompt tool
 */
export async function executeGeneratePrompt(params: GeneratePromptParams): Promise<GeneratePromptResult> {
  const { url } = params;

  if (!url) {
    throw new Error('URL is required for prompt generation');
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL format: ${url}`);
  }

  const prompt = generateMCPInitialPrompt(url);

  return {
    content: [
      {
        type: 'text',
        text: prompt,
      },
    ],
  };
}