// compare-monitor.js — updated: legend toggles hide/show color-coded elements inside compare popup only
// wss://socket-0akf.onrender.com/?id=sai


window.fetchLog = false;
window.fetchNetwork = false;
async function simulateKeydown(key, options = {}) {
    // Key code mapping for common keys
    const keyCodeMap = {
        'Enter': 13,
        'Escape': 27,
        'Space': 32,
        'ArrowUp': 38,
        'ArrowDown': 40,
        'ArrowLeft': 37,
        'ArrowRight': 39,
        'Tab': 9,
        'Backspace': 8,
        'Delete': 46,
        'Home': 36,
        'End': 35,
        'PageUp': 33,
        'PageDown': 34,
        'F1': 112,
        'F2': 113,
        'F3': 114,
        'F4': 115,
        'F5': 116,
        'F6': 117,
        'F7': 118,
        'F8': 119,
        'F9': 120,
        'F10': 121,
        'F11': 122,
        'F12': 123
    };
    var eventOptions = {
        key: key,
        code: (key.length === 1 ? "Key" + key.toUpperCase() : key),
        keyCode: (keyCodeMap[key] ? keyCodeMap[key] : key.charCodeAt(0)),
        which: (keyCodeMap[key] ? keyCodeMap[key] : key.charCodeAt(0)),
        bubbles: true,
        cancelable: true
    };

    // Merge extra options (manual merge instead of spread operator)
    if (options && typeof options === "object") {
        for (var prop in options) {
            if (options.hasOwnProperty(prop)) {
                eventOptions[prop] = options[prop];
            }
        }
    }


    // Create and dispatch the keydown event on window
    const keydownEvent = new KeyboardEvent('keydown', eventOptions);
    window.dispatchEvent(keydownEvent);

    // Also dispatch keypress for character keys
    if (key.length === 1) {
        const keypressEvent = new KeyboardEvent('keypress', eventOptions);
        window.dispatchEvent(keypressEvent);
    }

    // Dispatch keyup event
    const keyupEvent = new KeyboardEvent('keyup', eventOptions);
    window.dispatchEvent(keyupEvent);
}

function waitForTimeout(ms) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve();
        }, ms);
    });
}
// pass an array of attributes, object
// it will traverse through the object and returns it's value, else it will return false
function findAttributes(attrs, obj) {
    var result = {};

    // initialize result with false
    for (var i = 0; i < attrs.length; i++) {
        result[attrs[i]] = false;
    }

    function search(o) {
        if (o && typeof o === "object") {
            for (var key in o) {
                if (o.hasOwnProperty(key)) {
                    // if this key is one of the attributes we want
                    if (result.hasOwnProperty(key) && result[key] === false) {
                        result[key] = o[key];
                    }
                    // recurse deeper
                    search(o[key]);
                }
            }
        }
    }
    search(obj);
    return result;
}

async function triggerContinueWatch(n) {
    for (i = 0; i < n; i++) {
        postMessageViaSocket({ type: 'log', msg: `continue watch test iteration: ${i}` });
        await simulateKeydown('Enter');
        await waitForTimeout(18000);
        await simulateKeydown('Backspace');
        await waitForTimeout(3000);
    }
}

function captureLogs() {
    var methods = ["log", "info", "warn", "error"];
    var original = {};
    for (var i = 0; i < methods.length; i++) {
        (function (method) {
            original[method] = console[method];
            console[method] = function () {
                var args = [];
                switch(method){
                    case 'log':
                        args.push('📝');
                        break;
                    case 'info':
                        args.push('ℹ️');
                        break;
                    case 'warn':
                        args.push('⚠️');
                        break;
                    case 'error':
                        args.push('❗');
                        break;
                }
                for (var j = 0; j < arguments.length; j++) {
                    args.push(arguments[j]);
                }
                postMessageViaSocket({ type: 'log', msg: args });
                original[method].apply(console, arguments);
            };
        })(methods[i]);
    }
    return;
}

async function triggerPlayGroundSteps(steps) {
    var isLastActionKey = false;
    if (steps == 'fetchLog') {
        window.fetchLog = true;
        captureLogs();
        return;
    } else if (steps == 'fetchNetwork') {
        window.fetchNetwork = true;
        return;
    }
    for (var i = 0; i < steps.length; i++) {
        switch (steps[i].cmd) {
            case 'press':
                console.log('press');
                if (isLastActionKey)
                    await waitForTimeout(500);
                await simulateKeydown(steps[i].key);
                isLastActionKey = true;
                break;
            case 'wait':
                console.log('wait');
                await waitForTimeout(steps[i].ms);
                isLastActionKey = false;
                break;
        }
    }
}


// expected output {"cmd":"press","key":"enter","raw":"press enter","loop":1}
// expected output {"cmd":"wait","ms":15000,"raw":"wait 15000","loop":1}
async function formatPlayGroundSteps() {
    var str = document.getElementById('playGround').value || '';
    if (!str) return [];
    try {
        // str = str.toLowerCase();
        var commandList = [];
        var parts = str.split('\n');
        for (var i = 0; i < parts.length; i++) {
            var s = parts[i].trim();
            if (s.length > 0) {
                commandList.push(s);
            }
        }
        // find the first "start N" and the first "end" after it
        var startIndex = -1;
        var repeatCount = 1;
        for (var i = 0; i < commandList.length; i++) {
            var m = commandList[i].match(/^start\s+(\d+)$/);
            if (m) {
                startIndex = i;
                repeatCount = parseInt(m[1], 10) || 1;
                break;
            }
        }
        if (startIndex === -1) {
            console.warn('No start found — nothing to repeat.');
            return [];
        }
        var endIndex = -1;
        for (var j = startIndex + 1; j < commandList.length; j++) {
            if (commandList[j] === 'end') {
                endIndex = j;
                break;
            }
        }
        if (endIndex === -1) {
            console.warn('No end found — taking until end of input.');
            endIndex = commandList.length;
        }
        // commands between start and end (exclusive)
        var block = commandList.slice(startIndex + 1, endIndex);
        // parse a single line into an instruction object
        function parseLine(line) {
            var parts = line.split(/\s+/);
            if (parts[0] === 'press') {
                // press <key>
                return { cmd: 'press', key: parts.slice(1).join(' ') || null, raw: line };
            }
            if (parts[0] === 'wait') {
                // wait <ms>
                var ms = parseInt(parts[1], 10);
                if (isNaN(ms)) ms = 0;
                return { cmd: 'wait', ms: ms, raw: line };
            }
            // unknown command
            return { cmd: 'unknown', text: line };
        }
        // generate instructions repeated repeatCount times
        var instructions = [];
        for (var rep = 0; rep < repeatCount; rep++) {
            for (var k = 0; k < block.length; k++) {
                var instr = parseLine(block[k]);
                // annotate which loop iteration (1-based) and original index if useful
                instr.loop = rep + 1;
                instructions.push(instr);
            }
        }
        // return instructions;
        postMessageViaSocket({ type: 'command', list: instructions }, true);
    } catch (e) {
        console.error('illegal commands: ' + e);
        return [];
    }
}



// async function openL1Menu() {
//     let menuOpen = false;
//     while(!menuOpen) {
//         await simulateKeydown('ArrowLeft');
//         await waitForTimeout(500);
//         let leftMenu = await locateByClass("sidebar-module__sidebarContainer__r9S3v");
//         if (leftMenu.element().className.includes("menuFocused")){
//             menuOpen = true;
//         }
//     }
//     const homeItem = await locateByText('Home', {exact: true});
//     // expect(homeItem).toBeVisible();
//     if(!MENU_ITEMS.length)
//         await getL1MenuItems();
// }

// get all menu items from L1 menu
// async function getL1MenuItems() {
//     const menuItems = await locateByClass('sidebar-module__menuItem__P31kr');
//     for(var i = 0; i < menuItems.count(); i++){
//         MENU_ITEMS.push(menuItems.element(i).textContent.trim());
//     }
// }

