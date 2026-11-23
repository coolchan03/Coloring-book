// The address bar (and so the browser's and Android's Back button) follows the screens:
// #home, #c/<category>, #p/<page>.
let handlers = null;

const decode = (s) => { try { return decodeURIComponent(s); } catch (e) { return ''; } };   // a hand-edited address must never break the app

export function route() {
  const h = decode(location.hash.slice(1));
  if (h.startsWith('p/')) {
    if (handlers.page(h.slice(2))) return;
    history.replaceState(null, '', '#home');       // that picture is gone (deleted, or a stale link)
  } else if (h.startsWith('c/')) {
    if (handlers.category(h.slice(2))) return;
    history.replaceState(null, '', '#home');
  }
  handlers.home();
}

export function go(h, replace) {
  if (decode(location.hash.slice(1)) !== decode(h)) history[replace ? 'replaceState' : 'pushState'](null, '', '#' + h);
  route();
}

// handlers: { home(), category(id) -> bool, page(key) -> bool }
export function startRouter(h) {
  handlers = h;
  window.addEventListener('popstate', route);
  route();
}
