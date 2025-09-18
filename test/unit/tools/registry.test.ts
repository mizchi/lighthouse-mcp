import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  initializeRegistry,
  getTool,
  getToolsByCategory,
  getToolsByTag,
  getToolsByComplexity,
  getAllToolNames,
  recommendTools,
  TOOL_CATEGORIES,
  TOOL_REGISTRY
} from '../../../src/tools/registry';

describe('Tool Registry', () => {
  beforeAll(async () => {
    await initializeRegistry();
  });

  describe('initializeRegistry', () => {
    it('should load all tools into registry', () => {
      expect(TOOL_REGISTRY.size).toBeGreaterThan(0);
    });

    it('should register tools with correct categories', () => {
      const collectionTools = getToolsByCategory('collection');
      expect(collectionTools.length).toBeGreaterThan(0);

      const performanceTools = getToolsByCategory('performance');
      expect(performanceTools.length).toBeGreaterThan(0);

      const resourceTools = getToolsByCategory('resource');
      expect(resourceTools.length).toBeGreaterThan(0);
    });

    it('should have all categories defined', () => {
      expect(TOOL_CATEGORIES).toHaveProperty('collection');
      expect(TOOL_CATEGORIES).toHaveProperty('performance');
      expect(TOOL_CATEGORIES).toHaveProperty('resource');
      expect(TOOL_CATEGORIES).toHaveProperty('issues');
      expect(TOOL_CATEGORIES).toHaveProperty('strategy');
      expect(TOOL_CATEGORIES).toHaveProperty('comparison');
    });
  });

  describe('getTool', () => {
    it('should retrieve tool by primary name', () => {
      const tool = getTool('lighthouse_collect');
      expect(tool).toBeDefined();
      expect(tool?.category).toBe('collection');
    });

    it('should retrieve tool by alias', () => {
      const tool = getTool('l1_collect');
      expect(tool).toBeDefined();
      expect(tool?.aliases).toContain('l1_collect');
    });

    it('should return undefined for unknown tool', () => {
      const tool = getTool('non_existent_tool');
      expect(tool).toBeUndefined();
    });
  });

  describe('getToolsByCategory', () => {
    it('should return all tools in a category', () => {
      const performanceTools = getToolsByCategory('performance');
      expect(performanceTools.length).toBeGreaterThan(0);
      expect(performanceTools.every(t => t.category === 'performance')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const tools = getToolsByCategory('unknown_category');
      expect(tools).toEqual([]);
    });
  });

  describe('getToolsByTag', () => {
    it('should return tools with specific tag', () => {
      const lighthouseTools = getToolsByTag('lighthouse');
      expect(lighthouseTools.length).toBeGreaterThan(0);
      expect(lighthouseTools.every(t => t.tags?.includes('lighthouse'))).toBe(true);
    });

    it('should return tools with CSS tag', () => {
      const cssTools = getToolsByTag('css');
      expect(cssTools.length).toBeGreaterThan(0);
      expect(cssTools.every(t => t.tags?.includes('css'))).toBe(true);
    });
  });

  describe('getToolsByComplexity', () => {
    it('should return basic tools', () => {
      const basicTools = getToolsByComplexity('basic');
      expect(basicTools.length).toBeGreaterThan(0);
      expect(basicTools.every(t => t.complexity === 'basic')).toBe(true);
    });

    it('should return intermediate tools', () => {
      const intermediateTools = getToolsByComplexity('intermediate');
      expect(intermediateTools.length).toBeGreaterThan(0);
      expect(intermediateTools.every(t => t.complexity === 'intermediate')).toBe(true);
    });

    it('should return advanced tools', () => {
      const advancedTools = getToolsByComplexity('advanced');
      expect(advancedTools.length).toBeGreaterThan(0);
      expect(advancedTools.every(t => t.complexity === 'advanced')).toBe(true);
    });
  });

  describe('getAllToolNames', () => {
    it('should return all tool names including aliases', () => {
      const names = getAllToolNames();
      expect(names.length).toBeGreaterThan(TOOL_REGISTRY.size);
      expect(names).toContain('lighthouse_collect');
      expect(names).toContain('l1_collect');
      expect(names).toContain('collect');
    });
  });

  describe('recommendTools', () => {
    it('should recommend performance tools for slow site', () => {
      const recommendations = recommendTools('my site is slow');
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(t => t.category === 'performance')).toBe(true);
    });

    it('should recommend CSS tools for CSS issues', () => {
      const recommendations = recommendTools('too much CSS');
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(t => t.tool.name === 'l2_unused_code')).toBe(true);
    });

    it('should recommend third-party tools for external scripts', () => {
      const recommendations = recommendTools('third party scripts blocking');
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(t => t.tool.name === 'l2_third_party_impact')).toBe(true);
    });

    it('should recommend budget tools for budget queries', () => {
      const recommendations = recommendTools('set performance budget');
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(t => t.tool.name === 'l3_performance_budget')).toBe(true);
    });

    it('should recommend comparison tools for competitive analysis', () => {
      const recommendations = recommendTools('compare with competitor');
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(t => t.category === 'comparison')).toBe(true);
    });

    it('should recommend issue tools for problem detection', () => {
      const recommendations = recommendTools('find all issues');
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(t => t.category === 'issues')).toBe(true);
    });
  });

  describe('Tool metadata', () => {
    it('should have consistent tool structure', () => {
      for (const [name, tool] of TOOL_REGISTRY) {
        expect(tool).toHaveProperty('tool');
        expect(tool).toHaveProperty('category');
        expect(tool.tool).toHaveProperty('name');
        expect(tool.tool).toHaveProperty('description');
        expect(tool.tool).toHaveProperty('execute');
        expect(tool.tool).toHaveProperty('inputSchema');
      }
    });

    it('should have valid categories', () => {
      const validCategories = Object.keys(TOOL_CATEGORIES);
      for (const [, tool] of TOOL_REGISTRY) {
        expect(validCategories).toContain(tool.category);
      }
    });

    it('should have unique primary names', () => {
      const primaryNames = new Set<string>();
      for (const [name] of TOOL_REGISTRY) {
        expect(primaryNames.has(name)).toBe(false);
        primaryNames.add(name);
      }
    });
  });

  describe('Category metadata', () => {
    it('should have complete category information', () => {
      for (const [id, category] of Object.entries(TOOL_CATEGORIES)) {
        expect(category.id).toBe(id);
        expect(category.name).toBeDefined();
        expect(category.description).toBeDefined();
        expect(category.emoji).toBeDefined();
      }
    });
  });
});