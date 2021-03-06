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
ppc.__CONTENTEDITABLE__  = 1 << 24;
// #ifdef __WITH_CONTENTEDITABLE

ppc.addEventListener("load", function(){
    var lastShift;

    ppc.window.undoManager.addEventListener("afterchange", function(){
        ppc.layout.processQueue();
        ppc.document.$getVisualSelect().updateGeo(); //Possibly not best place for this
    });
    
    var sel = ppc.document.getSelection();
    sel.addEventListener("update", function(){
        
    });
    
    //Init visual selection 
    //ppc.document.$getVisualSelect();
    
    //@todo only for editable elements
    ppc.addEventListener("keydown", function(e){
        var key = e.keyCode;

        if (!ppc.document.activeElement
          || !ppc.document.activeElement.editable)
            return;

        if (ppc.document.queryCommandState("rename")) {
            if (ppc.hasSingleResizeEvent)
                $setTimeout(function(){
                    ppc.document.$getVisualSelect().updateGeo();
                });
            
            if (key == 27 || key == 13) {
                ppc.document.execCommand("rename", false, key == 13);
                
                window.focus(); //@todo don't know why this is needed...
                ppc.stopPropagation(e);
                return false;
            }
            else if (ppc.hasContentEditableContainerBug && key == 8
              && document.getElementById("txt_rename").innerHTML == "<br>") {
                e.preventDefault();
            }

            return;
        }

        //F2
        switch(key) {
            case 27: //ESC
                if (ppc.dragMode) {
                    var sel = ppc.document.$getVisualSelect().getLastSelection();
                    (ppc.document.activeElement || sel[0]).$cancelInteractive();
                }
                break;
            case 113: //F2
                ppc.document.execCommand("rename", true);
                return false;
            case 16:
                if (!this.dragMode && (ppc.document.documentElement.editable 
                  || self.app && self.app.editable)) { //@hack!
                    if (e.ctrlKey)
                        ppc.document.execCommand("mode", null, "select");
                    else {
                        ppc.document.execCommand("mode", null, {
                            mode    : "connect",
                            timeout : 1000,
                            event   : e.htmlEvent
                        });
                    }
                }
                break;
            case 17:
                if (!lastShift || new Date() - lastShift > 500 || e.htmlEvent.repeat)
                    lastShift = new Date().getTime();
                else {
                    var isShowingConnections = (ppc.document.queryCommandState("mode") || "").substr(0,8) == "connect-";
                    ppc.document.execCommand("mode", null, {
                        mode    : isShowingConnections ? "arrow" : "connect-element",
                        timeout : 1000,
                        event   : e.htmlEvent
                    });
                    lastShift = null;
                }
                break;
            /*case 36: //HOME
                return false;
            case 35: //END
                return false;
            case 107: //+
            case 187: //+
            case 109:
            case 189: //-
                break;
            case 38: //UP
                return false;
            case 40: //DOWN
                return false;
            case 39: //RIGHT
                return false;
            case 37: //LEFT
                return false;
            case 33: //PGUP
            case 34: //PGDN
                break;*/
        }
    });

    ppc.addEventListener("keyup", function(e){
        if (e.keyCode == 16
          && "select|connect".indexOf(ppc.document.queryCommandState("mode")) > -1)
            ppc.document.execCommand("mode", null, "arrow");
    });

    var recursion, $focus, lastFocussed;
    ppc.document.addEventListener("focus", $focus = function(e){
        if (recursion)
            return;
        
        recursion = true;
        var node = e.currentTarget, isSelected;
        if (node.editable) {
            if (sel.rangeCount) {
                isSelected = sel.$getNodeList().indexOf(node) > -1; //@todo use visualSelect cache here?

                if (!e.ctrlKey) {
                    if (isSelected) {
                        recursion = false;
                        return;
                    }

                    sel.removeAllRanges();
                }
                else {
                    //Only allow selection with nodes of the same parent
                    if (sel.getRangeAt(0).startContainer != node.parentNode) {
                        delete e.currentTarget;
                        e.fromElement && e.fromElement.focus(null, e); //@todo we should look into sel
                        recursion = false;
                        return;
                    }
                    
                    if (isSelected) {
                        recursion = false;
                        return;
                    }
                }
            }
            
            //Add element to the selection
            sel.addRange(this.createRange()).selectNode(node);
            lastFocussed = node;
        }
        recursion = false;
    });
    if (ppc.document.activeElement && ppc.document.activeElement.editable)
        sel.addRange(ppc.document.createRange()).selectNode(ppc.document.activeElement);
    
    var lastPos = [-1000, -1000];
    ppc.addEventListener("mousedown", function(e){
        lastPos = [e.htmlEvent.clientX, e.htmlEvent.clientY];
    });
    
    //Focus isn't set when the node already has the focus
    ppc.addEventListener("mouseup", function(e){
        if ((ppc.document.queryCommandState("mode") || "").indexOf("connect-") > -1)
            ppc.document.execCommand("mode", null, "arrow");
    
        if (Math.abs(lastPos[0] - e.htmlEvent.clientX) > 2 
          || Math.abs(lastPos[1] - e.htmlEvent.clientY) > 2)
            return;
        
        var o = ppc.document.$getVisualSelect().$getOutline();
        if (!o) return;
        
        //ppc.plane.hide();
        var lastTop = o.style.top;
        o.style.top = "-10000px"
        var hOutline = document.getElementById("ppc_outline");
        if (hOutline) 
            hOutline.style.top = "-10000px";
        
        var node = ppc.findHost(
            document.elementFromPoint(e.htmlEvent.clientX, e.htmlEvent.clientY));

        o.style.top = lastTop;

        if (lastFocussed == node) {
            lastFocussed = null;
            return;
        }
        
        if (!node.editable) return;
        
        //ppc.activeElement == node && 
        if (sel.rangeCount > 1) {
            //Deselect a node when its already selected
            var idx, list = sel.$getNodeList(); //@todo use visualSelect cache here?
            if (e.htmlEvent.ctrlKey && (idx = list.indexOf(node)) > -1) {
                sel.removeRange(sel.getRangeAt(idx));
                delete e.currentTarget;
                var r = sel.getRangeAt(sel.rangeCount - 1);
                recursion = true;
                r.startContainer.childNodes[r.startOffset].focus();
                recursion = false;
                return;
            }
            else { //@todo this could be optimized by checking whether the object is already the only selected
                sel.removeAllRanges();
                sel.addRange(ppc.document.createRange()).selectNode(node);
            }
        }
    });
    
    /*ppc.addEventListener("contextmenu", function(e){
        if (e.currentTarget.namespaceURI == ppc.ns.xhtml) {
            e.currentTarget.ownerDocument.execCommand("contextmenu", true, {
                amlNode   : e.currentTarget,
                htmlEvent : e
            });
            
            return false;
        }
    });*/
});

