const PRELOAD_BACKGROUND_COLOR_KEY = 'preloadBackgroundColor';
let preloadBackgroundColor = localStorage.getItem(PRELOAD_BACKGROUND_COLOR_KEY);
// console.log('preloadBackgroundColor:',preloadBackgroundColor);

if (preloadBackgroundColor === null) {
	// null preloadBackgroundColor, likely first run, set it to the default background color
	preloadBackgroundColor = '#272727';

	// store
	localStorage.setItem(PRELOAD_BACKGROUND_COLOR_KEY, preloadBackgroundColor);

}

// add to head style
var css = `body { background: ${preloadBackgroundColor}; }`,
    head = document.head || document.getElementsByTagName('head')[0],
    style = document.createElement('style');

head.appendChild(style);

style.type = 'text/css';
if (style.styleSheet){
  // This is required for IE8 and below.
  style.styleSheet.cssText = css;
} else {
  style.appendChild(document.createTextNode(css));
}
