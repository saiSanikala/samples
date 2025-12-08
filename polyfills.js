// Polyfills for gagv.js - Smart TV Browser Compatibility
// Add this file before loading gagv.js

(function() {
    'use strict';

    // Object.assign polyfill (IE11, older Smart TVs)
    if (!Object.assign) {
        Object.assign = function(target) {
            if (target == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            var to = Object(target);
            for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];
                if (nextSource != null) {
                    for (var nextKey in nextSource) {
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        };
    }

    // Array.from polyfill (IE11, older Smart TVs)
    if (!Array.from) {
        Array.from = function(arrayLike, mapFn, thisArg) {
            if (arrayLike == null) {
                throw new TypeError('Array.from requires an array-like object');
            }
            var items = Object(arrayLike);
            var len = parseInt(items.length) || 0;
            var result = typeof this === 'function' ? new this(len) : new Array(len);
            var k = 0;
            while (k < len) {
                if (k in items) {
                    result[k] = typeof mapFn === 'function' ? mapFn.call(thisArg, items[k], k) : items[k];
                }
                k++;
            }
            result.length = len;
            return result;
        };
    }

    // Array.prototype.find polyfill (IE11, older Smart TVs)
    if (!Array.prototype.find) {
        Array.prototype.find = function(callback, thisArg) {
            if (this == null) {
                throw new TypeError('Array.prototype.find called on null or undefined');
            }
            if (typeof callback !== 'function') {
                throw new TypeError('callback must be a function');
            }
            var list = Object(this);
            var length = parseInt(list.length) || 0;
            for (var i = 0; i < length; i++) {
                if (i in list) {
                    var element = list[i];
                    if (callback.call(thisArg, element, i, list)) {
                        return element;
                    }
                }
            }
            return undefined;
        };
    }

    // String.prototype.includes polyfill (IE11, older Smart TVs)
    if (!String.prototype.includes) {
        String.prototype.includes = function(search, start) {
            if (typeof start !== 'number') {
                start = 0;
            }
            if (start + search.length > this.length) {
                return false;
            } else {
                return this.indexOf(search, start) !== -1;
            }
        };
    }

    // Number.isNaN polyfill (IE11, older Smart TVs)
    if (!Number.isNaN) {
        Number.isNaN = function(value) {
            return typeof value === 'number' && isNaN(value);
        };
    }

    // Set polyfill (IE10, older Smart TVs)
    if (typeof Set === 'undefined') {
        window.Set = function(iterable) {
            this._values = [];
            this.size = 0;
            
            if (iterable) {
                for (var i = 0; i < iterable.length; i++) {
                    this.add(iterable[i]);
                }
            }
        };

        Set.prototype.add = function(value) {
            if (this._values.indexOf(value) === -1) {
                this._values.push(value);
                this.size = this._values.length;
            }
            return this;
        };

        Set.prototype.has = function(value) {
            return this._values.indexOf(value) !== -1;
        };

        Set.prototype.delete = function(value) {
            var index = this._values.indexOf(value);
            if (index !== -1) {
                this._values.splice(index, 1);
                this.size = this._values.length;
                return true;
            }
            return false;
        };

        Set.prototype.clear = function() {
            this._values = [];
            this.size = 0;
        };

        Set.prototype.forEach = function(callback, thisArg) {
            for (var i = 0; i < this._values.length; i++) {
                callback.call(thisArg, this._values[i], this._values[i], this);
            }
        };
    }

    // Object.entries polyfill (IE11, older Smart TVs)
    if (!Object.entries) {
        Object.entries = function(obj) {
            var entries = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    entries.push([key, obj[key]]);
                }
            }
            return entries;
        };
    }

    // Object.fromEntries polyfill (Not supported in IE, older Smart TVs)
    if (!Object.fromEntries) {
        Object.fromEntries = function(iterable) {
            var obj = {};
            for (var i = 0; i < iterable.length; i++) {
                var entry = iterable[i];
                if (entry && entry.length >= 2) {
                    obj[entry[0]] = entry[1];
                }
            }
            return obj;
        };
    }

    // Element.scrollIntoView with options polyfill
    if (Element.prototype.scrollIntoView) {
        var originalScrollIntoView = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function(options) {
            if (typeof options === 'object' && options !== null) {
                // Fallback to simple boolean for older browsers
                originalScrollIntoView.call(this, options.block !== 'end');
            } else {
                originalScrollIntoView.call(this, options);
            }
        };
    }

    // addEventListener passive option support check and polyfill
    (function() {
        var supportsPassive = false;
        try {
            var opts = Object.defineProperty({}, 'passive', {
                get: function() {
                    supportsPassive = true;
                    return true;
                }
            });
            window.addEventListener('test', null, opts);
            window.removeEventListener('test', null, opts);
        } catch (e) {}

        if (!supportsPassive) {
            var originalAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                var useCapture = typeof options === 'object' ? Boolean(options.capture) : Boolean(options);
                return originalAddEventListener.call(this, type, listener, useCapture);
            };
        }
    })();

    // String.prototype.trim polyfill (IE8 and below)
    if (!String.prototype.trim) {
        String.prototype.trim = function() {
            return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        };
    }

    // Array.isArray polyfill (IE8 and below)
    if (!Array.isArray) {
        Array.isArray = function(arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }

    // Date.now polyfill (IE8 and below)
    if (!Date.now) {
        Date.now = function() {
            return new Date().getTime();
        };
    }

    // Console polyfill for older Smart TVs that might not have console
    if (typeof console === 'undefined') {
        window.console = {
            log: function() {},
            error: function() {},
            warn: function() {},
            info: function() {}
        };
    }

    // JSON polyfill (very old browsers/Smart TVs)
    if (typeof JSON === 'undefined') {
        window.JSON = {
            parse: function(str) {
                try {
                    return eval('(' + str + ')');
                } catch (e) {
                    throw new SyntaxError('Invalid JSON');
                }
            },
            stringify: function(obj) {
                if (obj === null) return 'null';
                if (typeof obj === 'undefined') return undefined;
                if (typeof obj === 'string') return '"' + obj.replace(/"/g, '\\"') + '"';
                if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
                if (obj instanceof Array) {
                    var arr = [];
                    for (var i = 0; i < obj.length; i++) {
                        arr.push(JSON.stringify(obj[i]) || 'null');
                    }
                    return '[' + arr.join(',') + ']';
                }
                if (typeof obj === 'object') {
                    var pairs = [];
                    for (var key in obj) {
                        if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
                            pairs.push(JSON.stringify(key) + ':' + JSON.stringify(obj[key]));
                        }
                    }
                    return '{' + pairs.join(',') + '}';
                }
                return undefined;
            }
        };
    }

    // Function.prototype.bind polyfill (IE8 and below, some Smart TVs)
    if (!Function.prototype.bind) {
        Function.prototype.bind = function(oThis) {
            if (typeof this !== 'function') {
                throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
            }
            var aArgs = Array.prototype.slice.call(arguments, 1);
            var fToBind = this;
            var fNOP = function() {};
            var fBound = function() {
                return fToBind.apply(
                    this instanceof fNOP ? this : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments))
                );
            };
            if (this.prototype) {
                fNOP.prototype = this.prototype;
            }
            fBound.prototype = new fNOP();
            return fBound;
        };
    }

    // Array.prototype.indexOf polyfill (IE8 and below)
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function(searchElement, fromIndex) {
            if (this == null) {
                throw new TypeError('Array.prototype.indexOf called on null or undefined');
            }
            var o = Object(this);
            var len = parseInt(o.length) || 0;
            if (len === 0) return -1;
            var n = parseInt(fromIndex) || 0;
            var k;
            if (n >= len) return -1;
            if (n >= 0) {
                k = n;
            } else {
                k = len + n;
                if (k < 0) k = 0;
            }
            for (; k < len; k++) {
                if (k in o && o[k] === searchElement) {
                    return k;
                }
            }
            return -1;
        };
    }

    // Promise polyfill (IE11, older Smart TVs)
    if (typeof Promise === 'undefined') {
        window.Promise = function(executor) {
            var self = this;
            this.state = 'pending';
            this.value = undefined;
            this.handlers = [];

            function resolve(result) {
                if (self.state === 'pending') {
                    self.state = 'fulfilled';
                    self.value = result;
                    self.handlers.forEach(handle);
                    self.handlers = null;
                }
            }

            function reject(error) {
                if (self.state === 'pending') {
                    self.state = 'rejected';
                    self.value = error;
                    self.handlers.forEach(handle);
                    self.handlers = null;
                }
            }

            function handle(handler) {
                if (self.state === 'pending') {
                    self.handlers.push(handler);
                } else {
                    if (self.state === 'fulfilled' && typeof handler.onFulfilled === 'function') {
                        handler.onFulfilled(self.value);
                    }
                    if (self.state === 'rejected' && typeof handler.onRejected === 'function') {
                        handler.onRejected(self.value);
                    }
                }
            }

            this.then = function(onFulfilled, onRejected) {
                return new Promise(function(resolve, reject) {
                    handle({
                        onFulfilled: function(result) {
                            try {
                                if (typeof onFulfilled === 'function') {
                                    resolve(onFulfilled(result));
                                } else {
                                    resolve(result);
                                }
                            } catch (ex) {
                                reject(ex);
                            }
                        },
                        onRejected: function(error) {
                            try {
                                if (typeof onRejected === 'function') {
                                    resolve(onRejected(error));
                                } else {
                                    reject(error);
                                }
                            } catch (ex) {
                                reject(ex);
                            }
                        }
                    });
                });
            };

            this.catch = function(onRejected) {
                return this.then(null, onRejected);
            };

            try {
                executor(resolve, reject);
            } catch (error) {
                reject(error);
            }
        };

        // Promise.resolve static method
        Promise.resolve = function(value) {
            return new Promise(function(resolve) {
                resolve(value);
            });
        };

        // Promise.reject static method
        Promise.reject = function(reason) {
            return new Promise(function(resolve, reject) {
                reject(reason);
            });
        };
    }

    // URLSearchParams polyfill (not supported in IE, older Smart TVs)
    if (typeof URLSearchParams === 'undefined') {
        window.URLSearchParams = function(init) {
            this.params = [];
            
            if (typeof init === 'string') {
                if (init.charAt(0) === '?') {
                    init = init.slice(1);
                }
                var pairs = init.split('&');
                for (var i = 0; i < pairs.length; i++) {
                    var pair = pairs[i];
                    if (pair) {
                        var idx = pair.indexOf('=');
                        if (idx >= 0) {
                            this.params.push([decodeURIComponent(pair.slice(0, idx)), decodeURIComponent(pair.slice(idx + 1))]);
                        } else {
                            this.params.push([decodeURIComponent(pair), '']);
                        }
                    }
                }
            }
        };

        URLSearchParams.prototype.append = function(name, value) {
            this.params.push([String(name), String(value)]);
        };

        URLSearchParams.prototype.toString = function() {
            var pairs = [];
            for (var i = 0; i < this.params.length; i++) {
                pairs.push(encodeURIComponent(this.params[i][0]) + '=' + encodeURIComponent(this.params[i][1]));
            }
            return pairs.join('&');
        };

        URLSearchParams.prototype.get = function(name) {
            for (var i = 0; i < this.params.length; i++) {
                if (this.params[i][0] === name) {
                    return this.params[i][1];
                }
            }
            return null;
        };
    }

    // Basic FormData polyfill (minimal, for very old browsers)
    if (typeof FormData === 'undefined') {
        window.FormData = function() {
            this.data = [];
        };

        FormData.prototype.append = function(name, value) {
            this.data.push([String(name), value]);
        };

        FormData.prototype.entries = function() {
            var index = 0;
            var data = this.data;
            return {
                next: function() {
                    if (index < data.length) {
                        return { value: data[index++], done: false };
                    }
                    return { done: true };
                }
            };
        };
    }

    // loadScriptOnce utility function (used by minimal-api-monitor.js)
    if (typeof window.loadScriptOnce === 'undefined') {
        window.loadScriptOnce = function(src, integrity, timeoutMs) {
            return new Promise(function(resolve, reject) {
                // Check if already loaded
                var existingScript = document.querySelector('script[src="' + src + '"]');
                if (existingScript) {
                    resolve();
                    return;
                }

                var script = document.createElement('script');
                var timeout;

                function cleanup() {
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                    }
                    script.onload = null;
                    script.onerror = null;
                }

                script.onload = function() {
                    cleanup();
                    resolve();
                };

                script.onerror = function() {
                    cleanup();
                    reject(new Error('Failed to load script: ' + src));
                };

                if (timeoutMs && timeoutMs > 0) {
                    timeout = setTimeout(function() {
                        cleanup();
                        reject(new Error('Script load timeout: ' + src));
                    }, timeoutMs);
                }

                script.src = src;
                if (integrity) {
                    script.integrity = integrity;
                    script.crossOrigin = 'anonymous';
                }

                document.head.appendChild(script);
            });
        };
    }

})();
