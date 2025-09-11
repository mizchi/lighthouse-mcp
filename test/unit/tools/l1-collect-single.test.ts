/**
 * Unit tests for L1 Collect Single Tool
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeL1Collect, l1CollectTool } from '../../../src/tools/l1-collect-single';
import * as lighthouse from '../../../src/core/lighthouse';
import * as reportStorage from '../../../src/core/reportStorage';
import { ok, err } from 'neverthrow';

vi.mock('../../../src/core/lighthouse');
vi.mock('../../../src/core/reportStorage');

describe('L1 Collect Single Tool', () => {
  const mockStorage = {
    findReport: vi.fn(),
    getAllReports: vi.fn(),
    saveReport: vi.fn(),
    loadReport: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reportStorage, 'getDefaultStorage').mockReturnValue(mockStorage as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l1CollectTool.name).toBe('l1_collect');
      expect(l1CollectTool.description).toContain('Layer 1');
      expect(l1CollectTool.inputSchema.required).toContain('url');
    });

    it('should define proper schema', () => {
      const props = l1CollectTool.inputSchema.properties as any;
      expect(props.url.type).toBe('string');
      expect(props.device.enum).toContain('mobile');
      expect(props.device.enum).toContain('desktop');
      expect(props.categories.type).toBe('array');
      expect(props.gather.type).toBe('boolean');
      expect(props.timeout.type).toBe('number');
    });
  });

  describe('executeL1Collect', () => {
    const validUrl = 'https://example.com';
    const mockReport = {
      finalUrl: validUrl,
      requestedUrl: validUrl,
      audits: {},
      categories: {},
    };

    describe('URL Validation', () => {
      it('should reject invalid URLs', async () => {
        await expect(executeL1Collect({ url: 'not-a-url' })).rejects.toThrow(
          'Invalid URL format'
        );
      });

      it('should accept valid URLs', async () => {
        mockStorage.findReport.mockReturnValue(err(new Error('Not found')));
        vi.spyOn(lighthouse, 'runLighthouse').mockResolvedValue(ok(mockReport as any));
        mockStorage.getAllReports.mockReturnValue(ok([{
          id: 'test-id',
          url: validUrl,
          device: 'mobile',
          categories: ['performance'],
          timestamp: Date.now(),
        }]));

        await expect(executeL1Collect({ url: validUrl })).resolves.toBeDefined();
      });
    });

    describe('Cache Behavior', () => {
      it('should use cached report when gather=false', async () => {
        const cachedReport = {
          id: 'cached-id',
          url: validUrl,
          device: 'mobile',
          categories: ['performance'],
          timestamp: Date.now() - 1000,
        };

        mockStorage.findReport.mockReturnValue(ok(cachedReport));

        const result = await executeL1Collect({
          url: validUrl,
          gather: false,
        });

        expect(result.cached).toBe(true);
        expect(result.reportId).toBe('cached-id');
        expect(lighthouse.runLighthouse).not.toHaveBeenCalled();
      });

      it('should force new collection when gather=true', async () => {
        const cachedReport = {
          id: 'cached-id',
          url: validUrl,
          device: 'mobile',
          categories: ['performance'],
          timestamp: Date.now() - 1000,
        };

        mockStorage.findReport.mockReturnValue(ok(cachedReport));
        vi.spyOn(lighthouse, 'runLighthouse').mockResolvedValue(ok(mockReport as any));
        mockStorage.getAllReports.mockReturnValue(ok([{
          id: 'new-id',
          url: validUrl,
          device: 'mobile',
          categories: ['performance'],
          timestamp: Date.now(),
        }]));

        const result = await executeL1Collect({
          url: validUrl,
          gather: true,
        });

        expect(result.cached).toBe(false);
        expect(result.reportId).toBe('new-id');
        expect(lighthouse.runLighthouse).toHaveBeenCalled();
      });
    });

    describe('Lighthouse Execution', () => {
      beforeEach(() => {
        mockStorage.findReport.mockReturnValue(ok(null));
      });

      it('should run Lighthouse with correct config', async () => {
        vi.spyOn(lighthouse, 'runLighthouse').mockResolvedValue(ok(mockReport as any));
        mockStorage.getAllReports.mockReturnValue(ok([{
          id: 'test-id',
          url: validUrl,
          device: 'desktop',
          categories: ['performance', 'seo'],
          timestamp: Date.now(),
        }]));

        await executeL1Collect({
          url: validUrl,
          device: 'desktop',
          categories: ['performance', 'seo'],
          timeout: 60000,
        });

        expect(lighthouse.runLighthouse).toHaveBeenCalledWith(
          validUrl,
          expect.objectContaining({
            device: 'desktop',
            categories: ['performance', 'seo'],
            timeout: 60000,
            gather: true,
          })
        );
      });

      it('should handle Lighthouse failures', async () => {
        vi.spyOn(lighthouse, 'runLighthouse').mockResolvedValue(
          err(new Error('Lighthouse error'))
        );

        await expect(executeL1Collect({ url: validUrl })).rejects.toThrow(
          'Lighthouse failed: Lighthouse error'
        );
      });

      it('should handle missing saved report', async () => {
        vi.spyOn(lighthouse, 'runLighthouse').mockResolvedValue(ok(mockReport as any));
        mockStorage.getAllReports.mockReturnValue(ok([]));

        await expect(executeL1Collect({ url: validUrl })).rejects.toThrow(
          'Report was not saved properly'
        );
      });
    });

    describe('Result Format', () => {
      it('should return correct result structure', async () => {
        const timestamp = Date.now();
        mockStorage.findReport.mockReturnValue(ok(null));
        vi.spyOn(lighthouse, 'runLighthouse').mockResolvedValue(ok(mockReport as any));
        mockStorage.getAllReports.mockReturnValue(ok([{
          id: 'result-id',
          url: validUrl,
          device: 'mobile',
          categories: ['performance'],
          timestamp,
        }]));

        const result = await executeL1Collect({
          url: validUrl,
          device: 'mobile',
          categories: ['performance'],
        });

        expect(result).toEqual({
          reportId: 'result-id',
          url: validUrl,
          device: 'mobile',
          categories: ['performance'],
          timestamp,
          cached: false,
        });
      });
    });
  });
});