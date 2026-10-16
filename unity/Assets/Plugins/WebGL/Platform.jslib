mergeInto(LibraryManager.library, {
  // Unity's persistence pre-run hook needs this library retained by Emscripten.
  AW_IsMobileBrowser__deps: ['$IDBFS'],
  AW_IsMobileBrowser: function () {
    return window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent) ? 1 : 0;
  }
});
