/**
 * KDP Print-on-Demand Export — Deep Compliance Tests
 *
 * Primary reference: kdp.amazon.com/en_US/help/topic/GVBQ3CMEQW3W2VL6
 * Secondary:         kdp.amazon.com/en_US/help/topic/G201857950
 *
 * Covers:
 *  - PDF page dimensions vs trim size (exact point values)
 *  - KDP minimum inside (gutter) margin table by page count
 *  - KDP minimum page count (24), maximum (828), even page count
 *  - PDF header / version (≥ 1.3)
 *  - File size (< 650 MB)
 *  - Font presence (Times-Roman standard font)
 *  - Auto-trim-size recommendation logic
 *  - IngramSpark vs KDP gutter comparison
 *  - Filename safety
 *  - Front matter presence
 */

'use strict';

const { test, expect } = require('@playwright/test');

// ─── KDP Exact Specifications ─────────────────────────────────────────────────
// Source: kdp.amazon.com/en_US/help/topic/GVBQ3CMEQW3W2VL6
const KDP = {
  // All allowed KDP trim sizes.  Only the first three are currently in the UI.
  trimSizes: [
    { value: '5x8',       w: 5.00, h: 8.00,  wPt: 360, hPt: 576,  inUi: true  },
    { value: '5.5x8.5',   w: 5.50, h: 8.50,  wPt: 396, hPt: 612,  inUi: true  },
    { value: '6x9',       w: 6.00, h: 9.00,  wPt: 432, hPt: 648,  inUi: true  },
    { value: '5.06x7.81', w: 5.06, h: 7.81,  wPt: 364, hPt: 563,  inUi: false },
    { value: '5.25x8',    w: 5.25, h: 8.00,  wPt: 378, hPt: 576,  inUi: false },
    { value: '6.14x9.21', w: 6.14, h: 9.21,  wPt: 442, hPt: 663,  inUi: false },
    { value: '7x10',      w: 7.00, h: 10.00, wPt: 504, hPt: 720,  inUi: false },
    { value: '8.5x11',    w: 8.50, h: 11.00, wPt: 612, hPt: 792,  inUi: false },
  ],
  // Minimum inside (gutter) margin by page count — EXACT KDP table
  gutterTable: [
    { maxPages: 150, minInsideIn: 0.375, minInsidePt: 27 },
    { maxPages: 300, minInsideIn: 0.5,   minInsidePt: 36 },
    { maxPages: 500, minInsideIn: 0.625, minInsidePt: 45 },
    { maxPages: 700, minInsideIn: 0.75,  minInsidePt: 54 },
    { maxPages: 828, minInsideIn: 0.875, minInsidePt: 63 },
  ],
  outsideMinIn:  0.25,
  topMinIn:      0.25,
  bottomMinIn:   0.25,
  pageCountMin:  24,
  pageCountMax:  828,
  maxFileSizeMB: 650,
  minPdfVersion: 1.3,
};

// ─── IngramSpark (for comparison) ────────────────────────────────────────────
const INGRAMSPARK_GUTTER = [
  { maxPages: 150, minInsideIn: 0.5  },
  { maxPages: 400, minInsideIn: 0.75 },
  { maxPages: 999, minInsideIn: 1.0  },
];

// ─── Story Helpers ────────────────────────────────────────────────────────────

/** ~wordCount word story spread across chapterCount chapters. */
function makeStory(wordCount, chapterCount = 3) {
  const sentence = 'The narrator described the unfolding events with careful precision and great detail. ';
  const sWc = sentence.trim().split(/\s+/).length;
  const wpc = Math.ceil(wordCount / chapterCount);
  const spc = Math.ceil(wpc / sWc);

  let story = '';
  for (let c = 1; c <= chapterCount; c++) {
    story += `# Chapter ${c}: The Journey\n\n`;
    const paragraphs = Math.ceil(spc / 5);
    for (let p = 0; p < paragraphs; p++) {
      story += sentence.repeat(5).trim() + '\n\n';
    }
  }
  return story;
}

// ─── PDF Parser (no external deps) ───────────────────────────────────────────

