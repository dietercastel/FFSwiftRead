var selectedText;
var preSanitizedSelectedText;
const defaultSelectedTextSanitizeRegex = '\\s?\\[.*?\\d+.*?\\]';
var keepRaw;

var splitText;
var splitTextIndexes;
var rawSplitText;
var nonChunkedSplitText;

var wpm;
var chunkSize;
var style;
var highlightMode;
var highlightColor;
var highlightColorUseCustom;
var fontColor;
var fontColorEnabled;
var backgroundColor;
var backgroundColorEnabled;
var letterSpacing;
var focusLetterIndicatorEnabled;
var contextFromRightEnabled;
var activeWordOffsetFromCenterPctOfHalfWidth = 0.33;

var font;

var wordDiv;
var wpmDiv;
var fontSizeDiv;

var chunkSizeDiv;
var wordIndex; // the index of the current "word"(s), could be composed of multiple words if chunk size > 1
var currentFirstTokenIndex; // the "universal" index of the first word/token in the current word
function setCurrentFirstTokenIndex() {
	currentFirstTokenIndex = splitTextIndexes.length > 0 ? splitTextIndexes[wordIndex][0] : 0;
}

var pauseButton;
var playButton;
var rewindButton;
var replayButton;
var forwardButton;

var wordTimer;
var timerDelay = 3; // reading start timer

var width;
var height;

var maxWpm;

var delay;
const FUNCTION_EXECUTION_DISCOUNT_MS = 30;

var slider;
var sliderCheckbox;

var timerCountdown;
var timerTimeout;
var timerBorderWidth;

var inits = 0;
var popupClosed = 0;

var timeEstimate = 0;

var hide = 0;
let selectorsToHide = '#status, #controls, #slider-container';
let contextSelectors = '#context-container .context, .multiline-context';

var language = 0; //0 english/unknown. 1 chinese. 2 arabic.

var timerCount = 0;

var readingTimer;
var currentTimeSpent = 0;

var loadingStats;

var totalTimeSpent;
var wordCount;
var currenetWordCount = 0;
var nationalWpmAverage = 250.0;
var statsMode = 0;

var _MS_PER_DAY = 1000 * 60 * 60 * 24;

var articleShareThreshold;
var shareButtons;

var controls;

var curTitle;

var enablemicropauseNumbers;
var enablemicropausePunctuation;
var enablemicropauseLongWords;
var enablemicropauseParagraph;
var micropauseNumbersFactor;
var micropausePunctuationFactor;
var micropauseEndingPunctuationFactor;
var micropauseLongWordsFactor;
var micropauseParagraphFactor;
var wpmInterval;
var contextDisplayStyle;
var enableMultilineContext;
var contextOpacity;
var selectedTextSanitizationRule;

var autoTurnPage;
var extractNextPageThreshold;
var extractingNextPage = false;

var hotkeyRewind;
var hotkeyReset;
var hotkeyForward;
var hotkeyQuit;
var hotkeyHide;
var hotkeyWPMIncrease;
var hotkeyWPMDecrease;
var hotkeyChunkSizeIncrease;
var hotkeyChunkSizeDecrease;
var hotkeyFontSizeIncrease;
var hotkeyFontSizeDecrease;
var hotkeyFullscreen;
var hotkeyPageLeft;
var hotkeyPageRight;
var hotkeyToggleContextMode;

let homepageUrl;

// source tab info
let currentDomain;
let currentTabId;

// current spreed window info
let spreedTabId;
// store the tab id of THIS spreed window
getActiveTab(function (tab) {
	spreedTabId = tab.id;
});

const tagR = /<([\/]*([^>]+))>/ig;

//// timing helpers
const average = (array) => array.reduce((a, b) => a + b) / array.length;
let functionExecTimes = [];
let betweenFunctionExecTimes = [];
let lastFunctionExecTime = null;

var state = {
	settingsStore: null,
	settingsShown: false,
	isPlaying: false
};

// development url: http://localhost:5001/spreed-9532e/us-central1
// prod url: https://us-central1-spreed-9532e.cloudfunctions.net
const ENV = 'production';
// const ENV = 'development';

let API_URL;
if (ENV === 'development') {
	API_URL = 'http://localhost:5001/spreed-9532e/us-central1';
} else {
	API_URL = 'https://us-central1-spreed-9532e.cloudfunctions.net';
}
if (API_URL.includes('localhost')) {
	console.error('API url is localhost. Change.');
}


//STORAGE FUNCTIONS

function _dictIsEmpty(obj) {
	for (var prop in obj) {
		if (obj.hasOwnProperty(prop))
			return false;
	}

	return true;
}


function _localStorageSetdefault(key, defaultValue) {
	let value = localStorage.getItem(key);
	//console.log("key: "+key);
	//console.log("value: "+value);

	if (value == null || value == undefined) {
		localStorage.setItem(key, defaultValue);
		return defaultValue;
	}
	else {
		return value;
	}
}

function getSetting(key) {
	if (state.settingsStore !== null) {
		return state.settingsStore.getSetting(key);
	} else {
		throw "Cannot get settings from a null settingsStore in state."
	}
}



// a and b are javascript Date objects
function dateDiffInDays(a, b) {

	return Math.round((b - a) / _MS_PER_DAY);
}

function groupWords(splitText, chunkSize) {
	var newSplitText = new Array();
	splitTextIndexes = new Array(); // array of arrays. element array element is the index of the words in that chunk
	chunkCount = 0;

	for (var i = 0; i < splitText.length; i = i + chunkSize) {
		var newChunk = "";
		let newSplitTextIndexChunk = new Array();
		for (var j = 0; j < chunkSize; j++) {
			if ((i + j) < splitText.length) {
				newChunk = newChunk + splitText[i + j] + " ";
				newSplitTextIndexChunk.push((i + j));
			}
		}

		if (newChunk == " ") {
			newChunk = "_";
		}

		newSplitText.push(newChunk);
		splitTextIndexes.push(newSplitTextIndexChunk);
	}

	//get rid of spaces within chunks, if is chinese

	if (language == 1) {
		newSplitText2 = [];
		for (var i = 0; i < newSplitText.length; i++) {
			temp = newSplitText[i].split(" ");

			newtemp = temp.join("");

			newSplitText2.push(newtemp);
		}

		return newSplitText2;
	}
	else {
		return newSplitText;
	}


}


function _combineNumbers(theSplitText) {

	newList = Array();
	var i = 0;
	while (i < theSplitText.length) {
		curChar = theSplitText[i];
		if (theSplitText[i].match(/[0-9]/)) {
			curChar = "";
			while (theSplitText[i].match(/[0-9]/)) {
				curChar += theSplitText[i];
				i += 1;
			}
			newList.push(curChar);

		}
		else {
			newList.push(curChar);
			i += 1;
		}
	}
	//console.log(newList);
	return newList;
}

function _combineEnglishWords(theSplitText) {
	//console.log('combine english');

	newList = Array();
	var i = 0;
	while (i < theSplitText.length) {
		curChar = theSplitText[i];
		if (theSplitText[i].match(/[a-zA-Z]/)) {
			curChar = "";
			while (theSplitText[i].match(/[a-zA-Z]/)) {
				curChar += theSplitText[i];
				i += 1;
			}
			newList.push(curChar);

		}
		else {
			newList.push(curChar);
			i += 1;
		}
	}

	return newList;
}

function HasArabicCharacters(text) {
	var arregex = /[\u0600-\u06FF]/;
	return arregex.test(text);
}

function _splitSelectedText(selectedText) {

	// example: english article with some chinese characters: https://www.theatlantic.com/technology/archive/2018/01/the-shallowness-of-google-translate/551570/

	// detect chinese or japanese
	const allAsianChars = selectedText.match(/[\u3400-\u9FBF]/g); // could be null if there's no match
	// if (allAsianChars) console.log('allAsianChars length:',allAsianChars.length);
	// console.log('selectedText without whitespace:',selectedText.replace(/\s+/g, ""))
	// console.log('selectedText without whitespace length:',selectedText.replace(/\s+/g, "").length);

	//more than 50% of non-space characters
	if (allAsianChars && (1.0 * allAsianChars.length / selectedText.replace(/\s+/g, "").length) > 0.5) {

		// split everything at the character level
		var theSplitText = selectedText.split('');
		// naive: BUT don't split numbers, or english words, regroup them into "words"
		theSplitText = _combineNumbers(theSplitText);
		theSplitText = _combineEnglishWords(theSplitText);
		// filter OUT characters that are only whitespace
		theSplitText = theSplitText.filter(character => character.match(/\s+/) ? false : true);

		chunkSize = 3; // default chunk size: 3 characters at a time: this doesn't work because overridden by user setting
		language = 1;

		console.log('language:', language);
	}

	else {
		chunkSize = 1;

		// i used to have "scientific notation handling" here, it was causing issues so i removed it

		//split on whitespace
		theSplitText = selectedText.split(/[\s]+/);
	}

	theSplitText = _removeEmpty(theSplitText);

	if (HasArabicCharacters(selectedText)) {
		//console.log('arabic detected!');
		//todo: RIGHT TO LEFT

	}
	return theSplitText;
}

function _preProcessSelectedText(selectedText, raw = false) {

	//add space after em dashes
	selectedText = selectedText.replace(/\u2014/g, '\u2014 ');

	if (!raw) {
		// add space before any start style tags that were kept, BUT ONLY IF THERE ISN'T ALREADY A SPACE, to treat them as separate "words"
		selectedText = selectedText.replace(/([^\s])(<[^>\/]+>)/gi, '$1 $2');
	} else {
		// is raw: either selected text, or kindle cloud reader text
		// console.log('currentDomain:',currentDomain);
		if (currentDomain &&
			(
				currentDomain.includes(".amazon.") || currentDomain.includes("/pdf.js/")
			)
		) {
			// if text from kindle cloud reader or some other "custom" reader where we intentially insert html tags, don't do anything
		}
		else {
			// replace any < or > with their html codes
			selectedText = selectedText.replace(/\</g, '&lt;');
			selectedText = selectedText.replace(/\>/g, '&gt;');
		}
	}


	return selectedText;
}

function _sanitizeSelectedText(selectedText) {
	console.log('selectedText sanitization rule after escaping back slashes:', selectedTextSanitizationRule.replaceAll('\\', '\\\\'));
	if (selectedTextSanitizationRule && selectedTextSanitizationRule.length > 0) {
		const regex = new RegExp(selectedTextSanitizationRule, 'g');
		selectedText = selectedText.replaceAll(regex, "");
	}

	return selectedText;
}

function _getWordStartInHtml(html) {
	let inHtmlTag = false;
	for (let i = 0; i < html.length; i++) {
		const curChar = html[i];
		// ignore any preceding whitespace
		if (curChar.replace(/\u200c/g, "").replace(/\u00a0/g, "").replace(/\s/g, "").length === 0) {
			continue
		}

		// if still in html tag
		if (inHtmlTag) {
			if (curChar === ">") {
				inHtmlTag = false;
			}
		} else if (!inHtmlTag) {
			if (curChar === "<") {
				inHtmlTag = true;
			} else {
				// not in HTML tag any more, this must be the "first word", return index
				return i;
			}
		}
	}
}
function _processNonChunkedSplitTextStyling(nonChunkedSplitText) {

	let newNonChunkedSplitText = [];
	let activeTags = [];
	const startTagR = /<([^>|\/]+)>/ig;
	const endTagR = /<\/([^>]+)>/ig;

	// iterate through words
	for (let i = 0; i < nonChunkedSplitText.length; i++) {

		let word = nonChunkedSplitText[i];
		// console.log('---');
		// console.log('current word:', word);

		// try to match tags and words
		const allTagMatches = [...word.matchAll(tagR)].map(
			match => { match.isClose = (match[1].includes("/") ? true : false); return match; }
		); // [tagName, true/false is opening tag, raw tag]
		// console.log('all tag matches:',allTagMatches);

		// get position of word
		const wordAlone = word.replace(tagR, ""); // to handle special case: "<b>word</b>.". worAlone is "word." but the entire substring is not in the word...
		// get index of word start, where any preceding html tags end
		let wordIndex = _getWordStartInHtml(word);
		// word.indexOf(wordAlone);

		// console.log('wordAlone:',wordAlone);
		// console.log('wordIndex:',wordIndex);

		// iterate through each character
		let inTag = false;
		let isCloseTag = false;
		let newWord = "";
		let curTag = "";
		let wordStartIndex;
		let openTagEndIndex;
		let closeTagEndIndex;
		for (let j = 0; j < word.length; j++) {
			const char = word[j];
			if (char === "<") {
				inTag = true;
			} else if (char === "/") {
				if (inTag) isCloseTag = true;
			} else if (char === ">") {
				// detected end of current tag
				if (!isCloseTag) {
					// we finished an open tag
					activeTags.push(curTag);
					// keep track of end of open tag
					openTagEndIndex = j;
					// add start span
					newWord += `<span class='start ${curTag}'></span>`;
				}
				else {
					// we finished a closing tag
					// keep track of end of closing tag
					closeTagEndIndex = j;
					// remove from activeTags
					const index = activeTags.indexOf(curTag);
					if (index > -1) {
						activeTags.splice(index, 1);
						// add end span
						newWord += `<span class='end ${curTag}'></span>`;
					}
				}
				// console.log('curTag:', curTag);
				// console.log('isCloseTag:',isCloseTag);

				isCloseTag = false;
				inTag = false;
				curTag = "";

			} else {
				if (inTag) curTag += char;
				else {
					// if at start of word, encapsulate
					if (j === wordIndex) {
						const startTagString = activeTags.map(x => `<${x}>`).join("");
						const endTagString = activeTags.reverse().map(x => `</${x}>`).join("");
						newWord += `${startTagString}${wordAlone}${endTagString}`;
					}
				}
			}
		}
		// console.log('activeTags:',activeTags);
		// console.log('newWord:', newWord);

		newNonChunkedSplitText.push(newWord);

		// console.log('---');
	}

	return newNonChunkedSplitText;
}



