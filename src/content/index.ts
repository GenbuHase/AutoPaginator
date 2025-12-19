import { findNextPageLink } from '../utils/next-page';
import { findContentContainer } from '../utils/dom';

let isLoading = false;
let nextPageUrl: string | null = null;
let contentContainer: HTMLElement | null = null;
// Store visited URLs to prevent loops
const visitedUrls = new Set<string>();

import { storage, isBlacklisted } from '../utils/storage';

async function init() {
  console.log("[AutoPaginator] Initializing...");
  
  const settings = await storage.get();
  if (!settings.enabled) {
     console.log("[AutoPaginator] Disabled globally.");
     return;
  }
  
  if (isBlacklisted(location.href, settings.blacklist)) {
     console.log("[AutoPaginator] Disabled on this domain.");
     return;
  }

  // 1. Find Next Page Link
  const nextLink = findNextPageLink(document);
  if (!nextLink) {
    console.log("[AutoPaginator] No next page link found.");
    return;
  }
  nextPageUrl = nextLink.href;
  visitedUrls.add(location.href);

  // 2. Find Main Content Container
  contentContainer = findContentContainer(document);
  if (!contentContainer) {
    // console.warn("[AutoPaginator] Content container not found. Aborting."); // Silent fail is better for generic tools?
    return;
  }

  // 3. Setup Scroll Trigger (Sentinel)
  createSentinel();
}

function createSentinel() {
  const sentinel = document.createElement('div');
  sentinel.id = 'autopaginator-sentinel';
  sentinel.textContent = 'Loading more content...';
  sentinel.style.textAlign = 'center';
  sentinel.style.padding = '20px';
  sentinel.style.opacity = '0.5';
  
  if (contentContainer) {
    contentContainer.appendChild(sentinel);
    
    const observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: '400px', // Trigger well before bottom
      threshold: 0.1
    });
    observer.observe(sentinel);
  }
}

async function handleIntersect(entries: IntersectionObserverEntry[]) {
  const entry = entries[0];
  if (entry?.isIntersecting && !isLoading && nextPageUrl) {
    if (visitedUrls.has(nextPageUrl)) {
        console.warn("[AutoPaginator] Loop detected or already visited:", nextPageUrl);
        nextPageUrl = null;
        return;
    }

    isLoading = true;
    console.log("[AutoPaginator] Fetching:", nextPageUrl);
    
    // UI Feedback (Sentinel is already "Loading...")
    
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
}

function processNextPage(doc: Document, url: string) {
  // Extract content
  // We try to find the container matching our current contentContainer's selector if possible, 
  // or re-run findContentContainer logic on new doc.
  const newContainer = findContentContainer(doc);
  
  if (newContainer && contentContainer) {
    // Create a page wrapper for history handling
    const pageWrapper = document.createElement('div');
    pageWrapper.classList.add('autopaginator-page');
    pageWrapper.dataset.url = url;
    pageWrapper.style.marginTop = '20px';
    pageWrapper.style.borderTop = '1px dashed #ccc';
    pageWrapper.innerHTML = `<!-- Page: ${url} -->`;
    
    // Move children
    const fragment = document.createDocumentFragment();
    Array.from(newContainer.children).forEach(child => {
        // Skip next/prev links in the imported content to avoid clutter?
        // For now, import everything.
        fragment.appendChild(document.importNode(child, true));
    });
    pageWrapper.appendChild(fragment);
    
    // Remove old sentinel
    const oldSentinel = document.getElementById('autopaginator-sentinel');
    if (oldSentinel) oldSentinel.remove();
    
    // Append new page
    contentContainer.appendChild(pageWrapper);
    
    // Setup History Observer for this page
    setupHistoryObserver(pageWrapper, url);
    
    // Update State for next fetch
    visitedUrls.add(url);
    const newNextLink = findNextPageLink(doc);
    if (newNextLink) {
      nextPageUrl = newNextLink.href;
      // Re-add sentinel
      createSentinel();
    } else {
      nextPageUrl = null;
      // End indicator
      const endMsg = document.createElement('div');
      endMsg.textContent = 'No more pages.';
      endMsg.style.textAlign = 'center';
      endMsg.style.padding = '20px';
      contentContainer.appendChild(endMsg);
    }
  } else {
      console.warn("[AutoPaginator] Could not identify content in fetched page.");
  }
}

function setupHistoryObserver(element: HTMLElement, url: string) {
    // Observe when this element takes up the majority of the viewport?
    // Or just when it hits the top?
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
                // Update URL
                console.log("[AutoPaginator] Scrolled to:", url);
                history.replaceState(null, '', url);
            }
        });
    }, { threshold: [0.1, 0.5] });
    
    observer.observe(element);
}

// Safety: prevent running in frames?
if (window.self === window.top) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
