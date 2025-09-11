/**
 * Unit tests for L1 Get Report Tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeL1GetReport, l1GetReportTool } from '../../../src/tools/l1-get-report';
import * as reportStorage from '../../../src/core/reportStorage';
import { ok, err } from 'neverthrow';

vi.mock('../../../src/core/reportStorage');

describe('L1 Get Report Tool', () => {
  const mockStorage = {
    getAllReports: vi.fn(),
    loadReport: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reportStorage, 'getDefaultStorage').mockReturnValue(mockStorage as any);
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(l1GetReportTool.name).toBe('l1_get_report');
      expect(l1GetReportTool.description).toContain('Get');
      expect(l1GetReportTool.description).toContain('Layer 1');
      expect(l1GetReportTool.inputSchema.required).toContain('reportId');
    });

    it('should define proper schema', () => {
      const props = l1GetReportTool.inputSchema.properties as any;
      expect(props.reportId.type).toBe('string');
      expect(props.reportId.description).toContain('Report ID');
    });
  });

  describe('executeL1GetReport', () => {
    const mockReportMeta = {
      id: 'test-report-id',
      url: 'https://example.com',
      device: 'mobile',
      categories: ['performance', 'seo'],
      timestamp: Date.now(),
      reportPath: '/path/to/report.json',
      hash: 'abc123',
    };

    const mockReportData = {
      finalUrl: 'https://example.com',
      requestedUrl: 'https://example.com',
      fetchTime: '2024-01-01T00:00:00.000Z',
      lighthouseVersion: '11.0.0',
      categories: {
        performance: { score: 0.95 },
        seo: { score: 0.88 },
      },
      audits: {
        'first-contentful-paint': {
          score: 0.9,
          numericValue: 1200,
        },
      },
    };

    it('should retrieve report by ID', async () => {
      mockStorage.getAllReports.mockReturnValue(ok([mockReportMeta]));
      mockStorage.loadReport.mockReturnValue(ok(mockReportData));

      const result = await executeL1GetReport({
        reportId: 'test-report-id',
      });

      expect(result.reportId).toBe('test-report-id');
      expect(result.data).toEqual(mockReportData);
      expect(result.metadata).toEqual({
        url: 'https://example.com',
        device: 'mobile',
        categories: ['performance', 'seo'],
        timestamp: mockReportMeta.timestamp,
      });
    });

    it('should handle report not found', async () => {
      mockStorage.getAllReports.mockReturnValue(ok([]));

      await expect(
        executeL1GetReport({ reportId: 'non-existent' })
      ).rejects.toThrow('Report not found: non-existent');
    });

    it('should handle getAllReports error', async () => {
      mockStorage.getAllReports.mockReturnValue(err(new Error('Storage error')));

      await expect(
        executeL1GetReport({ reportId: 'test-id' })
      ).rejects.toThrow('Failed to get reports: Storage error');
    });

    it('should handle loadReport error', async () => {
      mockStorage.getAllReports.mockReturnValue(ok([mockReportMeta]));
      mockStorage.loadReport.mockReturnValue(err(new Error('Failed to read file')));

      await expect(
        executeL1GetReport({ reportId: 'test-report-id' })
      ).rejects.toThrow('Failed to load report: Failed to read file');
    });

    it('should find report among multiple reports', async () => {
      const reports = [
        { ...mockReportMeta, id: 'report-1' },
        { ...mockReportMeta, id: 'report-2' },
        { ...mockReportMeta, id: 'report-3' },
      ];
      
      mockStorage.getAllReports.mockReturnValue(ok(reports));
      mockStorage.loadReport.mockReturnValue(ok(mockReportData));

      const result = await executeL1GetReport({
        reportId: 'report-2',
      });

      expect(result.reportId).toBe('report-2');
      expect(mockStorage.loadReport).toHaveBeenCalledWith(reports[1]);
    });

    it('should include full report data', async () => {
      const complexReportData = {
        ...mockReportData,
        categories: {
          performance: {
            score: 0.95,
            auditRefs: [
              { id: 'first-contentful-paint', weight: 10 },
              { id: 'largest-contentful-paint', weight: 25 },
            ],
          },
          accessibility: {
            score: 0.78,
            auditRefs: [],
          },
        },
        audits: {
          'first-contentful-paint': {
            score: 0.9,
            numericValue: 1200,
            displayValue: '1.2 s',
          },
          'largest-contentful-paint': {
            score: 0.85,
            numericValue: 2500,
            displayValue: '2.5 s',
          },
          'cumulative-layout-shift': {
            score: 1,
            numericValue: 0.05,
          },
        },
        configSettings: {
          formFactor: 'mobile',
          locale: 'en-US',
          onlyCategories: ['performance', 'accessibility'],
        },
        timing: {
          total: 15000,
        },
        userAgent: 'Mozilla/5.0 ...',
      };

      mockStorage.getAllReports.mockReturnValue(ok([mockReportMeta]));
      mockStorage.loadReport.mockReturnValue(ok(complexReportData));

      const result = await executeL1GetReport({
        reportId: 'test-report-id',
      });

      expect(result.data).toEqual(complexReportData);
    });

    it('should preserve metadata categories order', async () => {
      const metaWithCategories = {
        ...mockReportMeta,
        categories: ['seo', 'accessibility', 'performance'],
      };

      mockStorage.getAllReports.mockReturnValue(ok([metaWithCategories]));
      mockStorage.loadReport.mockReturnValue(ok(mockReportData));

      const result = await executeL1GetReport({
        reportId: 'test-report-id',
      });

      expect(result.metadata.categories).toEqual(['seo', 'accessibility', 'performance']);
    });
  });
});