// run on init and when context settings are changed
function updateContextDisplayStyle(initial = false) {
	contextDisplayStyle = getSetting(state.settingsStore.SETTING_CONTEXT_DISPLAY_KEY);
	enableMultilineContext = getSetting(state.settingsStore.SETTING_COMBINE_BIGWORD_WITH_CONTEXT_KEY) === 'true' ? true : false;
	// console.log('contextDisplayStyle:',contextDisplayStyle);
	// console.log('enableMultilineContext:',enableMultilineContext);
	contextFromRightEnabled = getSetting(state.settingsStore.SETTING_CONTEXT_FROM_RIGHT_ENABLED_KEY) === 'true' ? true : false;
	// console.log('contextFromRightEnabled:', contextFromRightEnabled);

	if (initial === false) {
		// console.log('repositioning word...');
		// set word and context font size to be the same
		updateCustomStyleElements();

		setUpContextDisplay();
		// DOM changes take a little bit of time to propogate because menu overlay is fading out / closing, so need to keep running positionWord() until reading area is set
		let previousWordY = -999;
		let previousPostMLContextY = -999;
		let positionInterval = setInterval(() => {
			let readerEl = document.getElementById('word-container');
			let wordEl = $('#context-container #context').get(0);
			let postMLContext = document.getElementById('post-multiline-context-container');

			const readerBounds = readerEl.getBoundingClientRect();
			const wordBounds = wordEl.getBoundingClientRect();
			const postMLContextBounds = postMLContext.getBoundingClientRect();
			const wordYEnd = (wordBounds.y + wordBounds.height);
			const readerCenterY = (readerBounds.y + (readerBounds.height / 2));
			// check position of readerEl
			// console.log('checking reader y: ', readerBounds.y);
			// console.log('checking word position: ', wordBounds.y);
			// console.log('checking previous word position: ', previousWordY);
			// console.log('postMLContext display: ', postMLContext.style.display);
			// console.log('readerEl: ', readerEl);
			// console.log('wordYEnd: ', wordYEnd);
			// console.log('readerCenterY: ', readerCenterY);

			// if reader is visible
			// and word has stopped moving
			// and bottom of word is after half-way point of the reader's height
			// and (post-multiline-context has stopped moving or is not supposed to be shown)
			if (
				readerBounds.y > 0
				&& wordBounds.y === previousWordY
				&& wordYEnd > readerCenterY
			) {
				clearInterval(positionInterval);
			} else {
				previousWordY = wordBounds.y;
				positionWord();
			}

		}, 300);
	}
}

function getFocusLetterIndicatorSettings(initial = false) {
	focusLetterIndicatorEnabled = getSetting(state.settingsStore.SETTING_FOCUS_LETTER_INDICATOR_ENABLED_KEY) === 'true' ? true : false;
	if (initial === false) {
		updateContextDisplayStyle();
		positionWord();
	}
}
function getSanitizationRuleSettings(initial = false) {
	selectedTextSanitizationRule = getSetting(state.settingsStore.SETTING_SANITIZATION_RULE_KEY);
	// console.log('pre sanitized selectedText length:', preSanitizedSelectedText.length);
	// try matching with whitespace to see if the entire selectedText was just whitespace
	const preSanitizedSelectedTextNoWhitespace = preSanitizedSelectedText.replaceAll(/\s+/g, "");
	// console.log('pre sanitized selectedText no whitespace: ', preSanitizedSelectedTextNoWhitespace);
	console.log('length: ', preSanitizedSelectedTextNoWhitespace.length);
	if (preSanitizedSelectedTextNoWhitespace.length === 0) {
		// select text was already all whitespace
		// show empty swiftread window but suggest to user to turn the page (if page turn buttons exist) or open swiftread on non-empty text
		return;
	}

	// then santize original text with input regex
	const postSanitizedText = _sanitizeSelectedText(preSanitizedSelectedText);
	// console.log('post sanitized selectedText length:', postSanitizedText.length);
	const postSanitizedTextNoWhitespace = postSanitizedText.replaceAll(/\s+/g, "");
	// console.log('post sanitized selectedText without witespace length:', postSanitizedTextNoWhitespace.length);
	// protect against rules that sanitize ALL the text (very likely a mistake)

	if (postSanitizedTextNoWhitespace.length === 0 && preSanitizedSelectedText.length > 0) {
		alert("Notice: That regex sanitized the entire document! Reverting regex to the default regex, try again.");
		state.settingsStore.setSetting(state.settingsStore.SETTING_SANITIZATION_RULE_KEY, defaultSelectedTextSanitizeRegex);
		// reload settings
		openSettings();
	}
	if (initial === false) {
		// re-sanitize the selected text
		selectedText = postSanitizedText.slice();
		alert(`Re-sanitized the text. Please REFRESH the SwiftRead window to see the effects.\n\nNum chars before sanitization: ${preSanitizedSelectedText.length}. After sanitization: ${postSanitizedText.length}`);
	}
}
function getMicropauseSettings() {
	enablemicropauseNumbers = getSetting(state.settingsStore.SETTING_MICROPAUSE_NUMBERS_ENABLED_KEY) === 'true' ? true : false;
	enablemicropausePunctuation = getSetting(state.settingsStore.SETTING_MICROPAUSE_PUNCTUATION_ENABLED_KEY) === 'true' ? true : false;
	enablemicropauseLongWords = getSetting(state.settingsStore.SETTING_MICROPAUSE_LONGWORDS_ENABLED_KEY) === 'true' ? true : false;
	enablemicropauseParagraph = getSetting(state.settingsStore.SETTING_MICROPAUSE_PARAGRAPH_ENABLED_KEY) === 'true' ? true : false;

	micropauseNumbersFactor = getSetting(state.settingsStore.SETTING_MICROPAUSE_NUMBERS_FACTOR_KEY);
	micropausePunctuationFactor = getSetting(state.settingsStore.SETTING_MICROPAUSE_PUNCTUATION_FACTOR_KEY);
	micropauseEndingPunctuationFactor = getSetting(state.settingsStore.SETTING_MICROPAUSE_ENDING_PUNCTUATION_FACTOR_KEY);
	micropauseLongWordsFactor = getSetting(state.settingsStore.SETTING_MICROPAUSE_LONGWORDS_FACTOR_KEY);
	micropauseParagraphFactor = getSetting(state.settingsStore.SETTING_MICROPAUSE_PARGRAPH_FACTOR_KEY);
}
function getTimerDelay() {
	const timerEnabled = getSetting(state.settingsStore.SETTING_START_TIMER_ENABLED_KEY);
	if (timerEnabled === 'true') {
		timerDelay = getSetting(state.settingsStore.SETTING_START_TIMER_LENGTH_KEY);
	}
	else {
		timerDelay = null;
	}
}
function getWPMInterval() {
	wpmInterval = getSetting(state.settingsStore.SETTING_WPM_INTERVAL_KEY);
	if (typeof (wpmInterval) !== "undefined" && wpmInterval !== null) {
		wpmInterval = parseInt(wpmInterval);
	}

}
function getAutoPageTurnSettings() {
	autoTurnPage = getSetting(state.settingsStore.SETTING_AUTO_PAGE_TURN_ENABLED_KEY) === 'true' ? true : false;
}
function getHotkeyRewind() {
	hotkeyRewind = getSetting(state.settingsStore.SETTING_HOTKEY_REWIND_KEY);
}
function getHotkeyReset() {
	hotkeyReset = getSetting(state.settingsStore.SETTING_HOTKEY_RESET_KEY);
}
function getHotkeyForward() {
	hotkeyForward = getSetting(state.settingsStore.SETTING_HOTKEY_FORWARD_KEY);
}
function getHotkeyQuit() {
	hotkeyQuit = getSetting(state.settingsStore.SETTING_HOTKEY_QUIT_KEY);
}
function getHotkeyHide() {
	hotkeyHide = getSetting(state.settingsStore.SETTING_HOTKEY_HIDE_KEY);
}
function getHotkeyWPM() {
	hotkeyWPMIncrease = getSetting(state.settingsStore.SETTING_HOTKEY_WPM_INCREASE_KEY);
	hotkeyWPMDecrease = getSetting(state.settingsStore.SETTING_HOTKEY_WPM_DECREASE_KEY);
}
function getHotkeyChunkSize() {
	hotkeyChunkSizeIncrease = getSetting(state.settingsStore.SETTING_HOTKEY_CHUNK_SIZE_INCREASE_KEY);
	hotkeyChunkSizeDecrease = getSetting(state.settingsStore.SETTING_HOTKEY_CHUNK_SIZE_DECREASE_KEY);
}
function getHotkeyFontSize() {
	hotkeyFontSizeIncrease = getSetting(state.settingsStore.SETTING_HOTKEY_FONT_SIZE_INCREASE_KEY);
	hotkeyFontSizeDecrease = getSetting(state.settingsStore.SETTING_HOTKEY_FONT_SIZE_DECREASE_KEY);
}
function getHotkeyFullscreen() {
	hotkeyFullscreen = getSetting(state.settingsStore.SETTING_HOTKEY_FULLSCREEN_KEY);
}
function getHotkeyPageLeftRight() {
	hotkeyPageLeft = getSetting(state.settingsStore.SETTING_HOTKEY_PAGE_LEFT);
	hotkeyPageRight = getSetting(state.settingsStore.SETTING_HOTKEY_PAGE_RIGHT);
}
function getHotkeyToggleContextMode() {
	hotkeyToggleContextMode = getSetting(state.settingsStore.SETTING_TOGGLE_CONTEXT_MODE);
}
function reloadAppHotkeys() {
	// console.log('reloading app hotkeys...');
	hotkeys.deleteScope('app');
	hotkeys('*', { scope: 'app' }, checkKeypress);
	// rewind
	getHotkeyRewind();
	hotkeys(hotkeyRewind, { scope: 'app' }, function (event, handler) {
		replay();
	});
	// forward
	getHotkeyForward();
	hotkeys(hotkeyForward, { scope: 'app' }, function (event, handler) {
		forward();
	});
	// reset
	getHotkeyReset();
	hotkeys(hotkeyReset, { scope: 'app' }, function (event, handler) {
		rewind();
	});
	// quit
	getHotkeyQuit();
	hotkeys(hotkeyQuit, { scope: 'app' }, function (event, handler) {
		close();
	});
	// fullscreen
	getHotkeyFullscreen();
	hotkeys(hotkeyFullscreen, { scope: 'app' }, function (event, handler) {
		toggleFullScreen();
	});
	// page left/right
	getHotkeyPageLeftRight();
	hotkeys(hotkeyPageLeft, { scope: 'app' }, function (event, handler) {
		const pageTurnLeft = $("#page-turn-left a");
		if (pageTurnLeft.length > 0) {
			pageTurnLeft.trigger('click');
		}
	});
	hotkeys(hotkeyPageRight, { scope: 'app' }, function (event, handler) {
		const pageTurnRight = $("#page-turn-right a");
		if (pageTurnRight.length > 0) {
			pageTurnRight.trigger('click');
		}
	});
	// toggle context mode
	getHotkeyToggleContextMode();
	hotkeys(hotkeyToggleContextMode, { scope: 'app' }, function (event, handler) {
		// console.log('current contextDisplayStyle:', contextDisplayStyle);
		if (contextDisplayStyle === 'always') {
			state.settingsStore.setSetting(state.settingsStore.SETTING_CONTEXT_DISPLAY_KEY, 'on-pause');
		} else if (contextDisplayStyle === 'on-pause' || contextDisplayStyle === 'never') {
			state.settingsStore.setSetting(state.settingsStore.SETTING_CONTEXT_DISPLAY_KEY, 'always');
			$(contextSelectors).css('opacity', ''); // show contextSelectors in case opacity is 0
		}
		updateContextDisplayStyle();
		positionWord();
	});

	// // hide
	// // disabling "hide controls" for now because they already hide when playing
	// getHotkeyHide();
	// hotkeys(hotkeyHide, {scope: 'app'}, function(event, handler) {
	// 	toggleHide();
	// });
	// wpm
	getHotkeyWPM();
	hotkeys(hotkeyWPMIncrease, { scope: 'app' }, function (event, handler) {
		increaseWPM();
	});
	hotkeys(hotkeyWPMDecrease, { scope: 'app' }, function (event, handler) {
		decreaseWPM();
	});
	// chunk size
	getHotkeyChunkSize();
	hotkeys(hotkeyChunkSizeIncrease, { scope: 'app' }, function (e, h) {
		increaseChunkSize();
	});
	hotkeys(hotkeyChunkSizeDecrease, { scope: 'app' }, function (e, h) {
		decreaseChunkSize();
	});
	// font size
	getHotkeyFontSize();
	hotkeys(hotkeyFontSizeIncrease, { scope: 'app' }, function (e, h) {
		increaseFontSize();
	});
	hotkeys(hotkeyFontSizeDecrease, { scope: 'app' }, function (e, h) {
		decreaseFontSize();
	});

	hotkeys.setScope('app');
}
function addHelpDiv() {
	const helpDiv = `
	<div style="display:none" id="inline-tips-container">
			<div id="inline_tips" style="">
				<h1>Hotkeys</h1>
				<dl class="hotkeys-dd">
					<dt>Space</dt><dd>Play/pause</dd>

					<dt>${hotkeyFullscreen}</dt><dd>Toggle Full-screen</dd>

					<dt>${hotkeyRewind}</dt><dd>Rewind</dd>

					<dt>${hotkeyForward}</dt><dd>Fast-forward</dd>

					<dt>${hotkeyReset}</dt><dd>Reset</dd>

					<dt>1,2...9,0</dt><dd>Seek to position in text</dd>

					<dt>${hotkeyQuit}</dt><dd>Close SwiftRead window</dd>

					<dt>${hotkeyWPMDecrease} </dt><dt> ${hotkeyWPMIncrease}</dt> <dd>Decrease/Increase WPM</dd>

					<dt>${hotkeyChunkSizeDecrease} </dt><dt> ${hotkeyChunkSizeIncrease}</dt> <dd>Decrease/Increase Chunk Size</dd>

					<dt>${hotkeyFontSizeDecrease} </dt><dt> ${hotkeyFontSizeIncrease}</dt> <dd>Decrease/Increase Font Size</dd>

					<dt>${hotkeyPageLeft} </dt><dt> ${hotkeyPageRight}</dt> <dd>Turn page left/right (when reading PDFs in the SwiftRead PDF Reader)</dd>

				</dl>

				<div class="support-contact">Have questions or comments? Reach out to <a href="mailto:support@swiftread.com" target="_blank">support@swiftread.com</a>!</div>
			</div>
		</div>`;
	if ($('#inline-tips-container').length > 0) {
		$('#inline-tips-container').remove();
	}
	$('body').append(helpDiv);
}

