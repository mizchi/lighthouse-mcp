import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDeepAnalysisTool } from '../../src/mcp/deepAnalysisTool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadFixture(name: string) {
  const path = join(__dirname, '..', 'fixtures', `${name}.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

describe.sequential('Deep Analysis E2E', () => {
  it('produces a detailed report from fixture data', async () => {
    const fixture = loadFixture('goal-full');
    const tool = await createDeepAnalysisTool();

    const result = await tool.execute({
      reportData: fixture,
      includeChains: true,
      includeUnusedCode: true,
      maxRecommendations: 5,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();

    const textContent = Array.isArray(result.content)
      ? result.content
          .filter((item: any) => item && typeof item === 'object' && item.type === 'text')
          .map((item: any) => item.text ?? '')
          .join('\n')
      : String(result.content ?? '');

    expect(textContent).toContain('# Deep Performance Analysis');
    expect(textContent).toContain('## Performance Scores');
    expect(textContent).toContain('## Core Web Vitals');
    expect(textContent).toContain('## Prioritized Recommendations');
    expect(textContent).toContain('# Lighthouse パフォーマンス分析レポート');
  });
});
