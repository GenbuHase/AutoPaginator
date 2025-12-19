/**
 * Finds the link to the next page using various heuristics.
 */
export function findNextPageLink(doc: Document = document): HTMLAnchorElement | null {
  // 1. <link rel="next"> (Head) - Good for URL, but we need an element if possible?
  // Actually, we usually just need the URL to fetch. But for UI, highlighting the button is nice.
  // Let's stick to returning an anchor.

  // 2. <a rel="next">
  const anchorRel = doc.querySelector('a[rel="next"]');
  if (anchorRel instanceof HTMLAnchorElement) return anchorRel;

  // 3. Score-based Heuristics
  const links = doc.querySelectorAll('a');
  let bestCandidate: HTMLAnchorElement | null = null;
  let maxScore = 0;

  // Keywords to look for
  const strongKeywords = ["next", "次へ", "次のページ", "next page", "more", "older posts", "older"];
  const weakKeywords = [">", ">>", "→"];
  const negativeKeywords = ["prev", "previous", "前へ", "前のページ", "<", "<<", "←"];

  links.forEach(link => {
    // Skip invisible or empty links
    const rect = link.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0 && link.textContent === "") return;
    
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

    let score = 0;
    const text = link.textContent?.trim().toLowerCase() || "";
    const className = link.className.toLowerCase();
    const id = link.id.toLowerCase();

    // Ancestor checking helper
    const checkAncestor = (el: HTMLElement | null, depth: number = 0): number => {
      if (!el || depth > 3) return 0;
      let ancestorScore = 0;
      const aClass = el.className.toLowerCase();
      const aId = el.id.toLowerCase();

      if (strongKeywords.some(k => aClass.includes(k) || aId.includes(k))) ancestorScore += 10;
      if (weakKeywords.some(k => aClass.includes(k) || aId.includes(k))) ancestorScore += 5;
      if (negativeKeywords.some(k => aClass.includes(k) || aId.includes(k))) ancestorScore -= 50;

      return ancestorScore + checkAncestor(el.parentElement as HTMLElement | null, depth + 1);
    };

    // Text Match (Anchor itself)
    if (strongKeywords.some(k => text === k)) score += 50;
    else if (strongKeywords.some(k => text.includes(k))) score += 20;
    else if (weakKeywords.some(k => text === k)) score += 10;

    // Class/ID Match (Anchor itself)
    if (strongKeywords.some(k => className.includes(k) || id.includes(k))) score += 15;
    if (className.includes('pagination') || className.includes('pager')) score += 5;

    // Ancestor Score
    score += checkAncestor(link.parentElement as HTMLElement | null);

    // Negative Match (Anchor itself)
    if (negativeKeywords.some(k => text.includes(k)) || className.includes('prev')) score -= 100;

    if (score > maxScore) {
      maxScore = score;
      bestCandidate = link;
    }
  });

  return maxScore > 10 ? bestCandidate : null;
}
