/**
 * Evaluates an XPath and returns all matching Elements.
 */
export function getElementsByXPath(xpath: string, context: Node = document): Element[] {
  try {
    const result = document.evaluate(xpath, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const elements: Element[] = [];
    for (let i = 0; i < result.snapshotLength; i++) {
      const el = result.snapshotItem(i);
      if (el instanceof Element) {
        elements.push(el);
      }
    }
    return elements;
  } catch (e) {
    console.error("XPath evaluation failed:", xpath, e);
    return [];
  }
}

/**
 * Evaluates an XPath and returns the first matching Element.
 */
export function getElementByXPath(xpath: string, context: Node = document): Element | null {
  const results = getElementsByXPath(xpath, context);
  return results[0] ?? null;
}

export function findContentContainers(doc: Document, selector?: string): HTMLElement[] {
  // 0. Manual XPath/Selector Override
  if (selector) {
    if (selector.startsWith("/") || selector.startsWith("(")) {
      return getElementsByXPath(selector, doc).filter((el): el is HTMLElement => el instanceof HTMLElement);
    } else {
      const els = doc.querySelectorAll(selector);
      return Array.from(els).filter((el): el is HTMLElement => el instanceof HTMLElement);
    }
  }

  // 1. Explicit Common Selectors
  const candidates = ["main", '[role="main"]', "article", "#main", "#content", "#main-content", ".main-content", ".post-content", ".article-body", ".blog-posts", ".search-results"];

  for (const selector of candidates) {
    const el = doc.querySelector(selector);

    // Rough check: must have some content.
    if (el instanceof HTMLElement && el.innerText.length > 100) {
      return [el];
    }
  }

  return [];
}

/**
 * Clean up the new content before appending.
 * e.g. remove the new next button, remove headers/footers if they were captured?
 */
export function cleanContent(element: HTMLElement) {
  // Remove scripts
  const scripts = element.querySelectorAll("script");
  scripts.forEach(s => s.remove());

  // Remove next/prev links to avoid duplicates
  // (This might be too aggressive if valid links are removed, but for infinite scroll it's usually desired)
  // We can filter this later.
}
