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

//#ifdef __WITH_XIINCLUDE
/**
 * Defines a list of acceptable values
 */
ppc.XiInclude = function(struct, tagName){
    this.$init(tagName || "include", ppc.NODE_HIDDEN, struct);
};

ppc.xinclude.setElement("include", ppc.XiInclude);
ppc.aml.setElement("include", ppc.XiInclude);

//@todo test defer="true" situation
(function(){
    this.$parsePrio = "002";

    //1 = force no bind rule, 2 = force bind rule 
    /*this.$attrExcludePropBind = ppc.extend({
        href : 1,
        src  : 1
    }, this.$attrExcludePropBind);*/

    this.$propHandlers["href"] = 
    this.$propHandlers["src"]  = function(value){
        if (typeof value != "string")
            return finish.call(this, value);
        
        if (value.trim().charAt(0) == "<") {
            loadIncludeFile.call(this, value.trim());
            return;
        }

        this.$path = value.charAt(0) == "{" //@todo this shouldn't happen anymore
          ? value
          : ppc.getAbsolutePath(ppc.hostPath, value);
        
        var domParser = this.ownerDocument.$domParser;
        if (!this.defer) {
            domParser.$pauseParsing.apply(domParser, 
              this.$parseContext = domParser.$parseContext || [this.parentNode]);
        }

        //var basePath = ppc.hostPath;//only for recursion: ppc.getDirname(xmlNode.getAttribute("filename")) || 
        loadIncludeFile.call(this, this.$path);
    };
    
    function done(xmlNode) {
        var addedNode = this.previousSibling || this.nextSibling;
        
        if (this.callback) {
            this.callback({
                xmlNode : xmlNode,
                amlNode : this.parentNode,
                addedNode: addedNode
            })
        }
        
        addedNode.dispatchEvent("DOMNodeInserted", {
            $beforeNode         : addedNode.nextSibling,
            relatedNode         : this.parentNode,
            $isMoveWithinParent : false,
            bubbles             : true
        });
        
        //@todo hack!! this should never happen. Find out why it happens
        if (this.parentNode)
            this.parentNode.removeChild(this);
    }
    
    function finish(xmlNode){
        var domParser = this.ownerDocument.$domParser;

        if (this.clear)
            this.parentNode.$int.innerHTML = "";

        if (xmlNode) {
            domParser.parseFromXml(xmlNode, {
                doc        : this.ownerDocument,
                amlNode    : this.parentNode,
                beforeNode : this,
                include    : true
            });

            if (!this.defer && this.$parseContext) {
                var o     = (this.$parseContext[1] || (this.$parseContext[1] = {})),
                    cb    = o.callback,
                    _self = this;

                o.callback = function(){
                    done.call(_self, xmlNode);
                    if (cb)
                        cb.call(_self.ownerDocument);
                };

                //@todo this is wrong... probably based on load order of last include element. Please rearchitect parse continuation.
                if (domParser.$continueParsing(this.$parseContext[0]) === false) {
                    var o2  = (domParser.$parseContext[1] || (domParser.$parseContext[1] = {})),
                        cb2 = o.callback;
                    o2.callback = function(){
                        if (cb)
                            cb.call(_self.ownerDocument);
                        domParser.$continueParsing(_self.$parseContext[0]);
                    };
                }
            }
            else
                done.call(this, xmlNode);
        }
        else {
            if (!this.defer)
                domParser.$continueParsing(this.$parseContext[0]);
            
            done.call(this, xmlNode);
        }
    }
    
    function loadIncludeFile(path){
        //#ifdef __DEBUG
        ppc.console.info("Loading include file: " + path);
        //#endif

        var _self = this;
        ppc.getData(path, ppc.extend(this.options || {}, {
            //#ifdef __DEBUG
            type : "markup",
            //#endif
            callback : function(xmlString, state, extra){
                if (state != ppc.SUCCESS) {
                    var oError = new Error(ppc.formatErrorString(1007,
                        _self, "Loading Includes", "Could not load Include file '"
                        + (path || _self.src)
                        + "'\nReason: " + extra.message));

                    if (extra.tpModule.retryTimeout(extra, state, null, oError) === true)
                        return true;

                    ppc.console.error(oError.message);

                    finish.call(_self, null);

                    //throw oError;
                    return;
                }

                //@todo ppc3.0 please make one way of doing this
                xmlString = xmlString.replace(/\<\!DOCTYPE[^>]*>/, "")
                    .replace(/^[\r\n\s]*/, ""); //.replace(/&nbsp;/g, " ")
                if (!ppc.supportNamespaces)
                    xmlString = xmlString.replace(/xmlns\=\"[^"]*\"/g, "");
                
                if (xmlString.indexOf("<a:application") == -1)
                    xmlString = "<a:application xmlns:a='" + ppc.ns.aml +"'>"
                      + xmlString + "</a:application>";

                var xmlNode = ppc.getXml(xmlString, null, true);//ppc.getAmlDocFromString(xmlString);
            
                if (!xmlNode) {
                    throw new Error(ppc.formatErrorString(0, null,
                        "Loading include",
                        "Could not parse include file. Maybe the file does not exist?", xmlNode));
                }
                xmlNode.setAttribute("filename", extra.url);

                // #ifdef __DEBUG
                ppc.console.info("Loading of " + xmlNode[ppc.TAGNAME].toLowerCase() + " include done from file: " + extra.url);
                // #endif

                finish.call(_self, xmlNode); //@todo add recursive includes support here
            },
            async         : true,
            ignoreOffline : true
        }));
    }
}).call(ppc.XiInclude.prototype = new ppc.AmlElement());
//#endif