function getControlsMessage() {
	const upgradeMessage = '<a href="https://swiftread.com/pro?utm_source=extension&utm_medium=internal&utm_campaign=prelaunch_20200413" target="_blank" class="btn btn-primary">Click here to upgrade</a>';
	const licenseKey = state.settingsStore.getSetting(state.settingsStore.USER_LICENSE_KEY);
	if (licenseKey === null) {
		$('#controls-message').html(upgradeMessage);
	} else {

	}
}

function getActiveTab(callback) {

	chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
		var tab = tabs[0];

		// console.log('active tab:',tab);
		if (tab.hasOwnProperty("id") === true) {
			// tab should always have an id
			// console.log('returning active tab:',tab);

			callback(tab);
		} else {
			pushEvent("error", "no-spreed-window-tab");
			console.error('No active tab identified for current SwiftRead window.');
		}

	});
}

function addMouseListenersToToggleControls() {
	$(selectorsToHide).on('mouseenter', function (event) {
		// only when playing
		if (state.isPlaying === true) {
			showControls();
		}

	});
	$(selectorsToHide).on('mouseleave', function (event) {
		if (state.isPlaying === true) {
			hideControls();
		}
	});
}


function init() {
	console.log('in init function: ');
	// try to get currentDomain and currentTabId, they could be null/undefined though. TODO: handle safely
	currentDomain = localStorage.getItem("currentDomain");
	currentTabId = localStorage.getItem("currentTabId");
	if (currentTabId !== null && typeof (currentTabId) !== "undefined") {
		currentTabId = parseInt(currentTabId);
	}
	// console.log('currentTabId: ', currentTabId);
	console.log('currentDomain: ', currentDomain);

	//tokenize selected text (make sure there's stuff in it too)

	// reset congrats div box text
	$('#congrats').html("");
	$('#post-reading-status').fadeOut("fast");

	let checkInterval = 50;
	let timeElapsed = 0;

	// show loading spinner after a small delay
	$('#error-message').css('opacity', 0);
	$('#error-message').html(`
			<div>
				<i style="font-size: 2rem;" class="fas fa-circle-notch fa-spin"></i>
			</div>
			<div>
				<p style="font-size: 1rem;">No text detected yet, does this page have text?</p>
			</div>`);
	$('#error-message').show();
	$('#error-message').delay(500).animate({ 'opacity': '1' }, 500);

	waitUntil(

		function () {

			var settingsStore = new SettingsStore();
			console.log('initializing settings store...');
			settingsStore.isInitialized.then(function () {

				console.log('settings store initialized.');
				state.settingsStore = settingsStore;

				// init

				// alert('actual init');
				inits += 1;

				// set timer to check on time it takes to process the text
				const maxLoadTime = 15000;
				let elapsedTime = 0;
				const intervalLength = 100;
				let loadingTimer = setInterval(function () {
					elapsedTime += intervalLength;
					if (elapsedTime > maxLoadTime) {
						showLoadingError("Text processing timed out");
						clearInterval(loadingTimer);
					}
				}, intervalLength);

				// console.log('selectedText: ', selectedText); // TODO: comment this out before release to save memory
				console.log('selectedText length:', selectedText.length);

				// pre-process text: fix badly formatted HTML that was left over, add spaces where needed, etc.
				if (!keepRaw) {
					selectedText = _preProcessSelectedText(selectedText);
					// console.log('preprocessed selectedText', selectedText);
				} else {
					selectedText = _preProcessSelectedText(selectedText, raw = true);
					// console.log('preprocessed RAW selectedText', selectedText);
				}
				// implement sanitizing regexes
				preSanitizedSelectedText = selectedText.slice();
				getSanitizationRuleSettings(initial = true);
				selectedText = _sanitizeSelectedText(preSanitizedSelectedText);

				// split text
				nonChunkedSplitText = _splitSelectedText(selectedText);
				// console.log('nonChunkedSplitText', nonChunkedSplitText);


				// if selectedText is only a few words, log an "error" to track that we probably didn't extract this text correctly
				if (nonChunkedSplitText.length <= 5) {
					pushEvent("error", "selectedText-tokens-too-short", curUrl);
				}

				// console.log('currentDomain:', currentDomain);
				// console.log('curUrl:', currentDomain);
				// process styling, but only if it is a website OR epub
				if (
					!keepRaw &&
					(
						(curUrl && curUrl.slice(0, 4) === "http") ||
						(
							currentDomain.includes("epub_reader") && currentDomain.includes("extension://")
						)
					)
				) {
					nonChunkedSplitText = _processNonChunkedSplitTextStyling(nonChunkedSplitText);
					// console.log('new nonChunkedSplitText:', nonChunkedSplitText);
				}

				//set max wpm
				maxWpm = 2000;

				// set up page turn buttons, but only on read.amazon
				if (currentDomain && currentDomain.includes(".amazon.")) {
					// console.log('setting up page turn buttons for kindle cloud reader');

					// set up location string
					const kindleLocationString = localStorage.getItem("kindleLocationString");
					// console.log("kindleLocationString:",kindleLocationString);
					$('#controls-message').html(kindleLocationString);

					// handle page turn
					function handlePageTurn(event = null, pageTurnA, direction) {
						if (event) {
							event.preventDefault();
						}

						// console.log('using new page turn handler');

						pageTurnA.parent().html('<i class="fas fa-circle-notch fa-spin"></i>');

						// send message to content script in tab to turn page but handle potential nulls
						if (!currentTabId) {
							pushEvent("error", "failed-kindle-page-turn-event-no-current-tab-id", curUrl);
							console.error("No currentTabId, required to send message to turn Kindle page.");
						}
						if (!spreedTabId) {
							pushEvent("error", "failed-kindle-page-turn-event-no-spreed-window-tab-id", curUrl);
							console.error("No spreedTabId, required to send message to turn Kindle page.");
						}
						if (currentTabId && spreedTabId) {
							// reset selected text
							localStorage.removeItem("selectedText");

							chrome.runtime.sendMessage({ action: "kindlePageTurn", direction: direction, sourceTabId: spreedTabId, tabId: currentTabId }, function (response) {

								if (response) {

									// wait for next extracted content
									let getSelectedText = waitForSelectedText(timeout = 10000);

									getSelectedText.then((selectedText) => {
										// console.log('setting selectedText:', selectedText);
										localStorage.setItem("selectedText", selectedText);
										// reload
										location.reload();
									}, (error) => {
										alert("No next page to turn to in that direction! If you think this is an error, email help@swiftread.com");
									});


								} else {
									// this should never happen, but if it does it's because the extension has been updated/background page changed, but this open window is still referencing an old background page
									pushEvent("error", "failed-kindle-page-turn-event-no-response", spreedTabId ? 'has_spreed_tab_id' : spreedTabId);
									console.error("Error sending message to turn kindle page: ", currentTabId, spreedTabId);
								}

							});

						}

					}


					$("#page-turn-container").show();

					const pageTurnLeft = $("#page-turn-left a");
					pageTurnLeft.on('click', function (event) { handlePageTurn(event, pageTurnLeft, "left"); });

					const pageTurnRight = $("#page-turn-right a");
					pageTurnRight.on('click', function (event) { handlePageTurn(event, pageTurnRight, "right"); });

				}

				// set up page turn buttons, but for PDF reader
				else if (currentDomain && currentDomain.includes("pdf.js")) {
					console.log('setting up page turn buttons for pdf reader');
					console.log(currentDomain);

					// set up location string
					const locationString = localStorage.getItem("pdfLocationString");
					// console.log("locationString:",locationString);
					$('#controls-message').html(locationString);

					function turnPDFReaderPage(forward, iconTag) {
						console.log('turning PDF reader page, forward?', forward);

						// send message to content script in tab to turn page but handle potential nulls
						if (!currentTabId) {
							pushEvent("error", "failed-pdf-page-turn-event-no-current-tab-id", curUrl);
							console.error("No currentTabId, required to send message to turn pdf page.");
						}
						if (!spreedTabId) {
							pushEvent("error", "failed-pdf-page-turn-event-no-spreed-window-tab-id", curUrl);
							console.error("No spreedTabId, required to send message to turn pdf page.");
						}
						if (currentTabId && spreedTabId) {
							chrome.tabs.sendMessage(currentTabId, { action: "pdfPageTurn", forward: forward, sourceTabId: spreedTabId }, function (response) {
								// console.log('received response:', response);
								if (response) {
									if (response.success === true) {
										// don't do anything if success, because spreed will reload
										console.log('page turned, waiting for reload...');
									} else if (response.success === false && response.status === 'no-next-page') {
										console.log('no next page to turn to');

										// reset the icon
										if (forward) iconTag.attr('class', 'fas fa-chevron-right');
										else iconTag.attr('class', 'fas fa-chevron-left');

										alert('No more pages to turn to. If you think this is an error, email help@swiftread.com');

									}
									else {
										// TODO: handle user error with pdf page turn
										pushEvent("error", "failed-pdf-page-turn-event-response-not-successful", spreedTabId ? 'has_spreed_tab_id' : spreedTabId);
										console.error("Did not extract any text after turning page.");
									}
								} else {
									// this should never happen, but if it does it's because the extension has been updated/background page changed, but this open window is still referencing an old background page
									pushEvent("error", "failed-pdf-page-turn-event-no-response", spreedTabId ? 'has_spreed_tab_id' : spreedTabId);
									console.error("Error sending message to turn pdf page: ", currentTabId, spreedTabId);
								}

							});
						}

					}
					function handleTurnPDFReaderPage(event, forward = true) {
						event.preventDefault();
						const iconTag = $(event.target).parents('div').first().find('i');
						iconTag.attr('class', 'fas fa-circle-notch fa-spin');
						turnPDFReaderPage(forward, iconTag);
					}

					$("#page-turn-container").show();
					const pageTurnLeft = $("#page-turn-left a");
					pageTurnLeft.on('click', function (event) {
						handleTurnPDFReaderPage(event, forward = false);
					});

					const pageTurnRight = $("#page-turn-right a");
					pageTurnRight.on('click', function (event) {
						handleTurnPDFReaderPage(event);
					});
				}

				// set up page turn buttons, but for epub reader
				else if (currentDomain && currentDomain.includes("epub_reader") && currentDomain.includes("extension://")) {
					// console.log('setting up page turn buttons for epub reader');
					// console.log(currentDomain);

					// set up location string
					const locationString = localStorage.getItem("ePubLocationString");
					// console.log("locationString:",locationString);

					$('#controls-message').html(locationString);

					function turnePubReaderPage(forward, iconTag) {
						console.log('turning ePub reader page, forward?', forward);

						// send message to content script in tab to turn page but handle potential nulls
						if (!currentTabId) {
							pushEvent("error", "failed-ePub-page-turn-event-no-current-tab-id", curUrl);
							console.error("No currentTabId, required to send message to turn ePub page.");
						}
						if (!spreedTabId) {
							pushEvent("error", "failed-ePub-page-turn-event-no-spreed-window-tab-id", curUrl);
							console.error("No spreedTabId, required to send message to turn ePub page.");
						}
						if (currentTabId && spreedTabId) {
							chrome.tabs.sendMessage(currentTabId, { action: "ePubPageTurn", forward: forward, sourceTabId: spreedTabId }, function (response) {
								// console.log('received response:', response);
								if (response) {
									if (response.success === true) {
										// don't do anything if success, because spreed will reload
										console.log('page turned, waiting for reload...');
									} else if (response.success === false && response.status === 'no-next-page') {
										console.log('no next page to turn to');

										// reset the icon
										if (forward) iconTag.attr('class', 'fas fa-chevron-right');
										else iconTag.attr('class', 'fas fa-chevron-left');

										alert('No more pages to turn to. If you think this is an error, email help@swiftread.com');

									}
									else {
										// TODO: handle user error with epub page turn
										pushEvent("error", "failed-epub-page-turn-event-response-not-successful", spreedTabId ? 'has_spreed_tab_id' : spreedTabId);
										console.error("Did not extract any text after turning page.");
									}
								} else {
									// this should never happen, but if it does it's because the extension has been updated/background page changed, but this open window is still referencing an old background page
									pushEvent("error", "failed-epub-page-turn-event-no-response", spreedTabId ? 'has_spreed_tab_id' : spreedTabId);
									console.error("Error sending message to turn epub page: ", currentTabId, spreedTabId);
								}

							});
						}

					}
					function handleTurnePubPage(event, forward = true) {
						event.preventDefault();
						const iconTag = $(event.target).parents('div').first().find('i');
						iconTag.attr('class', 'fas fa-circle-notch fa-spin');
						turnePubReaderPage(forward, iconTag);
					}

					$("#page-turn-container").show();
					const pageTurnLeft = $("#page-turn-left a");
					pageTurnLeft.on('click', function (event) {
						handleTurnePubPage(event, forward = false);
					});

					const pageTurnRight = $("#page-turn-right a");
					pageTurnRight.on('click', function (event) {
						handleTurnePubPage(event);
					});
				}

				else if (currentDomain && currentDomain.includes("docs.google.")) {
					// console.log('setting up page turn buttons for google docs');

					// set up location string
					const gdocsLocationString = localStorage.getItem("gdocsLocationString");
					// console.log("gdocsLocationString:",gdocsLocationString);
					$('#controls-message').html(gdocsLocationString);

					// handle page turn
					function handlePageTurn(event = null, pageTurnA, direction) {
						if (event) {
							event.preventDefault();
						}

						// console.log('using new page turn handler');
						const oldPageTurnHTML = pageTurnA.parent().html();
						const oldPageTurnParent = pageTurnA.parent();
						// console.log('oldPageTurnParent:', oldPageTurnParent);
						// console.log('oldPageTurnHTML:', oldPageTurnHTML);
						pageTurnA.parent().html('<i class="fas fa-circle-notch fa-spin"></i>');

						// send message to content script in tab to turn page but handle potential nulls
						if (!currentTabId) {
							pushEvent("error", "failed-gdocs-page-turn-event-no-current-tab-id", curUrl);
							console.error("No currentTabId, required to send message to turn gdocs page.");
						}
						if (!spreedTabId) {
							pushEvent("error", "failed-gdocs-page-turn-event-no-spreed-window-tab-id", curUrl);
							console.error("No spreedTabId, required to send message to turn gdocs page.");
						}
						if (currentTabId && spreedTabId) {
							// reset selected text
							localStorage.removeItem("selectedText");

							chrome.runtime.sendMessage({ action: "gdocsPageTurn", direction: direction, sourceTabId: spreedTabId, tabId: currentTabId }, function (response) {

								if (response) {

									// wait for next extracted content
									let getSelectedText = waitForSelectedText(timeout = 15000);

									getSelectedText.then((selectedText) => {
										// console.log('setting selectedText:', selectedText);
										localStorage.setItem("selectedText", selectedText);
										// reload
										location.reload();
									}, (error) => {
										alert("No next page to turn to in that direction! If you think this is an error, email help@swiftread.com");
									});


								} else {
									// this should never happen, but if it does it's because the extension has been updated/background page changed, but this open window is still referencing an old background page
									pushEvent("error", "failed-gdocs-page-turn-event-no-response", spreedTabId ? 'has_spreed_tab_id' : spreedTabId);
									console.error("Error sending message to turn gdocs page: ", currentTabId, spreedTabId);
								}

							});
						}

					}


					$("#page-turn-container").show();

					const pageTurnLeft = $("#page-turn-left a");
					pageTurnLeft.on('click', function (event) { handlePageTurn(event, pageTurnLeft, "left"); });

					const pageTurnRight = $("#page-turn-right a");
					pageTurnRight.on('click', function (event) { handlePageTurn(event, pageTurnRight, "right"); });

				}

				else if (!currentDomain) {
					// currentDomain is empty
					// TODO: this fires a bunch, curUrl is null/empty. is this a problem?
					// update: *curUrl* should rarely be empty after some refactoring, but currentDomain may still be null...
					pushEvent("error", "currentDomain-is-null", currentDomain);
				}

				// get user settings
				// forceUpdate the user: talk to server, query database, get any new pro features
				unlockProFeatures(forceUpdate = true);

				//assign hotkeys
				reloadAppHotkeys();

				// micropauses
				getMicropauseSettings();
				// wpm interval
				getWPMInterval();
				// auto page turn settings
				getAutoPageTurnSettings();
				// focus indicator
				getFocusLetterIndicatorSettings(initial = true);

				// reading start timer
				getTimerDelay();

				//font size
				fontSize = 60; //in pixels
				fontSize = parseInt(_localStorageSetdefault("font-size", fontSize));

				fontSizeDiv = document.getElementById('font-size');
				fontSizeDiv.innerHTML = fontSize;
				// colors and font
				updateCustomStyleElements();
				if (highlightMode === true) {
					$('#word-container').addClass('highlight');
				}

				//wpm
				wpm = 400;
				wpm = parseInt(_localStorageSetdefault("speed", wpm));
				if (!wpm || wpm <= 0) {
					wpm = 400;
					// TODO: insert error logging?
				}

				wpmDiv = document.getElementById('wpm');
				wpmDiv.innerHTML = wpm;

				//console.log(wpmDiv.innerHTML);



				// text scroller
				getTextScrollerStatusDisplay();

				// get controls message (e.g. to upgrade)
				getControlsMessage();


				//count days
				//do it locally
				today = new Date();
				prevDate = localStorage.getItem("prevDate");
				dayCount = localStorage.getItem("dayCount");
				if (prevDate == null && dayCount == null) {
					//console.log('setting defaults');
					prevDate = today.toString();
					dayCount = 0;
				}

				today = today.toString();
				//console.log('today: '+today+', prevDate: '+prevDate);
				//console.log('today: '+Date.parse(today)+', prevDate: '+Date.parse(prevDate));

				diff = dateDiffInDays(Date.parse(prevDate), Date.parse(today));
				//console.log('diff: '+diff);
				dayCount = parseInt(dayCount) + diff;
				localStorage.setItem("dayCount", dayCount);
				localStorage.setItem("prevDate", today);
				//console.log(dayCount);



				//do it using chrome storage sync
				/*
				chrome.storage.sync.get(['dayCount','prevDate'], function(items) {

					//console.log(items);
					today = new Date();
					today = today.toString()

					if (_dictIsEmpty(items)) {
						//if doesn't exist, set to default
						console.log('empty. setting defaults.');

						prevDate = today;
						dayCount = 0;

					}
					else {
						prevDate = items['prevDate'];
						dayCount = items['dayCount'];
					}
					diff = dateDiffInDays(Date.parse(prevDate), Date.parse(today));
					//console.log('diff: '+diff);
					dayCount = parseInt(dayCount) + diff;
					_setStorage({'dayCount':dayCount});
					_setStorage({'prevDate':today});
					//console.log(dayCount);
				});
				*/




				//chunkSize = 1; //default, set by language
				//because so much logic depends on chunk size, can't sync/callback logic screwy
				if (localStorage.getItem("chunkSize") > 0) {
					chunkSize = localStorage.getItem("chunkSize");
				}

				chunkSize = parseInt(chunkSize);
				chunkSizeDiv = document.getElementById('chunk-size');
				chunkSizeDiv.innerHTML = chunkSize;


				// console.log('non chunked splitText: ', nonChunkedSplitText);
				splitText = nonChunkedSplitText;

				//group words depending on chunk size
				splitText = groupWords(splitText, chunkSize);
				// console.log('grouped splitText: ', splitText);
				// console.log('grouped splitTextIndexes: ', splitTextIndexes);

				// save "raw" split text without any html tags and nbsp
				rawSplitText = splitText.map(x => {
					x = x.replace(/<([^>]+)>\s*/ig, "");
					x = x.replace("&nbsp;", "");
					x = x.replace("&gt;", "");
					x = x.replace("&lt;", "");
					return x;
				});
				// console.log('rawSplitText:',rawSplitText);

				// process words: find the middle letter and highlight
				// TODO: improve this so that it ignores tags and any other "special" characters elegantly
				splitText = splitText.map(processWord);
				// console.log('final splitText: ', splitText);


				// set first word
				// if we just opened this window, start from beginning
				if (!currentFirstTokenIndex) {
					wordIndex = 0;
					setCurrentFirstTokenIndex();
				}
				else {
					// get the wordIndex that has the pre-existing currentFirstTokenIndex
					let chunkIndex;
					const targetSplitTextIndex = splitTextIndexes.filter((indexChunk, index) => {
						const chunkHasIndex = (indexChunk.indexOf(currentFirstTokenIndex) >= 0);
						if (chunkHasIndex) {
							chunkIndex = index;
							return true;
						} else { return false; }
					});
					// should ever only be one "targetSplitTextIndex"
					if (targetSplitTextIndex && chunkIndex && targetSplitTextIndex.length === 1) {
						// console.log('targetSplitTextIndex: ', targetSplitTextIndex);
						// console.log('chunkIndex: ', chunkIndex);

						wordIndex = chunkIndex;
					} else {
						if (!targetSplitTextIndex) {
							console.error('.filter returned null/undefined when looking for chunk with current token index');
							pushEvent('error', 'filter-returned-null-for-chunk-with-current-token');
						} else {
							console.error('more than one chunk found when looking for chunk with current token index');
							pushEvent('error', 'more-then-one-found-for-chunk-with-current-token', targetSplitTextIndex.length);
						}
					}

				}

				wordDiv = document.getElementById('word');


				//estimated time
				//if less than 1 min, < 1
				updateTimeEstimate();



				pauseButton = document.getElementById('pause');
				pauseButton.style.display = 'none';

				rewindButton = document.getElementById('rewind');
				replayButton = document.getElementById('replay');
				forwardButton = document.getElementById('forward');

				//add play/pause button listeners
				playButton = document.getElementById('play');
				playButton.addEventListener("click", play, false);


				pauseButton.addEventListener("click", pause, false);
				rewindButton.addEventListener("click", rewind, false);
				replayButton.addEventListener("click", replay, false);
				forwardButton.addEventListener("click", forward, false);
				document.getElementById('fullscreen').addEventListener("click", toggleFullScreen, false);
				document.addEventListener("fullscreenchange", function () {
					if (document.fullscreenElement === null) {
						document.getElementById('fullscreen').innerHTML = '<i class="fas fa-expand"></i>';
					}
				});

				//add increase/decrease listeners
				document.getElementById('increase-wpm').addEventListener("click", increaseWPM, false);
				document.getElementById('decrease-wpm').addEventListener("click", decreaseWPM, false);


				document.getElementById('increase-font-size').addEventListener("click", increaseFontSize, false);
				document.getElementById('decrease-font-size').addEventListener("click", decreaseFontSize, false);

				document.getElementById('increase-chunk-size').addEventListener("click", increaseChunkSize, false);
				document.getElementById('decrease-chunk-size').addEventListener("click", decreaseChunkSize, false);

				//document.getElementById('small-donate-link').addEventListener("click",donateClick,false);
				//document.getElementById('small-review-link').addEventListener("click",reviewClick,false);


				document.getElementById('statistics-open').addEventListener("click", function () {
					pushEvent("spreed-app-control", "click-statistics");
					openStatistics('statistics_control');
				}, false);

				// add mouse-in listeners to show/hide controls
				addMouseListenersToToggleControls();


				// update wpm multiplier, depending on word chunk size
				updateWPMMultiplier();

				//put focus on the play button
				playButton.focus();

				// set up context
				updateContextDisplayStyle(initial = true);
				setUpContextDisplay();

				// set first word
				// hiding the word containers is needed on first read, otherwise non-styled words flash
				wordDiv.style.display = "none";

				wordDiv.innerHTML = splitText[wordIndex];
				waitUntil(
					function () {

						setUpContextDisplay(); // need this right before positionWord, essentially
						positionWord();

					},
					function () {
						// the code that tests here... (return true if test passes; false otherwise)
						return !!(wordDiv.innerHTML !== '');
					},
					10 // amount to wait between checks
				)();

				// threshold for sharing buttons to appear
				articleShareThreshold = Math.round((splitText.length - 1) * 1);
				//console.log('articleShareThreshold: '+articleShareThreshold);

				// threshold for auto extract next page
				extractNextPageThreshold = Math.round((splitText.length - 1) * 1);

				//slider
				slider = $("#slider");

				slider.slider({
					orientation: "horizontal",
					max: splitText.length - 1,
					min: 0,
					slide: function (event, ui) {
						if (event.originalEvent) {
							//user changed the slider
							wordIndex = ui.value;
							movePacerToWordIndex(wordIndex);

						}
					}
				});

				sliderCheckbox = $('#slider-checkbox');
				showSlider = true; //default
				if (localStorage.getItem("showSlider") != undefined) {
					showSlider = localStorage.getItem("showSlider");
				}

				if (showSlider == "true" || showSlider == true) {
					slider.css("display", "");
					sliderCheckbox.prop('checked', true);

				}
				else {
					slider.css("display", "none");
					sliderCheckbox.prop('checked', false);
				}



				//slider checkbox
				sliderCheckbox.change(function () {
					if (this.checked) {
						//show progress slider
						slider.css("display", "");

					}
					else {
						//hide progress slider
						slider.css("display", "none");
					}
					localStorage.setItem("showSlider", this.checked);
					afterClick();

				});


				// add help popup div (after hotkeys have been loaded)
				addHelpDiv();
				// open quick tips (after hotkeys have been loaded)
				openQuickTips();




				// track app open
				loadManifest((response) => {
					// Parse JSON string into object
					let manifestJson = JSON.parse(response);
					// track open event
					let proString = 'free';
					if (getUserLicense() !== null) {
						proString = 'pro';
					}
					pushEvent('version-on-app-page-view', manifestJson.version, proString);
				});


				// done loading, clear the timer and hide loading
				clearInterval(loadingTimer);
				hideLoading();

				// start auto-read timer
				waitUntil(
					//wait unti the popup has closed, if it opened on startup
					function () {
						// the code you want to run here...
						if (inits == 1) {
							$(document).bind('keydown.space', 'space', bindPlay);

							if (timerDelay !== null) {

								playButton.style.display = 'none';
								// start the auto-read timer
								startTimer(timerDelay);
							}

						} else {
							$(document).unbind('keydown.space', bindPlay);
							$(document).bind('keydown.space', 'space', bindPlay);
						}
					},
					function () {
						// the code that tests here... (return true if test passes; false otherwise)
						return !!(popupClosed == 1);
					},
					50 // amount to wait between checks
				)();




			});

		},
		function (interval) {
			// the code that tests here... (return true if test passes; false otherwise)

			timeElapsed += checkInterval;

			// if too much time has elapsed
			if (timeElapsed >= 30000) {
				showLoadingError("Timed out while waiting for extracted text from page");

				clearInterval(interval);

			}

			// if there is text, return true if it's not empty and run the "waitUntil" function
			if (
				localStorage.getItem("selectedText") != ""
				&& localStorage.getItem("selectedText") != null
			) {
				//console.log('there was selectedText');
				//console.log(localStorage.getItem("selectedText"));

				selectedText = localStorage.getItem("selectedText");
				// console.log('selectedText from storage:',selectedText);
				keepRaw = localStorage.getItem("keepRaw") === 'true' ? true : false;

				//console.log('calling init');

				return !isEmpty(selectedText);

			} else if (currentDomain.includes('extension://') && currentDomain.includes('pdf.js')) {
				// skip empty selectedText check if on pdf reader
				selectedText = " ";
				return true;
			} else {
				return false;
			}

		},
		checkInterval // amount of time to wait between checks
	)();

}

