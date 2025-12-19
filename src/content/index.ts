import { findNextPageLink } from '../utils/next-page';
import { findContentContainer, getElementByXPath } from '../utils/dom';
import { storage, isBlacklisted, type SiteConfig } from '../utils/storage';

let isLoading = false;
let nextPageUrl: string | null = null;
let contentContainer: HTMLElement | null = null;
let currentSiteConfig: SiteConfig | undefined;

// Store visited URLs to prevent loops
const visitedUrls = new Set<string>();

async function init() {
  console.log("[AutoPaginator] Initializing...");
  
  const settings = await storage.get();
  if (!settings.enabled) {
    console.log("[AutoPaginator] Disabled globally.");
    return;
  }
  
  const url = location.href;
  if (isBlacklisted(url, settings.blacklist)) {
    console.log("[AutoPaginator] Disabled on this domain.");
    return;
  }

  // Find matching SITEINFO
  currentSiteConfig = settings.siteInfo.find(config => {
    try {
      return config.enabled && new RegExp(config.url).test(url);
    } catch (e) {
      console.error("Invalid regex in SITEINFO:", config.url, e);
      return false;
    }
  });

  // 1. Find Next Page Link
  const nextLink = findNextPageLink(document, currentSiteConfig?.nextLink);
  if (!nextLink) {
    console.log("[AutoPaginator] No next page link found.");
    return;
  }
  nextPageUrl = nextLink.href;
  visitedUrls.add(location.href);

  // 2. Find Main Content Container
  contentContainer = findContentContainer(document, currentSiteConfig?.pageElement);
  if (!contentContainer) {
    console.warn("[AutoPaginator] Content container not found. Aborting.");
    return;
  }

  // BUGFIX: Set up observer for the first page too
  const originalUrl = location.href;
  const firstPageWrapper = document.createElement('div');
  firstPageWrapper.id = 'autopaginator-first-page';
  firstPageWrapper.dataset.url = originalUrl;
  
  // Move all children (except our own potential additions) into the wrapper
  // But wait, it's better to just observe the existing children if possible, 
  // or wrap everything currently in the container.
  while (contentContainer.firstChild) {
    firstPageWrapper.appendChild(contentContainer.firstChild);
  }
  contentContainer.appendChild(firstPageWrapper);
  setupHistoryObserver(firstPageWrapper, originalUrl);

  // 3. Setup Trigger
  setupNextLinkObserver(nextLink);
}


function setupNextLinkObserver(element: HTMLElement) {
  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry?.isIntersecting && !isLoading && nextPageUrl) {
      triggerFetch();
      observer.disconnect(); // Stop observing this one once triggered
    }
  }, {
    root: null,
    rootMargin: '400px', // Trigger well before the link hits the viewport
    threshold: 0.1
  });
  
  observer.observe(element);
}


async function triggerFetch() {
  if (!nextPageUrl || isLoading) return;
  
  if (visitedUrls.has(nextPageUrl)) {
    console.warn("[AutoPaginator] Loop detected or already visited:", nextPageUrl);
    nextPageUrl = null;
    return;
  }

  isLoading = true;
  console.log("[AutoPaginator] Fetching:", nextPageUrl);
  
  try {
    const response = await fetch(nextPageUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const text = await response.text();
    const parser = new DOMParser();
    const nextDoc = parser.parseFromString(text, 'text/html');
    
    processNextPage(nextDoc, nextPageUrl);
  } catch (e) {
    console.error("[AutoPaginator] Fetch failed:", e);
  } finally {
    isLoading = false;
  }
}

function processNextPage(doc: Document, url: string) {
  const newContainer = findContentContainer(doc, currentSiteConfig?.pageElement);
  
  if (newContainer && contentContainer) {
    const pageWrapper = document.createElement('div');
    pageWrapper.classList.add('autopaginator-page');
    pageWrapper.dataset.url = url;
    pageWrapper.style.marginTop = '20px';
    pageWrapper.style.borderTop = '1px dashed #ccc';
    pageWrapper.innerHTML = `<!-- Page: ${url} -->`;
    
    const fragment = document.createDocumentFragment();
    Array.from(newContainer.children).forEach(child => {
      fragment.appendChild(document.importNode(child, true));
    });
    pageWrapper.appendChild(fragment);
    
    // Determine insertion point
    if (currentSiteConfig?.insertBefore) {
      const before = getElementByXPath(currentSiteConfig.insertBefore, document);
      if (before && before.parentNode) {
        before.parentNode.insertBefore(pageWrapper, before);
      } else {
        contentContainer.appendChild(pageWrapper);
      }
    } else {
      contentContainer.appendChild(pageWrapper);
    }

    setupHistoryObserver(pageWrapper, url);
    
    visitedUrls.add(url);
    const newNextLink = findNextPageLink(doc, currentSiteConfig?.nextLink);
    if (newNextLink) {
      nextPageUrl = newNextLink.href;
      setupNextLinkObserver(newNextLink);
    } else {
      nextPageUrl = null;
      const endMsg = document.createElement('div');
      endMsg.textContent = 'No more pages.';
      endMsg.style.textAlign = 'center';
      endMsg.style.padding = '20px';
      contentContainer.appendChild(endMsg);
    }
  } else {
    console.info("[AutoPaginator] Could not identify content in fetched page.");
  }
}

function setupHistoryObserver(element: HTMLElement, url: string) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
        history.replaceState(null, '', url);
      }
    });
  }, { threshold: [0.1, 0.5] });
    
  observer.observe(element);
}

if (window.self === window.top) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
