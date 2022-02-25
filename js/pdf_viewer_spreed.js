let curExtractedMostVisiblePage;
let currentTab;

let chunks;
let chunkXDiffs;
let chunkYDiffs;
let predictedXSpace;
let spacingChunks;
let clearSpacingTimer;

let newPDFLoaded = true;
let processedPDF = false;
let fromPageTurn = false;

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}
function median(values) {
	if (values.length === 0) return 0;

	values.sort(function (a, b) {
		return a - b;
	});

	var half = Math.floor(values.length / 2);

	if (values.length % 2)
		return values[half];

	return (values[half - 1] + values[half]) / 2.0;
}

async function changeSpreedWordSpacing(newSpaceValue) {
	predictedXSpace = parseInt(newSpaceValue);

	if (newPDFLoaded === true) {
		newPDFLoaded = false;
		// don't re-render text if pdf loaded, it should've already happened
	} else {
		await processPDFRenderedText();
	}

}

function clearSpacing() {
	if (spacingChunks && spacingChunks.length > 0) {
		for (let i = 0; i < spacingChunks.length; i++) {
			const spacingChunk = spacingChunks[i];
			spacingChunk.remove(); // remove from dom
		}
		spacingChunks = undefined;
	}
}
function isInParent(parent, child) {
	// console.log('parent:',parent);
	const parentBox = parent.getBoundingClientRect();
	// console.log('child:',child);
	const childBox = child.getBoundingClientRect();

	let result = true;
	if (childBox.y > (parentBox.y + parentBox.height) || childBox.y < parentBox.y) {
		result = false;
	}
	// console.log('child in parent:', result);
	return result;
}
function getPageViewPcts(pages) {
	const viewerTop = outerContainer.getBoundingClientRect().y;
	const viewerHeight = outerContainer.getBoundingClientRect().height;

	return pages.map((page) => {
		// get page number of y-pixels visible
		// console.log(page);
		const pageNumber = parseInt(page.dataset.pageNumber); // TODO: this assumes pageNumber is an int
		const pageBounds = page.getBoundingClientRect();
		// console.log(pageBounds);

		let yPixelsVisible;

		const onScreenYEnd = pageBounds.height + pageBounds.y; // where the page y ends on screen
		const onScreenYStart = pageBounds.y;

		if (onScreenYStart >= viewerTop && onScreenYEnd <= viewerHeight + viewerTop) { // page a subset in screen
			yPixelsVisible = (onScreenYEnd - onScreenYStart);
		} else if (onScreenYStart < viewerTop && onScreenYEnd > viewerHeight + viewerTop) { // page starts earlier, ends after screen
			yPixelsVisible = (viewerHeight);
		} else if (onScreenYStart < viewerTop && onScreenYEnd <= viewerHeight + viewerTop) { // page starts earlier, ends in screen
			yPixelsVisible = (onScreenYEnd - viewerTop);
		} else if (onScreenYStart > viewerTop && onScreenYStart <= viewerHeight + viewerTop && onScreenYEnd >= viewerHeight + viewerTop) { // page starts in screen, ends after screen
			yPixelsVisible = (viewerHeight + viewerTop - onScreenYStart);
		} else {
			yPixelsVisible = 0;
		}

		return { pageNumber, yPixelsVisible, pctOfViewer: yPixelsVisible / viewerHeight, page };
	});
}
function getMostVisiblePages() {
	// get pages
	const pages = Array.prototype.slice.call(outerContainer.querySelectorAll('.page'));
	// console.log('pages:',pages);

	const pageViewPcts = getPageViewPcts(pages);
	// console.log('pageViewPcts:', pageViewPcts);

	return pageViewPcts.sort((a, b) => {
		if (a.pctOfViewer < b.pctOfViewer) return -1;
		if (a.pctOfViewer > b.pctOfViewer) return 1;
		return 0;
	}).reverse();
}

