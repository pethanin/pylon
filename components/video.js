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

// #ifdef __JVIDEO || __INC_ALL
// #define __WITH_PRESENTATION 1

/**
 * @classDescription This class creates a new video
 * @return {Video} Returns a new video
 * @type {Video}
 * @constructor
 * @allowchild {text}
 * @addnode components:video
 *
 * @author      Mike de Boer
 * @version     %I%, %G%
 * @since       1.0
 */
jpf.video = jpf.component(GUI_NODE, function(){
    this.draw = function(){
        //Build Main Skin
        this.oExt = this.__getExternal();
    }
    
    this.loadVideo = function(sVideo) {
        if (this.player && sVideo) {
            this.src = this.currentSrc = sVideo;
            this.player.load(sVideo);
        }
    }
    
    this.seek = function(iTo) {
        if (this.player && iTo >= 0 && iTo <= this.duration)
            this.player.seek(iTo);
    }
    
    this.setVolume = function(iVolume) {
        if (this.player)
            this.player.setVolume(iVolume);
    }
    
    this.ready = function() {
        this.setProperty('networkState', jpf.Media.LOADED);
        this.setProperty('readyState',   jpf.Media.CAN_PLAY);
        this.setProperty('duration', this.player.getTotalTime());
        this.seeking  = false;
        this.seekable = true;
        this.setProperty('seeking', false);
    }
    
    this.guessType = function(path) {
        // make a best-guess, based on the extension of the src attribute (file name)
        var ext  = path.substr(path.lastIndexOf('.') + 1);
        var type = "";
        switch (ext) {
            case "mov":
                type = "video/quicktime";
                break;
            case "flv":
                type = "video/flv";
                break;
            case "avi":
            case "wmv":
                type = "video/wmv";
                break;
        }
        return type;
    }
    
    this.getPlayerType = function(mimeType) {
        if (!mimeType) return null;
        
        mimeType = mimeType.toLowerCase();
        var playerType = "";
        if (mimeType.indexOf('flv') > -1) 
            playerType = "TypeFlv";
        else if (mimeType.indexOf('quicktime') > -1) 
            playerType = "TypeQT";
        else if (mimeType.indexOf('wmv') > -1)
            playerType = jpf.isMac ? "TypeQT" : "TypeWmp";
        else if (mimeType.indexOf('silverlight') > -1)
            playerType = "TypeSilverlight";
        
        return playerType;
    }
    
    this.initPlayer = function() {
        this.player = new jpf.video[this.playerType](this.uniqueId, this.oExt, {
            src         : this.src,
            width       : this.width,
            height      : this.height,
            autoLoad    : true,
            autoPlay    : this.autoplay,
            showControls: this.controls,
            volume      : this.volume,
            mimeType    : this.type
        });
        return this;
    }
    
    this.startListening = function() {
        if (!this.player) return this;
        //this.player.addEventListener("error", "error", jpf.dumpError);                   <-- ignored
        //this.player.addEventListener("init", "init", jpf.dumpError);                     <-- ignored
        //this.player.addEventListener("cuePoint", "cuePoint", jpf.dumpError);             <-- not supported (yet)
        //this.player.addEventListener("playheadUpdate", "playheadUpdate", jpf.dumpError); <-- ignored
        this.player.addEventListener("progress", this, function(e) {
            // bytesLoaded, bytesTotal
            this.bufferedBytes = {start: 0, end: e.bytesLoaded};
            this.bytesTotal    = e.bytesTotal;
        });
        this.player.addEventListener("stateChange", this, function(e) {
            //loading, playing, seeking, paused, stopped, connectionError
            if (e.state == "loading") 
                this.setProperty('networkState', this.networkState = jpf.Media.LOADING);
            else if (e.state == "connectionError")
                this.setProperty('readyState', this.networkState = jpf.Media.DATA_UNAVAILABLE);
            else if (e.state == "playing" || e.state == "paused") {
                if (e.state == "playing") 
                    this.ready();
                this.paused = Boolean(e.state == "paused");
                this.setProperty('paused', this.paused);
            }
            else if (e.state == "seeking") {
                this.seeking = true;
                this.setProperty('seeking', true);
            }
        });
        this.player.addEventListener("change", this, function(e) {
            if (typeof e.volume != "undefined") {
                this.volume = e.volume;
                this.muted  = (e.volume > 0);
                this.setProperty('volume', e.volume);
            } else {
                this.duration = this.player.getTotalTime();
                this.position = e.playheadTime / this.duration;
                if (isNaN(this.position)) return;
                this.setProperty('position', this.position);
                this.currentTime = e.playheadTime;
                this.setProperty('currentTime', this.currentTime);
            }
        });
        this.player.addEventListener("complete", this, function(e) {
            this.paused = true;
            this.setProperty('paused', true);
        });
        this.player.addEventListener("ready", this, function(e) {
            this.ready();
        });
        
        return this;
    }
    
    this.stopListening = function() {
        if (!this.player) return this;
        
    }
    
    this.__loadJML = function(x){
        var oInt = this.__getLayoutNode("Main", "container", this.oExt);
        
        this.oInt = this.oInt
            ? jpf.JMLParser.replaceNode(oInt, this.oInt)
            : jpf.JMLParser.parseChildren(x, oInt, this);
            
        this.notSupported = x.firstChild.nodeValue;
        
        this.src        = x.getAttribute('src');
        this.type       = x.getAttribute('type') || this.guessType(this.src);
        this.playerType = this.getPlayerType(this.type)

        // sanity checking
        if (!this.playerType || !jpf.video[this.playerType] 
          || !jpf.video[this.playerType].isSupported()) {
            this.oExt.innerHTML = this.notSupported;
            return;
        }
        
        this.autoplay = jpf.isTrue(x.getAttribute('autoplay'));
        this.controls = jpf.isTrue(x.getAttribute('controls'));
        this.width    = parseInt(x.getAttribute('width'));
        this.height   = parseInt(x.getAttribute('height'));
        
        this.volume   = parseInt(x.getAttribute('volume')) || 50;
        
        jpf.JMLParser.parseChildren(this.jml, null, this);
        
        this.initPlayer().startListening();
    }
}).implement(jpf.Presentation, /*jpf.DataBinding, */jpf.Media);

