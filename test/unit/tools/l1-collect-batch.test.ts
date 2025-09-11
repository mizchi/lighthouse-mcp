/**
 * Unit tests for L1 Batch Collect Tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeL1BatchCollect, l1BatchCollectTool } from '../../../src/tools/l1-collect-batch';
import * as l1Single from '../../../src/tools/l1-collect-single';

vi.mock('../../../src/tools/l1-collect-single');

describe('L1 Batch Collect Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l1BatchCollectTool.name).toBe('l1_batch_collect');
      expect(l1BatchCollectTool.description).toContain('Batch');
      expect(l1BatchCollectTool.description).toContain('Layer 1');
      expect(l1BatchCollectTool.inputSchema.required).toContain('urls');
    });

    it('should define proper schema', () => {
      const props = l1BatchCollectTool.inputSchema.properties as any;
      expect(props.urls.type).toBe('array');
      expect(props.urls.items.type).toBe('string');
      expect(props.device.enum).toContain('mobile');
      expect(props.device.enum).toContain('desktop');
      expect(props.categories.type).toBe('array');
      expect(props.gather.type).toBe('boolean');
      expect(props.maxBrowsers.type).toBe('number');
    });
  });

  describe('executeL1BatchCollect', () => {
    const mockResult = (url: string, cached = false) => ({
      reportId: `id-${url}`,
      url,
      device: 'mobile',
      categories: ['performance'],
      timestamp: Date.now(),
      cached,
    });

    it('should collect reports for all URLs', async () => {
      const urls = ['https://example1.com', 'https://example2.com', 'https://example3.com'];
      
      vi.spyOn(l1Single, 'executeL1Collect')
        .mockImplementation(async ({ url }) => mockResult(url));

      const result = await executeL1BatchCollect({
        urls,
        device: 'mobile',
        categories: ['performance'],
      });

      expect(result.reports).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(l1Single.executeL1Collect).toHaveBeenCalledTimes(3);
      
      urls.forEach((url, index) => {
        expect(l1Single.executeL1Collect).toHaveBeenNthCalledWith(index + 1, {
          url,
          device: 'mobile',
          categories: ['performance'],
          gather: false,
        });
      });
    });

    it('should handle mixed success and failure', async () => {
      const urls = ['https://success.com', 'https://fail.com', 'https://success2.com'];
      
      vi.spyOn(l1Single, 'executeL1Collect')
        .mockImplementation(async ({ url }) => {
          if (url.includes('fail')) {
            throw new Error(`Failed to collect ${url}`);
          }
          return mockResult(url);
        });

      const result = await executeL1BatchCollect({ urls });

      expect(result.reports).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toEqual({
        url: 'https://fail.com',
        error: 'Failed to collect https://fail.com',
      });
    });

    it('should pass gather flag correctly', async () => {
      const urls = ['https://example.com'];
      vi.spyOn(l1Single, 'executeL1Collect').mockResolvedValue(mockResult(urls[0]));

      await executeL1BatchCollect({
        urls,
        gather: true,
      });

      expect(l1Single.executeL1Collect).toHaveBeenCalledWith(
        expect.objectContaining({
          gather: true,
        })
      );
    });

    it('should handle empty URL list', async () => {
      const result = await executeL1BatchCollect({ urls: [] });
      
      expect(result.reports).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(l1Single.executeL1Collect).not.toHaveBeenCalled();
    });

    it('should preserve device and categories settings', async () => {
      const urls = ['https://example.com'];
      vi.spyOn(l1Single, 'executeL1Collect').mockResolvedValue(mockResult(urls[0]));

      await executeL1BatchCollect({
        urls,
        device: 'desktop',
        categories: ['performance', 'seo', 'accessibility'],
      });

      expect(l1Single.executeL1Collect).toHaveBeenCalledWith({
        url: urls[0],
        device: 'desktop',
        categories: ['performance', 'seo', 'accessibility'],
        gather: false,
      });
    });

    it('should handle non-Error exceptions', async () => {
      const urls = ['https://example.com'];
      
      vi.spyOn(l1Single, 'executeL1Collect')
        .mockRejectedValue('String error');

      const result = await executeL1BatchCollect({ urls });

      expect(result.failed[0]).toEqual({
        url: urls[0],
        error: 'String error',
      });
    });
  });
});