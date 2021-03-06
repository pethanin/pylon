/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 *
 */

// #ifdef __TP_HTTP

/**
 * @class ppc.http
 *
 * This object does what is commonly known as Ajax; it **A**synchronously 
 * communicates using **J**avaScript, **A**nd in most 
 * cases it sends or receives **X**ml. It allows for easy HTTP 
 * communication from within the browser. 
 *
 * This object provides caching on top of
 * the browser's cache. This enables you to optimize your application, because
 * this can be set on a per call basis. 
 *
 * #### Example:
 *
 * Retrieving content over HTTP synchronously:
 *
 * ```javascript
 *  var http = new ppc.http();
 *  var data = http.get("http://www.example.com/mydata.jsp", {async: false});
 *  alert(data);
 * ```
 *
 * #### Example:
 *
 * Retrieving content over HTTP asynchronously:
 *
 * ```javascript
 *  var http = new ppc.http();
 *  http.get("http://www.example.com/mydata.jsp", {
 *      callback: function(data, state, extra){
 *         if (state != ppc.SUCCESS)
 *             return alert('an error has occurred');
 *
 *         alert(data);
 *      }
 *  });
 * ```
 *
 * #### Example:
 *
 * An asynchronous HTTP request, with retry:
 *
 * ```javascript
 *  var http = new ppc.http();
 *  http.get("http://www.example.com/mydata.jsp", {
 *      callback: function(data, state, extra){
 *          if (state != ppc.SUCCESS) {
 *              var oError = new Error(ppc.formatErrorString(0, null,
 *                  "While loading data", "Could not load data\n" + extra.message));
 *
 *              if (extra.tpModule.retryTimeout(extra, state, null, oError) === true)
 *                  return true;
 *
 *              throw oError;
 *          }
 *
 *          alert(data);
 *      }
 *  });
 * ```
 */
/**
 * @event error Fires when a communication error occurs.
 * @bubbles
 * @cancelable  Prevents a communication error to be thrown.
 * @param {Object} e An object returned by the callback. It contains the following properties:
 *     - error ([[Error]]): The error object that is thrown when the event
 *                                callback doesn't return false.
 *     - state ([[Number]]): The state of the call. Possible values include:
 *       - `ppc.SUCCESS`:  The request was successfull
 *       - `ppc.TIMEOUT`:  The request has timed out.
 *       - `ppc.ERROR`:    An error has occurred while making the request.
 *       - `ppc.OFFLINE`:  The request was made while the application was offline.
 *     - userdata (`Mixed`): Data that the caller wanted to be available in
 *                                the callback of the HTTP request.
 *     - http ([[XMLHttpRequest]]): The object that executed the actual HTTP request.
 *     - url ([[String]]): The URL that was requested.
 *     - tpModule ([[ppc.http]]): The teleport module that is making the request.
 *     - id ([[Number]]): The id of the request.
 *     - message ([[String]]): The error message.
 *
 * @define http
 * @default_private
 *
 * @author      Ruben Daniels (ruben AT ajax DOT org)
 * @version     %I%, %G%
 * @since       0.4
 */