// establish socket connection.
var WS = '';
var WS_LIVE = false;
var SOCKET_ID = '';
var STATUS = 'Idle';
var SOCKET_QUE = [];
window.MESSED = [];
var GAGV = (function () {
    if (window.__compareMonitorInstalled) return;
    window.__compareMonitorInstalled = true;
    window.__compareIgnoreKeys = window.__compareIgnoreKeys || ["timestamp", "event_type", "event_id", "TimeStamp"];

    // Config (update fragments if needed)
    const ENDPOINT_A_FRAGMENT = 'google-analytics.com/mp/collect';
    const ENDPOINT_B_FRAGMENT = 'evt.sonyliv.com/v2/smarttv/priority/records';
    const ENDPOINT_C_FRAGMENT = 'evt.sonyliv.com/v2/smarttv/batched/records';
    const ENDPOINT_BEACON = 'api-godavari.sonyliv.com/beacon';

    // DOM ids
    const OVERLAY_ID = '__compare_overlay';
    const TABLE_ID = '__compare_table';
    const TBODY_ID = '__compare_tbody';
    const STATUS_ID = '__compare_status';
    const COMPARE_VIEW_ID = '__compare_fullscreen';
    const COMPARE_LEFT_ID = '__compare_left';
    const COMPARE_RIGHT_ID = '__compare_right';
    const COMPARE_INDEX_ID = '__compare_index';
    const COMPARE_TITLE_ID = '__compare_title';

    // Colors
    const COLOR_GREEN = '#0b9a5a';
    const COLOR_YELLOW = '#e1c542';
    const COLOR_ORANGE = '#b46a00';
    const COLOR_RED = '#d0421b';
    const COLOR_GRAY = '#999';

    // Internal state
    const state = {
        running: false,
        unsub: null,
        listA: [],
        listB: [],   // each item will have .sourceType = 'B'|'C', .payload, .evtName, .event_id
        queueB: [],
        rows: [],    // { sn, aItem, bItem|null, eventId, tr, snCell, leftCell, rightCell, eventIdCell, pCell, cCell }
        compareIndex: 0,
        compareOpen: false,
        activeFilters: { green: true, yellow: true, orange: true, red: true }, // allow toggling of which colors to show
    };


    // element helper
    function el(tag, props = {}, ...children) {
        const node = document.createElement(tag);
        for (const k in props) {
            if (k === 'style' && typeof props[k] === 'object') Object.assign(node.style, props[k]);
            else if (k === 'html') node.innerHTML = props[k];
            else node.setAttribute(k, props[k]);
        }
        children.flat().forEach(c => {
            if (c == null) return;
            if (typeof c === 'string') node.appendChild(document.createTextNode(c));
            else node.appendChild(c);
        });
        return node;
    }

    // ---------------- UI ----------------
    function ensureOverlay() {
        let overlay = document.getElementById(OVERLAY_ID);
        if (overlay) return overlay;
        overlay = el('div', {
            id: OVERLAY_ID,
            style: {
                position: 'fixed',
                right: '0',
                top: '0',
                width: window.isClient ? '97%' : '50%',
                height: '100%',
                background: 'rgba(255,255,255,0.02)',
                zIndex: String(2147483647),
                pointerEvents: 'auto',
                display: 'block',
                boxSizing: 'border-box',
                padding: '12px',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial'
            }
        });

        const card = el('div', {
            style: {
                width: '100%',
                height: '100%',
                background: 'rgba(255,255,255,0.92)',
                borderRadius: '6px',
                boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }
        });

        const header = el('div', { style: { padding: '8px 12px', borderBottom: '1px solid #eee', display: 'flex', gap: '8px', alignItems: 'center' } },
            el('div', { style: { fontWeight: 'bold', color: 'black', fontSize: '25px' } }, 'Events Monitor'),
            el('div', { id: STATUS_ID, style: { marginLeft: 'auto', fontSize: '13px', color: '#333', fontWeight: 'bold' } }, 'Idle'),
            el('div', { id: 'socket_id', style: { marginLeft: 'auto', fontSize: '10px', color: '#333', fontWeight: 'bold' } }, '')
        );

        const tableWrap = el('div', {
            style: {
                padding: '8px 12px',
                overflowY: 'scroll',
                flex: '1 1 auto',
                fontSize: '13px'
            }
        }, el('div', { id: TABLE_ID, style: { width: '100%' } }));

        card.appendChild(header);
        if (window.isClient) {
            var report = el('button', { id: 'compare_view', style: { padding: '8px 12px' } }, 'Reports');
            report.addEventListener('click', function () {
                compareControl('compare');
            })
            card.appendChild(report);
        }
        card.appendChild(tableWrap);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        buildTableSkeleton();
        return overlay;
    }

    function showOverlay() {
        ensureOverlay().style.display = 'block';
        if (!window.isClient)
            connectToSocket();
    }
    function hideOverlay() { const ov = document.getElementById(OVERLAY_ID); if (ov) ov.style.display = 'none'; }

    // Table skeleton: S.No | GA | GV | EventID | P | C
    function buildTableSkeleton() {
        const tableRoot = document.getElementById(TABLE_ID);
        if (!tableRoot) return;
        tableRoot.innerHTML = '';

        const table = el('table', { style: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' } });
        var thead = '';
        if (window.isClient)
            thead = el('thead', {},
                el('tr', {},
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '5%' } }, 'S.No'),
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '10%' } }, 'GA TS'),
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '32.5%' } }, 'GA'),
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '10%' } }, 'GV TS'),
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '32.5%' } }, 'GV'),
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '20%' } }, 'EventID'),
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '5%' } }, 'P'),
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '5%' } }, 'B')
                )
            );
        else
            thead = el('thead', {},
                el('tr', {},
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '5%' } }, 'S.No'),
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '32.5%' } }, 'GA'),
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '32.5%' } }, 'GV'),
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '20%' } }, 'EventID'),
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '5%' } }, 'P'),
                    el('th', { style: { color: 'black', textAlign: 'center', padding: '6px', borderBottom: '1px solid #ddd', width: '5%' } }, 'B')
                )
            );
        table.appendChild(thead);
        const tbody = el('tbody', { id: TBODY_ID });
        table.appendChild(tbody);
        tableRoot.appendChild(table);
    }

    // ------------- helpers -------------
    function extractPayloadFromEvent(evt) {
        if (!evt) return null;
        if (evt.rawRequestBodyPreview) return evt.rawRequestBodyPreview;
        if (evt.requestBody) return evt.requestBody;
        try {
            if (evt.request && evt.request.postData && evt.request.postData.text) return evt.request.postData.text;
            if (evt.raw && evt.raw.request && evt.raw.request.postData && evt.raw.request.postData.text) return evt.raw.request.postData.text;
            if (evt.raw && evt.raw.request && evt.raw.request.body) return evt.raw.request.body;
            if (evt.raw && evt.raw.request && evt.raw.request.data) return evt.raw.request.data;
        } catch (e) { }
        try { if (evt.raw && evt.raw.request) return JSON.stringify(evt.raw.request); } catch (e) { }
        return null;
    }

    function tryParseJsonSafe(text) {
        if (text == null) return { ok: false, value: null, error: 'no-text' };
        if (typeof text !== 'string') {
            if (typeof text === 'object') return { ok: true, value: text, error: null };
            return { ok: false, value: String(text), error: 'not-string' };
        }
        try { return { ok: true, value: JSON.parse(text), error: null }; }
        catch (e) { return { ok: false, value: text, error: e.message }; }
    }

    // ignore keys
    function stripIgnoredKeys(obj, ignoreSet) {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(v => stripIgnoredKeys(v, ignoreSet));
        const out = {};
        for (const key of Object.keys(obj)) {
            if (ignoreSet.has(key)) continue;
            out[key] = stripIgnoredKeys(obj[key], ignoreSet);
        }
        return out;
    }
    function getIgnoreSet() {
        const arr = Array.isArray(window.__compareIgnoreKeys) ? window.__compareIgnoreKeys : [];
        return new Set(arr.map(x => String(x)));
    }

    // tolerant comparison
    function primitiveLooseEqual(a, b) {
        if (a === b) return true;
        const an = Number(a);
        const bn = Number(b);
        if (!Number.isNaN(an) && !Number.isNaN(bn)) {
            if (an === bn) return true;
        }
        const aBool = toBooleanIfPossible(a);
        const bBool = toBooleanIfPossible(b);
        if (aBool !== null && bBool !== null) return aBool === bBool;
        try { return String(a).trim() === String(b).trim(); } catch (e) { return false; }
    }
    function toBooleanIfPossible(v) {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v === 1 ? true : v === 0 ? false : null;
        if (typeof v === 'string') {
            const s = v.trim().toLowerCase();
            if (s === 'true' || s === '1') return true;
            if (s === 'false' || s === '0') return false;
        }
        return null;
    }
    function tolerantMatch(a, b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        const ta = typeof a;
        const tb = typeof b;
        if (ta !== 'object' && tb !== 'object') {
            return primitiveLooseEqual(a, b);
        }
        if (Array.isArray(a)) {
            if (!Array.isArray(b)) return false;
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) if (!tolerantMatch(a[i], b[i])) return false;
            return true;
        }
        if (ta === 'object') {
            if (typeof b !== 'object' || Array.isArray(b)) return false;
            for (const key of Object.keys(a)) {
                if (!(key in b)) return false;
                if (!tolerantMatch(a[key], b[key])) return false;
            }
            return true;
        }
        return String(a) === String(b);
    }

    // strict deep equal
    function strictDeepEqual(x, y) {
        if (x === y) return true;
        if (x == null || y == null) return false;
        if (Array.isArray(x) || Array.isArray(y)) {
            if (!Array.isArray(x) || !Array.isArray(y)) return false;
            if (x.length !== y.length) return false;
            for (let i = 0; i < x.length; i++) if (!strictDeepEqual(x[i], y[i])) return false;
            return true;
        }
        if (typeof x === 'object' || typeof y === 'object') {
            if (typeof x !== 'object' || typeof y !== 'object') return false;
            const kx = Object.keys(x).sort();
            const ky = Object.keys(y).sort();
            if (kx.length !== ky.length) return false;
            for (let i = 0; i < kx.length; i++) {
                if (kx[i] !== ky[i]) return false;
                if (!strictDeepEqual(x[kx[i]], y[ky[i]])) return false;
            }
            return true;
        }
        return false;
    }

    function compareMatchType(aRaw, bRaw) {
        const pa = (typeof aRaw === 'string') ? tryParseJsonSafe(aRaw) : { ok: true, value: aRaw };
        const pb = (typeof bRaw === 'string') ? tryParseJsonSafe(bRaw) : { ok: true, value: bRaw };
        const a = pa.ok ? pa.value : pa.value;
        const b = pb.ok ? pb.value : pb.value;
        const ignoreSet = getIgnoreSet();
        let aStr = a, bStr = b;
        try { aStr = stripIgnoredKeys(a, ignoreSet); bStr = stripIgnoredKeys(b, ignoreSet); } catch (e) { }
        const fullMatch = strictDeepEqual(aStr, bStr);
        const looseMatch = tolerantMatch(aStr, bStr);
        const looseMatchTypeDiff = looseMatch && !fullMatch;
        return { fullMatch: !!fullMatch, looseMatchTypeDiff: !!looseMatchTypeDiff };
    }

    function deepEqualPayload(a, b) {
        const ignoreSet = getIgnoreSet();
        const pa = (typeof a === 'string') ? tryParseJsonSafe(a) : { ok: true, value: a };
        const pb = (typeof b === 'string') ? tryParseJsonSafe(b) : { ok: true, value: b };
        let va = pa.ok ? pa.value : pa.value;
        let vb = pb.ok ? pb.value : pb.value;
        try { va = stripIgnoredKeys(va, ignoreSet); vb = stripIgnoredKeys(vb, ignoreSet); } catch (e) { }
        try { return tolerantMatch(va, vb); } catch (e) { return primitiveLooseEqual(va, vb); }
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, function (m) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
        });
    }

    function deepSort(obj) {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) return obj.map(item => deepSort(item));
        if (typeof obj === 'object') {
            const keys = Object.keys(obj).sort();
            const out = {};
            for (const k of keys) out[k] = deepSort(obj[k]);
            return out;
        }
        return obj;
    }

    // transform helpers
    function transformGAtoGV(payload) {
        if (!payload || typeof payload !== 'object') return payload;
        try {
            const ev = Array.isArray(payload.events) && payload.events[0] ? payload.events[0] : (payload.event ? payload.event : {});
            const params = ev.params || {};
            const context = (payload.user_properties && typeof payload.user_properties === 'object')
                ? Object.fromEntries(Object.entries(payload.user_properties).map(([k, v]) => [k, (v && v.value !== undefined) ? v.value : v]))
                : {};
            const out = {
                context,
                event_category: params.eventCategory || params.event_category || '',
                event_data: Object.assign({}, params),
                event_id: ev.id || ev.event_id || (payload.event_id || ''),
                event_name: ev.name || payload.event_name || '',
                event_type: ev.type || '',
                timestamp: payload.timestamp || ev.timestamp || ''
            };
            out.context.SessionId = out.context.gv_SessionId || '';
            delete out.event_data.eventCategory;
            delete out.event_data.event_category;
            try {
                if (out.event_data && typeof out.event_data.items === 'string') {
                    out.event_data.items = JSON.parse(out.event_data.items);
                }
            } catch (e) { }
            return deepSort(out);
        } catch (e) {
            return payload;
        }
    }

    function transformGVforGA(payload) {
        if (!payload || typeof payload !== 'object') return payload;
        try {
            const out = Object.assign({}, payload);
            if (payload.event_data && payload.event_data.items) {
                try {
                    if (typeof out.event_data.items === 'string') out.event_data.items = JSON.parse(out.event_data.items);
                    out.event_data = Object.assign({}, out.event_data);
                } catch (e) { }
            }
            if (!out.event_id) {
                if (out.eventId) out.event_id = out.eventId;
                else if (out.id) out.event_id = out.id;
            }
            out.context.gv_SessionId = out.context.SessionId || '';
            return deepSort(out);
        } catch (e) {
            return payload;
        }
    }

    // event name heuristics
    function extractEvtNameFromEventObject(obj) {
        if (!obj) return '(unknown)';
        if (typeof obj === 'string') return obj;
        try {
            if (typeof obj.event_name === 'string') return obj.event_name;
            if (typeof obj.name === 'string') return obj.name;
            if (obj.event && typeof obj.event.name === 'string') return obj.event.name;
            if (Array.isArray(obj.events) && obj.events[0] && typeof obj.events[0].name === 'string') return obj.events[0].name;
        } catch (e) { }
        try { if (obj && typeof obj === 'object' && Object.keys(obj).length > 0) return Object.keys(obj)[0]; } catch (e) { }
        return '(unknown)';
    }


    // get event_id helper
    function getEventIdFromPayload(p) {
        if (!p || typeof p !== 'object') return '';
        const id = (p.event_id !== undefined && p.event_id !== null) ? p.event_id
            : (p.eventId !== undefined && p.eventId !== null) ? p.eventId
                : (p.id !== undefined && p.id !== null) ? p.id : '';
        return String(id || '');
    }

    // items array helpers (optional deeper mapping)
    function getItemsArray(payload) {
        try {
            if (!payload || typeof payload !== 'object') return null;
            if (payload.event_data && Array.isArray(payload.event_data.items)) return payload.event_data.items;
            if (payload.event_data && typeof payload.event_data.items === 'string') {
                try {
                    const parsed = JSON.parse(payload.event_data.items);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) { return null; }
            }
            return null;
        } catch (e) { return null; }
    }
    function itemsArrayMatchInOrder(aPayload, bPayload) {
        const aItems = getItemsArray(aPayload);
        const bItems = getItemsArray(bPayload);
        if (!Array.isArray(aItems) || !Array.isArray(bItems)) return false;
        if (aItems.length !== bItems.length) return false;
        for (let i = 0; i < aItems.length; i++) if (!tolerantMatch(aItems[i], bItems[i])) return false;
        return true;
    }

    // scroll helper
    function scrollTableToBottom() {
        try {
            const tableRoot = document.getElementById(TABLE_ID);
            if (!tableRoot) return;
            let scroller = tableRoot;
            while (scroller && scroller !== document.body) {
                const overflowY = window.getComputedStyle(scroller).overflowY;
                if (overflowY === 'auto' || overflowY === 'scroll') break;
                scroller = scroller.parentElement;
            }
            if (!scroller) scroller = tableRoot.parentElement || document.documentElement;
            scroller.scrollTop = scroller.scrollHeight;
            const tb = document.getElementById(TBODY_ID);
            if (tb && tb.lastElementChild) tb.lastElementChild.scrollIntoView({ block: 'end', inline: 'nearest' });
        } catch (e) { }
    }

    // Render payload diff with color coding (left/right panes)
    function renderPayloadDiffHtml(aRaw, bRaw) {
        const ignoreSet = getIgnoreSet();
        const pa = (typeof aRaw === 'string') ? tryParseJsonSafe(aRaw) : { ok: true, value: aRaw };
        const pb = (typeof bRaw === 'string') ? tryParseJsonSafe(bRaw) : { ok: true, value: bRaw };
        let a = pa.ok ? pa.value : pa.value;
        let b = pb.ok ? pb.value : pb.value;
        try { a = stripIgnoredKeys(a, ignoreSet); b = stripIgnoredKeys(b, ignoreSet); } catch (e) { }

        function build(aVal, bVal) {
            if (aVal == null && bVal == null) {
                return ['<span style="color:#aaa">(empty)</span>', '<span style="color:#aaa">(empty)</span>'];
            }

            // primitives
            if ((typeof aVal !== 'object' || aVal === null) && (typeof bVal !== 'object' || bVal === null)) {
                const aExists = !(aVal === undefined);
                const bExists = !(bVal === undefined);

                if (!aExists && bExists) {
                    return ['<span style="color:#aaa">(missing)</span>', `<span style="color:${COLOR_GREEN}">${escapeHtml(String(bVal))}</span>`];
                }
                if (aExists && !bExists) {
                    return [`<span style="color:${COLOR_RED}">${escapeHtml(String(aVal))}</span>`, '<span style="color:#aaa">(missing)</span>'];
                }

                if (typeof aVal === typeof bVal && aVal === bVal) {
                    return [`<span style="color:${COLOR_GREEN}">${escapeHtml(String(aVal))}</span>`, `<span style="color:${COLOR_GREEN}">${escapeHtml(String(bVal))}</span>`];
                }

                if (primitiveLooseEqual(aVal, bVal) && typeof aVal !== typeof bVal) {
                    return [`<span style="color:${COLOR_GREEN}">${escapeHtml(String(aVal))}</span>`, `<span style="color:${COLOR_GREEN}">${escapeHtml(String(bVal))}</span>`];
                }

                return [`<span style="color:${COLOR_ORANGE}">${escapeHtml(String(aVal))}</span>`, `<span style="color:${COLOR_ORANGE}">${escapeHtml(String(bVal))}</span>`];
            }

            // arrays
            if (Array.isArray(aVal) || Array.isArray(bVal)) {
                const aArr = Array.isArray(aVal) ? aVal : [];
                const bArr = Array.isArray(bVal) ? bVal : [];
                const maxL = Math.max(aArr.length, bArr.length);
                const leftParts = ['['];
                const rightParts = ['['];
                for (let i = 0; i < maxL; i++) {
                    const [la, lb] = build(aArr[i], bArr[i]);
                    leftParts.push(`<div style="margin-left:12px;">${la}${i < maxL - 1 ? ',' : ''}</div>`);
                    rightParts.push(`<div style="margin-left:12px;">${lb}${i < maxL - 1 ? ',' : ''}</div>`);
                }
                leftParts.push(']');
                rightParts.push(']');
                return [leftParts.join('\n'), rightParts.join('\n')];
            }

            // objects
            if (typeof aVal === 'object' || typeof bVal === 'object') {
                const aObj = (aVal && typeof aVal === 'object' && !Array.isArray(aVal)) ? aVal : {};
                const bObj = (bVal && typeof bVal === 'object' && !Array.isArray(bVal)) ? bVal : {};
                const keys = Array.from(new Set([...Object.keys(aObj), ...Object.keys(bObj)])).sort();
                const leftParts = ['{'];
                const rightParts = ['{'];
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    const aChild = (key in aObj) ? aObj[key] : undefined;
                    const bChild = (key in bObj) ? bObj[key] : undefined;

                    const [la, lb] = build(aChild, bChild);

                    if (!(key in aObj) && (key in bObj)) {
                        leftParts.push(`<div style="margin-left:12px;"><span style="color:${COLOR_GRAY}">${escapeHtml(key)}:</span> <span style="color:#aaa">(missing)</span>${i < keys.length - 1 ? ',' : ''}</div>`);
                        rightParts.push(`<div style="margin-left:12px;"><span style="color:${COLOR_GREEN}">${escapeHtml(key)}:</span> ${lb}${i < keys.length - 1 ? ',' : ''}</div>`);
                        continue;
                    }
                    if ((key in aObj) && !(key in bObj)) {
                        leftParts.push(`<div style="margin-left:12px;"><span style="color:${COLOR_RED}">${escapeHtml(key)}:</span> ${la}${i < keys.length - 1 ? ',' : ''}</div>`);
                        rightParts.push(`<div style="margin-left:12px;"><span style="color:${COLOR_GRAY}">${escapeHtml(key)}:</span> <span style="color:#aaa">(missing)</span>${i < keys.length - 1 ? ',' : ''}</div>`);
                        continue;
                    }

                    leftParts.push(`<div style="margin-left:12px;"><span style="color:#ddd">${escapeHtml(key)}:</span> ${la}${i < keys.length - 1 ? ',' : ''}</div>`);
                    rightParts.push(`<div style="margin-left:12px;"><span style="color:#ddd">${escapeHtml(key)}:</span> ${lb}${i < keys.length - 1 ? ',' : ''}</div>`);
                }
                leftParts.push('}');
                rightParts.push('}');
                return [leftParts.join('\n'), rightParts.join('\n')];
            }

            return [escapeHtml(String(aVal)), escapeHtml(String(bVal))];
        }

        const [leftHtml, rightHtml] = build(a, b);
        return {
            leftHtml: `<div style="font-family: monospace; font-size:13px; color:#ddd; line-height:1.35; white-space:pre-wrap;">${leftHtml}</div>`,
            rightHtml: `<div style="font-family: monospace; font-size:13px; color:#ddd; line-height:1.35; white-space:pre-wrap;">${rightHtml}</div>`
        };
    }

    // ---------------- Match/Buffer logic ----------------
    function expandBufferOrMatchB(parsedValue, rawUrl) {
        if (parsedValue == null) return;
        const candidates = [];
        if (Array.isArray(parsedValue)) {
            for (const single of parsedValue) candidates.push(single);
        } else if (parsedValue && typeof parsedValue === 'object' && Array.isArray(parsedValue.events)) {
            for (const single of parsedValue.events) candidates.push(single);
        } else {
            candidates.push(parsedValue);
        }

        for (const single of candidates) {
            const singleName = extractEvtNameFromEventObject(single);
            if (window.ignoreEvents && window.ignoreEvents.indexOf(singleName) >= 0) {
                return;
            }
            if (window.isClient && window.GV_PAYLOAD.length >= 20)
                window.GV_PAYLOAD.shift();
            window.GV_PAYLOAD.push({ singleName, payload: single, ts: Date.now(), parsedOk: true, sourceUrl: rawUrl });
            const newPayload = transformGVforGA(single);
            if (rawUrl.toLowerCase().includes(ENDPOINT_B_FRAGMENT)) {
                var searchResult = findAttributes(['GVUID'], newPayload);
                if (!searchResult['GVUID']) {
                    if (window.MESSED.hasOwnProperty(singleName))
                        window.MESSED[singleName].GV++;
                    else
                        window.MESSED[singleName] = { GA: 0, GV: 1 };
                }
            }
            const sourceType = (typeof rawUrl === 'string' && rawUrl.toLowerCase().includes(ENDPOINT_C_FRAGMENT)) ? 'C' : 'B';
            const eventId = getEventIdFromPayload(newPayload) || '';
            const item = { evtName: singleName, payload: newPayload, ts: Date.now(), parsedOk: true, sourceUrl: rawUrl, sourceType, event_id: eventId };
            state.listB.push(item);
            // If there are rows with same evtName and no eventId yet, prefer to attach discovered event_id (helps linking)
            if (eventId) {
                for (const r of state.rows) {
                    if (!r.eventId && r.aItem && r.aItem.evtName === item.evtName) {
                        r.eventId = eventId;
                        if (r.eventIdCell) r.eventIdCell.textContent = eventId;
                        // update counts immediately
                        refreshRowPB(r);
                    }
                }
            }

            // Update counts for all rows (P/C counts are event_id-based)
            for (const r of state.rows) refreshRowPB(r);
            // Try to match: prefer A rows which are unmatched and either items-array matches or simply same evtName
            const bHasItems = Array.isArray(getItemsArray(item.payload));
            let matchRow = null;

            if (bHasItems) {
                matchRow = state.rows.find(r => r.aItem && !r.bItem && r.aItem.evtName === singleName && itemsArrayMatchInOrder(r.aItem.payload, item.payload));
            }

            if (!matchRow) {
                matchRow = state.rows.find(r => r.aItem && !r.bItem && r.aItem.evtName === singleName);
            }

            if (matchRow) {
                matchRow.bItem = item;
                // set eventId on row if present in B
                if (!matchRow.eventId && item.event_id) {
                    matchRow.eventId = item.event_id;
                    if (matchRow.eventIdCell) matchRow.eventIdCell.textContent = matchRow.eventId;
                }

                const cmp = compareMatchType(matchRow.aItem.payload, item.payload);
                let colorStyle = cmp.fullMatch ? COLOR_GREEN : (cmp.looseMatchTypeDiff ? COLOR_GREEN : COLOR_ORANGE);

                matchRow.leftCell.innerHTML = '';
                matchRow.leftCell.appendChild(el('div', { style: { fontWeight: 600, color: colorStyle } }, escapeHtml(matchRow.aItem.evtName)));

                matchRow.rightCell.innerHTML = '';
                matchRow.rightCell.appendChild(el('div', { style: { fontWeight: 600, color: colorStyle } }, escapeHtml(item.evtName)));
                // We don't hide rows here; legend applies to compare popup elements only.
                // refresh counters and colors
                refreshRowPB(matchRow);

                if (state.compareOpen && state.compareIndex < state.rows.length && state.rows[state.compareIndex] === matchRow) {
                    renderCompareForIndex(state.compareIndex);
                }
                scrollTableToBottom();
            } else {
                state.queueB.push(item);
            }
        }
    }

    // refresh P and C cells based on eventId strictly
    function refreshRowPB(row) {
        if (!row) return;
        const eventId = row.eventId || getEventIdFromPayload(row.aItem && row.aItem.payload ? row.aItem.payload : null) || '';
        row.eventId = eventId; // keep updated
        if (row.eventIdCell) row.eventIdCell.textContent = eventId || '';

        let pCount = 0, cCount = 0;
        if (eventId) {
            for (const it of state.listB) {
                if (!it) continue;
                if (!it.event_id) continue;
                if (String(it.event_id) === String(eventId)) {
                    if (it.sourceType === 'B') pCount++;
                    else if (it.sourceType === 'C') cCount++;
                }
            }
        } else {
            // If no eventId, counts remain zero (per your request to count by event_id)
            pCount = 0; cCount = 0;
        }

        if (!row.pCell) {
            row.pCell = el('td', { style: { padding: '8px', verticalAlign: 'top', borderBottom: '1px solid #f0f0f0', textAlign: 'center' } }, String(pCount));
            try { if (row.tr) row.tr.appendChild(row.pCell); } catch (e) { }
        } else {
            row.pCell.textContent = String(pCount);
        }

        if (!row.cCell) {
            row.cCell = el('td', { style: { padding: '8px', verticalAlign: 'top', borderBottom: '1px solid #f0f0f0', textAlign: 'center' } }, String(cCount));
            try { if (row.tr) row.tr.appendChild(row.cCell); } catch (e) { }
        } else {
            row.cCell.textContent = String(cCount);
        }
        // Update timestamps safely
        if (window.isClient && row.GATS && row.aItem && row.aItem.ts) {
            try {
                row.GATS.textContent = new Date(row.aItem.ts).toLocaleTimeString();
            } catch (e) {
                row.GATS.textContent = '';
            }
        }
        if (window.isClient && row.GVTS && row.bItem && row.bItem.ts) {
            try {
                row.GVTS.textContent = new Date(row.bItem.ts).toLocaleTimeString();
            } catch (e) {
                row.GVTS.textContent = '';
            }
        }

        // color: green if equal, red otherwise
        const color = (pCount === cCount) ? COLOR_GREEN : COLOR_RED;
        if (row.pCell) row.pCell.style.color = color;
        if (row.cCell) row.cCell.style.color = color;
    }

    // append A row (with S.No and EventID cell)
    function appendRowForA(aItem) {
        const tbody = document.getElementById(TBODY_ID);
        if (!tbody) return;

        const sn = state.rows.length + 1;
        const snCell = el('td', { style: { padding: '8px', verticalAlign: 'top', borderBottom: '1px solid #f0f0f0', width: '6%', fontWeight: 700, textAlign: 'center', color: 'black' } }, String(sn));

        const GATS = el('td', { style: { padding: '8px', verticalAlign: 'top', borderBottom: '1px solid #f0f0f0', width: '6%', fontWeight: 700, textAlign: 'center', color: 'black' } }, '');

        const leftCell = el('td', { style: { padding: '8px', verticalAlign: 'top', borderBottom: '1px solid #f0f0f0', minHeight: '38px' } },
            el('div', { style: { fontWeight: 600, color: '#111' } }, escapeHtml(aItem.evtName))
        );

        const GVTS = el('td', { style: { padding: '8px', verticalAlign: 'top', borderBottom: '1px solid #f0f0f0', width: '6%', fontWeight: 700, textAlign: 'center', color: 'black' } }, '');
        const rightCell = el('td', { style: { padding: '8px', verticalAlign: 'top', borderBottom: '1px solid #f0f0f0', minHeight: '38px' } }, '');

        // eventId cell (initially from A if present, otherwise blank; may be filled later from listB)
        const initialEventId = getEventIdFromPayload(aItem.payload) || '';
        const eventIdCell = el('td', { style: { padding: '8px', verticalAlign: 'top', borderBottom: '1px solid #f0f0f0', textAlign: 'center', fontSize: '12px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', direction: 'rtl', color: 'black' } }, initialEventId);

        // placeholder P and C cells
        const pCell = el('td', { style: { padding: '8px', verticalAlign: 'top', borderBottom: '1px solid #f0f0f0', textAlign: 'center' } }, '0');
        const cCell = el('td', { style: { padding: '8px', verticalAlign: 'top', borderBottom: '1px solid #f0f0f0', textAlign: 'center' } }, '0');

        // try to consume queued B that best matches (items array match preferred) as before
        const aHasItems = Array.isArray(getItemsArray(aItem.payload));
        let queuedIndex = -1;
        if (aHasItems) {
            for (let i = 0; i < state.queueB.length; i++) {
                const q = state.queueB[i];
                if (q.evtName === aItem.evtName && itemsArrayMatchInOrder(aItem.payload, q.payload)) { queuedIndex = i; break; }
            }
        }
        if (queuedIndex === -1) {
            for (let i = 0; i < state.queueB.length; i++) {
                if (state.queueB[i].evtName === aItem.evtName) { queuedIndex = i; break; }
            }
        }

        let bItem = null;
        if (queuedIndex !== -1) {
            bItem = state.queueB.splice(queuedIndex, 1)[0];
            // set eventId if present
            if (!initialEventId && bItem.event_id) eventIdCell.textContent = bItem.event_id;
            const cmp = compareMatchType(aItem.payload, bItem.payload);
            let colorStyle = cmp.fullMatch ? COLOR_GREEN : (cmp.looseMatchTypeDiff ? COLOR_GREEN : COLOR_ORANGE);
            leftCell.innerHTML = '';
            if (window.isClient) {
                try {
                    GATS.textContent = new Date(aItem.ts).toLocaleTimeString();
                    GVTS.textContent = new Date(bItem.ts).toLocaleTimeString();
                } catch (e) {
                    GATS.textContent = '';
                    GVTS.textContent = '';
                }
            }
            leftCell.appendChild(el('div', { style: { fontWeight: 600, color: colorStyle } }, escapeHtml(aItem.evtName)));
            rightCell.appendChild(el('div', { style: { fontWeight: 600, color: colorStyle } }, escapeHtml(bItem.evtName)));
        }
        var tr = '';
        if (window.isClient)
            tr = el('tr', {}, snCell, GATS, leftCell, GVTS, rightCell, eventIdCell, pCell, cCell);
        else
            tr = el('tr', {}, snCell, leftCell, rightCell, eventIdCell, pCell, cCell);
        tbody.appendChild(tr);

        const rowObj = { sn, aItem, bItem: bItem || null, eventId: initialEventId || (bItem && bItem.event_id ? bItem.event_id : ''), tr, snCell, leftCell, rightCell, eventIdCell, pCell, cCell, GATS, GVTS };
        state.rows.push(rowObj);
        // We apply legend effects only to compare popup (not table rows), so do not alter row visibility here.
        // initialize P/C counts for this row
        refreshRowPB(rowObj);

        scrollTableToBottom();

        if (state.compareOpen) {
            state.compareIndex = state.rows.length - 1;
            renderCompareForIndex(state.compareIndex);
        }
    }

    // ---------------- Event handling ----------------
    function handleApiEvent(evt) {
        try {
            if (!window.isClient)
                postMessageViaSocket(evt);
            if (!evt || !evt.url) return;
            const url = String(evt.url || '').toLowerCase();
            if(window.fetchNetwork) {
                var args = "🌐" + evt.url + " :: " + evt.method + " :: " + evt.status;
                postMessageViaSocket({ type: 'log', msg: args });
            }
            // Endpoint A
            if (url.includes(ENDPOINT_A_FRAGMENT)) {
                const raw = extractPayloadFromEvent(evt);
                const parsed = tryParseJsonSafe(raw);
                const payload = parsed.ok ? parsed.value : parsed.value || null;
                let evtName = '(unknown)';
                try {
                    if (payload && Array.isArray(payload.events) && payload.events.length > 0 && payload.events[0] && payload.events[0].name) evtName = payload.events[0].name;
                    else if (payload && typeof payload.event_name === 'string') evtName = payload.event_name;
                    else evtName = extractEvtNameFromEventObject(payload);
                } catch (e) { }
                if (window.ignoreEvents && window.indexOf(evtName) >= 0) {
                    return;
                }
                window.QA_JOURNEY.path.push({ event: evtName, screen: payload.events[0].params.ScreenName || '' });
                if (window.isClient && window.GA_PAYLOAD.length >= 20)
                    window.GA_PAYLOAD.shift();
                window.GA_PAYLOAD.push({ evtName, payload: payload, ts: Date.now(), parsedOk: parsed.ok, sourceUrl: evt.url });
                let searchResult = findAttributes(['GVUID'], payload);
                if (!searchResult['GVUID']) {
                    if (window.MESSED.hasOwnProperty(evtName))
                        window.MESSED[evtName].GA++;
                    else
                        window.MESSED[evtName] = { GA: 1, GV: 1 };
                }
                const newPayload = transformGAtoGV(payload);
                const aItem = { evtName, payload: newPayload, ts: Date.now(), parsedOk: parsed.ok, sourceUrl: evt.url };
                state.listA.push(aItem);
                appendRowForA(aItem);
                refreshCounts();
                return;
            }

            // Endpoint B
            if (url.includes(ENDPOINT_B_FRAGMENT)) {
                const raw = extractPayloadFromEvent(evt);
                const parsed = tryParseJsonSafe(raw);
                const value = parsed.ok ? parsed.value : parsed.value || null;
                expandBufferOrMatchB(value, evt.url);
                refreshCounts();
                return;
            }

            // Endpoint C
            if (url.includes(ENDPOINT_C_FRAGMENT)) {
                const raw = extractPayloadFromEvent(evt);
                const parsed = tryParseJsonSafe(raw);
                const value = parsed.ok ? parsed.value : parsed.value || null;
                expandBufferOrMatchB(value, evt.url);
                refreshCounts();
                return;
            }
            try {
                if (url.includes(ENDPOINT_BEACON)) {
                    var raw = extractPayloadFromEvent(evt);
                    const parsed = tryParseJsonSafe(raw);
                    const payload = parsed.ok ? parsed.value : parsed.value || null;
                    const evtName = payload.event.e || '';
                    const wtd = payload.vsp ? (payload.vsp['vs-wtd'] || 'NA') : 'NA';
                    const entry = { evtName, wtd, payload, ts: Date.now(), parsedOk: parsed.ok, sourceUrl: evt.url };
                    window.BEACON_PAYLOAD.push(entry);
                    // addBeaconEntry(entry);
                    return;
                }
            } catch (e) { }
        } catch (e) {
            console.error('handleApiEvent error', e);
        }
    }

    // Call this for each entry: { evtName, wtd, payload, ts: Date.now() }
    function addBeaconEntry(entry) {
        const popup = getOrCreateBeaconPopup();
        const line = document.createElement('div');

        line.style.padding = '4px 8px';
        line.style.whiteSpace = 'nowrap';

        const time = formatTime(entry.ts);
        const text = `[${time}] ${entry.evtName}  wtd=${entry.wtd}`;
        line.textContent = text;

        popup.appendChild(line);

        // keep latest entry in view
        popup.scrollTop = popup.scrollHeight;
    }

    // Create the popup if it doesn't exist, otherwise return it
    function getOrCreateBeaconPopup() {
        let popup = document.getElementById('beacon_popup');
        if (popup) return popup;

        popup = document.createElement('div');
        popup.id = 'beacon_popup';

        // Style: left side, full height, ~30% width, black bg, green text
        popup.style.position = 'fixed';
        popup.style.top = '0';
        popup.style.left = '0';
        popup.style.width = '30%';      // change to '50%' if you want half screen
        popup.style.height = '100%';
        popup.style.background = 'black';
        popup.style.color = 'limegreen';
        popup.style.fontFamily = 'monospace';
        popup.style.fontSize = '12px';
        popup.style.zIndex = '2147483647';
        popup.style.overflowY = 'auto';
        popup.style.padding = '6px';
        popup.style.boxSizing = 'border-box';
        document.body.appendChild(popup);
        return popup;
    }

    // Format ts (ms) -> hh:mm:ss in local time
    function formatTime(ts) {
        const d = new Date(ts);
        const pad = (n) => (n < 10 ? '0' + n : '' + n);
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    function refreshCounts(status) {
        status = status || '';
        var currentStatus = state.running ? 'Monitoring' : 'Stopped';
        if (currentStatus == STATUS)
            return;
        STATUS = currentStatus;
        const s = document.getElementById(STATUS_ID);
        if (status != '') {
            s.textContent = status;
            return;
        }
        if (s) s.textContent = state.running ? 'Monitoring' : 'Stopped';
        if (!window.isClient)
            postMessageViaSocket({ type: 'monitoring', status: s.textContent });
    }

    function startCapture() {
        if (state.running) return;
        window.QA_JOURNEY = {
            lastUpdatedTime: '',
            path: []
        };
        window.GA_PAYLOAD = [];
        window.GV_PAYLOAD = [];
        window.BEACON_PAYLOAD = [];
        ensureOverlay();
        state.listA = []; state.listB = []; state.queueB = []; state.rows = []; state.compareIndex = 0;
        buildTableSkeleton();
        refreshCounts();
        if (!window.isClient) {
            if (!window.__apiMonitor || typeof window.__apiMonitor.onEvent !== 'function') {
                const tableRoot = document.getElementById(TABLE_ID);
                if (tableRoot) tableRoot.innerHTML = '<div style="color:#b00">ERROR: window.__apiMonitor not found. Include api-monitor.js before using this tool.</div>';
                return;
            }
            state.unsub = window.__apiMonitor.onEvent(handleApiEvent);
        }
        state.running = true;
        refreshCounts();
    }

    function stopCapture() {
        if (!state.running) return;
        try { if (typeof state.unsub === 'function') state.unsub(); } catch (e) { }
        state.unsub = null;
        state.running = false;
        refreshCounts();
    }

    // ---------------- Compare viewer ----------------
    function ensureCompareView() {
        let view = document.getElementById(COMPARE_VIEW_ID);
        if (view) return view;

        view = el('div', {
            id: COMPARE_VIEW_ID,
            style: {
                position: 'fixed',
                left: '0',
                top: '0',
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.88)',
                color: '#fff',
                zIndex: String(2147483647 + 1),
                display: 'none',
                boxSizing: 'border-box',
                padding: '18px',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial'
            }
        });

        const toolbar = el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' } },
            el('button', { id: 'show_report', style: { padding: '8px 12px' } }, 'Summary'),
            el('button', { id: 'compare_prev', style: { padding: '8px 12px' } }, 'Prev'),
            el('button', { id: 'compare_next', style: { padding: '8px 12px' } }, 'Next'),
            el('div', { id: COMPARE_INDEX_ID, style: { marginLeft: '12px', fontWeight: 600 } }, '0 / 0'),
            el('div', { id: COMPARE_TITLE_ID, style: { marginLeft: '18px', fontWeight: 700, fontSize: '15px', color: '#ddd' } }, ''),

            el('div', { style: { marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' } },
                el('div', { style: { fontSize: '12px', color: '#ddd' } }, 'Legend:'),

                // ---- FULL (green) ----
                el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                    el('span', {
                        class: 'legend-swatch legend-green',
                        style: { display: 'inline-block', width: '12px', height: '12px', borderRadius: '2px', background: '#28a745' }
                    }, ''),
                    el('button', {
                        class: 'legend-btn',
                        'data-color': 'green',
                        id: 'legend_green',
                        style: {
                            background: 'none',
                            border: 'none',
                            padding: '0',
                            margin: '0',
                            color: '#ddd',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }
                    }, 'Full')
                ),

                // ---- TYPE-DIFF (yellow) ----
                // el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                //     el('span', {
                //         class: 'legend-swatch legend-yellow',
                //         style: { display: 'inline-block', width: '12px', height: '12px', borderRadius: '2px', background: '#ffc107' }
                //     }, ''),
                //     el('button', {
                //         class: 'legend-btn',
                //         'data-color': 'yellow',
                //         id: 'legend_yellow',
                //         style: { background: 'none', border: 'none', padding: '0', margin: '0', color: '#ddd', cursor: 'pointer', fontSize: '13px' }
                //     }, 'Type-diff')
                // ),

                // ---- MISMATCH (orange) ----
                el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                    el('span', {
                        class: 'legend-swatch legend-orange',
                        style: { display: 'inline-block', width: '12px', height: '12px', borderRadius: '2px', background: '#fd7e14' }
                    }, ''),
                    el('button', {
                        class: 'legend-btn',
                        'data-color': 'orange',
                        id: 'legend_orange',
                        style: { background: 'none', border: 'none', padding: '0', margin: '0', color: '#ddd', cursor: 'pointer', fontSize: '13px' }
                    }, 'Mismatch')
                ),

                // ---- MISSING (red) ----
                el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                    el('span', {
                        class: 'legend-swatch legend-red',
                        style: { display: 'inline-block', width: '12px', height: '12px', borderRadius: '2px', background: '#dc3545' }
                    }, ''),
                    el('button', {
                        class: 'legend-btn',
                        'data-color': 'red',
                        id: 'legend_red',
                        style: { background: 'none', border: 'none', padding: '0', margin: '0', color: '#ddd', cursor: 'pointer', fontSize: '13px' }
                    }, 'Missing')
                ),

                el('div', { style: { marginLeft: '12px' } },
                    el('button', { id: 'compare_close', style: { padding: '8px 12px' } }, 'Close')
                )
            )
        );



        const content = el('div', { style: { display: 'flex', gap: '12px', height: 'calc(100% - 56px)' } },
            el('div', { id: COMPARE_LEFT_ID + '_wrap', style: { flex: '1 1 50%', overflow: 'hidden', background: '#0b0b0b', padding: '12px', borderRadius: '6px', display: 'flex', flexDirection: 'column' } },
                el('div', { style: { fontWeight: 700, marginBottom: '8px' } }, 'GA Event'),
                el('div', { id: COMPARE_LEFT_ID + '_scroll', style: { overflow: 'auto', flex: '1 1 auto' } },
                    el('div', { id: COMPARE_LEFT_ID + '_pre', style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' } }, '')
                )
            ),
            el('div', { id: COMPARE_RIGHT_ID + '_wrap', style: { flex: '1 1 50%', overflow: 'hidden', background: '#0b0b0b', padding: '12px', borderRadius: '6px', display: 'flex', flexDirection: 'column' } },
                el('div', { style: { fontWeight: 700, marginBottom: '8px' } }, 'GV Event'),
                el('div', { id: COMPARE_RIGHT_ID + '_scroll', style: { overflow: 'auto', flex: '1 1 auto' } },
                    el('div', { id: COMPARE_RIGHT_ID + '_pre', style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' } }, '')
                )
            )
        );

        view.appendChild(toolbar);
        view.appendChild(content);
        document.body.appendChild(view);

        // --- legend interactivity & filtering helpers ---

        // Slightly more robust color pick used when there are missing attributes
        function overallColorKeyForRow(row) {
            const left = row && row.aItem && row.aItem.payload ? row.aItem.payload : null;
            const right = row && row.bItem && row.bItem.payload ? row.bItem.payload : null;
            const cmp = compareMatchType(left, right);
            if (cmp.fullMatch) return 'green';
            if (cmp.looseMatchTypeDiff) return 'green';
            // detect missing keys (if one side missing keys that other side has -> treat as red)
            try {
                const ignoreSet = getIgnoreSet();
                const pa = (typeof left === 'string') ? tryParseJsonSafe(left) : { ok: true, value: left };
                const pb = (typeof right === 'string') ? tryParseJsonSafe(right) : { ok: true, value: right };
                const aVal = pa.ok ? pa.value : pa.value;
                const bVal = pb.ok ? pb.value : pb.value;
                const aObj = (aVal && typeof aVal === 'object' && !Array.isArray(aVal)) ? stripIgnoredKeys(aVal, ignoreSet) : null;
                const bObj = (bVal && typeof bVal === 'object' && !Array.isArray(bVal)) ? stripIgnoredKeys(bVal, ignoreSet) : null;
                if (aObj && bObj) {
                    const aKeys = Object.keys(aObj);
                    const bKeys = Object.keys(bObj);
                    for (const k of aKeys) if (!(k in bObj)) return 'red';
                    for (const k of bKeys) if (!(k in aObj)) return 'red';
                }
            } catch (e) { }
            return 'orange';
        }

        // Convert hex like "#0b9a5a" to "rgb(r, g, b)"
        function hexToRgbString(hex) {
            if (!hex) return '';
            const h = hex.replace('#', '');
            if (h.length === 3) {
                const r = parseInt(h[0] + h[0], 16);
                const g = parseInt(h[1] + h[1], 16);
                const b = parseInt(h[2] + h[2], 16);
                return `rgb(${r}, ${g}, ${b})`;
            }
            const r = parseInt(h.substring(0, 2), 16);
            const g = parseInt(h.substring(2, 4), 16);
            const b = parseInt(h.substring(4, 6), 16);
            return `rgb(${r}, ${g}, ${b})`;
        }

        // Apply legend toggles to only the currently visible compare view content:
        // hide elements inside left/right pre whose computed color matches a toggled-off legend color.
        function applyLegendToCompareView() {
            const leftPre = document.getElementById(COMPARE_LEFT_ID + '_pre');
            const rightPre = document.getElementById(COMPARE_RIGHT_ID + '_pre');
            if (!leftPre || !rightPre) return;

            // build map of disabled colors (computed rgb values)
            const disabled = {};
            if (!state.activeFilters.green) disabled[hexToRgbString(COLOR_GREEN).replace(/\s+/g, ' ')] = true;
            if (!state.activeFilters.yellow) disabled[hexToRgbString(COLOR_YELLOW).replace(/\s+/g, ' ')] = true;
            if (!state.activeFilters.orange) disabled[hexToRgbString(COLOR_ORANGE).replace(/\s+/g, ' ')] = true;
            if (!state.activeFilters.red) disabled[hexToRgbString(COLOR_RED).replace(/\s+/g, ' ')] = true;

            // helper to process a root element (left or right)
            function processRoot(root) {
                // iterate all elements inside root
                const all = root.querySelectorAll('*');
                for (const elNode of all) {
                    try {
                        // computed color (normalized)
                        const cs = window.getComputedStyle(elNode);
                        const c = (cs && cs.color) ? cs.color.replace(/\s+/g, ' ') : '';
                        if (c && disabled[c]) {
                            // hide this node if it's directly a colored value/label
                            // elNode.style.display = 'none';
                            elNode.parentElement.style.display = 'none';
                        } else {
                            // if previously hidden due to legend, restore it
                            if (elNode.parentElement.style && elNode.parentElement.style.display === 'none') {
                                // only restore if this color is not currently disabled
                                // (we can't know original display type; set '' to let CSS/layout restore)
                                elNode.parentElement.style.display = 'block';
                            }
                        }
                    } catch (e) { /* ignore nodes that cause errors */ }
                }
            }

            // process both panes
            processRoot(leftPre);
            processRoot(rightPre);
        }

        function attachLegendHandlers() {
            const viewRoot = document.getElementById(COMPARE_VIEW_ID);
            if (!viewRoot) return;
            const buttons = viewRoot.querySelectorAll('.legend-btn');
            buttons.forEach(btn => {
                if (btn.__legendAttached) return;
                btn.__legendAttached = true;
                const color = btn.getAttribute('data-color');
                if (!color) return;
                if (state.activeFilters[color] === false) {
                    btn.style.color = 'rgb(255 255 255)';
                    btn.style.opacity = '0.5';
                } else {
                    btn.style.color = '#ddd';
                    btn.style.opacity = '1';
                }
                btn.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    const col = this.getAttribute('data-color');
                    if (!col) return;
                    state.activeFilters[col] = !Boolean(state.activeFilters[col]);
                    if (state.activeFilters[col]) {
                        this.style.color = '#ddd';
                        this.style.opacity = '1';
                    } else {
                        this.style.color = 'rgb(255 255 255)';
                        this.style.opacity = '0.5';
                    }
                    try { applyLegendToCompareView(); } catch (e) {
                        console.error('applyLegendToCompareView error', e);
                    }
                });
            });
            // apply initial legend state to compare view
            try { applyLegendToCompareView(); } catch (e) {
                console.error('applyLegendToCompareView error', e);
            }
        }


        function resetLegendState() {
            const viewRoot = document.getElementById(COMPARE_VIEW_ID);
            if (!viewRoot) return;
            const buttons = viewRoot.querySelectorAll('.legend-btn');
            buttons.forEach(btn => {
                const color = btn.getAttribute('data-color');
                if (!color) return;
                // reset filter variable
                state.activeFilters[color] = true;
                // reset visual state
                btn.classList.remove('toggled-off');
            });
            // reapply legend effect to compare view
            try {
                applyLegendToCompareView();
            } catch (e) {
                console.error('resetLegendState → applyLegendToCompareView error', e);
            }
        }

        // call attaching now (view has already been appended)
        setTimeout(attachLegendHandlers, 20);

        document.getElementById('show_report').addEventListener('click', () => {
            resetLegendState();
            var data = getOccurances();
            // target.innerHTML = JSON.stringify(getOccurances());
            let html = `
            <style>
      #popupBox table {
        width: 100%;
        border-collapse: collapse;
      }
      #popupBox thead, 
      #popupBox tbody {
        display: block;
      }
      #popupBox tbody {
        max-height: 500px;      /* Adjust scroll height */
        overflow-y: auto;
      }
      #popupBox thead tr, 
      #popupBox tbody tr {
        display: table;
        width: 100%;
        table-layout: fixed;
      }
      #popupBox th, #popupBox td {
        padding: 6px;
        border-bottom: 1px solid #ddd;
        text-align: center;
        white-space: normal;
        word-wrap: break-word;
      }
    </style>

    <table border="1" cellpadding="5" cellspacing="0">
                <thead>
                    <tr>
                        <th>Event Name</th>
                        <th>GA</th>
                        <th>Batch</th>
                        <th>Priority</th>
                    </tr>
                </thead>
                <tbody>`;
            Object.keys(data).forEach(key => {
                const row = data[key];
                html += `<tr>
                    <td>${key}</td>
                    <td>${row.ga}</td>
                    <td>${row.batch}</td>
                    <td>${row.priority}</td>
                </tr>`;
            });
            html += `
                </tbody>
            </table>`;
            const popup = document.createElement("div");
            popup.id = "popupBox";
            popup.style.position = "absolute";
            popup.style.top = "10%";
            popup.style.left = "25%";
            popup.style.background = "white";
            popup.style.padding = "20px";
            popup.style.borderRadius = "8px";
            popup.style.boxShadow = "0 0 20px rgba(0,0,0,0.3)";
            popup.style.zIndex = "2147483647";
            popup.style.width = "50%";
            popup.style.display = "block";
            popup.style.color = "black";

            // Create close button
            const closeBtn = document.createElement("span");
            closeBtn.innerHTML = "✖";
            closeBtn.id = 'popup_close';
            closeBtn.style.position = "absolute";
            closeBtn.style.top = "8px";
            closeBtn.style.right = "12px";
            closeBtn.style.cursor = "pointer";
            closeBtn.style.fontSize = "20px";
            closeBtn.style.color = "#333";
            closeBtn.style.zIndex = "123";

            closeBtn.onclick = () => popup.remove();

            // Add content
            const content = document.createElement("div");
            content.innerHTML = html;

            // Append everything
            popup.appendChild(closeBtn);
            popup.appendChild(content);
            document.body.appendChild(popup);
        });
        document.getElementById('compare_prev').addEventListener('click', () => {
            resetLegendState();
            comparePrev();
        });
        document.getElementById('compare_next').addEventListener('click', () => {
            resetLegendState();
            compareNext();
        });
        document.getElementById('compare_close').addEventListener('click', () => {
            resetLegendState();
            compareClose();
        });

        window.addEventListener('keydown', function onKey(e) {
            if (!state.compareOpen) return;
            if (e.key === 'ArrowRight' || e.key === 'd') { compareNext(); e.preventDefault(); }
            else if (e.key === 'ArrowLeft' || e.key === 'a') { comparePrev(); e.preventDefault(); }
            else if (e.key === 'Escape') { compareClose(); e.preventDefault(); }
        });

        // sync scrolls
        (function attachSyncScroll() {
            const leftScroll = document.getElementById(COMPARE_LEFT_ID + '_scroll');
            const rightScroll = document.getElementById(COMPARE_RIGHT_ID + '_scroll');
            if (!leftScroll || !rightScroll) return;

            let isSyncingLeft = false;
            let isSyncingRight = false;

            function syncFromLeft() {
                if (isSyncingLeft) return;
                isSyncingRight = true;
                try {
                    const lMax = leftScroll.scrollHeight - leftScroll.clientHeight;
                    const rMax = rightScroll.scrollHeight - rightScroll.clientHeight;
                    const ratio = lMax > 0 ? (leftScroll.scrollTop / lMax) : 0;
                    rightScroll.scrollTop = Math.round(ratio * Math.max(0, rMax));
                    const lMaxH = leftScroll.scrollWidth - leftScroll.clientWidth;
                    const rMaxH = rightScroll.scrollWidth - rightScroll.clientWidth;
                    const ratioH = lMaxH > 0 ? (leftScroll.scrollLeft / lMaxH) : 0;
                    rightScroll.scrollLeft = Math.round(ratioH * Math.max(0, rMaxH));
                } finally {
                    setTimeout(() => { isSyncingRight = false; }, 10);
                }
            }

            function syncFromRight() {
                if (isSyncingRight) return;
                isSyncingLeft = true;
                try {
                    const lMax = leftScroll.scrollHeight - leftScroll.clientHeight;
                    const rMax = rightScroll.scrollHeight - rightScroll.clientHeight;
                    const ratio = rMax > 0 ? (rightScroll.scrollTop / rMax) : 0;
                    leftScroll.scrollTop = Math.round(ratio * Math.max(0, lMax));
                    const lMaxH = leftScroll.scrollWidth - leftScroll.clientWidth;
                    const rMaxH = rightScroll.scrollWidth - rightScroll.clientWidth;
                    const ratioH = rMaxH > 0 ? (rightScroll.scrollLeft / rMaxH) : 0;
                    leftScroll.scrollLeft = Math.round(ratioH * Math.max(0, lMaxH));
                } finally {
                    setTimeout(() => { isSyncingLeft = false; }, 10);
                }
            }

            leftScroll.addEventListener('scroll', syncFromLeft, { passive: true });
            rightScroll.addEventListener('scroll', syncFromRight, { passive: true });
        })();

        return view;
    }

    function compareOpen() {
        const view = ensureCompareView();
        view.style.display = 'block';
        state.compareOpen = true;
        state.compareIndex = Math.max(0, state.rows.length - 1);
        renderCompareForIndex(state.compareIndex);
    }

    function compareClose() {
        const view = document.getElementById(COMPARE_VIEW_ID);
        if (view) view.style.display = 'none';
        state.compareOpen = false;
        for (const r of state.rows) if (r && r.tr) r.tr.style.outline = '';
    }

    function compareNext() {
        if (state.rows.length === 0) return;
        state.compareIndex = Math.min(state.rows.length - 1, state.compareIndex + 1);
        renderCompareForIndex(state.compareIndex);
    }

    function comparePrev() {
        if (state.rows.length === 0) return;
        state.compareIndex = Math.max(0, state.compareIndex - 1);
        renderCompareForIndex(state.compareIndex);
    }

    function renderCompareForIndex(idx) {
        const leftPre = document.getElementById(COMPARE_LEFT_ID + '_pre');
        const rightPre = document.getElementById(COMPARE_RIGHT_ID + '_pre');
        const idxLabel = document.getElementById(COMPARE_INDEX_ID);
        const titleEl = document.getElementById(COMPARE_TITLE_ID);
        if (!leftPre || !rightPre || !idxLabel || !titleEl) return;
        if (!state.rows || state.rows.length === 0) {
            leftPre.innerHTML = '(no events)';
            rightPre.innerHTML = '(no events)';
            idxLabel.textContent = '0 / 0';
            titleEl.textContent = '';
            return;
        }
        const safeIdx = Math.max(0, Math.min(state.rows.length - 1, idx));
        state.compareIndex = safeIdx;
        const row = state.rows[safeIdx];

        const leftPayload = row && row.aItem && row.aItem.payload ? row.aItem.payload : null;
        const rightPayload = row && row.bItem && row.bItem.payload ? row.bItem.payload : null;

        const diffs = renderPayloadDiffHtml(leftPayload, rightPayload);
        leftPre.innerHTML = diffs.leftHtml;
        rightPre.innerHTML = diffs.rightHtml;

        const cmp = compareMatchType(leftPayload, rightPayload);
        const statusText = cmp.fullMatch ? 'Full match!' : (cmp.looseMatchTypeDiff ? 'Full match' : 'Not matching');
        const statusColor = cmp.fullMatch ? COLOR_GREEN : (cmp.looseMatchTypeDiff ? COLOR_GREEN : COLOR_ORANGE);

        const evtName = (row && row.aItem && row.aItem.evtName) || (row && row.bItem && row.bItem.evtName) || '(unknown)';
        titleEl.innerHTML = `<span style="color:#ddd; margin-right:12px; font-weight:600;">${escapeHtml(evtName)}</span><span style="color:${statusColor}; font-weight:700;">${escapeHtml(statusText)}</span>`;

        idxLabel.textContent = `${safeIdx + 1} / ${state.rows.length}`;

        for (let i = 0; i < state.rows.length; i++) {
            const r = state.rows[i];
            if (!r || !r.tr) continue;
            if (i === safeIdx) {
                r.tr.style.outline = '3px solid rgba(255,255,255,0.12)';
                try { r.tr.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) { }
            } else {
                r.tr.style.outline = '';
            }
        }

        try {
            const leftScroll = document.getElementById(COMPARE_LEFT_ID + '_scroll');
            const rightScroll = document.getElementById(COMPARE_RIGHT_ID + '_scroll');
            if (leftScroll && rightScroll) {
                leftScroll.scrollTop = 0; leftScroll.scrollLeft = 0;
                rightScroll.scrollTop = 0; rightScroll.scrollLeft = 0;
            }
        } catch (e) { }

        // Apply legend toggles to the newly rendered compare content (hides elements with disabled colors)
        try {
            // find the ensureCompareView scope function applyLegendToCompareView via document (it was defined inside ensureCompareView closure),
            // but since we're in same closure, call the function if present by querying left pre (handler exists)
            const view = document.getElementById(COMPARE_VIEW_ID);
            if (view) {
                // call the function by retrieving it from closure scope: since it's declared above, just call it
                // NOTE: applyLegendToCompareView is defined in the ensureCompareView block; calling directly:
                // (we're in the same closure so the function is available)
                // But to be safe in this position, we call the function by dispatching a small event that attachLegendHandlers listens to.
            }
        } catch (e) { /* ignore */ }

        try {
            (function applyLegendToCompareView_inline() {
                const left = document.getElementById(COMPARE_LEFT_ID + '_pre');
                const right = document.getElementById(COMPARE_RIGHT_ID + '_pre');
                if (!left || !right) return;
                // build disabled color map as in attach
                const disabled = {};
                if (!state.activeFilters.green) disabled[hexToRgbString(COLOR_GREEN).replace(/\s+/g, ' ')] = true;
                if (!state.activeFilters.yellow) disabled[hexToRgbString(COLOR_YELLOW).replace(/\s+/g, ' ')] = true;
                if (!state.activeFilters.orange) disabled[hexToRgbString(COLOR_ORANGE).replace(/\s+/g, ' ')] = true;
                if (!state.activeFilters.red) disabled[hexToRgbString(COLOR_RED).replace(/\s+/g, ' ')] = true;

                function processRoot(root) {
                    const all = root.querySelectorAll('*');
                    for (const elNode of all) {
                        try {
                            const cs = window.getComputedStyle(elNode);
                            const c = (cs && cs.color) ? cs.color.replace(/\s+/g, ' ') : '';
                            if (c && disabled[c]) {
                                elNode.style.display = 'none';
                            } else {
                                if (elNode.style && elNode.style.display === 'none') elNode.style.display = '';
                            }
                        } catch (e) { }
                    }
                }
                processRoot(left);
                processRoot(right);
            })();
        } catch (e) { /* ignore */ }
    }

    function getOccurances() {
        const occurances = {};
        state.listA.forEach(item => {
            if (!occurances[item.evtName]) {
                occurances[item.evtName] = { ga: 0, batch: 0, priority: 0 };
            }
            occurances[item.evtName].ga++;
        });
        state.listB.forEach(item => {
            if (!occurances[item.evtName]) {
                occurances[item.evtName] = { ga: 0, batch: 0, priority: 0 };
            }
            if (item.sourceType === 'C')
                occurances[item.evtName].batch++;
            else
                occurances[item.evtName].priority++;
        });
        return occurances;
    }


    // public control
    window.compareControl = function compareControl(cmd) {
        try {
            const c = (cmd || '').toString().trim().toLowerCase();
            if (c === 'show') { showOverlay(); return; }
            if (c === 'hide') { hideOverlay(); return; }
            if (c === 'start') { startCapture(); return; }
            if (c === 'stop') { stopCapture(); return; }
            if (c === 'compare') { ensureOverlay(); compareOpen(); return; }
            if (c === 'comparehide') { compareClose(); return; }
            if (c === 'occurances') { return getOccurances(); }
            console.warn('compareControl: unknown command', cmd);
        } catch (err) { console.error('compareControl error', err); }
    };

    // init
    ensureOverlay();
    hideOverlay();
    buildTableSkeleton();
    ensureCompareView();

    window.__compareMonitor = {
        state,
        refreshCounts,
        config: { endpointA: ENDPOINT_A_FRAGMENT, endpointB: ENDPOINT_B_FRAGMENT, endpointC: ENDPOINT_C_FRAGMENT }
    };

    console.info('compare-monitor installed. Use compareControl("show"|"hide"|"start"|"stop"|"compare").');

    return {
        handleApiEvent: handleApiEvent,
        startCapture: startCapture,
        refreshCounts: refreshCounts
    };
})();