ppc.ContentEditable = function() {
    this.$regbase = this.$regbase | ppc.__CONTENTEDITABLE__;

    this.editable = false;
    this.$canEdit = true;
    /*this.$init(function(tagName, nodeFunc, struct){
         //this.$inheritProperties["editable"] = 2;
    });*/
    
    this.$booleanProperties["editable"] = true;
    this.$propHandlers["editable"] = function(value, prop){
        if (this.nomk) { //A way to have UI elements excluded from editing
            this.editable = false;
            return false;
        }
        
        if (value) {
            if (this.$canEdit && this.$ext && !this.$coreHtml) {
                this.dragOutline = true; //@todo via config setting??

                //Make this element draggable
                (this.$propHandlers["draggable"]
                  || ppc.GuiElement.propHandlers["draggable"]).call(this, true);
                
                //Make this element resizable
                (this.$propHandlers["resizable"]
                  || ppc.GuiElement.propHandlers["resizable"]).call(this, true);
                
                //Make this element focussable
                this.$lastFocussable = [this.$focussable, this.focussable];
                if (!this.$focussable || !this.focussable)
                    ppc.GuiElement.propHandlers.focussable.call(this, true);
                this.$focussable = 
                this.focussable  = true;
                if (this.$blur)
                    this.$blur();
                
                //Handle invisible elements
                if (this.$propHandlers.visible)
                    this.$propHandlers.visible_original = this.$propHandlers.visible;
                this.$propHandlers.visible = function(value){
                    ppc.setOpacity(this.$ext, value ? 1 : 0.5);
                    this.$ext.onmouseover = value ? null : function(){
                        ppc.setOpacity(this, 1);
                    }
                    this.$ext.onmouseout = value ? null : function(e){
                        if (!e) e = event;
                        if (!e.toElement || e.toElement.host !== false)
                            ppc.setOpacity(this, 0.5);
                    }
                }
                if (this.visible === false) {
                    if (this.$propHandlers.visible_original)
                        this.$propHandlers.visible_original.call(this, true);
                    this.$propHandlers.visible.call(this, false);
                }
                
                //Disable
                this.$lastDisabled = this.disabled;
                this.disabled = -1;
                
                //If an element is editable and its parent element is not, or if an element is editable and it has no parent element, then the element is an editing host
                //if this is the editing host, this value should be set to refrain it from being entered by tabbing
                if (this.$isWindowContainer)
                    this.$isWindowContainer = -2; //@todo bug in window.js causes child to be selected at window focus change
                
                //If this element supports rename, enable it via dblclick
                var rInfo
                if (rInfo = this.ownerDocument.queryCommandEnabled("rename", false, this)) {
                    var htmlNode = !rInfo[0] 
                        ? this.$ext 
                        : (rInfo[0].nodeType == 1 ? rInfo[0] : rInfo[0].parentNode);
                    if (ppc.isIE)
                        htmlNode.ondblclick = ppc.ContentEditable.$renameStart;
                    else {
                        ppc.addListener(htmlNode, "mousedown", 
                          ppc.ContentEditable.$renameStart);
                    }
                    
                    this.addEventListener("$skinchange", 
                        ppc.ContentEditable.$renameSkinChange);
                }
                
                //Contextmenu
                this.addEventListener("contextmenu", 
                    ppc.ContentEditable.$contextMenu);
                
                //Drag & Resize
                ppc.ContentEditable.addInteraction(this);
            }
            this.isContentEditable = true;
            
            //@todo ppc3.0 this needs optimization
            if (!this.parentNode.editable) {
                var curfoc, vsel, lsel = 
                  (vsel = this.ownerDocument.$getVisualSelect()).getLastSelection();
                if (!(curfoc = ppc.window.getLastActiveElement()) && lsel.length 
                  || curfoc && lsel.indexOf(curfoc) > -1) {
                    vsel.show();
                }
                else if (curfoc && curfoc.editable) {
                    //@todo check for editable
                    this.ownerDocument.getSelection().$selectList([curfoc]);
                }
            }
            
            ppc.setStyleClass(this.$ext, "editable");
        }
        else {
            if (this.$canEdit && this.$ext && !this.$coreHtml) {
                var n;
                
                //Unset draggable
                if (n = this.getAttributeNode("draggable")) {
                    ppc.removeListener(this.$ext, "mousedown", this.$dragStart);
                    n.$triggerUpdate();
                }
                else {
                    ppc.removeListener(this.$ext, "mousedown", this.$dragStart);
                    (this.$propHandlers["draggable"]
                      || ppc.GuiElement.propHandlers["draggable"]).call(this, this.localName == "window" || false); //@todo hack!
                }
                
                delete this.dragOutline; //@todo hack!
                delete this.$showDrag;
                delete this.$showResize;
                delete this.realtime; //@todo this should be renamed to something else
                
                //Unset resizable
                if (n = this.getAttributeNode("resizable"))
                    n.$triggerUpdate();
                else
                    (this.$propHandlers["resizable"]
                      || ppc.GuiElement.propHandlers["resizable"]).call(this, false);
                
                //Unset focussable
                if (this.$lastFocussable) {
                    this.$focussable = this.$lastFocussable[0];
                    this.focussable  = this.$lastFocussable[0] && this.$lastFocussable[1];
                    if (!this.focussable)
                        ppc.GuiElement.propHandlers.focussable.call(this, this.focussable);
                    delete this.$lastFocussable;
                }
                if (this.hasFocus && this.hasFocus())
                    this.$focus();
                
                //Enable
                this.disabled = this.$lastDisabled;
                delete this.$lastDisabled;
                
                //Hide invisible elements
                if (this.visible === false) {
                    if (this.$propHandlers.visible_original)
                        this.$propHandlers.visible_original.call(this, false);
                    this.$propHandlers.visible.call(this, true);
                }
                if (this.$propHandlers.visible_original) {
                    this.$propHandlers.visible = this.$propHandlers.visible_original;
                    delete this.$propHandlers.visible_original;
                }
                
                delete this.$isWindowContainer; //Should fall back to value from prototype
                
                var rInfo;
                if (rInfo = this.ownerDocument.queryCommandEnabled("rename", false, this)) {
                    var htmlNode = !rInfo[0] 
                        ? this.$ext 
                        : (rInfo[0].nodeType == 1 ? rInfo[0] : rInfo[0].parentNode);
                    if (ppc.isIE)
                        htmlNode.ondblclick = null;
                    else {
                        ppc.removeListener(htmlNode, "mousedown", 
                            ppc.ContentEditable.$renameStart);
                    }
                    
                    this.removeEventListener("$skinchange", 
                        ppc.ContentEditable.$renameSkinChange);
                }
                
                //Contextmenu
                this.removeEventListener("contextmenu", 
                    ppc.ContentEditable.$contextMenu);
                
                ppc.ContentEditable.removeInteraction(this);
                
                var sel = this.ownerDocument.$getVisualSelect().getLastSelection();//this.ownerDocument.getSelection().$getNodeList();
                if (sel.indexOf(this) > -1)
                    this.ownerDocument.$getVisualSelect().hide()
            }
            this.isContentEditable = false;
            
            //@todo hack!
            //ppc.ContentEditable.resize.hide();
            
            ppc.setStyleClass(this.$ext, "", ["editable"]);
        }
    }
    
    this.addEventListener("DOMNodeInsertedIntoDocument", function(e){
        //@todo shouldn't this only be set when editable is enabled
        /*try{
            if (this.$ext && !this.$ext.host)
                this.$ext.host = this;
        }catch(e){}*/
        
        if (!this.editable) {
            this.editable = ppc.isTrue(ppc.getInheritedAttribute(this, "editable"));
            if (this.editable) {
                this.$propHandlers["editable"].call(this, true);
                this.dispatchEvent("prop.editable", {value: true});
                this.$inheritProperties["editable"] = 2;
            }
        }
    });
    
    this.addEventListener("DOMNodeRemovedFromDocument", function(e){
        
    });
};
ppc.ContentEditable.$contextMenu = function(e){
    this.ownerDocument.execCommand("contextmenu", true, {
        amlNode: this,
        htmlEvent: e
    });

    ppc.stopEvent(e)
    return false;
};