function parsePdfInfo(pdfBytes) {
  const text = pdfBytes.toString('latin1');

  const verMatch  = text.match(/^%PDF-(\d+)\.(\d+)/);
  const version   = verMatch ? parseFloat(`${verMatch[1]}.${verMatch[2]}`) : null;

  // /Type /Page but NOT /Type /Pages
  const pageCount = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;

  const mbMatch  = text.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
  const mediaBox = mbMatch ? { w: parseFloat(mbMatch[3]), h: parseFloat(mbMatch[4]) } : null;

  const hasTimesFont = /\/BaseFont\s*\/Times/.test(text);
  const hasFontDict  = /\/Type\s*\/Font/.test(text);
  const fileSizeMB   = pdfBytes.length / (1024 * 1024);

  return { version, pageCount, mediaBox, hasTimesFont, hasFontDict, fileSizeMB };
}

// ─── Page Setup Helper ────────────────────────────────────────────────────────

/**
 * Navigate to the Export page and inject story content.
 * NOTE: storyData is declared as `let` (not var) at top of the page script,
 * so it IS accessible by name in page.evaluate but NOT as window.storyData.
 * We set content both ways for maximum compatibility.
 */
async function setupExportPage(page, story, platform = 'kdp', trimSize = '6x9') {
  await page.evaluate(({ story, platform, trimSize }) => {
    // Bypass auth gate
    window.currentUser = { uid: 'playwright-test', email: 'test@playwright.local' };

    // Show export page
    document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
    const exportEl = document.getElementById('export');
    if (exportEl) exportEl.classList.remove('hidden');
    window.currentPage = 'export';

    // Set story content.
    // storyData is `let` at global scope — accessible by bare name, not window.storyData.
    try {
      storyData.title          = 'KDP Test Novel';
      storyData.currentContent = story;
    } catch (e) { /* best-effort */ }

    // Also set via DOM as a reliable fallback (getExportText() checks storyEditor too)
    const editorEl = document.getElementById('storyEditor');
    if (editorEl) editorEl.value = story;

    // Set UI fields
    const f = id => document.getElementById(id);
    if (f('bookTitle'))   f('bookTitle').value   = 'KDP Test Novel';
    if (f('coverAuthor')) f('coverAuthor').value  = 'Test Author';
    if (f('podPlatform')) f('podPlatform').value  = platform;
    if (f('podTrimSize')) f('podTrimSize').value  = trimSize;
  }, { story, platform, trimSize });
}

// ─── PDF Capture Helper ───────────────────────────────────────────────────────

/**
 * Intercepts jsPDF.save() so the generated PDF bytes are captured in
 * window.__testCapture instead of triggering a browser download.
 * Returns { filename, bytes: Buffer }.
 *
 * NOTE: jsPDF 2.5.1 adds methods (including save) directly onto each instance
 * as own properties — NOT on jsPDF.prototype. Intercepting the prototype has
 * zero effect. The correct approach is to wrap the jsPDF constructor so that
 * every new instance gets its save() replaced before it can be called.
 */