function pushMessagesFromQue() {
    while (SOCKET_QUE.length > 0) {
        postMessageViaSocket(SOCKET_QUE[0], true);
        SOCKET_QUE.shift();
    }
}

function readBlobAsText(blob) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function (e) {
            resolve(e.target.result);
        };
        reader.onerror = reject;
        reader.readAsText(blob);
    });
}


function connectToSocket(id) {
    id = id || localStorage.getItem('socketid') || '';
    if (WS_LIVE)
        return;
    if (id == '') {
        id = Math.random().toString(36).substring(2, 7);
    }
    SOCKET_ID = id;
    localStorage.setItem('socketid', id);
    WS = new WebSocket('wss://socket-0akf.onrender.com/?id=' + id);
    console.log('connectToSocket');
    WS.addEventListener('open', () => {
        WS_LIVE = true;
        console.log('connected as: ' + id);
        compareControl('show');
        if (!window.isClient)
            pushMessagesFromQue();
    });
    document.getElementById('socket_id').textContent = id;
    document.getElementById('socket_id').style.color = 'green';
    if (window.isClient) {
        GAGV.startCapture();
    }
    WS.addEventListener('message', async (ev) => {
        try {
            var payload = ev.data;
            if (payload instanceof Blob) {
                // payload = await payload.text();
                payload = await new Promise(function (resolve, reject) {
                    var reader = new FileReader();
                    reader.onload = function (e) { resolve(e.target.result); };
                    reader.onerror = reject;
                    reader.readAsText(payload);
                });
                payload = JSON.parse(payload);
                if (window.isClient && payload.type && payload.type == 'monitoring') {
                    GAGV.refreshCounts(payload.status);
                } else if (window.isClient && payload.type && payload.type == 'log') {
                    console.log('server: ' + payload.msg);
                } else if (!window.isClient && payload.type && payload.type == 'test') {
                    switch (payload.method) {
                        case 'continue_watch':
                            triggerContinueWatch(payload.iterations);
                            break;
                        case 'menu_test':
                            break;
                        default:
                            break;
                    }
                } else if (!window.isClient && payload.type && payload.type == 'command') {
                    console.log('steps: ' + payload.list);
                    triggerPlayGroundSteps(payload.list);
                } else if (!window.isClient && payload.type && payload.type == 'ignore') {
                    window.ignoreEvents = payload.msg || [];
                } else if (window.isClient)
                    GAGV.handleApiEvent(payload);
            }
        } catch (err) {
            console.error('handleMessage error', err);
        }
    });
}

function postMessageViaSocket(msg, ignoreDeliveryStatus) {
    ignoreDeliveryStatus = ignoreDeliveryStatus || false;
    try {
        var parseMessage = typeof msg == 'object' ? msg : JSON.parse(msg);
        if (parseMessage.type && parseMessage.type == 'connected' || parseMessage.type == "pMetricsChange" || parseMessage.type == "build")
            return;
        var messageTypes = ['log', 'monitoring', 'test', 'command'];
        if ((parseMessage.type && messageTypes.indexOf(parseMessage.type) >= 0) || (parseMessage.kind && parseMessage.method == 'POST')) {
            // console.log('start sending pending messages: ' + msg + ' :: ' + WS_LIVE);
            if (msg && WS_LIVE) {
                // console.log('sending: ' + JSON.stringify(msg));
                WS.send(JSON.stringify(msg));
            } else if (!ignoreDeliveryStatus) {
                SOCKET_QUE.push(msg);
            } else { }
        }
    } catch (e) {
        console.log('postMessageViaSocket: ' + e);
    }
}
