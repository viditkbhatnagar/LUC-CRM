// M1 — atomic counters must be race-free and well-formatted (03 §7).
import { describe, it, expect } from 'vitest';
import { setupTestDb } from './db.js';
import {
  nextSeq,
  generateLeadCode,
  generateAdmissionId,
  generateReceiptNo,
} from '../src/services/counterService.js';

describe('M1 · counterService', () => {
  setupTestDb();

  it('produces strictly increasing, unique sequences under concurrency', async () => {
    const results = await Promise.all(Array.from({ length: 100 }, () => nextSeq('concurrent')));
    const unique = new Set(results);
    expect(unique.size).toBe(100);
    expect(Math.min(...results)).toBe(1);
    expect(Math.max(...results)).toBe(100);
  });

  it('formats leadCode / admissionId / receiptNo per spec', async () => {
    expect(await generateLeadCode()).toBe('LUC-1001');
    expect(await generateLeadCode()).toBe('LUC-1002');
    expect(await generateAdmissionId(2026)).toBe('ADM-2026-0001');
    expect(await generateAdmissionId(2026)).toBe('ADM-2026-0002');
    // per-year sequence resets
    expect(await generateAdmissionId(2027)).toBe('ADM-2027-0001');
    expect(await generateReceiptNo()).toBe('RCPT-00001');
  });
});
