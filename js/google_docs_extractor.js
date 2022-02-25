console.log("---");

pageTurnDirection = typeof (pageTurnDirection) !== "undefined" ? pageTurnDirection : null;
mostRecentPage = typeof (currentPageNumber) !== "undefined" ? currentPageNumber : null;

console.log("pageTurnDirection:", pageTurnDirection);
console.log("mostRecentPage:", mostRecentPage);
console.log('extracting google doc...');

editor = $(".kix-appview-editor-container").get(0);

console.log('editor: ', editor);
console.log(editor.getBoundingClientRect());

// seems like google docs only renders up to the to two "active" pages on screen
pages = $(editor).find(".kix-page").toArray();
console.log('pages:', pages);

viewerHeight = editor.getBoundingClientRect().height;
viewerWidth = editor.getBoundingClientRect().width;
viewerTop = editor.getBoundingClientRect().y;
viewerLeft = editor.getBoundingClientRect().x;

pageViewPcts = [];
pageViewPcts = pages.map((page, pageIndex) => {
	// get page number of y-pixels visible
	// console.log('---');
	// console.log('page:',page);
	// console.log('pageIndex:',pageIndex);

	const pageBounds = page.getBoundingClientRect();
	// console.log(pageBounds);

	let yPixelsVisible;

	const onScreenYStart = pageBounds.y;
	const onScreenYEnd = pageBounds.height + pageBounds.y; // where the page y ends on screen
	// console.log('onScreenYStart:',onScreenYStart,'onScreenYEnd:',onScreenYEnd);
	// console.log('viewerTop:',viewerTop,'viewerHeight:',viewerHeight);

	if (onScreenYStart >= viewerTop && onScreenYEnd <= viewerHeight + viewerTop) { // page a subset in screen
		yPixelsVisible = (onScreenYEnd - onScreenYStart);
	} else if (onScreenYStart < viewerTop && onScreenYEnd > viewerHeight + viewerTop) { // page starts earlier, ends after screen
		yPixelsVisible = (viewerHeight);
	} else if (onScreenYStart < viewerTop && onScreenYEnd >= viewerTop && onScreenYEnd <= viewerHeight + viewerTop) { // page starts earlier, ends in screen
		yPixelsVisible = (onScreenYEnd - viewerTop);
	} else if (onScreenYStart >= viewerTop && onScreenYStart <= viewerHeight + viewerTop && onScreenYEnd >= viewerHeight + viewerTop) { // page starts in screen, ends after screen
		yPixelsVisible = (viewerHeight + viewerTop - onScreenYStart);
	} else {
		yPixelsVisible = 0;
	}
	// console.log('yPixelsVisible:', yPixelsVisible);

	// update dom with page number
	$(page).attr('data-page-number', pageIndex);

	return {
		pageNumber: pageIndex,
		yPixelsVisible,
		pctOfViewer: yPixelsVisible / viewerHeight,
		page
	};
});

// console.log('pageViewPcts:',pageViewPcts);

// get page that is currently most visible
mostVisiblePages = pageViewPcts.sort((a, b) => {
	if (a.pctOfViewer < b.pctOfViewer) return -1;
	if (a.pctOfViewer > b.pctOfViewer) return 1;
	return 0;
}).reverse();
// console.log('mostVisiblePages:',mostVisiblePages);
if (mostVisiblePages.length === 0) {
	// alert("Error: no visible Google Doc page found. Please report to help@swiftread.com");
	alert("SwiftRead does not support Google Docs. Please print any document as a PDF or ePUB and use SwiftRead to read that file instead.");
	chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'error', eventAction: 'google-doc-zero-pages-detected' }, function (response) {
	});
}



// handle page turn
if (pageTurnDirection !== null) {
	if (mostRecentPage !== null) {
		let nextPages;
		if (pageTurnDirection === 'right') {
			nextPages = pages.filter(page => parseInt(page.getAttribute('data-page-number')) > currentPageNumber);
		} else if (pageTurnDirection === 'left') {
			nextPages = pages.filter(page => parseInt(page.getAttribute('data-page-number')) < currentPageNumber).reverse();
		}

		if (nextPages.length > 0) {
			// scroll to next page
			const nextPage = nextPages[0];
			nextPage.scrollIntoView();

			// set page
			currentPageNumber = parseInt(nextPage.getAttribute('data-page-number'));
			// console.log('turned to:',currentPageNumber);

			// reset pageTurnDirection
			pageTurnDirection = undefined;

			setTimeout(function () {
				// console.log('done scrolling');
				extractCurrentPage();
			}, 100);
		} else {
			// handle no more pages to scroll to: don't do anything, wait for timeout
			// reset pageTurnDirection
			pageTurnDirection = undefined;
		}
	} else {
		console.error('mostRecentPage null, should not be after a page turn');
		// reset pageTurnDirection
		pageTurnDirection = undefined;
	}

} else {
	// otherwise, get the most visible page
	currentPageNumber = mostVisiblePages[0].pageNumber;
	// console.log('no turn, currentPageNumber:',currentPageNumber);
	// reset pageTurnDirection
	pageTurnDirection = undefined;
	extractCurrentPage();
}