function showLoadingError(errorMsg) {
	$('#error-message').html(`
		<div><i style='color: #ffc837; font-size: 2rem;' class='fas fa-exclamation-triangle'></i></div>
		<div><p style='color: #ffc837;'>SwiftRead had trouble extracting text on this page, make sure the page actually has text on it. Error message: ${errorMsg}. Please reach out to <a href='mailto:help@swiftread.com' target='_blank'>help@swiftread.com</a> with this error and the URL of the page.</p></div>`);
	$('#error-message').css('top', '150px');
	$('#error-message').css('font-size', '16px');
	$('#error-message').css('font-weight', '700');
	$('#error-message').show();

	pushEvent("error", "no-selectedText-timeout", curUrl ? curUrl : 'null_curUrl');
}
function hideLoading() {

	$('#error-message').html();
	$('#error-message').hide();
}



function _removeEmpty(splitText) {
	var newSplitText = new Array();

	for (var i = 0; i < splitText.length; i = i + 1) {
		token = splitText[i];
		if (!isEmpty(token)) {
			newSplitText.push(token);
		}
	}
	return newSplitText;
}

var waitUntil = function (fn, condition, interval) {
	interval = interval || 100;

	var shell = function () {
		var timer = setInterval(
			function () {
				var check;

				try { check = !!(condition(timer)); } catch (e) { check = false; }

				if (check) {
					clearInterval(timer);
					delete timer;
					fn();
				}
			},
			interval
		);
	};

	return shell;
};




