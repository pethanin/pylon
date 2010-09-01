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

//#ifdef __WITH_PLANE
/**
 * @todo needs refactor
 * @private
 */
apf.plane = {
    $zindex : 100000000,
    $set    : [],
    $lookup : {},
    $find : function(id){
        if (this.$lookup[id])
            return this.$lookup[id];
        
        var item = this.$set.pop();
        if (!item)
            item = this.$factory();
        
        //item.id = id;
        this.$lookup[id] = item;
        
        return item;
    },
    
    show : function(o, reAppend, copyCursor, useRealSize, options){
        var item = this.$find(options && options.protect || "default");
        item.show(o, reAppend, copyCursor, useRealSize, options);
    },
    
    hide : function(protect){
        var item = this.$lookup[protect || "default"];
        if (item) {
            item.hide();
            delete this.$lookup[protect || "default"];
            this.$set.push(item);
        }
    },

    $factory : function(){
        var plane              = document.body.appendChild(document.createElement("DIV"));
        plane.style.background = "url(images/spacer.gif)";
        plane.style.position   = "fixed";
        plane.style.left       = 0;
        plane.style.top        = 0;
        plane.host             = false;
        
        return {
            host       : this,
            plane      : plane,
            lastCursor : null,
            
            show : function(o, reAppend, copyCursor, useRealSize, options){
                var plane = this.plane;
                
                this.plane.style.zIndex = this.host.$zindex++;
                this.plane.style.background = options && options.color || "url(images/spacer.gif)";
                this.animate = options && options.animate;
                this.protect = options && options.protect;
                
                if (o) { //@experimental
                    this.current = o;
                    if (!reAppend) { // || o.parentNode != document.body
                        this.lastZ = this.current.style.zIndex;
                        this.current.style.zIndex = this.host.$zindex;
                    }
                    else {
                        this.$originalPlace = [o.parentNode, o.nextSibling];
                        this.plane.appendChild(o);
                    }
                }
                
                useRealSize = apf.isIE;
                var pWidth = (plane.parentNode == document.body
                    ? useRealSize ? document.documentElement.offsetWidth : apf.getWindowWidth()
                    : plane.parentNode.offsetWidth);
         
                var pHeight = (plane.parentNode == document.body
                    ? useRealSize ? document.documentElement.offsetHeight : apf.getWindowHeight()
                    : plane.parentNode.offsetHeight);
                
                if (copyCursor) {
                    if (this.lastCursor === null)
                        this.lastCursor = document.body.style.cursor;
                    document.body.style.cursor = apf.getStyle(o, "cursor");
                }
                
                this.plane.style.display = "block";
                //this.plane.style.left    = p.scrollLeft;
                //this.plane.style.top     = p.scrollTop;
                
                var toOpacity = parseFloat(options && options.opacity) || 1;
                if (this.animate) {
                    var _self = this;
                    apf.setOpacity(this.plane, 0);
                    setTimeout(function(){
                        apf.tween.single(_self.plane, {
                            steps    : 5,
                            interval : 10,
                            type     : "fade",
                            from     : 0,
                            to       : toOpacity
                        });
                    }, 100);
                }
                else
                    apf.setOpacity(this.plane, toOpacity);
                
                var diff = apf.getDiff(plane);
                this.plane.style.width  = "100%";//(pWidth - diff[0]) + "px";
                this.plane.style.height = "100%";//(pHeight - diff[1]) + "px";
        
                return plane;
            },
        
            hide : function(){
                var isChild; // try...catch block is needed to work around a FF3 Win issue with HTML elements
                try {
                    isChild = apf.isChildOf(this.plane, document.activeElement);
                }
                catch (ex) {
                    isChild = false;
                }
                if (this.current) {
                    if (this.lastZ !== null) {
                        if (this.current.style.zIndex == 100000)
                            this.current.style.zIndex = this.lastZ;
                        this.lastZ = null;
                    }
        
                    if (this.current.parentNode == this.plane)
                        this.$originalPlace[0].insertBefore(this.current, this.$originalPlace[1]);
                }
                
                if (this.animate) {
                    var _self = this;
                    setTimeout(function(){
                        apf.tween.single(_self.plane, {
                            steps    : 5,
                            interval : 10,
                            type     : "fade",
                            from     : apf.getOpacity(_self.plane),
                            to       : 0,
                            onfinish : function(){
                                _self.plane.style.display  = "none";
                            }
                        });
                    }, 100);
                }
                else {
                    apf.setOpacity(this.plane, 0);
                    this.plane.style.display  = "none";
                }
                
                if (isChild && apf.document.activeElement) {
                    if (!apf.isIE)
                        document.activeElement.focus();
                    apf.document.activeElement.$focus();
                }
                
                this.current = null;
                
                if (this.lastCursor !== null) {
                    document.body.style.cursor = this.lastCursor;
                    this.lastCursor = null;
                }
                
                return this.plane;
            }
        };
    }
};
//#endif