ppc.http = function(){
    this.queue     = [null];
    this.callbacks = {};
    this.cache     = {};

    /**
     * Sets the timeout of http requests in milliseconds. Default is 10000ms (10s).
     * @type {Number}
     */
    this.timeout   = this.timeout || 10000; //default 10 seconds
    
    /**
     * Sets whether this element routes traffic through a server proxy.
     *
     * #### Remarks
     *
     * This can also be set on a per call basis. See {@link ppc.http.get}.
     *
     * 
     * @type {Boolean}
     */
    this.autoroute = this.autoroute || false;
    
    /**
     * String specifying the URL to the route script. 
     * 
     * #### Remarks
     *
     * The route script will receive the route information in three extra headers:
     *   - `X-Route-Request`     : Contains the destination URL
     *   - `X-Proxy-Request`     : Contains the proxy URL
     *   - `X-Compress-Response` : Set to 'gzip'
     *
     * @type {String}
     */
    this["route-server"] = this["route-server"] || null;

    if (!this.$uniqueId)
        this.$uniqueId = ppc.all.push(this) - 1;

    this.toString = this.toString || function(){
        return "[Ajax.org Teleport Component : (HTTP)]";
    };

    //#ifdef __WITH_STORAGE && __WITH_HTTP_CACHE
    
    /**
     * Saves the PPC HTTP cache to the available storage engine.
     */
    this.saveCache = function(){
        // #ifdef __DEBUG
        ppc.console.info("[HTTP] Loading HTTP Cache", "teleport");
        // #endif

        var strResult = JSON.stringify(comm.cache);
        ppc.storage.put("cache_" + this.name, strResult,
            ppc.config.name + ".ppc.http");
    };

    /**
     * Loads the PPC HTTP cache from the available storage engine.
     */
    this.loadCache = function(){
        var strResult = ppc.storage.get("cache_" + this.name,
            ppc.config.name + ".ppc.http");

        // #ifdef __DEBUG
        ppc.console.info("[HTTP] Loading HTTP Cache", "steleport");
        // #endif

        if (!strResult)
            return false;

        this.cache = ppc.unserialize(strResult);

        return true;
    };

    /**
     * Removes the stored HTTP cache from the available storage engine.
     */
    this.clearCache = function(){
        ppc.storage.remove("cache_" + this.name,
            ppc.config.name + ".ppc.http");
    };
    //#endif

    /**
     * Makes an HTTP request that receives XML.
     * @param {String}   url       The url that is accessed.
     * @param {Object}   options   The options for the HTTP request. It contains the following properties:
     *   - async ([[Boolean]]): Specifies whether the request is sent asynchronously. Defaults to true.
     *   - userdata (`Mixed`): custom data that is available to the callback function.
     *   - method ([[String]]): The request method (`POST`|`GET`|`PUT`|`DELETE`). Defaults to `GET`.
     *   - nocache ([[Boolean]]): Specifies whether browser caching is prevented.
     *   - data ([[String]]): the data sent in the body of the message.
     *   - autoroute ([[Boolean]]): Specifies whether the request can fallback to a server proxy.
     *   - caching ([[Boolean]]): Specifies whether the request should use internal caching.
     *   - ignoreOffline ([[Boolean]]): Specifies whether to ignore offline catching.
     *   - callback ([[Function]]): The handler that gets called whenever the
     *                            request completes succesfully or with an error,
     *                            or when the request times out.
     */
    this.getXml = function(url, callback, options){
        if (!options) options = {};
        options.useXML = true;
        options.callback = callback;
        return this.get(url, options);
    };
    
    this.getJSON = function(url, callback, options){
        if (!options) options = {};
        options.callback = callback;
        options.useJSON = true;
        return this.get(url, options);
    };

    /**
     * Makes an HTTP request.
     * @param {String}   url       The URL that is accessed.
     * @param {Object}   options   The options for the HTTP request. It contains the following properties:
     *   - async ([[Boolean]]): Specifies whether the request is sent asynchronously. Defaults to true.
     *   - userdata (`Mixed`): Custom data that is available to the callback function.
     *   - method ([[String]]): The request method (POST|GET|PUT|DELETE). Defaults to GET.
     *   - nocache ([[Boolean]]): Specifies whether browser caching is prevented.
     *   - data ([[String]]): The data sent in the body of the message.
     *   - useXML ([[Boolean]]): Specifies whether the result should be interpreted as xml.
     *   - autoroute ([[Boolean]]): Specifies whether the request can fallback to a server proxy.
     *   - caching ([[Boolean]]): Specifies whether the request should use internal caching.
     *   - ignoreOffline ([[Boolean]]): Specifies whether to ignore offline catching.
     *   - contentType ([[String]]): The mime type of the message
     *   - withCredentials ([[Boolean]]): Value of the withCredentials field for CORS requests
     *   - callback ([[Function]]): The handler that gets called whenever the
     *                            request completes succesfully or with an error,
     *                            or when the request times out.
     */
    this.get = this.$get = function(url, options){
        if (!options)
            options = {};

        var _self = this;
        var id    = options.id;
        //#ifdef __WITH_OFFLINE
        var bHasOffline = (typeof ppc.offline != "undefined");
        if (bHasOffline && !ppc.offline.onLine && options.notWhenOffline)
            return false;

        if (bHasOffline && !ppc.offline.onLine && !options.ignoreOffline) {
            if (ppc.offline.queue.enabled) {
                //Let's record all the necesary information for future use (during sync)
                var info = ppc.extend({
                    url      : url,
                    callback : options.callback,
                    retry    : function(){
                        _self.get(this.url, this.options);
                    },
                    $object : [this.name, "ppc.oHttp", "new ppc.http()"],
                    $retry : "this.object.get(this.url, this.options)"
                }, options);

                ppc.offline.queue.add(info);

                return;
            }

            /*
                Apparently we're doing an HTTP call even though we're offline
                I'm allowing it, because the developer seems to know more
                about it than I right now
            */

            //#ifdef __DEBUG
            ppc.console.warn("Executing HTTP request even though application is offline");
            //#endif
        }
        //#endif
        
        //#ifdef __ENABLE_UIRECORDER_HOOK
        if (ppc.uirecorder && ppc.uirecorder.captureDetails) {
            if (ppc.uirecorder.isRecording || ppc.uirecorder.isTesting) {// only capture events when recording  ppc.uirecorder.isLoaded
                ppc.uirecorder.capture.trackHttpCall(this, url, options); 
            }
        }
        //#endif

        var binary = ppc.hasXhrBinary && options.binary;
        var async = options.async = (options.async || binary 
            || typeof options.async == "undefined" || ppc.isOpera || false);

        //#ifdef __SUPPORT_WEBKIT
        if (ppc.isWebkit)
            url = ppc.html_entity_decode(url);
        //#endif

        var data = options.data || "";

        if (ppc.isNot(id)) {
            //#ifdef __WITH_HTTP_CACHE
            if (this.cache[url] && this.cache[url][data]) {
                var http = {
                    responseText : this.cache[url][data],
                    responseXML  : {},
                    status       : 200,
                    isCaching    : true
                }
            }
            else
            //#endif
                var http = ppc.getHttpReq();

            id = this.queue.push({
                http     : http,
                url      : url,
                callback : options.callback,
                retries  : 0,
                options  : options
            }) - 1;

            //#ifdef __WITH_HTTP_CACHE
            if (http.isCaching) {
                if (async)
                    return $setTimeout("ppc.lookup(" + this.$uniqueId
                        + ").receive(" + id + ");", 50);
                else
                    return this.receive(id);
            }
            //#endif
        }
        else {
            var http = this.queue[id].http;

            //#ifdef __WITH_HTTP_CACHE
            if (http.isCaching)
                http = ppc.getHttpReq();
            else
            //#endif
                http.abort();
        }

        if (async) {
            //#ifdef __SUPPORT_IE5
            if (ppc.hasReadyStateBug) {
                this.queue[id].starttime = new Date().getTime();
                this.queue[id].timer = setInterval(function(){
                    var diff = new Date().getTime() - _self.queue[id].starttime;
                    if (diff > _self.timeout) {
                        _self.$timeout(id);
                        return
                    };

                    if (_self.queue[id].http.readyState == 4) {
                        clearInterval(_self.queue[id].timer);
                        _self.receive(id);
                    }
                }, 20);
            }
            else
            //#endif
            {
                http.onreadystatechange = function(){
                    if (!_self.queue[id] || http.readyState != 4)
                        return;
                    if (async && arguments.callee.caller)
                        $setTimeout(function(){_self.receive(id)});
                    else
                        _self.receive(id);
                }
            }
        }

        var autoroute = this.autoroute && ppc.isOpera
            ? true //Bug in opera
            : (options.autoroute || this.shouldAutoroute),
            httpUrl = autoroute ? this["route-server"] : url;

        // #ifdef __DEBUG
        if (!options.hideLogMessage) {
            ppc.console.teleport(this.queue[id].log = new ppc.teleportLog({
                id      : id,
                tp      : this,
                type    : options.type,
                method  : this.method || options.method || "GET",
                url     : url,
                route   : autoroute ? httpUrl : "",
                data    : new String(data && data.xml ? data.xml : data),
                start   : new Date()
            }));
        }
        // #endif
        var headers = [];
        
        function setRequestHeader(name, value){
            //#ifdef __DEBUG
            headers.push(name + ": " + value);
            //#endif
            http.setRequestHeader(name, value);
        }

        var errorFound = false;
        try {
            if (options.nocache)
                httpUrl = ppc.getNoCacheUrl(httpUrl);

            //#ifdef __WITH_QUERYAPPEND
            if (ppc.config.queryAppend) {
                httpUrl += (httpUrl.indexOf("?") == -1 ? "?" : "&")
                    + ppc.config.queryAppend;
            }
            //#endif
            
            var requestedWithParam = ppc.config ? ppc.config["requested-with-getparam"] : null;
            if (requestedWithParam) {
                httpUrl += (httpUrl.indexOf("?") == -1 ? "?" : "&") +
                    encodeURIComponent(requestedWithParam) + "=1";
            }

            var withCredentials = false;
            if ("withCredentials" in options) {
                withCredentials = options.withCredentials;
            }
            else {
                withCredentials = (ppc.config && ppc.config["cors-with-credentials"]) || false;
            }
            http.withCredentials = withCredentials;

            // global support for protection against Cross Site Request Forgery
            // attacks by supplying a token to the global PPC config object. This
            // token will be appended to the URL and sent for each XHR.
            // Warning: if you are doing CORS, be sure to use a different method!
            var method = this.method || options.method || "GET";
            var CSRFHeader = ppc.config ? ppc.config["csrf-header"] : null;
            var CSRFToken = ppc.config ? ppc.config["csrf-token"] : null;
            if (method !== "GET" && CSRFToken) {
                CSRFToken = CSRFToken.split("=").map(function(s) { return encodeURIComponent(s); }).join("=");
                httpUrl += (httpUrl.indexOf("?") == -1 ? "?" : "&") + CSRFToken;
            }

            http.open(method, httpUrl, async);

            if (method !== "GET" && CSRFHeader) {
                setRequestHeader("X-CSRF-Token", CSRFHeader);
            }

            if (options.username) {
                setRequestHeader("Authorization", "Basic "
                    + ppc.crypto.Base64.encode(options.username + ":" + options.password))
            }

            //@todo OPERA ERROR's here... on retry [is this still applicable?]
            if (!requestedWithParam)
                setRequestHeader("X-Requested-With", "XMLHttpRequest");

            if (!options.headers || !options.headers["Content-type"])
                setRequestHeader("Content-type", options.contentType || this.contentType
                    || (this.useXML || options.useXML ? "text/xml" : "text/plain"));

            if (autoroute) {
                setRequestHeader("X-Route-Request", url);
                setRequestHeader("X-Proxy-Request", url);
                setRequestHeader("X-Compress-Response", "gzip");
            }
            
            if (binary) {
                setRequestHeader("Cache-Control", "no-cache");
                setRequestHeader("X-File-Name", binary.filename);
                setRequestHeader("X-File-Size", binary.filesize);
                setRequestHeader("Content-Type", "application/octet-stream");
            }
        }
        catch (e) {
            errorFound = e.message;
        }

        if (errorFound) {
            var useOtherXH = false;

            // Retry request by routing it
            if (!useOtherXH && this.autoroute && !autoroute) {
                //#ifdef __SUPPORT_IE5
                if (!ppc.isNot(id))
                    clearInterval(this.queue[id].timer);
                //#endif

                this.shouldAutoroute = true;

                options.autoroute = true;
                return this.get(url, options);
            }

            if (!useOtherXH) {
                //Routing didn't work either... Throwing error
                var noClear = options.callback ? options.callback(null, ppc.ERROR, {
                    userdata: options.userdata,
                    http    : http,
                    url     : url,
                    tpModule: this,
                    id      : id,
                    message : "Permission denied accessing remote resource: "
                              + url + "\nMessage: " + errorFound
                }) : false;
                if (!noClear)
                    this.clearQueueItem(id);

                return;
            }
        }

        if (this.$headerHook)
            this.$headerHook(http);

        //Set request headers
        if (options.headers) {
            for (var name in options.headers)
                setRequestHeader(name, options.headers[name]);
        }
        
        // #ifdef __DEBUG
        if (!options.hideLogMessage)
            this.queue[id].log.request(headers);
        // #endif

        function handleError(){
            var msg = self.navigator && self.navigator.onLine
                ? "File or Resource not available " + url
                : "Browser is currently working offline";

            //#ifdef __DEBUG
            ppc.console.warn(msg, "teleport");
            if (!options.hideLogMessage)
                _self.queue[id].log.response({
                    //#ifdef __DEBUG
                    end     : new Date(),
                    //#endif
                    message : msg,
                    http    : http
                });
            //#endif

            var state = self.navigator && navigator.onLine
                ? ppc.ERROR
                : ppc.TIMEOUT;

            // File not found
            var noClear = options.callback ? options.callback(null, state, {
                userdata : options.userdata,
                http     : http,
                url      : url,
                tpModule : _self,
                id       : id,
                message  : msg
            }) : false;
            if (!noClear)
                _self.clearQueueItem(id);
        }

        function send(isLocal){
            var hasError;

            if (ppc.isIE && isLocal) { //When local IE calls onreadystate immediately
                var oldWinOnerror = window.onerror;
                window.onerror = function(){
                    if (arguments.caller && arguments.caller.callee == send) {
                        window.onerror = oldWinOnerror;
                        //_self.receive(id);
                        //setTimeout(function(){handleError();});
                        return true;
                    }
                    else {
                        window.onerror = oldWinOnerror;
                        
                        if (oldWinOnerror)
                            return oldWinOnerror.apply(window, arguments);
                    }
                }
                http.send(data);
                window.onerror = oldWinOnerror;
            }
            else {
                try {
                    if (binary && http.sendAsBinary) {
                        binary.blob = getBinaryBlob(data, http, binary);
                        http.sendAsBinary(binary.blob.data);
                    }
                    else
                        http.send(data);
                }
                catch(e){
                    hasError = true;
                }
            }

            if (hasError) {
                handleError();
                return;
            }
            else if (binary && http.upload) {
                http.upload.onprogress = function(e) {
                    ppc.dispatchEvent("http.uploadprogress", {
                        loaded  : e.loaded - binary.blob.size,
                        extra   : e,
                        bubbles : true
                    });
                };
            }
        }

        if (!async) {
            send.call(this);
            return this.receive(id);
        }
        else {
            if (ppc.loadsLocalFilesSync && location.protocol == "file:"
              && url.indexOf("http://") == -1) {
                $setTimeout(function(){
                    send.call(_self, true);
                });
            }
            else
                send.call(_self);

            return id;
        }
    };
    
    // #ifdef __WITH_DATA
    if (!this.exec) {
    /**
             * A method that all async objects should implement.
             *
     * @private
     */
        this.exec = function(method, args, callback, options){
            if (!options)
                options = {};
            
            var url = args[0], query = "";
            if (!options.method)
                options.method = method.toUpperCase();
            if (!options.callback)
                options.callback = callback;
            
            this.contentType = "application/x-www-form-urlencoded";
            this.$get(
                ppc.getAbsolutePath(ppc.config.baseurl, url), 
                options.method == "GET" 
                    ? options 
                    : ppc.extend({data : query}, options)
            );
        }
    }
    // #endif
    
    /**
     * Sends the binary blob to the server, and multipart encodes it if needed. This code 
     * will only be executed on Gecko since it's currently the only browser that 
     * supports direct file access.
     * @private
     */
    function getBinaryBlob(data, http, binary) {
        var boundary      = "----ppcbound".appendRandomNumber(5),
            dashdash      = "--",
            crlf          = "\r\n",
            multipartBlob = "",
            multipartSize = 0;

        // Build multipart request
        if (binary.multipart) {
            http.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
            // Build RFC2388 blob
            multipartBlob += dashdash + boundary + crlf +
                'Content-Disposition: form-data; name="' + (binary.filedataname || binary.filename)
                    + '"; filename="' + binary.filename + '"' + crlf +
                'Content-Type: application/octet-stream' + crlf + crlf +
                data + crlf +
                dashdash + boundary + dashdash + crlf;

            multipartSize = multipartBlob.length - data.length;
            data = multipartBlob;
        }
        // Send blob or multipart blob depending on config
        return {size: multipartSize, data: data};
    }

    /**
     * @private
     */
    this.receive = function(id){
        if (!this.queue[id])
            return false;

        var qItem    = this.queue[id],
            http     = qItem.http,
            callback = qItem.callback;
        //if (ppc.isGecko)
        //    var ppc = self.ppc || ppc;     // needed here to fix a rare ReferenceError in FF

        //#ifdef __SUPPORT_IE5
        clearInterval(qItem.timer);
        //#endif

        /*if (self.navigator && navigator.onLine === false &&
          (location.protocol != "file:"
          || qItem.url.indexOf("http://") > -1))
            return false;*/

        // Test if HTTP object is ready
        if (qItem.async) {
            try {
                if (http.status) {}
            }
            catch (e) {
                var _self = this;
                return $setTimeout(function(){
                    _self.receive(id)
                }, 10);
            }
        }
        
        /* #ifdef __DEBUG
        if (!qItem.options.hideLogMessage) {
            ppc.console.info("[HTTP] Receiving [" + id + "]"
                + (http.isCaching
                    ? "[<span style='color:orange'>cached</span>]"
                    : "")
                + " from " + qItem.url,
                "teleport",
                http.responseText);
        }
        #endif */

        //Gonna check for validity of the http response
        var errorMessage = [],
            extra = {
                //#ifdef __DEBUG
                end      : new Date(),
                //#endif
                tpModule : this,
                http     : http,
                status   : http.status,
                url      : qItem.url,
                callback : callback,
                id       : id,
                retries  : qItem.retries || 0,
                userdata : qItem.options.userdata
            };

        // Check HTTP Status
        // The message didn't receive the server. We consider this a timeout (i.e. 12027)
        if (http.status > 600)
            return this.$timeout(id);

        extra.data = qItem.options.useJSON 
            ? eval("(" + http.responseText + ")") 
            : http.responseText; //Can this error?

        if (http.status >= 400 && http.status < 600 || http.status < 10 
          && (http.status != 0 || !ppc.isIE && !http.responseText)) { //qItem.url.substr(0, 6) == "file:/"
            //#ifdef __WITH_AUTH
            //@todo This should probably have an RPC specific handler
            if (http.status == 401) {
                var auth = ppc.document.getElementsByTagNameNS(ppc.ns.ppc, "auth")[0];
                if (auth) {
                    var wasDelayed = qItem.isAuthDelayed;
                    qItem.isAuthDelayed = true;
                    if (auth.authRequired(extra, wasDelayed) === true)
                        return;
                }
            }
            //#endif

            errorMessage.push("HTTP error [" + id + "]:" + http.status + "\n"
                + http.responseText);
        }

        // Check for XML Errors
        if (qItem.options.useXML || this.useXML) {
            /* Note (Mike, Oct 14th 2008): for WebDAV, I had to copy the lines below,
                                           it required custom responseXML handling/
                                           parsing.
                                           If you alter this code, please correct
                                           webdav.js appropriately.
            */
            if ((http.responseText || "").replace(/^[\s\n\r]+|[\s\n\r]+$/g, "") == "")
                errorMessage.push("Received an empty XML document (0 bytes)");
            else {
                try {
                    var xmlDoc = (http.responseXML && http.responseXML.documentElement)
                        ? ppc.xmlParseError(http.responseXML)
                        : ppc.getXmlDom(http.responseText);

                    if (!ppc.supportNamespaces)
                        xmlDoc.setProperty("SelectionLanguage", "XPath");

                    extra.data = xmlDoc.documentElement;
                }
                catch(e){
                    errorMessage.push("Received invalid XML\n\n" + e.message);
                }
            }
        }

        //Process errors if there are any
        if (errorMessage.length) {
            extra.message = errorMessage.join("\n");

            //#ifdef __DEBUG
            if (qItem.log)
                qItem.log.response(extra);
            //#endif

            // Send callback error state
            if (!callback || !callback(extra.data, ppc.ERROR, extra))
                this.clearQueueItem(id);

            return;
        }

        // #ifdef __WITH_HTTP_CACHE
        if (qItem.options.caching) {
            if (!this.cache[qItem.url])
                this.cache[qItem.url] = {};

            this.cache[qItem.url][qItem.options.data] = http.responseText;
        }
        //#endif

        //#ifdef __DEBUG
        if (qItem.log)
            qItem.log.response(extra);
        //#endif

        //Http call was successfull Success
        if (!callback || !callback(extra.data, ppc.SUCCESS, extra))
            this.clearQueueItem(id);

        return extra.data;
    };

    this.$timeout = function(id){
        if (!this.queue[id])
            return false;

        var qItem = this.queue[id],
            http  = qItem.http;

        //#ifdef __SUPPORT_IE5
        clearInterval(qItem.timer);
        //#endif

        // Test if HTTP object is ready
        try {
            if (http.status) {}
        }
        catch (e) {
            var _self = this;
            return $setTimeout(function(){
                _self.$timeout(id)
            }, 10);
        }

        var callback = qItem.callback;

        http.abort();

        // #ifdef __DEBUG
        ppc.console.info("HTTP Timeout [" + id + "]", "teleport");
        // #endif

        var extra;
        var noClear = callback ? callback(null, ppc.TIMEOUT, extra = {
            //#ifdef __DEBUG
            end     : new Date(),
            //#endif
            userdata: qItem.options.userdata,
            http    : http,
            url     : qItem.url,
            tpModule: this,
            id      : id,
            message : "HTTP Call timed out",
            retries : qItem.retries || 0
        }) : false;
        
        //#ifdef __DEBUG
        if (qItem.log)
            qItem.log.response(extra);
        //#endif
        
        if (!noClear)
            this.clearQueueItem(id);
    };

    /**
     * Checks if the request has timed out. If so, it is retried
     * three times before an exception is thrown. Request retrying is a very
     * good way to create a robust Ajax application. In many cases, even with
     * good connections, requests still time out.
     * @param {Object}  extra      The information object given as a third
     *                             argument of the HTTP request callback.
     * @param {Number}  state      The return code of the HTTP request. It contains the following properties:
     *   - `ppc.SUCCESS`:  the request was successfull
     *   - `ppc.TIMEOUT`:  the request has timed out.
     *   - `ppc.ERROR`:    an error occurred while making the request.
     *   - `ppc.OFFLINE`:  the request was made while the application was offline.
     * @param {ppc.AmlNode} [amlNode]    The element receiving the error event.
     * @param {Error}   [oError]     The error to be thrown when the request is
     *                               not retried.
     * @param {Number}  [maxRetries] The number of retries that are done before
     *                               the request times out. Default is 3.
     */
    this.retryTimeout = function(extra, state, amlNode, oError, maxRetries){
        if (state == ppc.TIMEOUT
          && extra.retries < (maxRetries || ppc.maxHttpRetries))
            return extra.tpModule.retry(extra.id);

        oError = oError || new Error(ppc.formatErrorString(0,
            this, "Communication " + (state == ppc.TIMEOUT
                ? "timeout"
                : "error"), "Url: " + extra.url + "\nInfo: " + extra.message));

        if ((amlNode || ppc).dispatchEvent("error", ppc.extend({
            error   : oError,
            state   : state,
            extra   : extra,
            bubbles : true
        }, extra)) === false)
            return 2;
    };

    /**
     * Removes the item from the queue. This is usually done automatically.
     * However, when the callback returns `true` the queue isn't cleared; for instance,
     * when a request is retried. The id of the call
     * is found on the `'extra'` object, the third argument of the callback.
     * 
     * #### Example
     *
     * ```javascript
     *  http.clearQueueItem(extra.id);
     * ```
     *
     * @param {Number} id The id of the call that should be removed from the queue.
     */
    this.clearQueueItem = function(id){
        if (!this.queue[id])
            return false;

        //#ifdef __SUPPORT_IE5
        clearInterval(this.queue[id].timer);
        //#endif

        if (ppc.releaseHTTP && !ppc.isGecko)
            ppc.releaseHTTP(this.queue[id].http);

        this.queue[id] = null;
        delete this.queue[id];

        return true;
    };

    /**
     * Retries a call based on its id. The id of the call is found on the
     * `'extra'` object, the third argument of the callback.
     * 
     * #### Example
     *
     * ```javascript
     *  function callback(data, state, extra){
     *      if (state == ppc.TIMEOUT && extra.retries < ppc.maxHttpRetries)
     *          return extra.tpModule.retry(extra.id);
     *
     *      //Do stuff here
     *  }
     * ```
     *
     * @param {Number} id The id of the call that should be retried.
     */
    this.retry = function(id){
        if (!this.queue[id])
            return false;

        var qItem = this.queue[id];

        //#ifdef __SUPPORT_IE5
        clearInterval(qItem.timer);
        //#endif

        // #ifdef __DEBUG
        ppc.console.info("[HTTP] Retrying request [" + id + "]", "teleport");
        // #endif

        qItem.retries++;
        qItem.options.id = id;
        this.get(qItem.url, qItem.options);

        return true;
    };

    /**
     * Cancels a call based on its id. The id of the call is found on the
     * `'extra'` object, the third argument of the callback.
     *
     * @see ppc.http.clearQueueItem
     *
     * @param {Number} id The id of the call that should be canceled.
     */
    this.cancel = function(id){
        if (id === null)
            id = this.queue.length - 1;

        if (!this.queue[id])
            return false;

        if (ppc.isGecko)
            this.queue[id].http.abort();

        this.clearQueueItem(id);
    };

    if (!this.$loadAml && !this.instantiate && !this.call) {
        /**
         * @private
         */
        this.$loadAml = function(x){
            var receive = this["receive"];

            for (var i = 0, l = this.childNodes.length; i < l; i++) {
                if (this.childNodes[i].nodeType != 1)
                    continue;

                var url      = this.childNodes[i].getAttribute("url"),
                    callback = self[this.childNodes[i].getAttribute("receive") || receive],
                    options  = {
                        useXML  : this.childNodes[i].getAttribute("type") == "XML",
                        async   : !ppc.isFalse(this.childNodes[i].getAttribute("async"))
                    };

                this[this.childNodes[i].getAttribute("name")] = function(data, userdata){
                    options.userdata = userdata;
                    options.data     = data;
                    return this.get(url, options);
                }
            }
        };

        /**
         * @private
         */
        this.instantiate = function(x){
            var url     = x.getAttribute("src"),
                options = {
                    async   : x.getAttribute("async") != "false",
                    nocache : true
                };

            this.getURL = function(data, userdata){
                options.data     = data;
                options.userdata = userdata;
                options.callback = this.callbacks.getURL;
                return this.get(url, options);
            }

            var name = "http" + Math.round(Math.random() * 100000);
            ppc.setReference(name, this);

            return name + ".getURL()";
        };

        /**
         * @private
         */
        this.call = function(method, args){
            this[method].call(this, args);
        };
    }
};

// #endif

ppc.Init.run("http");
