requirejs.config({
  paths: {
    "templates": "../../.tmp/jst"
  },
  shim: {
    "bootstrap": {
      "deps": ['jquery'],
      exports: "$.fn.collapse"
    },
  }
});