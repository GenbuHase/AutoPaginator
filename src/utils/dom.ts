export function findContentContainer(doc: Document): HTMLElement | null {
  // 1. Explicit Common Selectors
  const candidates = [
    'main',
    '[role="main"]',
    'article',
    '#main',
    '#content',
    '#main-content',
    '.main-content',
    '.post-content',
    '.blog-posts',
    '.search-results'
  ];

  for (const selector of candidates) {
    const el = doc.querySelector(selector);

    // Rough check: must have some content.
    if (el instanceof HTMLElement && el.innerText.length > 100) {
      return el;
    }
  }

  // 2. Heuristic: Parent of the Next Button?
  // We don't have the next button here as argument.
  // Maybe we should pass it?
  
  // 3. Largest text block heuristic (Simplified)
  // Find div with most text?
  return null;
}

/**
 * Clean up the new content before appending.
 * e.g. remove the new next button, remove headers/footers if they were captured?
 */
export function cleanContent(element: HTMLElement) {
  // Remove scripts
  const scripts = element.querySelectorAll('script');
  scripts.forEach(s => s.remove());
  
  // Remove next/prev links to avoid duplicates
  // (This might be too aggressive if valid links are removed, but for infinite scroll it's usually desired)
  // We can filter this later.
}
