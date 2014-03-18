/*
   Licensed under the Apache License v2.0.

   A copy of which can be found at the root of this distrubution in
   the file LICENSE-2.0 or at http://www.apache.org/licenses/LICENSE-2.0
*/

(function (window) {

  var jetzt = window.jetzt;
  var H = jetzt.helpers;

  // Don't commit changes to these without prior approval please
  jetzt.DEFAULT_OPTIONS = {
      target_wpm: 400
    , scale: 1
    , dark: false
    , show_message: false
    , selection_color: "#FF0000"
    , modifiers: {
          normal: 1
        , start_clause: 1
        , end_clause: 1.8
        , start_sentence: 1.3
        , end_sentence: 2.2
        , start_paragraph: 2.0
        , end_paragraph: 2.8
        , short_space: 1.5
        , long_space: 2.2
      }
    , font_family: "Menlo, Monaco, Consolas, monospace"
    , selected_theme: 0
    , themes: [
      {
        "name": "Default"
        , "dark": {
              "backdrop_color": "#000000"
            , "backdrop_opacity": "0.5"
            , "background_color": "#303030"
            , "foreground_color": "#E0E0E0"
            , "message_color": "#909090"
            , "pivot_color": "#E01000"
            , "progress_bar_background_color": "#000000"
            , "progress_bar_foreground_color": "#b1dcdb"
            , "reticle_color": "#656565"
            , "wrap_background_color": "#404040"
            , "wrap_foreground_color": "#a1a1a1"
          }
        , "light": {
             "backdrop_color": "black"
            , "backdrop_opacity": "0.07"
            , "background_color": "#fbfbfb"
            , "foreground_color": "#353535"
            , "message_color": "#929292"
            , "pivot_color": "#E01000"
            , "progress_bar_background_color": "black"
            , "progress_bar_foreground_color": "#00be0b"
            , "reticle_color": "#efefef"
            , "wrap_background_color": "#f1f1f1"
            , "wrap_foreground_color": "#666"
          }
       }

       // put more themes here
    ]
    // keybindings and so forth soon
  };

  // This is where we store the options for the current instance of jetzt.
  var options = H.recursiveExtend({}, jetzt.DEFAULT_OPTIONS);

  // This is where we store the backend getters/setters. It is initialised
  // with a localStorage placeholder for the bookmarklet and demo page.
  var KEY = "jetzt-options";

  var configBackend = {
    get: function (cb) {
      var options = localStorage.getItem(KEY);
      if(options === null) {
        cb({});
      } else {
        cb(JSON.parse(options));
      }
    },
    set: function (options) {
      localStorage.setItem(KEY, JSON.stringify(options));
    }
  };

  var listeners = [];

  function announce () {
    listeners.forEach(function (cb) { cb(); });
  }

  

  // recursive lookup. Like clojure's get-in;
  function lookup (map, keyPath) {
    if (keyPath.length === 0) throw new Error("No keys specified.");

    var key = keyPath[0];
    if (keyPath.length === 1) {
      if (!map.hasOwnProperty(key)) {
        console.warn("config lookup: no key '"+key+"'");
      }
      return map[key];
    } else {
      var submap = map[key];
      if (H.realTypeOf(submap) !== 'Object') {
        console.warn("config lookup: no key '"+key+"'");
        return;
      } else {
        return lookup(submap, keyPath.slice(1));
      }
    }
  }

  // recursive put. Like clojure's assoc-in
  function put (map, keyPath, val) {
    if (keyPath.length === 0) throw new Error("No keys specified.");

    var key = keyPath[0];
    if (keyPath.length === 1) {
      map[key] = val;
    } else {
      var submap = map[key];
      if (H.realTypeOf(submap) !== 'Object') {
        submap = {};
        map[key] = submap;
      }
      _put(submap, keyPath.slice(1), val);
    }
  }


  /**
   * jetzt.config
   * get and set config variables.
   *
   * e.g.
   *      jetzt.config("cheese", "Edam")
   * 
   * sets the "cheese" option to the string "Edam"
   *
   *      jetzt.config("cheese")
   *
   *      => "edam"
   *
   * It also has support for key paths
   *
   *      jetzt.config(["cheese", "color"], "blue")
   *      jetzt.config(["cheese", "name"], "Stilton")
   *
   *      jetzt.config(["cheese", "name"])
   *
   *      => "Stilton"
   *
   *      jetzt.config("cheese")
   * 
   *      => {color: "blue", name: "Stilton"}
   */
  jetzt.config = function (keyPath, val) {
    if (typeof keyPath === 'string') keyPath = [keyPath];

    if (arguments.length === 1) {
      return lookup(options, keyPath);
    } else {
      put(options, keyPath, val);
      configBackend.set(options);
      announce();
    }
  };

  /**
   * config.setBackend
   * Set the config 'backend' store. Should be an object with methods
   * void get(cb(opts))
   * void set(opts)
   */
  jetzt.config.setBackend = function (backend) {
    configBackend = backend;
    backend.get(function (opts) {
      if (H.realTypeOf(opts) === 'Object') {
        options = H.recursiveExtend({}, options, opts);
        announce();
      } else {
        throw new Error("bad config backend");
      }
    });
  };

  jetzt.config.getBackend = function () {
    return configBackend;
  };

  // convenince functions for dealing with delay modifiers
  jetzt.config.getModifier = function (mod) {
    return jetzt.config(["modifiers", mod]) || 1;
  };

  jetzt.config.maxModifier = function (a, b) {
    if (jetzt.config.getModifier(a) > jetzt.config.getModifier(b)) {
      return a;
    } else {
      return b;
    }
  };

  jetzt.config.onChange = function (cb) {
    listeners.push(cb);
    return function () { H.removeFromArray(listeners, cb); };
  };

  jetzt.config.refresh = function () {
    this.setBackend(configBackend);
  };

  /**
   * Adjust the size of the reader
   */
  jetzt.config.adjustScale = function (diff) {
    var current = this("scale");
    var adjusted = H.clamp(0.1, current + diff, 10);

    this("scale", adjusted);
  };


  /**
   * Adjust the speed of the reader (words per minute)
   */
  jetzt.config.adjustWPM = function (diff) {
    var current = this("target_wpm");
    var adjusted = H.clamp(100, current + diff, 1500);

    this("target_wpm", adjusted);
  };

  /**
   * Toggle the dark of the reader
   */
  jetzt.config.toggleDark = function () {
    this("dark", !options.dark);
  };

  jetzt.config.getSelectedTheme = function () {
    return options.themes[options.selected_theme];
  };

  jetzt.config.nextTheme = function () {
    var current = options.selected_theme;
    var numThemes = options.themes.length;
    this("selected_theme", (current + 1) % numThemes);
  };

})(this);