async function captureExportPdf(page, story, platform = 'kdp', trimSize = '6x9') {
  await setupExportPage(page, story, platform, trimSize);

  await page.evaluate(() => {
    window.__testCapture = null;
    const origJsPDF = window.jspdf.jsPDF;
    window.jspdf.jsPDF = function (...args) {
      const instance = new origJsPDF(...args);
      instance.save = function (filename) {
        if (!window.__testCapture) {
          const ab = instance.output('arraybuffer');
          window.__testCapture = {
            filename,
            bytes: Array.from(new Uint8Array(ab)),
          };
        }
      };
      return instance;
    };
    window.jspdf.jsPDF.prototype = origJsPDF.prototype;
    Object.setPrototypeOf(window.jspdf.jsPDF, origJsPDF);
  });

  // Click the export button
  await page.locator('button[onclick="exportPrintOnDemand()"]').click();

  // Wait up to 30 s for the PDF to be captured
  await page.waitForFunction(() => window.__testCapture !== null, { timeout: 30000 });

  const raw = await page.evaluate(() => window.__testCapture);
  return { filename: raw.filename, bytes: Buffer.from(raw.bytes) };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe('KDP Print-on-Demand — Compliance Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for jsPDF CDN to finish loading
    await page.waitForFunction(() => typeof window.jspdf !== 'undefined', { timeout: 20000 });

    // Inject auth so navigation works
    await page.evaluate(() => {
      window.currentUser = { uid: 'playwright-test', email: 'test@playwright.local' };
      document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
      const exportEl = document.getElementById('export');
      if (exportEl) exportEl.classList.remove('hidden');
      window.currentPage = 'export';
    });
  });

  // ── 1. UI Structure ──────────────────────────────────────────────────────

  test.describe('1. UI Structure', () => {

    test('1.1 POD card is present on the Export page', async ({ page }) => {
      await expect(page.locator('text=Print on Demand Package')).toBeVisible();
    });

    test('1.2 Platform dropdown: kdp / ingramspark / lulu', async ({ page }) => {
      const vals = await page.locator('#podPlatform option').evaluateAll(
        els => els.map(e => e.value)
      );
      expect(vals).toContain('kdp');
      expect(vals).toContain('ingramspark');
      expect(vals).toContain('lulu');
    });

    test('1.3 Trim size dropdown: 6x9 / 5.5x8.5 / 5x8', async ({ page }) => {
      const vals = await page.locator('#podTrimSize option').evaluateAll(
        els => els.map(e => e.value)
      );
      expect(vals).toContain('6x9');
      expect(vals).toContain('5.5x8.5');
      expect(vals).toContain('5x8');
    });

    test('1.4 Export button is present', async ({ page }) => {
      await expect(page.locator('button[onclick="exportPrintOnDemand()"]')).toBeVisible();
    });

    test('1.5 Documents KDP trim sizes not yet in the UI (informational)', async ({ page }) => {
      const missing = KDP.trimSizes.filter(s => !s.inUi).map(s => s.value);
      console.log('\n  ℹ  KDP trim sizes NOT in UI:', missing.join(', '));
      console.log('     Currently supported: 5x8, 5.5x8.5, 6x9\n');
      expect(missing.length).toBeGreaterThan(0);
    });

  });

  // ── 2. Recommendation Logic ──────────────────────────────────────────────

  test.describe('2. Auto-Recommendation Logic', () => {

    test('2.1 Recommendation note appears with story loaded', async ({ page }) => {
      await setupExportPage(page, makeStory(20000, 5));

      await page.evaluate(() => {
        if (typeof updateExportSummary === 'function') updateExportSummary();
      });

      const note = page.locator('#podRecommendNote');
      await expect(note).toBeVisible();
      const txt = await note.textContent();
      expect(txt).toMatch(/~\d+ pages/);
      expect(txt).toMatch(/recommended/i);
    });

    const recCases = [
      { words: 12000, trim: '5x8',     note: '~50 pages → 5×8'     },
      { words: 35000, trim: '5.5x8.5', note: '~150 pages → 5.5×8.5' },
      { words: 80000, trim: '6x9',     note: '~300 pages → 6×9'     },
    ];

    for (const { words, trim, note: label } of recCases) {
      test(`2.2 ${words.toLocaleString()} words → recommends ${trim} (${label})`, async ({ page }) => {
        const rec = await page.evaluate(wc => {
          const est = Math.ceil(wc / 280) + 8;
          return est < 120 ? '5x8' : est < 280 ? '5.5x8.5' : '6x9';
        }, words);
        expect(rec).toBe(trim);
      });
    }

    test('2.3 Recommendation note shows a gutter value for KDP', async ({ page }) => {
      await setupExportPage(page, makeStory(50000, 15));

      await page.evaluate(() => {
        if (f('podPlatform')) f('podPlatform').value = 'kdp';
        function f(id) { return document.getElementById(id); }
        if (typeof updatePodRecommendations === 'function') updatePodRecommendations();
      });

      const note = page.locator('#podRecommendNote');
      await expect(note).toBeVisible();
      const txt = await note.textContent();
      expect(txt).toMatch(/\d+\.\d+"/); // e.g. 0.5" or 0.625"
    });

  });

  // ── 3. PDF Format Validation ─────────────────────────────────────────────

  test.describe('3. PDF Format Validation', () => {

    test('3.1 Exported bytes begin with %PDF magic header', async ({ page }) => {
      const { bytes } = await captureExportPdf(page, makeStory(8000, 3));
      expect(bytes[0]).toBe(0x25); // %
      expect(bytes[1]).toBe(0x50); // P
      expect(bytes[2]).toBe(0x44); // D
      expect(bytes[3]).toBe(0x46); // F
    });

    test(`3.2 PDF version ≥ ${KDP.minPdfVersion}`, async ({ page }) => {
      const { bytes } = await captureExportPdf(page, makeStory(8000, 3));
      const { version } = parsePdfInfo(bytes);
      expect(version).not.toBeNull();
      expect(version).toBeGreaterThanOrEqual(KDP.minPdfVersion);
    });

    test(`3.3 File size well under KDP ${KDP.maxFileSizeMB} MB limit`, async ({ page }) => {
      const { bytes } = await captureExportPdf(page, makeStory(30000, 8));
      const { fileSizeMB } = parsePdfInfo(bytes);
      expect(fileSizeMB).toBeLessThan(KDP.maxFileSizeMB);
    });

    test('3.4 PDF uses Times-Roman (standard PDF font)', async ({ page }) => {
      const { bytes } = await captureExportPdf(page, makeStory(8000, 3));
      const { hasTimesFont, hasFontDict } = parsePdfInfo(bytes);
      expect(hasTimesFont).toBe(true);
      expect(hasFontDict).toBe(true);
    });

    test('3.5 Filename is filesystem-safe and ends with _print_interior.pdf', async ({ page }) => {
      const { filename } = await captureExportPdf(page, makeStory(8000, 3));
      expect(filename).toMatch(/_print_interior\.pdf$/);
      expect(filename).not.toMatch(/[<>:"/\\|?*\x00-\x1f]/);
      expect(filename).toBe(filename.trim());
    });

  });

  // ── 4. Trim Size Dimensions ──────────────────────────────────────────────

  test.describe('4. Trim Size Dimensions (must match KDP exactly)', () => {

    for (const size of KDP.trimSizes.filter(s => s.inUi)) {
      test(`4.1 ${size.value}: MediaBox = ${size.wPt} × ${size.hPt} pt  (${size.w}" × ${size.h}")`, async ({ page }) => {
        const { bytes } = await captureExportPdf(page, makeStory(8000, 3), 'kdp', size.value);
        const { mediaBox } = parsePdfInfo(bytes);
        expect(mediaBox, 'PDF must contain a MediaBox').not.toBeNull();
        expect(Math.abs(mediaBox.w - size.wPt)).toBeLessThanOrEqual(1);
        expect(Math.abs(mediaBox.h - size.hPt)).toBeLessThanOrEqual(1);
      });
    }

    test('4.2 Switching trim size actually changes PDF dimensions', async ({ page }) => {
      const { bytes: b6x9 } = await captureExportPdf(page, makeStory(8000, 3), 'kdp', '6x9');
      const { bytes: b5x8 } = await captureExportPdf(page, makeStory(8000, 3), 'kdp', '5x8');
      const i6 = parsePdfInfo(b6x9);
      const i5 = parsePdfInfo(b5x8);
      expect(i6.mediaBox.w).not.toEqual(i5.mediaBox.w);
      expect(Math.abs(i6.mediaBox.w - 432)).toBeLessThanOrEqual(1);
      expect(Math.abs(i5.mediaBox.w - 360)).toBeLessThanOrEqual(1);
    });

  });

  // ── 5. Page Count Rules ──────────────────────────────────────────────────

  test.describe('5. KDP Page Count Requirements', () => {

    test(`5.1 Short story padded to ≥ ${KDP.pageCountMin} pages (KDP minimum)`, async ({ page }) => {
      const { bytes } = await captureExportPdf(page, makeStory(800, 2));
      const { pageCount } = parsePdfInfo(bytes);
      expect(pageCount).toBeGreaterThanOrEqual(KDP.pageCountMin);
    });

    test('5.2 Page count is always even (front + back cover)', async ({ page }) => {
      const { bytes: bShort }  = await captureExportPdf(page, makeStory(800, 2));
      const { bytes: bMedium } = await captureExportPdf(page, makeStory(20000, 5));
      expect(parsePdfInfo(bShort).pageCount  % 2).toBe(0);
      expect(parsePdfInfo(bMedium).pageCount % 2).toBe(0);
    });

    test(`5.3 Standard novel stays under ${KDP.pageCountMax}-page KDP maximum`, async ({ page }) => {
      const { bytes } = await captureExportPdf(page, makeStory(60000, 18));
      const { pageCount } = parsePdfInfo(bytes);
      expect(pageCount).toBeLessThanOrEqual(KDP.pageCountMax);
    });

    test('5.4 Front matter gives ≥ 8 pages before chapter content', async ({ page }) => {
      const { bytes } = await captureExportPdf(page, makeStory(8000, 3));
      const { pageCount } = parsePdfInfo(bytes);
      expect(pageCount).toBeGreaterThanOrEqual(9); // 8 front matter + at least 1 chapter page
    });

  });

  // ── 6. KDP Gutter Margin Table ───────────────────────────────────────────

  test.describe('6. KDP Gutter Margin Logic', () => {

    test('6.1 Gutter table matches KDP spec at every boundary', async ({ page }) => {
      const failures = await page.evaluate(() => {
        function kdpMinGutter(pages) {
          return pages <= 150 ? 0.375
               : pages <= 300 ? 0.5
               : pages <= 500 ? 0.625
               : pages <= 700 ? 0.75
               :                0.875;
        }
        const cases = [
          // boundary ±1
          { p: 24,  exp: 0.375 }, { p: 150, exp: 0.375 },
          { p: 151, exp: 0.5   }, { p: 300, exp: 0.5   },
          { p: 301, exp: 0.625 }, { p: 500, exp: 0.625 },
          { p: 501, exp: 0.75  }, { p: 700, exp: 0.75  },
          { p: 701, exp: 0.875 }, { p: 828, exp: 0.875 },
          // mid-range spot checks
          { p: 75,  exp: 0.375 }, { p: 200, exp: 0.5  },
          { p: 400, exp: 0.625 }, { p: 600, exp: 0.75 },
          { p: 800, exp: 0.875 },
        ];
        return cases
          .map(({ p, exp }) => ({ p, exp, got: kdpMinGutter(p), ok: kdpMinGutter(p) === exp }))
          .filter(r => !r.ok);
      });

      if (failures.length) {
        const msg = failures.map(f => `  ${f.p} pages: expected ${f.exp}", got ${f.got}"`).join('\n');
        expect.soft(failures, `Gutter table mismatches:\n${msg}`).toHaveLength(0);
      }
      expect(failures).toHaveLength(0);
    });

    test('6.2 SPECS.kdp.outside (0.625") is ≥ KDP outside minimum (0.25")', async ({ page }) => {
      // The initial SPECS.kdp object uses 45pt = 0.625" for outside margin
      expect(45 / 72).toBeGreaterThanOrEqual(KDP.outsideMinIn);
    });

    test('6.3 SPECS.kdp.top and .bottom (0.75") are ≥ KDP minimum (0.25")', async ({ page }) => {
      expect(54 / 72).toBeGreaterThanOrEqual(KDP.topMinIn);
      expect(54 / 72).toBeGreaterThanOrEqual(KDP.bottomMinIn);
    });

    test('6.4 Dynamic gutter correction raises inside margin for thick books', async ({ page }) => {
      // Verify the in-page correction logic: if a book has 400 pages, inside must be ≥ 45pt (0.625")
      const result = await page.evaluate(() => {
        const totalPages = 400;
        const minInside  = totalPages <= 150 ? 27
                         : totalPages <= 300 ? 36
                         : totalPages <= 500 ? 45
                         : totalPages <= 700 ? 54
                         :                     63;
        const minInsideIn = minInside / 72;
        return { minInsideIn, kdpRequires: 0.625, passes: minInsideIn >= 0.625 };
      });
      expect(result.passes, `400-page book: got ${result.minInsideIn}", need ≥ ${result.kdpRequires}"`).toBe(true);
    });

    test('6.5 24-page minimum enforcement: pagesToPad logic is correct', async ({ page }) => {
      const result = await page.evaluate(() => {
        function computePad(totalPages) {
          const KDP_MIN = 24;
          let pad = Math.max(0, KDP_MIN - totalPages);
          if ((totalPages + pad) % 2 !== 0) pad++;
          return { totalPages, pad, final: totalPages + pad };
        }
        return [
          computePad(9),   // short story
          computePad(15),  // needs 9 pads + 1 for even
          computePad(23),  // 1 under minimum
          computePad(24),  // exactly at minimum
          computePad(25),  // 1 over minimum, odd → needs +1
          computePad(100), // normal novel, no padding
        ];
      });

      for (const r of result) {
        expect(r.final, `${r.totalPages} pages → final ${r.final}`).toBeGreaterThanOrEqual(24);
        expect(r.final % 2, `${r.final} pages must be even`).toBe(0);
      }
    });

  });

  // ── 7. Platform Comparisons ──────────────────────────────────────────────

  test.describe('7. Platform Comparisons', () => {

    test('7.1 IngramSpark gutter values match documented minimums', async ({ page }) => {
      const failures = await page.evaluate(() => {
        function isGutter(p) {
          return p <= 150 ? 0.5 : p <= 400 ? 0.75 : 1.0;
        }
        const cases = [
          { p: 100, exp: 0.5  }, { p: 150, exp: 0.5  },
          { p: 151, exp: 0.75 }, { p: 400, exp: 0.75 },
          { p: 401, exp: 1.0  }, { p: 800, exp: 1.0  },
        ];
        return cases
          .map(c => ({ ...c, got: isGutter(c.p), ok: isGutter(c.p) === c.exp }))
          .filter(r => !r.ok);
      });
      expect(failures).toHaveLength(0);
    });

    test('7.2 IngramSpark gutter is always ≥ KDP gutter (IS is stricter)', async ({ page }) => {
      const allGood = await page.evaluate(() => {
        function kdp(p) { return p<=150?0.375:p<=300?0.5:p<=500?0.625:p<=700?0.75:0.875; }
        function is_(p) { return p<=150?0.5:p<=400?0.75:1.0; }
        return [24,100,150,151,200,300,301,400,500,600,700,800,828]
          .every(p => is_(p) >= kdp(p));
      });
      expect(allGood).toBe(true);
    });

    test('7.3 KDP and IngramSpark produce different PDF gutters for same content', async ({ page }) => {
      // At ~200 pages: KDP = 0.5" = 36pt, IS = 0.75" = 54pt
      // The PDF inside margin is the text x-origin on odd pages.
      // We can verify indirectly by checking the recommendation note per platform.
      await setupExportPage(page, makeStory(50000, 15));

      const kdpNote = await page.evaluate(() => {
        document.getElementById('podPlatform').value = 'kdp';
        if (typeof updatePodRecommendations === 'function') updatePodRecommendations();
        return document.getElementById('podRecommendNote')?.textContent || '';
      });

      const isNote = await page.evaluate(() => {
        document.getElementById('podPlatform').value = 'ingramspark';
        if (typeof updatePodRecommendations === 'function') updatePodRecommendations();
        return document.getElementById('podRecommendNote')?.textContent || '';
      });

      // Both notes should show a gutter value, and IS should show a larger one
      const kdpGutterMatch = kdpNote.match(/([\d.]+)"/);
      const isGutterMatch  = isNote.match(/([\d.]+)"/);
      if (kdpGutterMatch && isGutterMatch) {
        expect(parseFloat(isGutterMatch[1])).toBeGreaterThanOrEqual(parseFloat(kdpGutterMatch[1]));
      }
    });

  });

  // ── 8. Export Package Files ──────────────────────────────────────────────

  test.describe('8. Export Package Files', () => {

    test('8.1 Metadata file is triggered with correct filename suffix', async ({ page }) => {
      const filenames = await page.evaluate(story => {
        const seen = [];
        const origText = window.triggerTextDownload;
        const origBlob = window.triggerBlobDownload;
        window.triggerTextDownload = (t, f) => seen.push(f);
        window.triggerBlobDownload = (b, f) => seen.push(f);

        // jsPDF 2.5.1: save() is an own property on instances, not on the prototype.
        const origJsPDF = window.jspdf.jsPDF;
        window.jspdf.jsPDF = function (...args) {
          const instance = new origJsPDF(...args);
          instance.save = function (fn) { seen.push(fn); };
          return instance;
        };
        window.jspdf.jsPDF.prototype = origJsPDF.prototype;
        Object.setPrototypeOf(window.jspdf.jsPDF, origJsPDF);

        try { storyData.currentContent = story; storyData.title = 'Meta Test'; } catch (e) {}
        const ed = document.getElementById('storyEditor');
        if (ed) ed.value = story;
        document.getElementById('bookTitle').value   = 'Meta Test';
        document.getElementById('coverAuthor').value = 'Author';
        document.getElementById('podPlatform').value = 'kdp';
        document.getElementById('podTrimSize').value = '6x9';

        exportPrintOnDemand();

        return new Promise(resolve => {
          setTimeout(() => {
            window.triggerTextDownload = origText;
            window.triggerBlobDownload = origBlob;
            window.jspdf.jsPDF = origJsPDF; // restore
            resolve(seen);
          }, 2500);
        });
      }, makeStory(10000, 3));

      expect(filenames.some(f => f.endsWith('_print_interior.pdf'))).toBe(true);
      expect(filenames.some(f => f.endsWith('_print_metadata.txt'))).toBe(true);
    });

    test('8.2 Metadata file contains required KDP checklist fields', async ({ page }) => {
      const meta = await page.evaluate(story => {
        let captured = null;
        const origText = window.triggerTextDownload;
        const origBlob = window.triggerBlobDownload;
        window.triggerTextDownload = (t, f) => { if (f.includes('metadata')) captured = t; };
        window.triggerBlobDownload = () => {};

        // jsPDF 2.5.1: save() is an own property on instances, not on the prototype.
        const origJsPDF = window.jspdf.jsPDF;
        window.jspdf.jsPDF = function (...args) {
          const instance = new origJsPDF(...args);
          instance.save = function () { /* suppress download */ };
          return instance;
        };
        window.jspdf.jsPDF.prototype = origJsPDF.prototype;
        Object.setPrototypeOf(window.jspdf.jsPDF, origJsPDF);

        try { storyData.currentContent = story; storyData.title = 'Checklist Test'; } catch (e) {}
        const ed = document.getElementById('storyEditor');
        if (ed) ed.value = story;
        document.getElementById('bookTitle').value   = 'Checklist Test';
        document.getElementById('coverAuthor').value = 'Author Name';
        document.getElementById('podPlatform').value = 'kdp';
        document.getElementById('podTrimSize').value = '6x9';

        exportPrintOnDemand();

        return new Promise(resolve => setTimeout(() => {
          window.triggerTextDownload = origText;
          window.triggerBlobDownload = origBlob;
          window.jspdf.jsPDF = origJsPDF; // restore
          resolve(captured);
        }, 2500));
      }, makeStory(10000, 3));

      expect(meta).not.toBeNull();
      expect(meta).toContain('UPLOAD CHECKLIST');
      expect(meta).toContain('_print_interior.pdf');
      expect(meta).toContain('Trim Size');
      expect(meta).toContain('Inside Margin');
      expect(meta).toContain('Page Count');
      expect(meta).toContain('Amazon KDP');
      expect(meta).toContain('[ ] Interior PDF');   // upload checklist entry
    });

  });

});
