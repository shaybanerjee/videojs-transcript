/*! videojs-transcript - v0.0.0 - 2014-09-11
* Copyright (c) 2014 Matthew Walsh; Licensed MIT */
(function (window, videojs) {
  'use strict';


var Utils = (function () {
  var niceTimestamp = function (timeInSeconds) {
    var hour = Math.floor(timeInSeconds / 3600);
    var min = Math.floor(timeInSeconds % 3600 / 60);
    var sec = Math.floor(timeInSeconds % 60);
    sec = (sec < 10) ? '0' + sec : sec;
    min = (hour > 0 && min < 10) ? '0' + min : min;
    if (hour > 0) {
      return hour + ':' + min + ':' + sec;
    }
    return min + ':' + sec;
  };
  return {
    niceTimestamp : niceTimestamp,
  };
}());
var Html = (function () {
  var myContainer, myPlayer, myPrefix;
  var createSeekClickHandler = function (time) {
    return function () {
      myPlayer.currentTime(time);
    };
  };
  var createLine = function (cue) {
    var line = document.createElement('div');
    var timestamp = document.createElement('span');
    var text = document.createElement('span');
    line.className = myPrefix + '-line';
    line.setAttribute('data-begin', cue.startTime);
    timestamp.className = myPrefix + '-timestamp';
    timestamp.textContent = Utils.niceTimestamp(cue.startTime);
    line.addEventListener('click', createSeekClickHandler(cue.startTime));
    text.className = myPrefix + '-text';
    text.innerHTML = cue.text;
    line.appendChild(timestamp);
    line.appendChild(text);
    return line;
  };
  var setTrack = function (track) {
    if (myContainer === undefined) {
      throw new Error('videojs-transcript: Html not initialized!');
    }
    var line, i;
    var fragment = document.createDocumentFragment();
    track.load();
    track.on('loaded', function () {
      //console.log('Creating transcript with ' + track.cues().length + ' lines.');
      var cues = track.cues();
      for (i = 0; i < cues.length; i++) {
        line = createLine(cues[i], myPrefix);
        fragment.appendChild(line);
      }
      myContainer.appendChild(fragment);
      myContainer.setAttribute('lang', track.language());
    });
  };
  var init = function (container, player, prefix) {
    myContainer = container;
    myPlayer = player;
    myPrefix = prefix;
    myContainer.className = prefix;
    myContainer.id = myPrefix + '-' + myPlayer.id();
  };
  return {
    init: init,
    setTrack: setTrack,
  };
}());
var ScrollHelper = (function () {
  var isScrollable = function (container) {
    return container.scrollHeight > container.offsetHeight;
  };
  var scrollIntoView = function (element) {
    // TODO: make this nice and smooth
    // TODO: don't scroll if line is already visible
    // TODO: don't scroll while user is scrolling
    element.scrollIntoView(false);
  };
  return {
    isScrollable : isScrollable,
    scrollIntoView : scrollIntoView
  };
}());
var defaults = {
    autoscroll: true
  },
    transcript;
  /**
   * Initialize the plugin.
   * @param options (optional) {object} configuration for the plugin
   */
  transcript = function (options) {
    var settings = videojs.util.mergeOptions(defaults, options);
    var player = this;
    var htmlPrefix = 'transcript';
    var htmlContainer = document.createElement('div');
    var tracks;
    var currentTrack;
    var getAllTracks = function () {
      var i, kind;
      var validTracks = [];
      tracks = player.textTracks();
      for (i = 0; i < tracks.length; i++) {
        kind = tracks[i].kind();
        if (kind === 'captions' || kind === 'subtitles') {
          validTracks.push(tracks[i]);
        }
      }
      return validTracks;
    };
    var getDefaultTrack = function (tracks) {
      var i;
      for (i = 0; i < tracks.length; i++) {
        if (tracks[i].dflt && tracks[i].dflt()) {
          return tracks[i];
        }
      }
      return tracks[0];
    };
    var getCaptionNodes = function () {
      var i, node, caption;
      var nodes = document.querySelectorAll('#' + htmlContainer.id + ' > .' + htmlPrefix + '-line');
      var captions = [];
      for (i = 0; i < nodes.length; i++) {
        node = nodes[i];
        caption = {
          'element': node,
          'begin': node.getAttribute('data-begin'),
        };
        captions.push(caption);
      }
      return captions;
    };
    var timeUpdate = function () {
      var caption, end, i;
      var time = player.currentTime();
      var captions = getCaptionNodes();
      for (i = 0; i < captions.length; i++) {
        caption = captions[i];
        // Remain active until next caption.
        // On final caption, remain active until video duration if known, or forever;
        if (i < captions.length - 1) {
          end = captions[i + 1].begin;
        } else {
          end = player.duration() || Infinity;
        }
        if (time > caption.begin && time < end) {
          caption.element.classList.add('is-active');
          if (settings.autoscroll && ScrollHelper.isScrollable(htmlContainer)) {
            ScrollHelper.scrollIntoView(caption.element);
          }
        } else {
          caption.element.classList.remove('is-active');
        }
      }
    };
    tracks = getAllTracks();
    if (tracks.length > 0) {
      currentTrack = getDefaultTrack(tracks);
      Html.init(htmlContainer, player, htmlPrefix);
      Html.setTrack(currentTrack);
      this.on('timeupdate', timeUpdate);
    } else {
      throw new Error('videojs-transcript: No tracks found!');
    }
    var getContainer = function () {
      return htmlContainer;
    };
    return {
      getContainer: getContainer,
    };
  };
  // register the plugin
  videojs.plugin('transcript', transcript);


}(window, window.videojs));