async function processPDFRenderedText(predictSpacing = false) {
	clearSpacing();

	const outerContainer = document.getElementById('outerContainer');
	// console.log('outerContainer:',outerContainer);


	// get page that is currently most visible
	const mostVisiblePages = getMostVisiblePages();
	// console.log('mostVisiblePages:', mostVisiblePages);

	if (mostVisiblePages.length === 0) {
		alert("Error: no visible PDF page found. Please report to help@swiftread.com");
		chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'error', eventAction: 'pdf-reader-zero-pages-detected' }, function (response) {
		});
	}

	const mostVisiblePage = mostVisiblePages[0].page;
	curExtractedMostVisiblePage = mostVisiblePages[0];
	// console.log('curExtractedMostVisiblePage:',curExtractedMostVisiblePage);

	const pdfLocationString = "Page " + (mostVisiblePages[0].pageNumber).toString() + " of " + mostVisiblePages.length.toString();
	// console.log('pdfLocationString:', pdfLocationString);
	chrome.runtime.sendMessage({ action: "storePDFLocation", locationString: pdfLocationString }, function (response) {
		// console.log('pushEvent response:',response);
	});

	// get text layer of this page
	// wait until text layer is non-undefined
	function waitAndGetTextLayer(mostVisiblePage, timeout = 5000) {
		return new Promise((resolve, reject) => {
			const interval = 100;
			let tries = 0;
			const maxTries = timeout / interval;

			let wait = setInterval(function () {
				// console.log('waiting for text layer...');
				const textLayer = mostVisiblePage.querySelector('.textLayer');
				if (textLayer) {
					// console.log('text layer found');
					clearInterval(wait);
					resolve(textLayer);
				}

				tries += 1;
				if (tries > maxTries) {
					clearInterval(wait);
					// console.error("Timed out while waiting for PDF text layer");
					chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'error', eventAction: 'pdf-reader-waiting-for-textLayer-timed-out' }, function (response) {
					});
					reject("Timed out while waiting for PDF text layer");
				}
			}, interval);
		});
	}
	const textLayer = await waitAndGetTextLayer(mostVisiblePage);

	// console.log('textLayer:',textLayer);
	if (!textLayer) {
		alert("Error: PDF still loading. Please try again in a few seconds. If this issue persists, email help@swiftread.com");
		chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'error', eventAction: 'pdf-still-loading' }, function (response) {
		});
	}

	chunks = Array.prototype.slice.call(textLayer.querySelectorAll('span'));

	// each "chunk" could be a line of words, headers, or even partial words (sometimes the renderer breaks up words)
	chunks = chunks.map((chunk) => {
		return {
			innerText: chunk.innerText,
			chunk: chunk,
			styles: chunk.style
		};
	});
	// console.log('chunks: ', chunks);
	// console.log('num chunks: ', chunks.length);

	// filter out chunks that are not in the current text layer
	chunks = chunks.filter(chunk => isInParent(textLayer, chunk.chunk));
	// console.log('visible chunks: ', chunks);
	// console.log('num visible chunks: ', chunks.length);


	if (chunks.length === 0) {
		if (fromPageTurn === true) {
			// console.log('from page turn and no chunks to process, skipping...');
			return;
		}
		alert("This page doesn't seem to have any selectable text. SwiftRead only works on PDF pages where the text is selectable. If applicable, please scroll to a page in this PDF with selectable text to start SwiftReading from there.");
		chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'error', eventAction: 'pdf-reader-no-selectable-text' }, function (response) {
			const oldClasses = document.getElementById('openSpreed').className;
			document.getElementById('openSpreed').className = oldClasses.replaceAll('loading', '');
		});
		processedPDF = false;
		return;
	}

	// detect header/paragraph breaks
	const avgLineHeight = chunks.map((chunk) => {
		return chunk.chunk.getBoundingClientRect().height
	}).reduce((a, b) => a + b, 0) / chunks.length;
	// console.log('avgLineHeight:',avgLineHeight);

	chunkYDiffs = chunks.reduce((accumulator, currentChunk) => {
		// console.log('accumulator:',accumulator);
		// console.log('currentChunk:',currentChunk);

		let yDiffs, previousChunk;
		if (!accumulator) {
			yDiffs = [];
			previousChunk = currentChunk;

		} else {
			yDiffs = accumulator.yDiffs;
			previousChunk = accumulator.previousChunk;
		}

		const yDiff = (currentChunk.chunk.getBoundingClientRect().top - previousChunk.chunk.getBoundingClientRect().top);
		// console.log('yDiff:',yDiff);
		yDiffs.push(
			yDiff / avgLineHeight
		);
		const newYDiffs = yDiffs.slice();
		// console.log('newYDiffs:',newYDiffs);

		// console.log('---');

		return {
			yDiffs: newYDiffs,
			previousChunk: currentChunk
		};

	}, null);

	chunkYDiffs = chunkYDiffs.yDiffs;
	// console.log('chunkYDiffs:',chunkYDiffs);
	// console.log('num chunkYDiffs:',chunkYDiffs.length);



	// detect places where a horizontal space is needed by first calculating the x difference between chunks
	chunkXDiffs = chunks.reduce((accumulator, currentChunk) => {
		// console.log(currentChunk);

		if (currentChunk.chunk) {
			// console.log(currentChunk.chunk);
		}


		let xDiffs, previousChunk;
		if (!accumulator) {
			xDiffs = [];
			previousChunk = currentChunk;

		} else {
			xDiffs = accumulator.xDiffs;
			previousChunk = accumulator.previousChunk;
		}

		const xDiff = (currentChunk.chunk.getBoundingClientRect().left - previousChunk.chunk.getBoundingClientRect().right);
		// console.log(previousChunk.chunk.getBoundingClientRect());
		// console.log(currentChunk.chunk.getBoundingClientRect());
		// console.log('xDiff:',xDiff);
		xDiffs.push(xDiff);
		const newXDiffs = xDiffs.slice();

		// console.log('---');

		return {
			xDiffs: newXDiffs,
			previousChunk: currentChunk
		};

	}, null);
	chunkXDiffs = chunkXDiffs.xDiffs;
	// all xdiffs that are negative are newlines, zero out
	chunkXDiffs = chunkXDiffs.map((xDiff) => xDiff < 0 ? 0 : xDiff);
	// console.log('chunkXDiffs:',chunkXDiffs);
	// console.log('num chunkXDiffs:',chunkXDiffs.length);



	// PREDICT SPACING BETWEEN CHUNKS
	if (predictSpacing === true || !predictedXSpace) {

		// only keep the single word chunks
		let singleChunkXDiffs = chunkXDiffs.filter((xDiff, i) => {
			if (chunks[i].innerText.length === 1 && chunks[i].innerText.match(/\w+/gi)) {
				// console.log('single word chunk:', chunks[i]);
				return true;
			} else return false;
		});
		// console.log('single word chunkXDiffs:',singleChunkXDiffs);
		// round, get unique
		singleChunkXDiffs = singleChunkXDiffs.map((x) => Math.round(x)); // round
		singleChunkXDiffs = singleChunkXDiffs.filter(onlyUnique).sort((a, b) => a < b ? -1 : 1);
		// console.log('unique singleChunkXDiffs:',singleChunkXDiffs);
		const medianSpace = median(singleChunkXDiffs);
		// console.log('medianSpace:',medianSpace);

		if (singleChunkXDiffs.indexOf(medianSpace) < 0) {
			predictedXSpace = medianSpace;
		} else {
			const predictedXSpaceI = singleChunkXDiffs.indexOf(medianSpace) + 1; // index of median, plus 1 over
			predictedXSpace = predictedXSpaceI >= singleChunkXDiffs.length ? singleChunkXDiffs[predictedXSpaceI - 1] : singleChunkXDiffs[predictedXSpaceI];
		}
		// console.log('predictedXSpace:',predictedXSpace);

		// update word spacing element
		document.getElementById('wordSpacing').value = predictedXSpace;
	}

	// create new chunks with spacing to show spacing visually. but just on what's ACTUALLY visible for efficiency.
	const viewerContainer = document.getElementById('viewerContainer');
	// console.log('viewerContainer:', viewerContainer);
	let currentlyVisibleChunks = chunks.filter((obj) => isInParent(viewerContainer, obj.chunk));
	let indexes = currentlyVisibleChunks.map((_, i) => i);

	// randomly select a max of X to show spacing visually but not slow down processing too much
	const maxToShow = 100;
	const randomIndexes = [];
	for (let i = 0; i < maxToShow; i++) {
		if (indexes.length === 0) break; // break if there aren't any indexes left to pick from 
		let randomI = Math.floor(Math.random() * indexes.length);
		const visibleChunkIndex = indexes[randomI];
		indexes.splice(randomI, 1); // remove the index at randomI
		randomIndexes.push(visibleChunkIndex); // add the index
	}
	// console.log('randomIndexes:', randomIndexes.sort((a, b) => a - b));

	currentlyVisibleChunks = currentlyVisibleChunks.filter((chunk, i) => randomIndexes.includes(i));
	// console.log('currentlyVisibleChunks:', currentlyVisibleChunks);

	// console.log('creating new spacing chunk elements for X chunks...', chunks.length);
	function insertAfter(newNode, existingNode) {
		existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
	}
	spacingChunks = currentlyVisibleChunks.map((obj) => {
		const chunkBounds = obj.chunk.getBoundingClientRect();
		const chunkStyles = obj.styles;
		// console.log('chunkStyles:',chunkStyles);
		// console.log('chunkStyles left:', chunkStyles.getPropertyValue("left"));
		// console.log('chunkStyles top:', chunkStyles.getPropertyValue("top"));
		let newSpace = document.createElement("span");
		newSpace.style.left = (parseFloat(chunkStyles.getPropertyValue("left").replace("px", "")) + chunkBounds.width).toString() + "px";
		newSpace.style.width = (predictedXSpace).toString() + "px";
		newSpace.style.top = chunkStyles.getPropertyValue("top");
		newSpace.style.height = (chunkBounds.height).toString() + "px";
		newSpace.style.zIndex = 999;
		insertAfter(newSpace, obj.chunk);

		return newSpace;
	});
	// console.log('spacingChunks: ', spacingChunks);
	// console.log('num spacingChunks: ', spacingChunks.length);

	// color spacing depending on whether if overlaps with the next chunk or not
	// console.log('coloring the spacing chunks...');
	for (let i = 0; i < currentlyVisibleChunks.length; i++) {
		const nextIndex = i + 1;

		const curSpacing = spacingChunks[i];
		const curSpacingBounds = curSpacing.getBoundingClientRect();

		if (nextIndex < currentlyVisibleChunks.length) {
			const nextChunk = currentlyVisibleChunks[nextIndex];
			const nextChunkBounds = nextChunk.chunk.getBoundingClientRect();

			if (curSpacingBounds.x + curSpacingBounds.width > nextChunkBounds.x) {
				curSpacing.style.background = "black";
				const halfHeight = (parseFloat(curSpacing.style.height.replace("px")) / 2);
				curSpacing.style.height = halfHeight.toString() + "px";
				curSpacing.style.top = (parseFloat(curSpacing.style.top.replace("px")) + halfHeight).toString() + "px";
			} else {
				curSpacing.style.background = "green";
			}
		} else {

		}
	}
	// console.log('done coloring the spacing chunks.');

	processedPDF = true;
	// console.log('processedPDF:', processedPDF);

	// remove spacing chunks after a little bit
	if (clearSpacingTimer) clearTimeout(clearSpacingTimer);
	clearSpacingTimer = setTimeout(function () {
		clearSpacing();
	}, 2000);
}
async function extractPDFRenderedText() {

	// console.log('EXTRACTING TEXT FROM PDF...');
	// console.log('fromPageTurn: ', fromPageTurn);

	// only process PDF if it hasn't been procesesed yet, e.g. if page turned, should be processed already on load
	const mostVisiblePageNumber = getMostVisiblePages()[0].pageNumber;
	if (processedPDF === false) {
		// console.log('this page not processed yet, processing...');
		await processPDFRenderedText();
	} else if (mostVisiblePageNumber !== curExtractedMostVisiblePage.pageNumber) {
		// console.log('newly visible page not processed yet, processing...');
		await processPDFRenderedText();
	}

	// delete any spacingChunks, just in case
	clearSpacing();

	// detect "normal" line breaks vs. new paragraphs, and spaces
	// requires: chunks, chunkXDiffs, chunkYDiffs, predictedXSpace
	let chunksWBreaks = [];
	for (let i = 0; i < chunks.length; i++) {
		const currentChunk = chunks[i];
		const xDiff = chunkXDiffs[i];
		const yDiff = chunkYDiffs[i];
		// console.log('xDiff:',xDiff);
		// console.log('yDiff:',yDiff);

		// is a new line but a continuation of the previous OR there should be a space
		if (yDiff > 1 && yDiff < 2 || xDiff > predictedXSpace) {
			chunksWBreaks.push({ innerText: ' ' });
		} else if (yDiff >= 2) {
			// is probably a whole new "paragraph"
			chunksWBreaks.push({ innerText: ' <br/> ' });
		}
		chunksWBreaks.push(currentChunk);

	}
	// console.log('chunksWBreaks:',chunksWBreaks);

	// join everything together
	const finalHTML = chunksWBreaks.map((obj) => obj.innerText).join('');

	// TODO: detect headers to bold? look at transform: scaleX (and keep track of it per character count)?

	// console.log("finalHTML:", finalHTML);

	return finalHTML;

}

