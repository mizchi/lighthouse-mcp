/**
 * Unit tests for L1 List Reports Tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeL1ListReports, l1ListReportsTool } from '../../../src/tools/l1-list-reports';
import * as reportStorage from '../../../src/core/reportStorage';
import { ok, err } from 'neverthrow';

vi.mock('../../../src/core/reportStorage');

describe('L1 List Reports Tool', () => {
  const mockStorage = {
    getAllReports: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reportStorage, 'getDefaultStorage').mockReturnValue(mockStorage as any);
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l1ListReportsTool.name).toBe('l1_list_reports');
      expect(l1ListReportsTool.description).toContain('List');
      expect(l1ListReportsTool.description).toContain('Layer 1');
    });

    it('should define proper schema', () => {
      const props = l1ListReportsTool.inputSchema.properties as any;
      expect(props.url.type).toBe('string');
      expect(props.device.enum).toContain('mobile');
      expect(props.device.enum).toContain('desktop');
      expect(props.limit.type).toBe('number');
      expect(props.limit.default).toBe(10);
    });
  });

  describe('executeL1ListReports', () => {
    const now = Date.now();
    const mockReports = [
      {
        id: 'report-1',
        url: 'https://example1.com',
        device: 'mobile',
        categories: ['performance'],
        timestamp: now - 1000 * 60 * 5, // 5 minutes ago
      },
      {
        id: 'report-2',
        url: 'https://example2.com',
        device: 'desktop',
        categories: ['performance', 'seo'],
        timestamp: now - 1000 * 60 * 65, // 65 minutes ago
      },
      {
        id: 'report-3',
        url: 'https://example1.com',
        device: 'desktop',
        categories: ['accessibility'],
        timestamp: now - 1000 * 60 * 130, // 130 minutes ago
      },
    ];

    it('should list all reports without filters', async () => {
      mockStorage.getAllReports.mockReturnValue(ok([...mockReports]));

      const result = await executeL1ListReports({});

      expect(result.total).toBe(3);
      expect(result.reports).toHaveLength(3);
      expect(result.reports[0].id).toBe('report-1');
      expect(result.reports[0].age).toBe('5m');
      expect(result.reports[1].age).toBe('1h 5m');
      expect(result.reports[2].age).toBe('2h 10m');
    });

    it('should filter by URL', async () => {
      mockStorage.getAllReports.mockReturnValue(ok([...mockReports]));

      const result = await executeL1ListReports({
        url: 'https://example1.com',
      });

      expect(result.total).toBe(2);
      expect(result.reports).toHaveLength(2);
      expect(result.reports.every(r => r.url === 'https://example1.com')).toBe(true);
    });

    it('should filter by device', async () => {
      mockStorage.getAllReports.mockReturnValue(ok([...mockReports]));

      const result = await executeL1ListReports({
        device: 'desktop',
      });

      expect(result.total).toBe(2);
      expect(result.reports).toHaveLength(2);
      expect(result.reports.every(r => r.device === 'desktop')).toBe(true);
    });

    it('should combine filters', async () => {
      mockStorage.getAllReports.mockReturnValue(ok([...mockReports]));

      const result = await executeL1ListReports({
        url: 'https://example1.com',
        device: 'desktop',
      });

      expect(result.total).toBe(1);
      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].id).toBe('report-3');
    });

    it('should respect limit parameter', async () => {
      mockStorage.getAllReports.mockReturnValue(ok([...mockReports]));

      const result = await executeL1ListReports({
        limit: 2,
      });

      expect(result.total).toBe(3);
      expect(result.reports).toHaveLength(2);
    });

    it('should sort by timestamp (newest first)', async () => {
      const unsorted = [mockReports[2], mockReports[0], mockReports[1]];
      mockStorage.getAllReports.mockReturnValue(ok(unsorted));

      const result = await executeL1ListReports({});

      expect(result.reports[0].id).toBe('report-1');
      expect(result.reports[1].id).toBe('report-2');
      expect(result.reports[2].id).toBe('report-3');
    });

    it('should handle empty report list', async () => {
      mockStorage.getAllReports.mockReturnValue(ok([]));

      const result = await executeL1ListReports({});

      expect(result.total).toBe(0);
      expect(result.reports).toHaveLength(0);
    });

    it('should handle storage errors', async () => {
      mockStorage.getAllReports.mockReturnValue(err(new Error('Storage error')));

      await expect(executeL1ListReports({})).rejects.toThrow(
        'Failed to get reports: Storage error'
      );
    });

    it('should format age correctly for recent reports', async () => {
      const recentReport = {
        id: 'recent',
        url: 'https://example.com',
        device: 'mobile',
        categories: ['performance'],
        timestamp: now - 1000 * 30, // 30 seconds ago
      };

      mockStorage.getAllReports.mockReturnValue(ok([recentReport]));

      const result = await executeL1ListReports({});

      expect(result.reports[0].age).toBe('0m');
    });

    it('should include all report metadata', async () => {
      mockStorage.getAllReports.mockReturnValue(ok([mockReports[0]]));

      const result = await executeL1ListReports({});

      expect(result.reports[0]).toEqual({
        id: 'report-1',
        url: 'https://example1.com',
        device: 'mobile',
        categories: ['performance'],
        timestamp: mockReports[0].timestamp,
        age: '5m',
      });
    });
  });
});