function extractCurrentPage() {

	// store data and construct location string
	// console.log('most visible page data-page-number: ', mostVisiblePages[0].page.getAttribute('data-page-number'));
	// console.log('currentPageNumber:',currentPageNumber);
	localStorage.setItem("gdocsCurrentPageNumber", currentPageNumber);

	maxPageNumber = pageViewPcts.length
	gdocsLocationString = "Page " + (currentPageNumber + 1).toString() + " of " + maxPageNumber.toString();
	// console.log(gdocsLocationString);

	chrome.runtime.sendMessage({ action: "storeGdocsLocation", locationString: gdocsLocationString }, function (response) {
		// console.log('pushEvent response:',response);
	});


	// get the needed page
	allPages = pageViewPcts
		.filter(obj => obj.pageNumber === currentPageNumber)
		.sort((a, b) => {
			if (a.pageNumber < b.pageNumber) return -1;
			else if (a.pageNumber > b.pageNumber) return 1;
			else return 0;
		})
		.map(obj => obj.page);

	// console.log('allPages:', allPages);

	// start extracting content
	// skip header and footer: .kix-page-header, .kix-page-bottom
	$columns = $(allPages).find(".kix-page-column");
	// console.log('columns:', $columns);

	// get paragraphs
	paragraphs = $columns.find(".kix-paragraphrenderer").toArray();
	console.log('paragraphs:', paragraphs);

	extractedMap = [];
	// iterate through paragraphs
	for (let p = 0; p < paragraphs.length; p++) {
		const curParagraph = [];
		const wordNodes = $(paragraphs[p]).find(".kix-wordhtmlgenerator-word-node").toArray();
		// iterate through words
		for (let w = 0; w < wordNodes.length; w++) {
			const curWordNode = wordNodes[w];
			const curText = curWordNode.innerText.replace(/\u200c/g, "").replace(/\u00a0/g, " ");

			// skip completely empty word nodes
			if (curText.replace(/\s/g, "").trim().length === 0) {
				continue
			}

			// extract styles
			const fontSize = curWordNode.style.fontSize.replace("px", "");
			const fontWeight = curWordNode.style.fontWeight;

			const styles = {
				fontSize: fontSize.length > 0 ? parseFloat(fontSize) : null,
				fontWeight: fontWeight.length > 0 ? parseInt(fontWeight) : null,
				fontStyle: curWordNode.style.fontStyle
			}
			curParagraph.push([curText, styles]);

		}
		if (curParagraph.length > 0) extractedMap.push(curParagraph);
	}

	// console.log('extractedMap:',extractedMap);

	// detect headers based on font-sizes
	// get distribution of font-sizes
	// most common one: regular
	// how many are their own paragraph and larger? these are the likely headers
	wordSizeFrequency = {};
	paragraphSizeFrequency = {};
	for (let p = 0; p < extractedMap.length; p++) {
		const curParagraph = extractedMap[p];

		// get font sizes of this paragraph's wordNodes
		const fontSizes = curParagraph.map(([text, styles]) => styles.fontSize);
		// keep track of word font size frequency
		for (let i = 0; i < fontSizes.length; i++) {
			const curFontSize = fontSizes[i];
			let curCount = wordSizeFrequency[curFontSize];
			if (!curCount) curCount = 1;
			else curCount += 1;
			wordSizeFrequency[curFontSize] = curCount;
		}
		// keep track of entire paragraphs that are the same size
		const paragraphUniqueSizes = fontSizes.filter((x, i, a) => a.indexOf(x) === i);
		// console.log(paragraphUniqueSizes);
		if (paragraphUniqueSizes.length === 1) { // if entire paragraph is the same size, track
			const curFontSize = fontSizes[0];
			let curCount = paragraphSizeFrequency[curFontSize];
			if (!curCount) curCount = 1;
			else curCount += 1;
			paragraphSizeFrequency[curFontSize] = curCount;
		}
	}

	// console.log(wordSizeFrequency);
	// console.log(paragraphSizeFrequency);

	// get the normal word size
	topWordSizes = Object
		.entries(wordSizeFrequency)
		.sort(([k1, v1], [k2, v2]) => {
			if (v1 < v2) { return 1; }
			if (v1 > v2) { return -1; }
			return 0;
		});
	if (topWordSizes.length > 0) {
		normalWordSize = parseFloat(topWordSizes[0]);
	} else {
		console.error("no word sizes detected in google doc");
		// alert("Error: no words found in Google Doc. Please report to help@swiftread.com");
		alert("SwiftRead does not support Google Docs. Please print any document as a PDF or ePUB and use SwiftRead to read that file instead.");
		chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'error', eventAction: 'google-doc-no-word-sizes' }, function (response) {
		});

	}

	// get header sizes
	// console.log(Object.keys(paragraphSizeFrequency));
	if (Object.keys(paragraphSizeFrequency).includes(normalWordSize.toString())) {
		delete paragraphSizeFrequency[normalWordSize];
	}
	// sort from largest to smallest key
	topHeaderSizes = Object
		.entries(paragraphSizeFrequency)
		.sort(([k1, v1], [k2, v2]) => {
			if (parseFloat(k1) < parseFloat(k2)) { return 1; }
			if (parseFloat(k1) > parseFloat(k2)) { return -1; }
			return 0;
		});
	// console.log(topHeaderSizes);

	headerKeys = topHeaderSizes.slice(0, 6).map(([fontSizeStr, _]) => parseFloat(fontSizeStr));
	headerSizeToTagMap = {};
	for (let i = 0; i < headerKeys.length; i++) {
		headerSizeToTagMap[headerKeys[i]] = "h" + (i + 1).toString();
	}
	// console.log(headerSizeToTagMap);


	// construct full extracted text as HTML
	extractedHTML = "";
	openHeaderTag = undefined;
	for (let p = 0; p < extractedMap.length; p++) {
		if (openHeaderTag) {
			// if it's a new paragraph and there's an open header tag, close it
			extractedHTML += "</" + openHeaderTag + ">";
			openHeaderTag = null;
		}
		if (p > 0) {
			extractedHTML += "</p>"; // close previous paragraph
		}
		extractedHTML += "<p>";
		const curParagraph = extractedMap[p];

		for (let w = 0; w < curParagraph.length; w++) {
			const [curText, curStyles] = curParagraph[w];

			// console.log("---");
			// console.log(curText);
			// console.log(curStyles);

			let headerTag;
			if (Object.keys(headerSizeToTagMap).includes(curStyles.fontSize.toString())) {
				// word size is a header
				headerTag = headerSizeToTagMap[curStyles.fontSize];
				// open an open header tag if none already exists
				if (!openHeaderTag) {
					openHeaderTag = headerTag;
					extractedHTML += "<" + openHeaderTag + ">";
					// console.log('opening: ', openHeaderTag);
				}
				// if one already exists
				else if (openHeaderTag !== headerTag) {
					extractedHTML += "</" + openHeaderTag + ">";
					// console.log('closing: ', openHeaderTag);
					openHeaderTag = headerTag;
					extractedHTML += "<" + openHeaderTag + ">";
					// console.log('opening: ', openHeaderTag);

				}
			} else {
				// word size is not a header
				// close any open header tag
				if (openHeaderTag) {
					extractedHTML += "</" + openHeaderTag + ">";
					openHeaderTag = null;
				}

			}


			let boldTag;
			if (curStyles.fontWeight > 400) {
				boldTag = "b";
			}

			let italicTag;
			if (curStyles.fontStyle === 'italic') {
				italicTag = "i";
			}

			if (boldTag) extractedHTML += "<" + boldTag + ">";
			if (italicTag) extractedHTML += "<" + italicTag + ">";
			extractedHTML += curText;
			if (italicTag) extractedHTML += "</" + italicTag + ">";
			if (boldTag) extractedHTML += "</" + boldTag + ">";



		}

	}
	extractedHTML += "</p>";
	// console.log(extractedHTML);

	// send extracted text
	// track event
	chrome.runtime.sendMessage({
		action: "pushEvent",
		eventCategory: 'read-format',
		eventAction: 'extract-text',
		eventLabel: 'google-doc',
		eventValue: extractedHTML.length
	}, function (response) {
		// console.log('pushEvent response:',response);
	});

	// send extracted text
	chrome.runtime.sendMessage({ action: "extractor", html: extractedHTML, keepRaw: false, source: 'google-doc' }, function (response) {
		// console.log('Sent extracted text with number of characters:', extractedHTML.length)
	});

}