(function(){
    var time;
    ppc.ContentEditable.$renameStart = ppc.isIE
      ? function(){
        e = event;
        if (e.srcElement != this)
            return;
        
        ppc.findHost(e.srcElement).ownerDocument.execCommand("rename", true);
        ppc.stopPropagation(e);
      }
      : function(e){
        if (e.target != this)
            return;
    
        if (!time || new Date() - time[0] > 500 || time[1] != e.target)
            time = [new Date().getTime(), e.target];
        else if (time) {
            ppc.findHost(e.target).ownerDocument.execCommand("rename", true);
            ppc.stopPropagation(e);
            time = null;
        }
      }
})();

ppc.ContentEditable.$renameSkinChange = function(e){
    var rInfo = this.ownerDocument.queryCommandEnabled("rename", false, this);
    var htmlNode = !rInfo[0] 
        ? this.$ext 
        : (rInfo[0].nodeType == 1 ? rInfo[0] : rInfo[0].parentNode);
    if (ppc.isIE) {
        htmlNode.ondblclick = ppc.ContentEditable.$renameStart;
        //@todo ppc3.0 memory leak - fix this
        //e.ext ... .ondblclick        = null;
    }
    else {
        ppc.addListener(htmlNode, "mousedown", 
          ppc.ContentEditable.$renameStart);
    }
}


ppc.XhtmlElement.prototype.implement(ppc.ContentEditable);

ppc.config.$inheritProperties["editable"] = 2;
// #endif
