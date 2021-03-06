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

//#ifdef __WITH_POPUP

/**
 * @private
 */
ppc.popup = {
    cache      : {},
    focusFix   : {"INPUT":1,"TEXTAREA":1,"SELECT":1},
    
    setContent : function(cacheId, content, style, width, height){
        if (!this.popup) this.init();

        this.cache[cacheId] = {
            content : content,
            style   : style,
            width   : width,
            height  : height
        };
        content.style.position = "absolute";
        //if(content.parentNode) content.parentNode.removeChild(content);
        //if(style) ppc.importCssString(style, this.popup.document);
        
        content.onmousedown  = function(e) {
            if (!e) e = event;

            //#ifdef __WITH_WINDOW_FOCUS
            if (ppc.hasFocusBug 
              && !ppc.popup.focusFix[(e.srcElement || e.target).tagName]) {
                ppc.window.$focusfix();
            }
            //#endif
            
            //@todo can this cancelBubble just go?
            //ppc.cancelBubble(e, null, true);
            //e.cancelBubble = true;
        };
        
        return content.ownerDocument;
    },
    
    removeContent : function(cacheId){
        this.cache[cacheId] = null;
        delete this.cache[cacheId];
    },
    
    init : function(){
        //consider using iframe
        this.popup = {};
        
        ppc.addEventListener("hotkey", function(e){
            if (e.keyCode == "27" || e.altKey) 
                ppc.popup.forceHide();
        });
    },
    
    show : function(cacheId, options){
        if (!this.popup) this.init();
        
        options = ppc.extend({
            x            : 0,
            y            : 0,
            animate      : false,
            ref          : null,
            width        : null,
            height       : null,
            callback     : null,
            draggable    : false,
            resizable    : false,
            allowTogether: false,
            autoCorrect  : true,
            noleft       : false,
            setZindex    : true
        }, options);
        
        if ((!options.allowTogether 
          || options.allowTogether !== true && options.allowTogether != this.last) 
          && this.last != cacheId
          && this.cache[this.last]
          && (!this.cache[this.last].options || this.cache[this.last].options.autohide !== false))
            this.hide();

        var o = this.cache[cacheId];
        o.options = options;
        //if(this.last != cacheId) 
        //this.popup.document.body.innerHTML = o.content.outerHTML;

        var dp,
            popup  = o.content,
            moveUp = false,
            moveLeft = false,
            fixed  = false;

        if (options.setZindex)
            ppc.window.zManager.set("popup", o.content);
        
        if ((dp = o.content.style.display) && dp.indexOf("none") > -1)
            o.content.style.display = "";

        var x = options.x;
        var y = options.y;

        var refNode = options.ref;
        while (refNode && refNode.nodeType == 1) {
            if (fixed = ppc.getStyle(refNode, "position") == "fixed")
                break;
            refNode = refNode.parentNode || refNode.$parentNode;
        }

        if (!fixed) {
            if (refNode) {
                var pos = ppc.getAbsolutePosition(options.ref, 
                    o.content.offsetParent || o.content.parentNode);
                x = (x || 0) + pos[0];
                y = (y || 0) + pos[1];
            }
            
            if (options.width || o.width)
                popup.style.width = ((options.width || o.width) - 3) + "px";

            popup.style.position = "absolute";
            
            var parentMenu = this.cache[options.allowTogether];
            var pOverflow  = ppc.getOverflowParent(o.content);
            var edgeY      = (pOverflow == document.documentElement
                ? (ppc.isIE 
                    ? pOverflow.offsetHeight 
                    : (window.innerHeight + window.pageYOffset)) + pOverflow.scrollTop
                : pOverflow.offsetHeight + pOverflow.scrollTop);
            moveUp = options.up || options.autoCorrect && (y
                + (options.height || o.height || o.content.offsetHeight))
                > edgeY;

            if (moveUp) {
                var value;
                if (options.ref)
                    value = (pos[1] - (options.height || o.height || o.content.offsetHeight)) + 3;
                else
                    value = Math.max(0, edgeY - (options.height || o.height || o.content.offsetHeight));
                
                popup.style.top = (!options.up && value < 0 ? y : value) + "px";
            }
            else {
                popup.style.top = y + "px";
            }
            
            if (!options.noleft) {
                var edgeX     = (pOverflow == document.documentElement
                    ? (ppc.isIE 
                        ? pOverflow.offsetWidth
                        : (window.innerWidth + window.pageXOffset)) + pOverflow.scrollLeft
                    : pOverflow.offsetWidth + pOverflow.scrollLeft);
                moveLeft = options.autoCorrect && (x
                    + (options.width || o.width || o.content.offsetWidth))
                    > edgeX;

                if (moveLeft) {
                    var value;
                    if (options.ref) {
                        value = (pos[0] - (options.width || o.width || o.content.offsetWidth))
                                + (options.ref.offsetWidth);
                    }
                    else {
                        value = (edgeX - (options.width || o.width || o.content.offsetWidth) 
                                - (parentMenu ? (parentMenu.width || parentMenu.content.offsetWidth) : 0));
                    }
                    popup.style.left = value < 0 ? x : (value - 1) + "px";
                }
                else {
                    popup.style.left = x + "px";
                }
            }
        }
        else {
            pos = ppc.getAbsolutePosition(options.ref, refNode);
            y = (y || 0) + pos[1] + refNode.offsetTop;
            pos[0] += refNode.offsetLeft;
            popup.style.position = "fixed";
            popup.style.top      = y + "px";
            
            if (!options.noleft)
                popup.style.left = x + "px";
        }

        // #ifdef __WITH_STYLE
        // set a className that specifies the direction, to help skins with
        // specific styling options.
        ppc.setStyleClass(popup, moveUp ? "upward" : "downward", [moveUp ? "downward" : "upward"]);
        ppc.setStyleClass(popup, moveLeft ? "moveleft" : "moveright", [moveLeft ? "moveright" : "moveleft"]);
        // #endif

        if (options.animate) {
            if (options.animate == "fade") {
                ppc.tween.single(popup, {
                    type  : 'fade',
                    from  : 0,
                    to    : 1,
                    anim  : ppc.tween.NORMAL,
                    steps : options.steps || 15 * ppc.animSteps
                });
            }
            else {
                var iVal, steps = ppc.isIE8 ? 5 : 7, i = 0;
                iVal = setInterval(function(){
                    var value = ++i * ((options.height || o.height) / steps);

                    popup.style.height = value + "px";
                    if (moveUp)
                        popup.style.top = (y - value - (options.y || 0)) + "px";
                    else
                        (options.container || popup).scrollTop = -1 * (i - steps) * ((options.height || o.height) / steps);
                    popup.style.display = "block";

                    if (i >= steps) {
                        clearInterval(iVal)
                        
                        if (options.callback)
                            options.callback(popup);
                    }
                }, 10);
            }
        }
        else {
            if (!refNode) {
                if (options.height || o.height)
                    popup.style.height = (options.height || o.height) + "px";
                value = (edgeY - (options.height || o.height || o.content.offsetHeight));
                popup.style.top = y + (options.height || o.height || o.content.offsetHeight) < edgeY 
                                    ? y 
                                    : value 
                                  + "px";
            }
            popup.style.display = "block";
            
            if (options.callback)
               options.callback(popup);
        }

        $setTimeout(function(){
            ppc.popup.last = cacheId;
        });

        if (options.draggable) {
            options.id = cacheId;
            this.makeDraggable(options);
        }
    },
    
    hide : function(){
        if (this.isDragging) return;

        var o = this.cache[this.last];
        if (o) {
            if (o.content)
                o.content.style.display = "none";

            if (o.options && o.options.onclose) {
                o.options.onclose(ppc.extend(o.options, {htmlNode: o.content}));
                o.options.onclose = false;
            }
        }
    },
    
    isShowing : function(cacheId){
        return this.last && this.last == cacheId 
            && this.cache[this.last]
            && this.cache[this.last].content.style.display != "none";
    },

    isDragging   : false,

    makeDraggable: function(options) {
        if (!ppc.Interactive || this.cache[options.id].draggable) 
            return;

        var oHtml = this.cache[options.id].content;
        this.cache[options.id].draggable = true;
        var o = {
            $propHandlers : {},
            minwidth      : 10,
            minheight     : 10,
            maxwidth      : 10000,
            maxheight     : 10000,
            dragOutline   : false,
            resizeOutline : false,
            draggable     : true,
            resizable     : options.resizable,
            $ext          : oHtml,
            oDrag         : oHtml.firstChild
        };

        oHtml.onmousedown =
        oHtml.firstChild.onmousedown = function(e){
            if (!e) e = event;
            
            //#ifdef __WITH_WINDOW_FOCUS
            if (ppc.hasFocusBug
              && !ppc.popup.focusFix[(e.srcElement || e.target).tagName]) {
                ppc.window.$focusfix();
            }
            //#endif
            
            (e || event).cancelBubble = true;
        }

        ppc.implement.call(o, ppc.Interactive);

        o.$propHandlers["draggable"].call(o, true);
        o.$propHandlers["resizable"].call(o, true);
    },
    
    getCurrentElement : function(){
        return typeof this.last == "number" && ppc.lookup(this.last);
    },
    
    $mousedownHandler : function(amlNode, e){
        if (!this.last || (amlNode && this.last == amlNode.$uniqueId) || !this.cache[this.last])
          return;

        var htmlNode = e.srcElement || e.target;
        
        var uId = this.last;
        
        while (this.cache[uId]) {
            if (ppc.isChildOf(this.cache[uId].content, htmlNode, true))
                return;
            
            if (!this.cache[uId].options)
                return;
            
            uId = this.cache[uId].options.allowTogether;
        }
        
        this.forceHide();
    },
    
    forceHide : function(){
        if (this.last 
          //#ifdef __WITH_PLANE
          && !ppc.plane.current
          //#endif
          && this.isShowing(this.last)
          && this.cache[this.last]
          && this.cache[this.last].options
          && this.cache[this.last].options.autohide !== false) {
            var o = ppc.lookup(this.last);
            if (!o)
                this.last = null;
            else if (o.dispatchEvent("popuphide") !== false)
                this.hide();
        }
    },

    destroy : function(){
        for (var cacheId in this.cache) {
            if (this.cache[cacheId]) {
                this.cache[cacheId].content.onmousedown = null;
                ppc.destroyHtmlNode(this.cache[cacheId].content);
                this.cache[cacheId].content = null;
                this.cache[cacheId] = null;
            }
        }
        
        if (!this.popup) return;
        //this.popup.document.body.c = null;
        //this.popup.document.body.onmouseover = null;
    }
};

//#endif