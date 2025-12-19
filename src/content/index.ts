import { findNextPageLink } from '../utils/next-page';
import { findContentContainers, getElementByXPath } from '../utils/dom';
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

  // 2. Find Main Content Containers
  const containers = findContentContainers(document, currentSiteConfig?.pageElement);
  if (containers.length === 0) {
    console.warn("[AutoPaginator] Content container not found. Aborting.");
    return;
  }
  
  // Set contentContainer to the parent of the first matched container
  // This ensures new pages are appended as siblings to the original content
  const firstContainer = containers[0];
  if (!firstContainer) return;
  
  contentContainer = (firstContainer.parentElement || document.body) as HTMLElement;

  // BUGFIX: Set up observer for the first page too
  const originalUrl = location.href;
  const firstPageWrapper = document.createElement('div');
  
  // Copy classes from the first container to the wrapper to preserve styling
  firstPageWrapper.className = firstContainer.className;
  firstPageWrapper.id = 'autopaginator-first-page';
  firstPageWrapper.dataset.url = originalUrl;
  
  const insertionPoint = firstContainer;
  if (insertionPoint.parentNode) {
    insertionPoint.parentNode.insertBefore(firstPageWrapper, insertionPoint);
  }

  // Move all matched containers into the wrap.
  containers.forEach(c => {
    firstPageWrapper.appendChild(c);
  });
  setupHistoryObserver(firstPageWrapper, originalUrl);

  // 3. Setup Trigger
  // Add a sentinel as a reliable fallback even for the first page
  const firstSentinel = document.createElement('div');
  firstSentinel.style.height = '1px';
  firstSentinel.style.width = '1px';
  firstSentinel.style.visibility = 'hidden';
  firstPageWrapper.appendChild(firstSentinel);
  
  setupNextLinkObserver(nextLink);
  setupNextLinkObserver(firstSentinel);
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
    rootMargin: '600px', // Increased margin for smoother loading
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
  const newContainers = findContentContainers(doc, currentSiteConfig?.pageElement);
  const fetchedNextLink = findNextPageLink(doc, currentSiteConfig?.nextLink);

  if (newContainers.length > 0 && contentContainer) {
    const pageWrapper = document.createElement('div');
    const templateContainer = newContainers[0];
    if (templateContainer) {
      pageWrapper.className = templateContainer.className;
    }
    pageWrapper.classList.add('autopaginator-page');
    pageWrapper.dataset.url = url;
    pageWrapper.style.marginTop = '20px';
    pageWrapper.style.borderTop = '1px dashed #ccc';
    pageWrapper.innerHTML = `<!-- Page: ${url} -->`;
    
    const fragment = document.createDocumentFragment();
    newContainers.forEach(container => {
      fragment.appendChild(document.importNode(container, true));
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

    // Update nextPageUrl from the FETCHED document
    if (fetchedNextLink) {
      nextPageUrl = fetchedNextLink.href;
      
      // Find the corresponding live link in the document to observe it
      const liveNextLink = findNextPageLink(document, currentSiteConfig?.nextLink);
      if (liveNextLink && liveNextLink.href === nextPageUrl) {
        setupNextLinkObserver(liveNextLink);
      } else {
        // Fallback: If we can't find a matching live link (e.g. it's outside the container),
        // we use a sentinel at the end of the wrapper to trigger the next fetch.
        const sentinel = document.createElement('div');
        sentinel.style.height = '1px';
        sentinel.style.width = '1px';
        sentinel.style.visibility = 'hidden';
        pageWrapper.appendChild(sentinel);
        setupNextLinkObserver(sentinel);
      }
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
