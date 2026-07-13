const CONSENT_IFRAME_SELECTOR = 'iframe[src*="cmp"], iframe[id^="sp_message_iframe_"]';
const MAIN_CONTENT_SELECTOR = 'main#application';
const SCROLL_LOCK_CLASS = 'sp-message-open';

function removeConsentIframe(iframe) {
  const container = iframe.closest('[id^="sp_message_container_"]');
  if (container && container !== document.body) {
    container.remove();
    return;
  }

  const parent = iframe.parentElement;
  if (parent && parent !== document.body) {
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
  if (style.overflow === 'hidden') {
    element.style.setProperty('overflow', 'visible', 'important');
  }
  if (style.position === 'fixed') {
    element.style.setProperty('position', 'static', 'important');
  }
}

function enforceScrollable() {
  document.documentElement.classList.remove(SCROLL_LOCK_CLASS);
  document.body.classList.remove(SCROLL_LOCK_CLASS);
  unlockScrollable(document.documentElement);
  unlockScrollable(document.body);
  unlockScrollable(document.querySelector(MAIN_CONTENT_SELECTOR));
}

const scrollLockObserver = new MutationObserver(enforceScrollable);

function watchMainContent() {
  const main = document.querySelector(MAIN_CONTENT_SELECTOR);
  if (main && !main.dataset.scrollWatch) {
    main.dataset.scrollWatch = 'true';
    scrollLockObserver.observe(main, { attributes: true, attributeFilter: ['class', 'style'] });
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

document.querySelectorAll(CONSENT_IFRAME_SELECTOR).forEach(removeConsentIframe);
enforceScrollable();
watchMainContent();

const domObserver = new MutationObserver(handleDomMutations);
domObserver.observe(document.documentElement, { childList: true, subtree: true });

scrollLockObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
scrollLockObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