function sendMessagePromise(messagePayload) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(messagePayload, function (response) {
			if (chrome.runtime.lastError) {
				const errorMsg = chrome.runtime.lastError.message;
				console.error('Error when sending message ' + JSON.stringify(messagePayload));
				reject(errorMsg);
			}

			if (response && response.hasOwnProperty('success') && response.success === true) {
				resolve();
			} else {
				console.error('The following message payload did not respond successfully: ' + JSON.stringify(messagePayload));
				reject(messagePayload);
			}
		});
	});
}

function sendExtractedTextAndOpenSpreed(html, setVarsForPageTurn = true) {
	// set variables needed for left/right page turn
	let setCurrentTabIdPromise;
	if (setVarsForPageTurn) {
		// set currentDomain so that spreed knows the "source"
		let domain = window.location.href; // set as full url
		// console.log('setting domain:',domain);
		sendMessagePromise({ action: "setVarsForPageTurn", currentDomain: domain });

		// set currentTabId so that spreed knows which tab it's coming from
		if (!currentTab) {
			console.error('currentTab not set for some reason, it should have been');
			chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'error', eventAction: 'pdf-reader-no-currentTab-in-autoextract' }, function (response) {
			});
		} else {
			// console.log('setting current tab id:',currentTab.id);
			setCurrentTabIdPromise = sendMessagePromise({ action: "setVarsForPageTurn", currentTabId: currentTab.id });
		}
	} else {
		// unset the variables needed to disable page turn
		setCurrentTabIdPromise = sendMessagePromise({ action: "setVarsForPageTurn", currentDomain: null, currentTabId: null });
	}


	// send recording event async
	chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'read-format', eventAction: 'extract-text', eventLabel: 'pdf' }, function (response) {
	});


	setCurrentTabIdPromise.then(() => {
		// send extracted text
		// console.log('sending extracted text...');
		return sendMessagePromise({ action: "extractor", html: html, keepRaw: true });
	}, (errorMsg) => {
		alert("Error extracting text: " + errorMsg + " \n\nPlease close this tab, re-open it, and try again. If this error re-occurs, please email help@swiftread.com with a screenshot.");
	}).then(() => {
		// open spreed window
		// console.log('opening window...');
		chrome.runtime.sendMessage({ action: "openSpreedWithText" }, function (response) {
			if (response && response.success) {
				setTimeout(() => {
					const oldClasses = document.getElementById('openSpreed').className;
					document.getElementById('openSpreed').className = oldClasses.replaceAll('loading', '');
				}, 1000);

			}
		});
	}, (errorMsg) => {
		alert("Error extracting text: " + errorMsg + " \n\nPlease close this tab, re-open it, and try again. If this error re-occurs, please email help@swiftread.com with a screenshot.");
	});

}