function startTimer(delay) {

	//console.log('startTimer: '+delay);
	$('#word-container-timer').css('width', (delay * 100) + 'px');
	timerBorderWidth = (delay * 100);

	timerCountdown = setInterval(function () { countdown(); }, 1000);

	timerTimeout = setTimeout(function () {
		clearInterval(timerCountdown);
		play();
	}, (delay * 1000));

}

function countdown() {
	//decrease width of
	timerBorderWidth -= 100;
	$('#word-container-timer').css('width', timerBorderWidth + 'px');
}



function getMatchBounds(match) {
	return { match: match[0], length: match[0].length, index: match.index, indexEnd: match.index + match[0].length - 1 };
}
function processWord(word) {
	// console.log('---');
	// console.log('word:',word);

	// determine highlight center and add span
	var divisor = 2;
	let charOffset = 0;
	// console.log('language:', language);
	if (language === 0 || language === 1) {
		// if language is english or chinese/japanese
		divisor = 2;
		// if english, add a 1 character offset too
		if (language === 0) charOffset = 1;
	} else {
		divisor = 2.5;
	}

	// create temp element with word only, no styles
	let tmp = document.createElement("DIV");
	tmp.innerHTML = word;
	let wordContent = tmp.textContent || tmp.innerText || "";
	// console.log('wordContent:',wordContent);
	// find center based on real word
	var center = Math.max(Math.round(wordContent.length / divisor - 1) - charOffset, 0);


	// reconstruct "word"/chunk with center highlighted]
	// split on every character
	var letters = word.split('');

	// get all special character positions
	let specialTokenMatches = [];

	const tagMatches = [...word.matchAll(tagR)].map(getMatchBounds);
	// console.log('tagMatches:',tagMatches);
	specialTokenMatches = specialTokenMatches.concat(tagMatches);

	const ltgtMatches = [...word.matchAll(/\&[l|g]t\;/gi)].map(getMatchBounds);
	// console.log('ltgtMatches:', ltgtMatches);
	specialTokenMatches = specialTokenMatches.concat(ltgtMatches);

	const nbspMatches = [...word.matchAll(/\&nbsp\;/gi)].map(getMatchBounds);
	// console.log('nbspMatches:', nbspMatches);
	specialTokenMatches = specialTokenMatches.concat(nbspMatches);

	const whitespaceMatches = [...word.matchAll(/\s/gi)].map(getMatchBounds);
	// console.log('whitespaceMatches:', whitespaceMatches);
	specialTokenMatches = specialTokenMatches.concat(whitespaceMatches);

	// console.log('specialTokenMatches:', specialTokenMatches);

	// iterate through every letter in the entire styled chunk, finding the center of the "real" word
	// and ignoring any special tokens

	let idxCount = 0;
	let newWord = [];
	for (let i = 0; i < letters.length; i++) {
		const letter = letters[i];

		const curMatches = specialTokenMatches.filter(x => (i >= x.index && i <= x.indexEnd));
		// console.log('curMatches:', curMatches);

		if (curMatches.length === 0) {
			// if this letter isn't inside a special token
			if (idxCount === center) {
				newWord.push('<span class="highlight">' + letter + '</span>');
			} else {
				newWord.push(letter);
			}
			idxCount += 1;
		} else {
			newWord.push(letter);
		}
	}

	return newWord.join('');


}

function positionWord() {
	//var wordEl = $('#word').get();
	// console.log('position word');

	var wordEl = $('#context-container #context').get(0); // instead, use context
	// console.log('#word:',wordEl);

	var readerEl = document.getElementById('word-container');

	// horizontally position (center on highlight) context
	const contextContainer = $('#context-container').get(0);
	const contextCurrent = document.getElementById('context');

	// contextContainer.style.backgroundColor = 'purple';
	let activeHighlight = $(contextCurrent).find('.active .highlight').get(0);
	if (typeof (activeHighlight) === 'undefined') {
		activeHighlight = $(contextCurrent).find('.active').get(0);
	}
	// activeHighlight.style.backgroundColor = 'green';

	// reposition top of active word
	const halfWordHeight = activeHighlight.getBoundingClientRect().height / 2;
	// console.log('readerEl:', readerEl);
	const readerY = readerEl.getBoundingClientRect().y;
	// console.log('readerY:', readerY);
	const readerHeight = readerEl.getBoundingClientRect().height;
	// console.log('readerHeight:', readerHeight);

	var centerOffsetY = halfWordHeight + activeHighlight.offsetTop;
	const newWordTop = ((readerEl.clientHeight / 2) - centerOffsetY);
	wordEl.style.top = newWordTop + "px";

	$(wordEl).offset({
		top: readerY + readerHeight / 2 - halfWordHeight
	});
	// console.log('new word top:', newWordTop);

	// reposition left of context line
	const highlightOffset = activeHighlight.offsetLeft + (activeHighlight.offsetWidth / 2);
	// console.log('highlightOffset:',highlightOffset);
	const halfReaderWidth = readerEl.getBoundingClientRect().width / 2;
	let leftOffset = (
		((readerEl.offsetWidth / 2) - highlightOffset)
	);
	if (contextFromRightEnabled === true) {
		leftOffset = leftOffset - activeWordOffsetFromCenterPctOfHalfWidth * halfReaderWidth;
	}

	// console.log('leftOffset:',leftOffset);
	wordEl.style.left = leftOffset + 'px';
	// console.log('word style top:', wordEl.style.top); // after going to single line context, this looks fine
	// console.log('word y:', wordEl.getBoundingClientRect().y); // after going to single line context, this looks highly negative...

	// highlight
	highlightCenterVisualOnly();


	//update slider
	slider.slider('value', wordIndex);

	// update time estimate
	updateTimeEstimate();

	// FOCUS INDICATORS
	// reposition focus indicators
	// vertically position guides
	const focusIndicatorHeight = focusLetterIndicatorEnabled === true ? 50 : 25;
	const topFocusIndicator = document.getElementById('top-focus-indicator');
	const bottomFocusIndicator = document.getElementById('bottom-focus-indicator');
	if (focusLetterIndicatorEnabled === true) {
		topFocusIndicator.style.display = 'block';
		bottomFocusIndicator.style.display = 'block';
		// console.log('enabling focus letter...');
	} else {
		topFocusIndicator.style.display = 'none';
		bottomFocusIndicator.style.display = 'none';
		// console.log('hiding focus letter...');
	}

	const topFocusIndicatorY = contextCurrent.getBoundingClientRect().y - topFocusIndicator.getBoundingClientRect().height - focusIndicatorHeight / 2;
	$(topFocusIndicator).offset({
		top: topFocusIndicatorY
	});

	const bottomFocusIndicatorY = contextCurrent.getBoundingClientRect().y + contextCurrent.getBoundingClientRect().height + focusIndicatorHeight / 2;
	$(bottomFocusIndicator).offset({
		top: bottomFocusIndicatorY
	});
	// horizontally position indicator
	const highlightedLetterWidth = activeHighlight.getBoundingClientRect().width;
	const highlightedLetterX = activeHighlight.getBoundingClientRect().x;
	$(topFocusIndicator).find('.focus-indicator-mark').offset({
		left: highlightedLetterX + (highlightedLetterWidth / 2)
	});
	$(bottomFocusIndicator).find('.focus-indicator-mark').offset({
		left: highlightedLetterX + (highlightedLetterWidth / 2)
	});


	// MULTILINE CONTEXT FUNCTIONALITY
	// detect which words in context line are on/off the wordContainer
	// console.log('readerEl:', readerEl.getBoundingClientRect());
	const contextLineStartWords = Array.from(document.getElementById('context-line-start').querySelectorAll('.context-word'));
	// console.log('contextLineStartWords:', contextLineStartWords);
	const contextLineEndWords = Array.from(document.getElementById('context-line-end').querySelectorAll('.context-word'));
	// console.log('contextLineEndWords:', contextLineEndWords);

	// words fully visible in context start
	const pageTurnButtonBuffer = 30;
	const inlineContextStartWords = contextLineStartWords.map((wordEl) => {
		if (wordEl.getBoundingClientRect().x < readerEl.getBoundingClientRect().x + pageTurnButtonBuffer) {
			return false;
		} else {
			return true;
		}
	});
	// words fully visible in context end
	const inlineContextEndWords = contextLineEndWords.map((wordEl) => {
		const wordElBounds = wordEl.getBoundingClientRect();
		const readerElBounds = readerEl.getBoundingClientRect();
		if (wordElBounds.x + wordElBounds.width > readerElBounds.x + readerElBounds.width - pageTurnButtonBuffer) {
			return false;
		} else {
			return true;
		}
	});
	// turn words in inline context off/on depending on if they're fully visible
	inlineContextStartWords.map((isVisible, i) => {
		if (isVisible === false || contextFromRightEnabled === true) contextLineStartWords[i].style.opacity = 0;
	});
	inlineContextEndWords.map((isVisible, i) => {
		if (isVisible === false) contextLineEndWords[i].style.opacity = 0;
	});
	// move words that aren't visible to pre/post multi line context containers
	function sanitizeWordElForMLContext(wordEl) {
		let outerHTML = wordEl.outerHTML;
		// remove any styles
		outerHTML = outerHTML.replaceAll(/style=".*?"(.*?\>)/g, "$1");
		return outerHTML;
	}
	const preMLContext = document.getElementById('pre-multiline-context-container');
	let preMLContextHTML = contextLineStartWords.filter((_, i) => !inlineContextStartWords[i]).map((wordEl) => {
		return sanitizeWordElForMLContext(wordEl);
	}).join(" ");
	preMLContextHTML = preMLContextHTML.replaceAll(/\<span class=.{1}start p.{1}\>\<\/span\>/g, "<br/><br/>");
	preMLContext.innerHTML = preMLContextHTML;

	const postMLContext = document.getElementById('post-multiline-context-container');
	let postMLContextHTML = contextLineEndWords.filter((_, i) => !inlineContextEndWords[i]).map((wordEl) => {
		return sanitizeWordElForMLContext(wordEl);
	}).join(" ");
	postMLContextHTML = postMLContextHTML.replaceAll(/\<span class=.{1}start p.{1}\>\<\/span\>/g, "<br/><br/>");
	postMLContext.innerHTML = postMLContextHTML;
	// reposition pre/post context containers
	const preMLContextY = contextCurrent.getBoundingClientRect().y - preMLContext.getBoundingClientRect().height - focusIndicatorHeight;
	$(preMLContext).offset({
		top: preMLContextY
	});

	const postMLContextY = contextCurrent.getBoundingClientRect().y + contextCurrent.getBoundingClientRect().height + focusIndicatorHeight;
	$(postMLContext).offset({
		top: postMLContextY
	});

	// set up multi-line context click listeners
	const contextWords = $('.multiline-context .context-word');
	$(contextWords).on('click', function (e) {
		e.preventDefault();
		wordIndex = $(this).data('word-index');
		movePacerToWordIndex(wordIndex);
	});



	// console.log('---');
}

