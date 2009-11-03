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

// #ifdef __AMLIMG || __INC_ALL
// #define __AMLBASESIMPLE 1

/**
 * Element displaying a picture. This element can read databound resources.
 * Example:
 * This example shows a list with pictures. When one is selected its displayed
 * in the img element.
 * <code>
 *  <a:model id="mdlPictures"> 
 *      <pictures> 
 *          <picture title="Landscape" src="http://example.com/landscape.jpg" />
 *          <picture title="Animal" src="http://example.com/animal.jpg" />
 *          <picture title="River" src="http://example.com/river.jpg" />
 *      </pictures> 
 *  </a:model>
 *  
 *  <a:list id="lstPics" skin="thumbnail" height="200" width="400" 
 *      each = "picture" 
 *      name = "@title" 
 *      model = "mdlPictures" 
 *      image = "@src" 
 *  />
 *   
 *  <a:img ref="@src" model="#lstPics" width="400" />
 * </code>
 *
 * @constructor
 * @define img
 * @allowchild {smartbinding}
 * @addnode elements
 *
 * @inherits apf.BaseSimple
 *
 * @author      Ruben Daniels (ruben AT javeline DOT com)
 * @version     %I%, %G%
 * @since       0.4
 *
 * @event click Fires when a user presses a mouse button while over this element.
 *
 * @binding value  Determines the way the value for the element is retrieved 
 * from the bound data.
 * Example:
 * Sets the image source based on data loaded into this component.
 * <code>
 *  <a:img>
 *      <a:bindings>
 *          <a:value select="@src" />
 *      </a:bindings>
 *  </a:img>
 * </code>
 * Example:
 * A shorter way to write this is:
 * <code>
 *  <a:img ref="@src" />
 * </code>
 */
apf.img = function(struct, tagName){
    this.$init(tagName || "img", apf.NODE_VISIBLE, struct);
};

(function(){
    //#ifdef __WITH_CONVENIENCE_API
    
    /**
     * Sets the value of this element. This should be one of the values
     * specified in the values attribute.
     * @param {String} value the new value of this element
     */
    this.setValue = function(value){
        this.setProperty("value", value, false, true);
    };
    
    /**
     * Returns the current value of this element.
     * @return {String}
     */
    this.getValue = function(value){
        return this.value;
    };
    
    //#endif
    
    this.$supportedProperties.push("value", "src");
    /**
     * @attribute {String} value the url location of the image displayed.
     */
    this.$propHandlers["src"] = 
    this.$propHandlers["value"] = function(value){
        if (this.oImage.nodeType == 1)
            this.oImage.style.backgroundImage = "url(" + value + ")";
        else
            this.oImage.nodeValue = value;
        
        //@todo resize should become a generic thing
        if (this.oImage.nodeType == 2 && !this.$resize.done) {
            if (this.oImg) {
                //#ifdef __WITH_LAYOUT
                //@todo add this to $destroy
                var pNode = apf.hasSingleRszEvent ? this.$pHtmlNode : this.$ext;
                apf.layout.setRules(pNode, this.$uniqueId + "_image",
                    "var o = apf.all[" + this.$uniqueId + "];\
                     if (o) o.$resize()");
                apf.layout.queue(pNode);
                
                this.oImg.onload = function(){
                    apf.layout.forceResize(pNode);
                }
                //#endif
            }
            
            this.$resize.done = true;
        }

        if (this.oImg) {
            this.oImg.style.display = value ? "block" : "none";
            
            if (value)
                this.$resize();
        }
    };
    
    this.addEventListener("$clear", function(){
        this.value = "";
        
        if (this.oImg)
            this.oImg.style.display = "none";
    });
    
    /**** Init ****/
    
    this.$draw = function(){
        //Build Main Skin
        this.$int = this.$ext = this.$getExternal();
        this.$ext.onclick = function(e){
            this.host.dispatchEvent("click", {htmlEvent: e || event});
        };
        this.oImage = this.$getLayoutNode("main", "image", this.$ext);
        this.oImg = this.$int.getElementsByTagName("img")[0];
    };
    
    this.$resize = function(){
        var diff = apf.getDiff(this.$ext);
        var wratio = 1, hratio = 1;
        
        this.oImg.style.width = "";
        this.oImg.style.height = "";
        
        if (this.oImg.offsetWidth > this.$ext.offsetWidth)
            wratio = this.oImg.offsetWidth / (this.$ext.offsetWidth - diff[0]);
        if (this.oImg.offsetHeight > this.$ext.offsetHeight)
            hratio = this.oImg.offsetHeight / (this.$ext.offsetHeight - diff[1]);

        if (wratio > hratio && wratio > 1)
            this.oImg.style.width = "100%";
        else if (hratio > wratio && hratio > 1)
            this.oImg.style.height = "100%";
        
        this.oImg.style.top = ((this.$ext.offsetHeight - apf.getHeightDiff(this.$ext) 
            - this.oImg.offsetHeight) / 2) + "px";
    }
}).call(apf.img.prototype = new apf.BaseSimple());

apf.aml.setElement("img", apf.img);

apf.aml.setElement("name", apf.BindingRule);
apf.aml.setElement("image", apf.BindingRule);
// #endif