function openSpreedOnPDF() {

	checkShowPDF(async function () {
		fromPageTurn = false;

		// extract rendered text
		const html = await extractPDFRenderedText();
		// open spreed with it
		sendExtractedTextAndOpenSpreed(html);
	});

}

function getCurrentTab() {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage({ action: "getCurrentTab" }, function (response) {
			if (response && response.success === true) {
				resolve(response.tab);
			}
			else {
				alert("Error setting up SwiftRead. Please close this tab, re-open it, and try again. For help, email help@swiftread.com");
				reject();
			}
		});
	});
}
function currentTabIsActive() {
	return new Promise((resolve, reject) => {
		chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
			var activeTab = tabs[0];
			if (activeTab.id === currentTab.id) resolve(true);
			else resolve(false);
		});
	});
}
function _getPagesWithText() {
	const outerContainer = document.getElementById('outerContainer');
	// console.log('outerContainer:',outerContainer);

	// get pages
	const pages = Array.prototype.slice.call(outerContainer.querySelectorAll('.page'));
	// console.log('pages:', pages);

	if (pages.length > 0) {
		// if there are pages:
		// get if there are text layers in any of the pages
		let textLayers = [];
		for (let p = 0; p < pages.length; p++) {
			const curTextLayers = Array.prototype.slice.call(pages[p].querySelectorAll('.textLayer'));
			Array.prototype.push.apply(textLayers, curTextLayers);
		}
		// console.log('extended textLayers:', textLayers);

		const textLayersWithText = textLayers.filter(t => t.textContent.length > 0);
		if (textLayersWithText.length > 0) {
			// console.log('some text layers do have content:',textLayersWithText);
			return pages;
		} else {
			// console.log('no text layer has content yet...');
			return [];
		}
	} else {
		// no pages detected
		return [];
	}

}
async function pdfDidLoad(timeout = 15000) {
	return new Promise((resolve, reject) => {
		const interval = 100;
		let tries = 0;
		const maxTries = timeout / interval;

		let wait = setInterval(function () {

			// console.log('checking if pdf has loaded...');
			const pagesWithText = _getPagesWithText();
			// console.log('pagesWithText.length: ', pagesWithText.length);

			if (pagesWithText.length > 0) {
				// console.log('resolving true');
				clearInterval(wait);
				resolve(true);
			}

			tries += 1;
			if (tries > maxTries) {
				clearInterval(wait);
				console.error("Timed out while loading PDF");
				resolve(false);
			}
		}, interval);
	});

}

