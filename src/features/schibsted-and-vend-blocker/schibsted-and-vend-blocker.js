const CONSENT_IFRAME_SELECTOR = 'iframe[src*="cmp"], iframe[id^="sp_message_iframe_"]';
const MAIN_CONTENT_SELECTOR = 'main#application';
const SCROLL_LOCK_CLASS = 'sp-message-open';

function removeConsentIframe(iframe) {
  const container = iframe.closest('[id^="sp_message_container_"]');
  // Extra safety: make sure we don't accidentally nuke the main application
  if (container && container !== document.body && !container.matches(MAIN_CONTENT_SELECTOR)) {
    container.remove();
    return;
  }

  const parent = iframe.parentElement;
  if (parent && parent !== document.body && !parent.matches(MAIN_CONTENT_SELECTOR)) {
    parent.remove();
  } else {
    iframe.remove();
  }
}

function findConsentIframes(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const matches = node.matches(CONSENT_IFRAME_SELECTOR) ? [node] : [];
  matches.push(...node.querySelectorAll(CONSENT_IFRAME_SELECTOR));
  return matches;
}

function unlockScrollable(element) {
  if (!element) return;
  const style = getComputedStyle(element);

  // Guard clause: Only mutate if absolutely necessary to prevent infinite loop
  if (style.overflow === 'hidden' && element.style.overflow !== 'visible') {
    element.style.setProperty('overflow', 'visible', 'important');
  }
  if (style.position === 'fixed' && element.style.position !== 'static') {
    element.style.setProperty('position', 'static', 'important');
  }
}

function enforceScrollable() {
  // Temporarily disconnect observer to prevent triggering a mutation event on our own changes
  scrollLockObserver.disconnect();

  document.documentElement.classList.remove(SCROLL_LOCK_CLASS);
  document.body.classList.remove(SCROLL_LOCK_CLASS);

  unlockScrollable(document.documentElement);
  unlockScrollable(document.body);
  unlockScrollable(document.querySelector(MAIN_CONTENT_SELECTOR));

  // Reconnect after cleanup
  reconnectScrollObservers();
}

const scrollLockObserver = new MutationObserver(enforceScrollable);

function reconnectScrollObservers() {
  const observerConfig = { attributes: true, attributeFilter: ['class', 'style'] };

  scrollLockObserver.observe(document.documentElement, observerConfig);
  scrollLockObserver.observe(document.body, observerConfig);

  const main = document.querySelector(MAIN_CONTENT_SELECTOR);
  if (main) {
    scrollLockObserver.observe(main, observerConfig);
  }
}

function watchMainContent() {
  const main = document.querySelector(MAIN_CONTENT_SELECTOR);
  if (main && !main.dataset.scrollWatch) {
    main.dataset.scrollWatch = 'true';
    reconnectScrollObservers(); // Re-bind observers to include main content
  }
}

function handleDomMutations(mutations) {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => {
      findConsentIframes(node).forEach(removeConsentIframe);
    });
  }
  watchMainContent();
}

// Initial Execution
document.querySelectorAll(CONSENT_IFRAME_SELECTOR).forEach(removeConsentIframe);
enforceScrollable();
watchMainContent();

const domObserver = new MutationObserver(handleDomMutations);
domObserver.observe(document.documentElement, { childList: true, subtree: true });