jpf.video.TypeInterface = {
    /**
     * Add an event listener to the video.
     *
     * @param eventType A string representing the type of event.  e.g. "init"
     * @param object The scope of the listener function (usually "this").
     * @param function The function to be called when the event is dispatched.
     */
    addEventListener: function(eventType, object, functionRef) {
        if (this.listeners == null)
            this.listeners = {};

        if (this.listeners[eventType] == null)
            this.listeners[eventType] = [];
        else
            this.removeEventListener(eventType, object, functionRef);

        this.listeners[eventType].push({target:object, func:functionRef});
        return this;
    },
    
    /**
     * Remove an event listener from the video.
     *
     * @param eventType A string representing the type of event.  e.g. "init"
     * @param object The scope of the listener function (usually "this").
     * @param functionRef The function to be called when the event is dispatched.
     */
    removeEventListener: function(eventType, object, functionRef) {
        for (var i = 0; i < this.listeners[eventType].length; i++) {
            var listener = this.listeners[eventType][i];
            if (listener.target == object && listener.func == functionRef) {
                this.listeners[eventType].splice(i, 1);
                break;
            }
        }
        return this;
    },
    
    // Notify all listeners when a new event is dispatched.
    dispatchEvent: function(eventObj) {
        if (this.listeners == null) return;
        var type = eventObj.type;
        var items = this.listeners[type];
        if (items == null) return this;
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.func.apply(item.target, [eventObj]);
        }
        return this;
    },
    
    properties: ["src", "width", "height", "volume", "showControls", 
        "autoPlay", "totalTime", "mimeType"],
    
    setOptions: function(options) {
        if (options == null) return this;
        // Create a hash of acceptable properties
        var hash = this.properties;
        for (var i = 0; i < hash.length; i++) {
            var prop = hash[i];
            if (options[prop] == null) continue;
            this[prop] = options[prop];
        }
        
        return this;
    }
};

// #endif