// ON LOAD
window.addEventListener('DOMContentLoaded', async function () {


	// get current tab
	// console.log('getting current tab...');
	currentTab = await getCurrentTab(); // TODO: can this fail?

	// wait for pdf to load
	// console.log('waiting for pdf to load...');
	let pdfLoaded = await pdfDidLoad();
	if (pdfLoaded === true) {
		// set up custom event listeners
		// swiftread button click
		let openSpreedButton = document.getElementById('openSpreed');
		openSpreedButton.addEventListener('click', function (event) {
			this.className += ' loading';
			openSpreedOnPDF();
		});
		// word spacing change
		let spreedWordSpacing = document.getElementById('wordSpacing');
		spreedWordSpacing.addEventListener('change', function () {
			this.blur();
			changeSpreedWordSpacing(this.value);
		});
		// open file
		let openFileInput = document.querySelector('.fileInput');
		// console.log('openFileInput: ', openFileInput);
		openFileInput.addEventListener('change', async function (event) {
			// file changed, reprocess
			const pdfLoaded = await pdfDidLoad();
			if (pdfLoaded === true) {
				console.log('pdf loaded. re-processing...');
				newPDFLoaded = true;
				await processPDFRenderedText(predictSpacing = true);
			} else {
				// console.log('pdf did not load / have any content');
				alert("This PDF doesn't seem to have any selectable text. SwiftRead only works on PDFs where the text is selectable.");

				chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'error', eventAction: 'pdf-reader-no-selectable-text-newly-opened-pdf' }, function (response) {
					const oldClasses = document.getElementById('openSpreed').className;
					document.getElementById('openSpreed').className = oldClasses.replaceAll('loading', '');
				});
			}
		});

		// console.log('processing...');
		await processPDFRenderedText(predictSpacing = true);



	} else {
		alert("Error: Empty PDF, or PDF taking too long to load. Try a smaller PDF or email help@swiftread.com for help.");
	}

});
// listen to chrome command to auto extract
chrome.commands.onCommand.addListener(async function (command) {
	// make sure command is on this tab / this tab is active
	const isOnCurrentTab = await currentTabIsActive();
	// console.log('chrome command detected. isOnCurrentTab:',isOnCurrentTab);

	if (isOnCurrentTab && command === 'open-spreed') {
		document.getElementById('openSpreed').className += ' loading';
		// check if there's selected text
		var selection = window.getSelection();

		if (selection.rangeCount > 0 && selection.toString().length > 0) {
			// console.log('detected selection');
			const text = selection.toString();
			// send and open, but disable page turn
			checkShowPDF(function () {
				// console.log('opening spreed with selected text...');
				sendExtractedTextAndOpenSpreed(text, setVarsForPageTurn = false);
			});
		} else {
			// if there's no selected text, auto-extract
			openSpreedOnPDF();
		}

	}
});