function sanitizeContextArray(words, startWordIndex, endWordIndex) {
	// console.log('words:', words);
	return words.map((word, i) => {
		// remove some breaking tags that surround every word
		word = word.replaceAll(/\<br\/+\>/g, "");
		word = word.replaceAll(/\<\/p\>/g, "");
		word = word.replaceAll(/\<p.*?\>/g, "");

		// remove the extraneous highlight span
		word = word.replaceAll(/\<span class=.{1}highlight.{1}>(.*?)\<\/span\>/g, "$1");
		// add context-word around every word
		word = `<span class='context-word' data-word-index='${i + startWordIndex}'>${word}</span>\n`;
		return word;
	});
}
function setUpContextDisplay() {
	// console.log('current word:', splitText[wordIndex]);

	const contextCurrent = document.getElementById('context');
	const activeChunkString = splitText[wordIndex].replaceAll("<br>", "").replaceAll("<br/>", "");
	// console.log('activeChunkString:',activeChunkString);

	const contextNumWords = 150;
	const contextChunkSize = Math.floor(contextNumWords / chunkSize);
	let preContextString;
	if (wordIndex === 0) {
		preContextString = ""
	}
	else if (wordIndex > 0) {
		const preContextStartIndex = Math.max(0, wordIndex - contextChunkSize - 1);
		const preContextEndIndex = wordIndex;
		preContextString = sanitizeContextArray(
			splitText.slice(preContextStartIndex, preContextEndIndex),
			preContextStartIndex,
			preContextEndIndex
		).join(" ");
		// console.log('preContextString:\n',preContextString);

	}

	let postContextString;
	if (wordIndex < splitText.length - 1) {
		const postContextStartIndex = wordIndex + 1;
		const postContextEndIndex = Math.min(splitText.length - 1, wordIndex + 1 + contextChunkSize);
		postContextString = sanitizeContextArray(
			splitText.slice(postContextStartIndex, postContextEndIndex),
			postContextStartIndex,
			postContextEndIndex
		).join(" ");
		// console.log('postContextString:\n',postContextString);

	} else {
		postContextString = "";
	}

	// construct context string
	const fullContextString = `<span class="context" id="context-line-start">${preContextString}</span><span class="active">${activeChunkString}</span><span class="context" id="context-line-end">${postContextString}</span>`;
	// console.log('fullContextString:',fullContextString);
	contextCurrent.innerHTML = fullContextString;


	// hide context if supposed to be hidden
	if (contextDisplayStyle === "never") {
		$('.context, .multiline-context').css('display', 'none');
	} else {
		if (enableMultilineContext === true) {
			$('.context').css('display', 'inline-block');
			$('.multiline-context').css('display', 'inline-block');
		} else {
			$('.context').css('display', 'inline-block');
			$('.multiline-context').css('display', 'none');
		}

		if (contextDisplayStyle === "on-pause" && hide > 0) {
			$('.context, .multiline-context').css('opacity', 0);
		}
	}

	// // debug
	// setTimeout(() => {
	// 	// turns out i need to wait a little, DOM hasn't finished propogating position changes...
	// 	let readerEl = document.getElementById('word-container');
	// 	let wordEl = $('#context-container #context').get(0);
	// 	console.log('in setUpContextDisplay:')
	// 	console.log('readerEl y:', readerEl.getBoundingClientRect().y);
	// 	console.log('wordEl y:', wordEl.getBoundingClientRect().y);

	// 	console.log('---');
	// }, 1000);

}


function updateTimeEstimate() {
	timeEstimate = (rawSplitText.length - (wordIndex + 1)) / (wpm);
	// console.log("time estimate: ", timeEstimate, rawSplitText.length, (wordIndex + 1));
	timeEstimate = Math.round(timeEstimate * 10) / 10;
	// console.log("rounded: ", timeEstimate);

	if (timeEstimate < 1 && timeEstimate > 0)
		timeString = "< 1";
	else if (timeEstimate <= 0)
		timeString = "0";
	else
		timeString = Math.round(timeEstimate).toString();

	$('#time-estimate').html(timeString + " min");
}

function updateWPMMultiplier() {
	if (chunkSize > 1) {
		wpmDiv = document.getElementById('wpm');
		wpmDiv.innerHTML = wpm + "&#8202;&#215;&#8202;" + chunkSize;
	}
}

function isEmpty(str) {
	return (!str || 0 === str.length);
}


function replay() {
	movePacer(-2);
}
function forward() {
	movePacer(2);
}
function movePacer(seconds) {

	rewindAmount = Math.floor((wpm / 60 / chunkSize) * seconds);
	wordIndex += rewindAmount;
	if (wordIndex < 0) {
		wordIndex = 0;
		setCurrentFirstTokenIndex();
	}
	//console.log('rewinding '+rewindAmount);

	//display word
	wordDiv.innerHTML = splitText[wordIndex];
	setUpContextDisplay();

	waitUntil(
		function () {
			// the code you want to run here...
			positionWord();
		},
		function () {
			// the code that tests here... (return true if test passes; false otherwise)
			return !!(wordDiv.innerHTML !== '');
		},
		50 // amount to wait between checks
	)();

	afterClick();
}
function movePacerToWordIndex(wordIndex) {
	setCurrentFirstTokenIndex();
	wordDiv.innerHTML = splitText[wordIndex];
	setUpContextDisplay();

	waitUntil(
		function () {
			// the code you want to run here...
			positionWord();
		},
		function () {
			// the code that tests here... (return true if test passes; false otherwise)
			return !!(wordDiv.innerHTML !== '');
		},
		50 // amount to wait between checks
	)();

}

function rewind() {
	//stop reading timer
	clearInterval(readingTimer);
	state.isPlaying = false;
	currentTimeSpent = 0;

	clearInterval(wordTimer);
	playButton.style.display = '';

	pauseButton.style.display = 'none';


	$(document).unbind('keydown.space', bindPlay);

	showControls();

	wordIndex = 0;
	setCurrentFirstTokenIndex();

	init();
}

function play() {
	// // timing helper //
	// lastFunctionExecTime = null;

	resetCongrats();

	// hide controls
	hideControls();

	//start reading timer
	readingTimer = setInterval(function () { incrementReadingTimer() }, 1000);
	state.isPlaying = true;


	clearInterval(timerCountdown);
	clearTimeout(timerTimeout);
	$('#word-container-timer').css("width", "0px");

	delay = 1 / (wpm / 60) * 1000 - FUNCTION_EXECUTION_DISCOUNT_MS;

	wordTimer = setInterval(function () {
		nextWord();
	}, delay);

	//disable play, enable pause
	playButton.style.display = 'none';
	$(document).unbind('keydown.space', bindPlay);

	pauseButton.style.display = '';
	$(document).bind('keydown.space', 'space', bindPause);


}

function openStatistics(campaign) {
	chrome.tabs.create({ url: "statistics.html?utm_source=extension&utm_medium=internal&utm_campaign=" + campaign });
	setTimeout(function () {
		close();

	}, 200);

}


////STATS////

function incrementReadingTimer() {

	/*
	chrome.storage.sync.get("totalTimeSpent", function(items) {
		if (_dictIsEmpty(items)) {
			//if doesn't exist, set to default
			chrome.storage.sync.set({"totalTimeSpent":0}, function() {});
		}
		else {
			totalTimeSpent = items['totalTimeSpent'];
			totalTimeSpent += 1;
			chrome.storage.sync.set({"totalTimeSpent":totalTimeSpent}, function() {});
			console.log(totalTimeSpent);
		}

	});
	*/

	totalTimeSpent += 1;
	localStorage.setItem("totalTimeSpent", totalTimeSpent);
	//console.log(totalTimeSpent);

	//also keep track of current time spent
	currentTimeSpent += 1;
}

function countWord() {

	/*
	chrome.storage.sync.get("wordCount", function(items) {
		//console.log(items);
		if (_dictIsEmpty(items)) {
			//if doesn't exist, set to default
			chrome.storage.sync.set({"wordCount":0}, function() {});
		}
		else {
			wordCount = items['wordCount'];
			wordCount += 1*chunkSize;
			chrome.storage.sync.set({"wordCount":wordCount}, function() {});
			//console.log(wordCount);
		}

	});
	*/

	wordCount += 1 * chunkSize;
	currenetWordCount += 1 * chunkSize;
	localStorage.setItem("wordCount", wordCount);
	//console.log(wordCount);

}

function syncCountStats() {
	//sync word count and time spent from local vars to google chrome.sync

}

function secondsToString(seconds) {

	var numdays = Math.floor(seconds / 86400);
	var numhours = Math.floor((seconds % 86400) / 3600);
	var numminutes = Math.floor(((seconds % 86400) % 3600) / 60);
	var numseconds = ((seconds % 86400) % 3600) % 60;
	if (numdays > 0) {
		return numdays + " days, " + numhours + " hours, " + numminutes + " minutes, " + numseconds + " seconds";
	} else if (numhours > 0) {
		return numhours + " hours, " + numminutes + " minutes, " + numseconds + " seconds";
	} else {
		return numminutes + " minutes, " + numseconds + " seconds";
	}

}


function resetCongrats() {
	$('#post-reading-status').fadeOut("fast");
	$('#congrats').html("");
}

