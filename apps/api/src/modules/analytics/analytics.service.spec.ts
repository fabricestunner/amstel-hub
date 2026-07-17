import { AnalyticsService } from './analytics.service';

/**
 * The dashboard shows a signed percentage "vs last month" on each headline KPI.
 * percentDelta turns a current/previous pair into that number, handling the
 * zero-previous edge cases so we never divide by zero.
 */
describe('AnalyticsService.percentDelta', () => {
  it('computes a positive month-over-month change', () => {
    expect(AnalyticsService.percentDelta(120, 100)).toBe(20);
  });

  it('computes a negative change', () => {
    expect(AnalyticsService.percentDelta(80, 100)).toBe(-20);
  });

  it('rounds to one decimal place', () => {
    expect(AnalyticsService.percentDelta(133, 100)).toBe(33);
    expect(AnalyticsService.percentDelta(1015, 1000)).toBe(1.5);
  });

  it('reports +100% when growing from zero', () => {
    expect(AnalyticsService.percentDelta(5, 0)).toBe(100);
  });

  it('reports 0% when both periods are zero', () => {
    expect(AnalyticsService.percentDelta(0, 0)).toBe(0);
  });
});