function getUserIsPRO() {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage({ action: "userIsPRO" }, function (response) {
			// console.log('userIsPRO message response:', response);
			if (response && response.success === true) resolve(response.isPRO);
			else reject();
		})
	});
}
async function checkShowPDF(callback) {
	// get if user is a PRO user. if so, redirect to PDF reader
	const userIsPRO = await getUserIsPRO();
	if (userIsPRO === true) {
		// execute normally
		callback();
	} else {
		// otherwise, redirect to landing page with explanation
		chrome.runtime.sendMessage({ action: "redirectToPaid", featureName: "pdf_reader" }, function (response) {

		});
	}

}

// SET UP MESSAGE LISTENERS
chrome.runtime.onMessage.addListener(

	function (request, sender, sendResponse) {
		// console.log('message received:',request);

		let sourceTabId;
		switch (request.action) {
			case "pdfPageTurn":

				(async () => {
					fromPageTurn = true;

					// "turn page" by scrolling down to next page after the one we just extracted
					sourceTabId = request.sourceTabId;
					const forward = request.forward;

					if (!curExtractedMostVisiblePage) {
						chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'error', eventAction: 'pdf-reader-curExtractedMostVisiblePage-never-set' }, function (response) {
						});
						return;
					}

					const curPageNumber = curExtractedMostVisiblePage.pageNumber;
					// console.log('curPageNumber:',curPageNumber);
					const newPageNumber = forward ? curPageNumber + 1 : curPageNumber - 1;
					// console.log('newPageNumber:',newPageNumber);

					const newPage = document.querySelector(`#outerContainer .page[data-page-number="${newPageNumber}"]`);
					// console.log('newPage:',newPage);

					if (!newPage) {
						// there wasn't a next page
						sendResponse({ success: false, status: 'no-next-page' });
						return;
					}

					// physically scroll to it
					newPage.scrollIntoView();

					// extract content but retrieve it
					const html = await extractPDFRenderedText();

					// send it to spreed and reload
					chrome.runtime.sendMessage({ action: "reloadSpreed", extractedContent: html }, function (response) {
					});

					sendResponse({
						success: true
					});

				})();

				break;


		}

		return true;

	}
);


