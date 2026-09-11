import { describe, it, expect } from 'vitest';
import { buildViewerHtml } from '../zip-exporter';

describe('zip-exporter HTML viewer security', () => {
  it('escapes all < characters in the injected JSON to prevent script tag breakout', () => {
    const maliciousJson = JSON.stringify({
      data: {
        tasks: [
          {
            id: 'task-1',
            title: '</script><script>alert("xss")</script>',
          },
        ],
      },
      exportedAt: '2026-09-11T00:00:00.000Z',
    });

    const html = buildViewerHtml(maliciousJson);

    // The script tag containing RAW data should have no raw < characters from the JSON
    const scriptStart = html.indexOf('<script>');
    const scriptEnd = html.indexOf('</script>');
    const scriptContent = html.substring(scriptStart + '<script>'.length, scriptEnd);

    expect(scriptContent).not.toContain('</script><script>');
    expect(scriptContent).toContain('\\u003c/script>');
    expect(scriptContent).toContain('\\u003cscript>');
  });

  it('uses data-type and data-id instead of single-quoted inline onclick handlers', () => {
    const json = JSON.stringify({
      data: {
        tasks: [
          {
            id: "task-'--onclick-payload",
            title: 'Test task',
          },
        ],
      },
    });

    const html = buildViewerHtml(json);

    // Should NOT have inline onclick='openDetail(...)'
    expect(html).not.toContain("onclick='openDetail(");
    // Should have card click delegation in DOMContentLoaded
    expect(html).toContain("closest('.card[data-id]')");
    // Should have data-type and data-id template attributes
    expect(html).toContain('data-type="${escHtml(type)}" data-id="${escHtml(item.id)}"');
  });

  it('sanitizes colors and links against injection in the viewer template', () => {
    const html = buildViewerHtml('{}');

    expect(html).toContain('function safeColor(c)');
    expect(html).toContain('function safeUrl(u)');
    expect(html).toContain('function escHtml(s)');
    expect(html).toContain('safeUrl(src)');
    expect(html).toContain('safeUrl(href)');
  });
});
