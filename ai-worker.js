/* Runs the in-browser AI (WebLLM) away from the page, so the page stays smooth while the model writes. Started by ai.js. */
self.window=self;   // the WebLLM bundle ends with window.WebLLM=...
importScripts('lib/web-llm.min.js');
var handler=new self.WebLLM.WebWorkerMLCEngineHandler();
self.onmessage=function(m){ handler.onmessage(m); };
