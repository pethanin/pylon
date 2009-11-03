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

// #ifdef __WITH_PRINTER

/**
 * @private
 */
apf.printer = {
    //#ifdef __WITH_AMLDOM_FULL
    tagName  : "printer",
    nodeFunc : apf.NODE_HIDDEN,
    //#endif
    
    lastContent : "",
    inited      : false,
    
    init : function(aml){
        this.inited = true;
        this.$aml    = aml;
        
        this.contentShower = document.body.appendChild(document.createElement("DIV"));
        this.contentShower.id = "print_content"
        
        with (this.contentShower.style) {
            width           = "100%";
            height          = "100%";
            backgroundColor = "white";
            zIndex          = 100000000;
        }
        
        apf.importCssString(document, "#print_content{display:none}");
        apf.importCssString(document, (apf.hasCSSChildOfSelector
          ? "body #print_content{display:block} body>*{display:none}"
          : "body #print_content, body #print_content *{display:block} body *{display:none}")
            , "print");

        //body #print_content, body #print_content *{display:block} 
        
        if (aml) {
            //Events
            var a, i, attr = aml.attributes;
            for (i = 0; i < attr.length; i++) {
                a = attr[i];
                if (a.nodeName.indexOf("on") == 0)
                    apf.addEventListener(a.nodeName, 
                      // #ifdef __WITH_JSLT_EVENTS
                      apf.lm.compile(a.nodeValue, {event: true, parsecode: true})
                      /* #else
                      new Function('event', a.nodeValue)
                      #endif */
                    );
            }
        }

        // #ifdef __WITH_IEPNGFIX
        function printPNGFix(disable) {
            if (apf.supportPng24) return;
            // #ifdef __WITH_APPSETTINGS
            if (!apf.config.iePngFix) return;
            // #endif
            for (var e, i = 0, j = document.all.length; i < j; i++) {
                e = document.all[i];
                if (e.filters['DXImageTransform.Microsoft.AlphaImageLoader'] || e._png_print) {
                    if (disable) {
                        e._png_print   = e.style.filter;
                        e.style.filter = '';
                    }
                    else {
                        e.style.filter = e._png_print;
                        e._png_print   = '';
                    }
                }
            }
        }
        // #endif
        
        window.onbeforeprint = function(){
            // #ifdef __WITH_IEPNGFIX
            printPNGFix(true);
            // #endif
            apf.dispatchEvent("beforeprint");
        };
        
        window.onafterprint = function(){
            // #ifdef __WITH_IEPNGFIX
            printPNGFix(false);
            // #endif
            apf.dispatchEvent("afterprint");
        };
    },
    
    preview : function(strHtml){
        if (!this.inited)
            this.init();
        
        if (typeof strHtml != "string")
            strHtml = strHtml.outerHTML || strHtml.xml || strHtml.serialize();
        
        this.lastContent = strHtml;
        this.contentShower.innerHTML = strHtml;
    }
};

/**
 * Sents html to a printer in formatted form.
 * @param {String} strHtml the html to be printed.
 */
apf.print = function(strHtml){
    if (!apf.printer.inited)
        apf.printer.init();
    
    apf.printer.preview(strHtml);
    window.print();
}

// #endif