//// next word
function nextWord(first) {
	// // timing helper //
	// const startAt = Date.now();
	// console.log(startAt, '---start: nextWord function---');
	// if (lastFunctionExecTime !== null) {
	// 	betweenFunctionExecTimes.push(startAt - lastFunctionExecTime);
	// }

	countWord();

	// calculate base delay
	delay = 1 / (wpm / 60) * 1000;

	first = typeof first !== 'undefined' ? first : 0;

	// MOVE ONTO NEXT WORD
	wordIndex = wordIndex + 1;

	if (wordIndex >= splitText.length) {
		//WE'RE DONE READING

		//reset (old)
		//clearInterval(wordTimer);
		//enable play, disable pause
		//playButton.style.display = '';
		//pauseButton.style.display = 'none';


		pause();
		wordIndex = -1;

		//show congratulations div after we're done reading
		var existingCongrats = $('#congrats').html();
		var congratsMessage = generateRandomCongrats();
		existingCongrats += congratsMessage + " You just read " + String(currenetWordCount) + " words in " + String(secondsToString(currentTimeSpent)) + "! <br><br><u>Enjoying SwiftRead? Write us a review!</u>";
		$('#congrats').css('cursor', 'pointer');
		$('#congrats').on('click', function (e) {
			chrome.tabs.create({ url: homepageUrl }, function (tab) {
				chrome.windows.update(tab.windowId, { focused: true });
			});
			pushEvent("spreed-app-link", "post-read-write-review");
		});
		$('#congrats').html(existingCongrats);
		$('#post-reading-status').fadeIn("slow");

		// show social share too
		$('#share-spreed-fb').show("slow");

	}
	else {
		// CONTINUE READING
		//console.log(wordIndex);

		// set the universal index of the first word in this chunk, for state tracking
		setCurrentFirstTokenIndex();

		// START WORD DISPLAY
		// set up context display FIRST
		setUpContextDisplay();

		// get the "raw" word (no html tags), to use later to determine micropuases
		// also next word for the same purpose
		curWordToken = rawSplitText[wordIndex];
		curWordHTML = splitText[wordIndex];
		curChunkTextIndexes = splitTextIndexes[wordIndex];
		if (wordIndex + 1 < rawSplitText.length) {
			nextWordToken = rawSplitText[wordIndex + 1]
			nextWordHTML = splitText[wordIndex + 1];
			nextChunkTextIndexes = splitTextIndexes[wordIndex + 1];
		} else {
			nextWordToken = undefined;
			nextWordHTML = undefined;
			nextChunkTextIndexes = [];
		}

		// console.log('curChunkTextIndexes:',curChunkTextIndexes);
		let curChunkTextArray = curChunkTextIndexes.map((i) => nonChunkedSplitText[i]);
		// console.log('curChunkTextArray:',curChunkTextArray);
		let nextChunkTextArray = nextChunkTextIndexes.map((i) => nonChunkedSplitText[i]);
		var doesNextMatch = function (curChunkArray, nextChunkArray, chunkSize, matchRegex) {
			// if chunk size is 1:
			// check current chunk, if matches but beyond first character, return to pause
			// otherwise, check the next chunk, and if it matches but at the first position, return true to pause on current chunk
			let curChunkText = curChunkArray.join("");
			let nextChunkText = nextChunkArray.join("");
			// console.log('curChunkText:',curChunkText);
			// console.log('nextChunkText:',nextChunkText);
			// console.log('matchRegex:',matchRegex);

			let curChunkMatch = curChunkText.match(matchRegex);
			let nextChunkMatch = nextChunkText.match(matchRegex);
			// console.log('curChunkMatch:',curChunkMatch);
			// console.log('nextChunkMatch:',nextChunkMatch);

			if (curChunkMatch && curChunkMatch.index > 0) {
				// console.log('above matches, returning true');
				return true;
			}
			else if (nextChunkMatch && nextChunkMatch.index === 0) {
				// console.log('above matches, returning true');
				return true;
			}

			return false;
		}

		// #word div gets populated, but isn't shown if context is active
		wordDiv.innerHTML = splitText[wordIndex];
		positionWord();


		// TIMING
		bonus = 0;

		// micropausing is enabled, but check to see if individual micro-pause types are
		enablemicropause = "true";

		if (enablemicropause == "true") {
			// MICRO PAUSING

			//if contains a number
			var numbers_re = /(?:^|\s)(\d*\.?\d+|\d{1,4}(?:,\d{1,4})*(?:\.\d+)?)(?!\S)/g;
			var numbers_matched = curWordToken.match(numbers_re);
			var bonus_factor;
			// console.log(numbers_matched);
			if (numbers_matched && enablemicropauseNumbers === true) {
				numbers_matched = numbers_matched.join("");
				// console.log('match: ', numbers_matched);
				// console.log('----')
				// console.log('numbers matched length: ', numbers_matched.length);
				// console.log('micropauseNumbersFactor: ', micropauseNumbersFactor);
				// pause constant amount for displayed numbers larger than 1000
				bonus_factor = (Math.round((numbers_matched.length - 1) / 3.0) > 0 ? 1 : 0) * micropauseNumbersFactor;
				// console.log('bonus_factor: ', bonus_factor);
				bonus = delay * bonus_factor;
				// console.log('bonus: ',bonus);
				// console.log('delay: ',delay);
			} else {
				if (enablemicropausePunctuation === true) {

					let openParensRegex = /<?.*?>?\(/; // open parens right after any html tags
					let endingPunctuationRegex = /[\.\!\?]/;
					let otherPunctuationRegex = /[\,\;\:\)]/;

					// if not a number but contains ending punctuation
					if (curWordToken.match(endingPunctuationRegex)) {
						bonus_factor = (micropauseEndingPunctuationFactor);
						// console.log('ending punctuation bonus_factor: ', bonus_factor);
						bonus = delay * bonus_factor;
						// console.log('bonus:',bonus);
					}
					// otherwise, if it contains the "other" punctuation
					else if (curWordToken.match(otherPunctuationRegex)) {
						bonus_factor = (micropausePunctuationFactor);
						// console.log('other punctuation bonus_factor: ', bonus_factor);
						bonus = delay * bonus_factor;
						// console.log('bonus:',bonus);
					}
					// otherwise, detect if NEXT word has any symbols that should cause us to pause on the current word
					else if (doesNextMatch(curChunkTextArray, nextChunkTextArray, chunkSize, openParensRegex)) {
						bonus_factor = (micropausePunctuationFactor);
						bonus = delay * bonus_factor;

						// console.log('!!! pausing on this word, because open parens coming');
						// console.log('curChunkTextArray:',curChunkTextArray);
						// console.log('nextChunkTextArray:',nextChunkTextArray);
						// console.log('chunkSize:',chunkSize);
						// console.log('bonus:',bonus);
					}
				}

			}

			//delay longer words that are not numbers: add to any existing delay
			if (curWordToken.length > (8 * chunkSize) && enablemicropauseLongWords === true && numbers_matched === null) {
				bonus_factor = Math.ceil(curWordToken.length / (8 * chunkSize)) * micropauseLongWordsFactor;
				// console.log('bonus_factor: ', bonus_factor);
				bonus = bonus + delay * bonus_factor;

				// bonus = bonus + ((curWordToken.length - (6*chunkSize))/(8*chunkSize) * delay);
			}

			// end of paragraph delay: add to any existing delay
			// console.log('enablemicropauseParagraph:',enablemicropauseParagraph);
			if (enablemicropauseParagraph === true) {
				// check if we should micropause on this word becaue next character is a new paragraph
				// console.log('---');
				// console.log('curChunkTextArray:',curChunkTextArray);
				// console.log('nextChunkTextArray:',nextChunkTextArray);
				// console.log('chunkSize:',chunkSize);
				if (
					doesNextMatch(curChunkTextArray, nextChunkTextArray, chunkSize, /<br\/>/)
					|| doesNextMatch(curChunkTextArray, nextChunkTextArray, chunkSize, /<span class=\'end [p|h]/)

				) {
					// console.log('!!! pausing because new paragraph is about to start.');
					// console.log('curChunkTextArray:',curChunkTextArray);
					// console.log('nextChunkTextArray:',nextChunkTextArray);
					// console.log('chunkSize:',chunkSize);

					bonus_factor = (micropauseParagraphFactor);
					bonus = bonus + delay * bonus_factor;
				}
			}

		}

		// console.log(curWordToken);
		// console.log(curWordToken.length);

		// console.log('delay: ' + delay);
		// console.log('bonus: ' + bonus);

		clearInterval(wordTimer);
		if ((chunkSize * wpm) <= 100) {
			bonus = 0;
		}
		wordTimer = setTimeout(function () {
			nextWord()
		}, (delay + bonus - FUNCTION_EXECUTION_DISCOUNT_MS));

		// see if we should auto-turn to the next page
		if (wordIndex >= extractNextPageThreshold && extractingNextPage === false) {
			extractingNextPage = true;

			if (autoTurnPage === true) {
				// go to the next page
				$("#page-turn-right a").trigger('click');
			}


		}


	}

	//console.log("#container width: "+$("#container").width());
	//console.log("#word-continer width: "+$("#word-container").width());

	// // timing helper //
	// const endAt = Date.now();
	// console.log(endAt, '---end: nextWord function---');
	// functionExecTimes.push(endAt - startAt);
	// lastFunctionExecTime = endAt;
}

function donateClick() {
	//chrome.tabs.create({url:'https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7BDUJ9WFCEPLG'});
	//chrome.tabs.create({ url: homepageUrl });
}
function reviewClick() {
	//chrome.tabs.create({url:'https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7BDUJ9WFCEPLG'});
	chrome.tabs.create({ url: homepageUrl });
}



function pause() {

	//stop reading timer
	clearInterval(readingTimer);
	state.isPlaying = false;

	clearInterval(wordTimer);
	playButton.style.display = '';
	$(document).bind('keydown.space', 'space', bindPlay);

	pauseButton.style.display = 'none';
	$(document).unbind('keydown.space', bindPause);

	showControls();

}

function increaseWPM() {
	// console.log('increasing WPM...');
	let interval = wpmInterval;

	if (wpm + interval <= maxWpm) {

		//console.log("increase");
		wpm = wpm + interval;
		wpmDiv.innerHTML = wpm;

		//_setStorage({"speed": wpm});
		localStorage.setItem("speed", wpm);
	} else {
		console.warn(`wpm not increased to ${(wpm + interval)} from ${wpm}, max wpm is ${maxWpm} and wpm interval is ${interval}`);
	}
	updateWPMMultiplier();
	updateTimeEstimate();
	afterClick();
}

function decreaseWPM() {
	// console.log('decreasing WPM...');
	let interval = wpmInterval;

	if (wpm - interval > 0) {
		wpm = wpm - interval;
		wpmDiv.innerHTML = wpm;

		//_setStorage({"speed": wpm});
		localStorage.setItem("speed", wpm);
	} else {
		console.warn(`wpm not decreased to ${(wpm - interval)} from ${wpm}, wpm must be > 0 and wpm interval is ${interval}`);
	}

	updateWPMMultiplier();
	updateTimeEstimate();
	afterClick();
}

function setFontSize(obj, value) {
	obj.css('font-size', value + "px");
}

function increaseFontSize() {
	if (fontSize + 5 < 455) {
		fontSize = fontSize + 5;
		fontSizeDiv.innerHTML = fontSize;

		updateCustomStyleElements();

		//_setStorage({"font-size":fontSize});
		localStorage.setItem("font-size", fontSize);

	}
	setUpContextDisplay();
	positionWord();
	afterClick();
}

function decreaseFontSize() {
	if (fontSize - 5 >= 5) {
		fontSize = fontSize - 5;
		fontSizeDiv.innerHTML = fontSize;

		updateCustomStyleElements();

		//_setStorage({"font-size":fontSize});
		localStorage.setItem("font-size", fontSize);
	}
	setUpContextDisplay();
	positionWord();
	afterClick();
}

function increaseChunkSize() {
	// console.log('increasing chunk size...');

	if (chunkSize + 1 <= 6) {

		pause();

		chunkSize = chunkSize + 1;
		chunkSizeDiv.innerHTML = chunkSize;
		localStorage.setItem("chunkSize", chunkSize);

		$(document).unbind('keydown.space', bindPlay);
		$(document).bind('keydown.space', bindPause);

		init();

	} else {
		console.log(`WARNING: chunk size not increased to ${chunkSize + 1}, max chunk size is 6`);
	}
	afterClick();
}

function decreaseChunkSize() {
	// console.log('decreasing chunk size...');

	if (chunkSize - 1 >= 1) {
		pause();

		chunkSize = chunkSize - 1;
		chunkSizeDiv.innerHTML = chunkSize;
		localStorage.setItem("chunkSize", chunkSize);

		$(document).unbind('keydown.space', bindPlay);
		$(document).bind('keydown.space', bindPause);

		init();
	} else {
		console.log(`WARNING: chunk size not decreased to ${chunkSize - 1}, min chunk size is 1`);
	}
	afterClick();
}

$.fn.removeClassRegex = function (regex) {
	return $(this).removeClass(function (index, classes) {
		return classes.split(/\s+/).filter(function (c) {
			return regex.test(c);
		}).join(' ');
	});
};






function getHighlightSettings() {
	highlightMode = getSetting(state.settingsStore.SETTING_HIHGLIGHT_ENABLED_KEY) === 'true' ? true : false;
	// console.log('highlightMode:', highlightMode);
	highlightColorUseCustom = getSetting(state.settingsStore.SETTING_HIGHLIGHT_COLOR_USE_CUSTOM_KEY) === 'true' ? true : false;
	// console.log('highlightColorUseCustom:', highlightColorUseCustom);
	if (highlightColorUseCustom === true) {
		// use custom color
		highlightColor = getSetting(state.settingsStore.SETTING_HIHGLIGHT_COLOR_KEY);
	} else {
		// use color scheme color
		const [colorSchemes, colorSchemeName] = returnColorSchemeData();

		// console.log(colorSchemes[colorSchemeName]);
		highlightColor = colorSchemes[colorSchemeName][state.settingsStore.SETTING_COLOR_SCHEME_HIGHLIGHT_COLOR_KEY];
	}
	// console.log('highlightColor:',highlightColor);

}
function highlightCenterVisualOnly() {
	if (highlightMode === true) {
		$('#word .highlight').css({ 'color': highlightColor });
		$('#context .active .highlight').css({ 'color': highlightColor });
	}
	else {
		$('#word .highlight').css({ 'color': '' });
		$('#context .active .highlight').css({ 'color': '' });
	}
}
function highlightCenter() {
	getHighlightSettings();
	highlightCenterVisualOnly();
}

function returnColorSchemeData() {
	const colorSchemes = getSetting(state.settingsStore.SETTING_COLOR_SCHEMES_KEY);
	let colorSchemeName = getSetting(state.settingsStore.SETTING_CURRENT_COLOR_SCHEME_KEY);
	if (typeof (colorSchemes[colorSchemeName]) === 'undefined') {
		// somehow ended up with a non-existent color scheme, so set to default
		colorSchemeName = state.settingsStore.DEFAULT_COLOR_SCHEME;
		state.settingsStore.setSetting(state.settingsStore.SETTING_CURRENT_COLOR_SCHEME_KEY, colorSchemeName);
	}
	return [colorSchemes, colorSchemeName];
}
function returnFontData() {
	const fonts = getSetting(state.settingsStore.SETTING_FONTS_KEY);
	let fontKey = getSetting(state.settingsStore.SETTING_CURRENT_FONT_KEY);
	if (typeof (fonts[fontKey]) === 'undefined') {
		// somehow ended up with a non-existent font name
		fontKey = state.settingsStore.DEFAULT_FONT;
		state.settingsStore.setSetting(state.settingsStore.SETTING_CURRENT_FONT_KEY, fontKey);
	}
	return [fonts, fontKey];
}
function getCustomFontBackgroundSettings() {
	// color scheme colors
	const [colorSchemes, colorSchemeName] = returnColorSchemeData();
	// console.log('setting app color scheme:',colorSchemeName);

	// use custom colors?
	backgroundColorEnabled = getSetting(state.settingsStore.SETTING_BACKGROUND_COLOR_ENABLED_KEY) === 'true' ? true : false;
	fontColorEnabled = getSetting(state.settingsStore.SETTING_FONT_COLOR_ENABLED_KEY) === 'true' ? true : false;

	if (backgroundColorEnabled === true) {
		// custom colors override
		backgroundColor = getSetting(state.settingsStore.SETTING_BACKGROUND_COLOR_KEY);
	} else {
		backgroundColor = colorSchemes[colorSchemeName][state.settingsStore.SETTING_COLOR_SCHEME_BACKGROUND_COLOR_KEY];
	}
	// set it as the preload background color
	localStorage.setItem(PRELOAD_BACKGROUND_COLOR_KEY, backgroundColor);

	if (fontColorEnabled === true) {
		// custom colors override
		fontColor = getSetting(state.settingsStore.SETTING_FONT_COLOR_KEY);
	} else {
		fontColor = colorSchemes[colorSchemeName][state.settingsStore.SETTING_COLOR_SCHEME_FONT_COLOR_KEY];
	}

	// fonts
	const [fonts, fontKey] = returnFontData();
	const fontData = fonts[fontKey];
	font = `${fontData[state.settingsStore.SETTING_FONT_NAME_KEY]}, ${fontData[state.settingsStore.SETTING_FONT_BACKUP_KEY]}`;
	// console.log('setting word font:', font);

	// letter spacing
	letterSpacing = getSetting(state.settingsStore.SETTING_LETTER_SPACING_KEY);

}

function getContextOpacitySetting() {
	contextOpacity = getSetting(state.settingsStore.SETTING_CONTEXT_OPACITY_KEY);
}
function updateCustomStyleElements() {
	// update custom colors
	getCustomFontBackgroundSettings();

	// update center letter highlight
	highlightCenter();

	// get other custom styling settings
	getContextOpacitySetting();

	// console.log('setting custom styles:');
	// console.log(backgroundColor);
	// console.log(fontColor);

	const customStyles = `
	<style id='custom-styles'>
		body {
			${"background: " + backgroundColor + ";"}
			${"color: " + fontColor + ";"}
		}
		body #status .config-group a:hover {
			${"color: " + fontColor + ";"}
		}
		body #status .svg-arrow .svg-path {
			${"fill: " + fontColor + ";"}
		}
		body #slider {
			${"background: " + fontColor + ";"}
		}
		body #slider .ui-slider-handle {
			${"background: " + fontColor + ";"}
			${"border-color: " + backgroundColor + ";"}
		}
		body #word-container-timer {
			${"border-bottom:3px solid " + fontColor + ";"}
		}
		body #word-container {
			font-family: ${font};
		}
		body #word {
			letter-spacing: ${letterSpacing}px;
			font-size: ${fontSize}px;
		}
		body #cboxContent {
			${"background: " + backgroundColor + ";"}
		}
		#context-container {
			font-family: ${font};
			font-size: ${fontSize}px;
		}
		#context-container #context {
			line-height: ${fontSize}px;
		}
		#context-container #context .context, .multiline-context {
			opacity: ${contextOpacity};
		}
		.focus-indicator {
			opacity: ${contextOpacity};
			${"border-color: " + fontColor + ";"}
		}
		.focus-indicator .focus-indicator-mark {
			${"background-color: " + fontColor + ";"}
		}

	</style>
	`;
	if ($('head style#custom-styles').length > 0) {
		$('head style#custom-styles').remove();
	}
	$('head').append(customStyles);

	setTimeout(function () {
		$('#page-turn .page-turn-direction').css('background', backgroundColor);
		$('#page-turn > #page-turn-left').css('box-shadow', '5px 0px 5px ' + backgroundColor);
		$('#page-turn > #page-turn-right').css('box-shadow', '-5px 0px 5px ' + backgroundColor);
	}, 100);
}



function afterClick() {
	//on focus currently focused element
	if ("activeElement" in document)
		document.activeElement.blur();
}



window.onresize = resize;
let resizeId;
function resize() {
	// console.log('window resized');
	clearTimeout(resizeId);
	resizeId = setTimeout(saveWindowDimensions, 200);
}
function saveWindowDimensions() {
	const windowWidth = window.outerWidth;
	const windowHeight = window.outerHeight;
	// console.log(windowWidth);
	// console.log(windowHeight);

	chrome.runtime.sendMessage({ action: "saveWindowDimensions", width: windowWidth, height: windowHeight }, function (response) { });

	setUpContextDisplay();
	positionWord();
}

function toggleFullScreen(event = null) {
	if (event !== null) {
		pushEvent("spreed-app-action", "click-fullscreen");
	} else {
		pushEvent("spreed-app-action", "hotkey-fullscreen");
	}

	if (!document.fullscreenElement) {
		document.documentElement.requestFullscreen();
		document.getElementById('fullscreen').innerHTML = '<i class="fas fa-compress"></i>';

	} else {
		if (document.fullscreenElement != null) {
			document.exitFullscreen();
		}
	}
}


function bindPlay(k) {
	if (k.keyCode == 32) {
		play();
	}
}

function bindPause(k) {
	if (k.keyCode == 32) {
		pause();
	}
}

function setHide(set) {
	var hideElements = $(selectorsToHide);
	if (contextDisplayStyle === "on-pause") {
		hideElements = $(`${selectorsToHide}, ${contextSelectors}`);
	}

	hide = set;

	if (hide == 0) {
		//show everything
		hideElements.css('opacity', ''); // remove inline opacity style to use default transparency settings
	}
	else {
		//hide everything
		hideElements.css('opacity', 0);
	}

}

function toggleHide() {
	if (hide == 0)
		hide = 1;
	else
		hide = 0

	setHide(hide);
	localStorage.setItem("hide", hide);

}
function hideControls() {
	setHide(1);
}
function showControls() {
	setHide(0);
}


function checkKeypress(k, handler) {
	// // debug
	// console.log(k, handler);
	// console.log(k.keyCode);
	// console.log(String.fromCharCode(k.keyCode));
	// if (hotkeys.cmd) {
	//     console.log('cmd is pressed!');
	// }
	// if (hotkeys.command) {
	//    	console.log('command is pressed!');
	//  	}


	// seek to position in text
	if (k.keyCode >= 48 && k.keyCode <= 57) {
		number = parseInt(String.fromCharCode(k.keyCode));
		if (number == 0) number = 10;
		pct = (number - 1) * 0.1;

		//move word to % position
		wordIndex = Math.round(pct * (splitText.length - 1));
		setCurrentFirstTokenIndex();
		wordDiv.innerHTML = splitText[wordIndex];
		setUpContextDisplay();

		waitUntil(
			function () {
				// the code you want to run here...
				positionWord();
			},
			function () {
				// the code that tests here... (return true if test passes; false otherwise)
				return !!(wordDiv.innerHTML !== '');
			},
			50 // amount to wait between checks
		)();
	}
}

function openQuickTips() {

	//console.log(localStorage.getItem("notfirsttime"));
	if (localStorage.getItem("notfirsttime") > 0) {
		openImmediately = false;
		popupClosed = 1;
	}
	else {
		localStorage.setItem("notfirsttime", 1);
		openImmediately = true;
		//openImmediately = false;

	}
	$(".inline").colorbox({
		inline: true,
		width: "70%",
		transition: "none",
		opacity: 0.70,
		open: openImmediately,
		onClosed: function () {
			popupClosed = 1;
		}
	});

}

function generateRandomCongrats() {
	var randomInt = Math.floor((Math.random() * 5) + 1);
	switch (randomInt) {
		case 1:
			return "Congratulations!";
			break;
		case 2:
			return "Nice!";
			break;
		case 3:
			return "Awesome!";
			break;
		case 4:
			return "Cool!";
			break;
		case 5:
			return "Wow!";
			break;
	}
}

function unbindMouseWheelScroll() {
	$(window).unbind('mousewheel');
}
function bindMouseWheelTextScroll() {
	$(window).bind('mousewheel', function (e) {
		if (state.settingsShown === false) {

			//pause();
			if (e.originalEvent.wheelDelta > 0) {
				if (wordIndex < splitText.length - 1)
					wordIndex += 1;
				setCurrentFirstTokenIndex();
			}
			else {
				if (wordIndex >= 1)
					wordIndex -= 1;
				setCurrentFirstTokenIndex();
			}
			wordDiv.innerHTML = splitText[wordIndex];
			setUpContextDisplay();

			waitUntil(
				function () {
					// the code you want to run here...
					positionWord();
				},
				function () {
					// the code that tests here... (return true if test passes; false otherwise)
					return !!(wordDiv.innerHTML !== '');
				},
				50 // amount to wait between checks
			)();
		}

	});
}
function getTextScrollerStatusDisplay() {
	const textScrollerEnabled = state.settingsStore.getSetting(state.settingsStore.SETTING_TEXT_SCROLLER_ENABLED_KEY) === 'true' ? true : false;

	if (textScrollerEnabled === true) {
		// show text scroller
		$('#slider-container').css('opacity', '1');
		// add text scroller to selectorsToHide
		selectorsToHide = [...selectorsToHide.split(',').map(x => x.trim()), '#slider-container'].join(', ');
		// enabled text scroller listeners
		bindMouseWheelTextScroll();
	} else {
		// hide text scroller
		$('#slider-container').css('opacity', '0');
		// remove text scroller from selectorsToHide
		selectorsToHide = selectorsToHide.split(',').map(x => x.trim()).filter(x => x !== '#slider-container').join(', ');
		// disable text scroller listeners
		unbindMouseWheelScroll();
	}
	addMouseListenersToToggleControls();


}





function strip(html) {
	var tmp = document.createElement("DIV");
	tmp.innerHTML = html;
	return tmp.textContent || tmp.innerText || "";
}


/* ON LOAD */
$(function () {

	// set global vars that require chrome API
	// homepage URL
	homePageUrl = chrome.runtime.getManifest().homepage_url;
	// console.log('homepageUrl: ', homepageUrl);

	// share code
	$('#share-spreed-fb').hide(); // we will re-show this later
	// replace share links
	let originalShareEncodedUrl = "https%3A%2F%2Fchrome.google.com%2Fwebstore%2Fdetail%2Fswiftread-read-faster-lea%2Fipikiaejjblmdopojhpejjmbedhlibno";
	let newShareEncodedUrl = encodeURIComponent(homepageUrl);
	let shareHtml = $('#share-spreed-fb').html();
	shareHtml = shareHtml.replaceAll(originalShareEncodedUrl, newShareEncodedUrl);
	$('#share-spreed-fb').html(shareHtml);

	// get the url and title of the page user is trying to spreed
	curUrl = localStorage.getItem("curUrl");
	curTitle = localStorage.getItem("curTitle");

	console.log('curUrl: ', curUrl);
	console.log(curTitle);

	statsMode = 0; //we have to start displaying stats on loading

	//send google analytic event based on open mode
	//console.log("open mode: "+parseInt(localStorage.getItem("openMode")));
	let value;
	switch (parseInt(localStorage.getItem("openMode"))) {
		case 0:
			value = "button overlay";
			break;
		case 1:
			value = "alt+v auto text extraction";
			break;
		case 2:
			value = "alt+b text selector";
			break;
		case 3:
			value = "highlight text, alt+v";
			break;
		case 4:
			value = "highlight text, context menu";
			break;
		case 5:
			value = "browser action menu item";
			break;
		case 6:
			value = "pasted text";
			break;
		case 7:
			value = "open text selector from menu";
			break;
		case 8:
			value = "auto text extractor from menu";
			break;
		case 9:
			value = "kindle cloud button overlay";
			break;

		default:
			value = "unknown";
			break;
	}

	pushEvent('spreed open mode', value);

	/*

	//populate loading stats with time saved first
	wordCount = localStorage.getItem('wordCount');
	if (wordCount==null) {
		wordCount = 0;
	}
	totalTimeSpent = localStorage.getItem('totalTimeSpent');
	if (totalTimeSpent==null) {
		totalTimeSpent = 0;
	}
	wordCount = parseInt(wordCount);
	totalTimeSpent = parseInt(totalTimeSpent);
	*/

	//init: get loading stats from chrome sync
	//populate loading stats with time saved first
	wordCount = parseInt(_localStorageSetdefault("wordCount", 0));
	totalTimeSpent = parseInt(_localStorageSetdefault("totalTimeSpent", 0));


	init();


});





function resetUserFeatures() {
	// resets user setting handlers to non-pro
	const defaultFeatures = state.settingsStore.getDefaultSettings()[state.settingsStore.USER_SETTINGS_JSON_KEY];
	state.settingsStore.setSetting(
		state.settingsStore.USER_SETTINGS_JSON_KEY,
		defaultFeatures
	);
}
function resetUserFeatureValues() {
	// reset all setting *values* to their default values
	const defaultSettings = state.settingsStore.getDefaultSettings();
	console.log('defaultSettings:', defaultSettings);
	Object.entries(defaultSettings).map(([key, value]) => {
		state.settingsStore.setSetting(
			key,
			value
		);
	});

}
function resetUserLicense() {
	// resets the user's license to non-pro
	state.settingsStore.setSetting(
		state.settingsStore.USER_LICENSE_KEY,
		null
	);
}
function getUserLicense() {
	return state.settingsStore.getSetting(state.settingsStore.USER_LICENSE_KEY);
}
function getDefaultUserFeatures() {
	return state.settingsStore.getDefaultSettings()[state.settingsStore.USER_SETTINGS_JSON_KEY];
}
function getUserFeatures() {
	return state.settingsStore.getSetting(state.settingsStore.USER_SETTINGS_JSON_KEY);
}
function setUserLicense(licenseKey) {
	state.settingsStore.setSetting(state.settingsStore.USER_LICENSE_KEY, licenseKey);
}
function setUserFeatures(featuresJSON) {
	state.settingsStore.setSetting(state.settingsStore.USER_SETTINGS_JSON_KEY, featuresJSON);
}

function unlockProFeatures(forceUpdate = false) {
	const licenseKey = getUserLicense();
	const defaultFeatures = getDefaultUserFeatures();
	const curFeatures = getUserFeatures();

	// if license key is null
	if (licenseKey === null) {
		// use default feature json
		setUserFeatures(defaultFeatures);
		// console.log('null licenseKey, using default features');
	} else {
		// non-null license key but default features: try to get new features
		if (JSON.stringify(defaultFeatures).length === JSON.stringify(curFeatures).length) {
			// console.log('non-null licenseKey, but default features: querying for new features');
			requestUserSettingsJsonKey(licenseKey);
		}
		// non-null license key and non-default features: continue. unless we should force updated paid users
		else {
			if (forceUpdate === true) {
				// console.log('forcing update pro user settings');
				requestUserSettingsJsonKey(licenseKey);
			}
			// console.log('non-null licenseKey and non-default features: continue as planned');
		}
	}
}
function requestUserSettingsJsonKey(licenseKey, otherSuccessCallback = null, otherFailureCallback = null) {

	$.ajax({
		url: `${API_URL}/getCustomerFeatures?license_key=${encodeURIComponent(licenseKey)}`,
		timeout: 5000
	}).done(function (data) {
		// console.log('data:',data);

		if (data.exists === true) {
			if (otherSuccessCallback !== null) {
				otherSuccessCallback();
			}

			const proSettingsJson = data.data;
			setUserFeatures(proSettingsJson);
			setUserLicense(licenseKey);
		} else {
			// if no paid user found set to default feature settings
			// console.log('no user found, resetting');
			setUserFeatures(getDefaultUserFeatures());
			setUserLicense(null);

			if (otherFailureCallback !== null) {
				otherFailureCallback({}, "That license key is invalid. Did you enter it correctly?");
			}
		}


	}).fail(function (error) {
		if (otherFailureCallback !== null) {
			otherFailureCallback(error, "Error communicating with server. Are you connected to the internet?");
		}
		else {
			console.error("Error communicating with server to update features. Try again later.");
			console.error(error.status, error.statusText);
		}
	});

}

function waitForSelectedText(timeout = 5000) {
	return new Promise((resolve, reject) => {
		const interval = 100;
		const maxTries = timeout / interval;
		let tries = 0;
		let check = setInterval(function () {
			tries += 1;
			if (tries > maxTries) {
				clearInterval(check);
				reject();
			}
			const curSelectedText = localStorage.getItem("selectedText");
			if (curSelectedText !== null) {
				clearInterval(check);
				resolve(curSelectedText);
			}
		}, interval);
	});
}





const loadManifest = (callback) => {
	let xobj = new XMLHttpRequest();
	xobj.overrideMimeType("application/json");
	xobj.open('GET', 'manifest.json', true);
	// Replace 'manifest' with the path to your file
	xobj.onreadystatechange = () => {
		if (xobj.readyState === 4 && xobj.status === 200) {
			// Required use of an anonymous callback
			// as .open() will NOT return a value but simply returns undefined in asynchronous mode
			callback(xobj.responseText);
		}
	};
	xobj.send(null);
}






// SET UP MESSAGE LISTENERS
chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {
		// console.log('message received:',request);

		switch (request.action) {
			case "reloadSpreed":
				// console.log("reloadSpreed message received");

				if (request.hasOwnProperty("extractedContent") === true) {
					localStorage.setItem("selectedText", request.extractedContent);
				}

				sendResponse({
					success: true
				});
				location.reload();
				break;
		}
	}
);


