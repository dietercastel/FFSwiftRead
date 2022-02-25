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

function resetKindleExtractedContent() {
	hashes = {};
	contentWithBounds = [];
}
function getKindleIFrame() {
	kindleIframe = document.getElementById("KindleReaderIFrame");
}
function checkKindleContentLoaded() {
	// console.log('checking if kindle content has loaded...');
	getKindleIFrame();
	if (kindleIframe !== null) {

		kindleContent = kindleIframe.contentWindow.document.getElementById("kindleReader_content");

		// loaded
		if (kindleContent !== null && kindleContent.getBoundingClientRect().width > 0) {

			// console.log(kindleIframe);
			// console.log(kindleContent);

			let contentIframes = kindleContent.getElementsByTagName("iframe");
			// console.log(contentIframes);
			// console.log(contentIframes.length);

			totalContentLength = 0;
			for (iframe of contentIframes) {
				totalContentLength += iframe.contentWindow.document.body.textContent.length;
			}
			// console.log('totalContentLength:',totalContentLength);

			if (contentIframes.length > 0 && totalContentLength > 0 && typeof (previousContentLength) !== "undefined" && totalContentLength === previousContentLength) {
				// console.log("kindle content loaded");
				kindleContentLoaded = true;
			} else {
				previousContentLength = totalContentLength;
				buttonLoaded = false;
				kindleContentLoaded = false;
			}


		} else {
			// console.log("waiting for kindle iframe...");
			buttonLoaded = false;
		}
	}
	else {
		// console.log("waiting for kindle iframe...");
		buttonLoaded = false;
	}

}
function waitForKindleContentLoaded(timeout = 5000) {
	return new Promise((resolve, reject) => {
		const maxTries = timeout / 100;
		let tries = 0;
		let poll = setInterval(function () {

			if (tries >= maxTries) {
				clearInterval(poll);
				delete poll;
				reject(false);
			}

			checkKindleContentLoaded();

			if (kindleContentLoaded === true) {
				clearInterval(poll);
				delete poll;
				resolve(true);
			}

			tries += 1;

		}, 100);

	});
}



console.log("---");

pageTurnDirection = typeof (pageTurnDirection) !== "undefined" ? pageTurnDirection : null;
console.log("pageTurnDirection:", pageTurnDirection);

// handle page turn
if (pageTurnDirection !== null) {
	let pageTurnArea;
	getKindleIFrame();
	if (pageTurnDirection === 'right') {

		// get turn page right
		pageTurnArea = kindleIframe.contentWindow.document.getElementById("kindleReader_pageTurnAreaRight");

	} else if (pageTurnDirection === 'left') {

		// get turn page left
		pageTurnArea = kindleIframe.contentWindow.document.getElementById("kindleReader_pageTurnAreaLeft");
	}

	if (!pageTurnArea.classList.contains("pageArrow")) {
		// this direction's page turn arrow doesn't exist on the kindle page
		pageTurnDirection = undefined;
	} else {
		// handle page turn

		// reset kindleContentLoaded, and extracted content
		kindleContentLoaded = false;
		resetKindleExtractedContent();

		// scroll to next page
		pageTurnArea.click();

		// reset pageTurnDirection
		pageTurnDirection = undefined;

		// wait until kindle content has loaded
		waitForKindleContentLoaded(timeout = 15000).then(() => {
			// kindle content loaded for new page
			// extract current page, add a delay to be safe, kindle cloud reader does some iframe stuff that seems to take a pause
			setTimeout(function () {
				extractCurrentPage();
			}, 100);
		}, () => {
			// page turn timed out
			// reset page turn direction
			pageTurnDirection = undefined;
		});
	}


} else {
	// otherwise, there isn't a pageTurnDirection, just extract this page
	// reset pageTurnDirection
	pageTurnDirection = undefined;
	extractCurrentPage();
}


function extractCurrentPage() {

	// don't re-declare variable because content script can be run more than once
	contentIframes = $("#KindleReaderIFrame")
		.contents()
		.find("#kindleReader_content iframe[name^='book_iframe']");
	console.log('Attempting to extract Kindle book content...')
	// console.log('contentIframes:',contentIframes);
	if (contentIframes.length > 0) console.log('Found Kindle book iframes:', contentIframes.length);
	else {
		console.log('ERROR: no Kindle book iframes found on page. does not seem to be a page with book text content');
		// alert('ERROR: SwiftRead could not detect pages.');
		alert('ERROR: SwiftRead does not support Kindle Cloud Reader.');
		chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'error', eventAction: 'no-text-detected-in-kindle-book', eventLabel: window.location.href }, function (response) { });
	}


	// ** OTHER KINDLE PAGE CONTENT ** //
	locationMessageElement = $("#KindleReaderIFrame")
		.contents()
		.find("#kindleReader_footer_readerControls_middle #kindleReader_footer_message");
	if (locationMessageElement.length > 0) {
		locationTokens = locationMessageElement.text().split('·').map(x => x.trim());
		if (locationTokens.length > 1) {
			locationString = locationTokens[0] + " of book, " + locationTokens[1];
		}
		else {
			locationString = "";
		}

	} else {
		locationString = "";
	}
	console.log('locationString:', locationString);
	chrome.runtime.sendMessage({ action: "storeKindleLocation", locationString: locationString }, function (response) {
		console.log('Stored Kindle book location string:', locationString)
	});



	// ** KINDLE BOOK CONTENT EXTRACTION ** //
	// console.log('starting extraction');

	var iFrameVisible = function (iframe) {
		var iframeBounding = iframe.getBoundingClientRect();
		if (iframeBounding.width === 0 || iframeBounding.height === 0) {
			return false;
		}
		// is iframe partially visible in window?
		if (
			iframeBounding.left <= (window.innerWidth || document.documentElement.clientWidth) &&
			iframeBounding.right >= 0 &&
			iframeBounding.top <= (window.innerHeight || document.documentElement.clientHeight) &&
			iframeBounding.bottom >= 0
		) {
			return true;
		} else {
			return false;
		}
	}
	// in "viewport" defined by iframe
	var isInViewport = function (iframe, elem, full = false) {
		var iframeBounding = iframe.getBoundingClientRect();
		var bounding = elem.getBoundingClientRect(); // relative to parent: iframe
		// console.log('iframeBounding:',iframeBounding);
		// console.log('bounding:',bounding);

		// check if iframe or element just doesn't have a shape
		if (iframeBounding.width === 0 || iframeBounding.height === 0 || bounding.height === 0 || bounding.width === 0) {
			return false;
		}

		// first, is any part of iframe visible?
		if (iFrameVisible() === false) return false;

		// true element position in screen is relative to iframe
		const top = bounding.top + iframeBounding.top;
		const bottom = bounding.bottom + iframeBounding.top;
		const left = bounding.left + iframeBounding.left;
		const right = bounding.right + iframeBounding.left;

		// is element visible?

		let elementCondition = (
			right >= 0 &&
			left <= (window.innerWidth || document.documentElement.clientWidth) &&
			bottom >= 0 &&
			top <= (window.innerHeight || document.documentElement.clientHeight)
		);
		if (full === true) {
			// fully visible
			elementCondition = (
				left >= 0 &&
				right <= (window.innerWidth || document.documentElement.clientWidth) &&
				top >= 0 &&
				bottom <= (window.innerHeight || document.documentElement.clientHeight)
			);
		}

		if (
			elementCondition
		) {
			// console.log('element is partially visible');
			return true;
		} else {
			return false;
		}
	};

	var isInFrame = function (iframe, elem) {
		var iframeBounding = iframe.getBoundingClientRect();
		var bounding = elem.getBoundingClientRect(); // relative to parent: iframe

		// vertically within iframe
		const pctOfWordHeightBuffer = 0.3;
		const isTopWithin = (bounding.y >= (0 - pctOfWordHeightBuffer * bounding.height)); // word is at least x% from top of iframe
		const isBottomWithin = (bounding.y + bounding.height <= iframeBounding.height + pctOfWordHeightBuffer * bounding.height); // wor dis at least x% from bottom of iframe
		const isLeftWithin = (bounding.x >= 0);
		const isRightWithin = (bounding.x + bounding.width <= iframeBounding.width);

		return (isTopWithin && isBottomWithin && isLeftWithin && isRightWithin);

	}




	/**
	*
	*  Secure Hash Algorithm (SHA1)
	*  http://www.webtoolkit.info/
	*
	**/

	function SHA1(msg) {

		function rotate_left(n, s) {
			var t4 = (n << s) | (n >>> (32 - s));
			return t4;
		}

		function lsb_hex(val) {
			var str = "";
			var i;
			var vh;
			var vl;

			for (i = 0; i <= 6; i += 2) {
				vh = (val >>> (i * 4 + 4)) & 0x0f;
				vl = (val >>> (i * 4)) & 0x0f;
				str += vh.toString(16) + vl.toString(16);
			}
			return str;
		}

		function cvt_hex(val) {
			var str = "";
			var i;
			var v;

			for (i = 7; i >= 0; i--) {
				v = (val >>> (i * 4)) & 0x0f;
				str += v.toString(16);
			}
			return str;
		}


		function Utf8Encode(string) {
			string = string.replace(/\r\n/g, "\n");
			var utftext = "";

			for (var n = 0; n < string.length; n++) {

				var c = string.charCodeAt(n);

				if (c < 128) {
					utftext += String.fromCharCode(c);
				}
				else if ((c > 127) && (c < 2048)) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				}
				else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}

			}

			return utftext;
		}

		var blockstart;
		var i, j;
		var W = new Array(80);
		var H0 = 0x67452301;
		var H1 = 0xEFCDAB89;
		var H2 = 0x98BADCFE;
		var H3 = 0x10325476;
		var H4 = 0xC3D2E1F0;
		var A, B, C, D, E;
		var temp;

		msg = Utf8Encode(msg);

		var msg_len = msg.length;

		var word_array = new Array();
		for (i = 0; i < msg_len - 3; i += 4) {
			j = msg.charCodeAt(i) << 24 | msg.charCodeAt(i + 1) << 16 |
				msg.charCodeAt(i + 2) << 8 | msg.charCodeAt(i + 3);
			word_array.push(j);
		}

		switch (msg_len % 4) {
			case 0:
				i = 0x080000000;
				break;
			case 1:
				i = msg.charCodeAt(msg_len - 1) << 24 | 0x0800000;
				break;

			case 2:
				i = msg.charCodeAt(msg_len - 2) << 24 | msg.charCodeAt(msg_len - 1) << 16 | 0x08000;
				break;

			case 3:
				i = msg.charCodeAt(msg_len - 3) << 24 | msg.charCodeAt(msg_len - 2) << 16 | msg.charCodeAt(msg_len - 1) << 8 | 0x80;
				break;
		}

		word_array.push(i);

		while ((word_array.length % 16) !== 14) word_array.push(0);

		word_array.push(msg_len >>> 29);
		word_array.push((msg_len << 3) & 0x0ffffffff);


		for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {

			for (i = 0; i < 16; i++) W[i] = word_array[blockstart + i];
			for (i = 16; i <= 79; i++) W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);

			A = H0;
			B = H1;
			C = H2;
			D = H3;
			E = H4;

			for (i = 0; i <= 19; i++) {
				temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
				E = D;
				D = C;
				C = rotate_left(B, 30);
				B = A;
				A = temp;
			}

			for (i = 20; i <= 39; i++) {
				temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
				E = D;
				D = C;
				C = rotate_left(B, 30);
				B = A;
				A = temp;
			}

			for (i = 40; i <= 59; i++) {
				temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
				E = D;
				D = C;
				C = rotate_left(B, 30);
				B = A;
				A = temp;
			}

			for (i = 60; i <= 79; i++) {
				temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
				E = D;
				D = C;
				C = rotate_left(B, 30);
				B = A;
				A = temp;
			}

			H0 = (H0 + A) & 0x0ffffffff;
			H1 = (H1 + B) & 0x0ffffffff;
			H2 = (H2 + C) & 0x0ffffffff;
			H3 = (H3 + D) & 0x0ffffffff;
			H4 = (H4 + E) & 0x0ffffffff;

		}

		temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);

		return temp.toLowerCase();

	}

	resetKindleExtractedContent();

	targetNodeNames = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'U', 'I', 'B', 'P', 'EM', 'DEL', 'SMALL'];

	function addText(elem, keepStyles = false) {
		// console.log(elem.outerHTML);
		let hash = SHA1(elem.outerHTML);
		// console.log('hash:',hash);

		// if word is a CANVAS, use the inner HTML
		// if word is a "normal" word, use the inner text
		let text;
		if (elem.tagName === "CANVAS") text = elem.innerHTML;
		else text = elem.innerText;
		// console.log('considering text: ', text);
		// console.log(elem);

		if (hashes[hash] === undefined) {
			hashes[hash] = true;

			const bounds = elem.getBoundingClientRect();
			let contentObj = {
				elem: elem,
				text: text,
				x1: bounds.x,
				x2: bounds.x + bounds.width,
				y: bounds.y
			};

			if (keepStyles === true) {
				// TODO: deal with new paragraph case in "A Hidden Wholeness" where parent is actually a <p> tag, not a style tag. so handle this "new paragraph" special case
				// get any styling to keep from parents, EXCLUDING paragraph tags
				const parentStyles = $(elem).parents(
					targetNodeNames.map(x => x.toLowerCase()).join(', ')
				)
					.toArray()
					.map(x => x.nodeName.toLowerCase())
					.reverse()
					.filter(tag => tag !== 'p')
					;

				// console.log('parent styles:', parentStyles);

				// add styling html tags
				contentObj.text = `${parentStyles.map(x => `<${x}>`).join('')}${contentObj.text}${parentStyles.reverse().map(x => `</${x}>`).join('')}`;
			}
			// console.log('added:', contentObj);
			contentWithBounds.push(contentObj);

		}
	}


	curText = "";
	let numVisibleIframes = 0;
	for (let i = 0; i < contentIframes.length; i++) {

		// check if iframe is at least partially visible
		// console.log(contentIframes[i]);
		// console.log('iframe is visible?', iFrameVisible(contentIframes[i]));
		let iFrameIsVisible = iFrameVisible(contentIframes[i]);

		if (iFrameIsVisible) {

			// console.log(window.innerWidth, window.innerHeight);
			// console.log(contentIframes[i]);
			// console.log(contentIframes[i].getBoundingClientRect());

			let curBody = $(contentIframes[i]).contents().find("body");
			// console.log('visible curBody:',curBody);

			// loop through each sub-div / word in paragraph
			const subDivs = curBody.find(".k4w, canvas");
			// console.log('subDivs:', subDivs);
			// console.log('Number of words in content div:',subDivs.length);
			// TODO: render bullet points (LIs)

			// iterate through each "word"
			let numVisibleWords = 0;
			for (let k = 0; k < subDivs.length; k++) {

				// console.log(window.innerWidth, window.innerHeight);
				// console.log(contentIframes[i]);
				// console.log(contentIframes[i].getBoundingClientRect());
				// console.log(subDivs[k]);
				// console.log(subDivs[k].getBoundingClientRect());
				// console.log('partially in viewport?',isInViewport(contentIframes[i], subDivs[k]));
				// console.log('fully in iframe?', isInFrame(contentIframes[i], subDivs[k]));
				// console.log('------');

				// if "word" is fully in its containing frame, which should be visible
				if (isInFrame(contentIframes[i], subDivs[k]) === true) {

					// console.log(window.innerWidth, window.innerHeight);
					// console.log(contentIframes[i]);
					// console.log(contentIframes[i].getBoundingClientRect());
					// console.log(subDivs[k]);
					// console.log(subDivs[k].getBoundingClientRect());
					// // window.getComputedStyle(subDivs[k]) are identital...
					// console.log('fully in iframe?', isInFrame(contentIframes[i], subDivs[k]));
					// console.log('parents:',$(subDivs[k]).parents());
					// console.log('------');


					addText(subDivs[k], true);
					numVisibleWords += 1;

				}

			}
			console.log('Number of VISIBLE words in content iFrame:', numVisibleWords);

			numVisibleIframes += 1;

		}



	}
	console.log('Number of VISIBLE content iFrames detected:', numVisibleIframes);
	console.log('Total number of words extracted:', contentWithBounds.length);

	// console.log('contentWithBounds:',contentWithBounds);

	// TRACK INDEXES THAT NEED VERITICAL SPACING / BREAKS FOR NEW PARAGRAPHS
	// calculate vertical spacing
	contentWithBounds = contentWithBounds.map(function (current, index) {
		if (index + 1 < contentWithBounds.length) {
			let next = contentWithBounds[index + 1];
			let nextYSpace = (next.y - current.y);
			return {
				...current,
				nextYSpace
			}
		} else {
			return current;
		}
	});
	// console.log('new contentWithBounds:',contentWithBounds);
	// get unique values of vertical spacing
	uniqueVerticalSpacing = contentWithBounds.map((obj) =>
		obj.nextYSpace
	).filter(onlyUnique).filter((x) => x > 0 && typeof (x) !== 'undefined').sort(
		(a, b) => a < b ? -1 : 1
	);
	console.log('uniqueVerticalSpacing values:', uniqueVerticalSpacing);

	// // deprecate "vertical spacing detection for new paragraphs" for now
	// // the max new paragraph threshold is the *second* largest unique vertical spacing
	// // careful: Math.max(...[empty array]) returns -Infinity...
	// // this doesn't detect any new paragraphs when the spacing is the same b/w paragraphs but the line is indented
	// subsetUniqueVerticalSpacing = uniqueVerticalSpacing.slice(0,uniqueVerticalSpacing.length-1);
	// console.log('subsetUniqueVerticalSpacing:',subsetUniqueVerticalSpacing);
	// predictedNewParagraphYThreshold = Math.max(...subsetUniqueVerticalSpacing);
	// console.log('predictedNewParagraphYThreshold:',predictedNewParagraphYThreshold);

	newContent = [];
	curWordQueue = [];
	// MERGE WORDS BASED ON HORIZONTAL SPACING (E.G. TO HANDLE SOME PUNCTUATION APPEARING AS SEPARATE WORDS)
	nextWord = undefined;
	for (let i = 0; i < contentWithBounds.length - 1; i++) {
		const curWord = contentWithBounds[i];
		nextWord = contentWithBounds[i + 1];

		curWordQueue.push(curWord.text);

		// heuristic: if current word is very close to the next word and on the same line
		if ((nextWord.x1 - curWord.x2) <= 1 && curWord.y >= nextWord.y - 5 && curWord.y <= nextWord.y + 5) {
			continue;
		} else {
			// current word is "spaced" from next word. wrap up this word
			const newWord = curWordQueue.join('');
			newContent.push(newWord);
			curWordQueue = [];

			// // deprecate "vertical spacing detection for new paragraphs" for now
			// // logic to enter paragraph breaks, for paragraph pausing: check if next word is a different "paragraph"
			// // make sure the new paragraph threshold is non-zero
			// if (predictedNewParagraphYThreshold > 0 && curWord.nextYSpace > predictedNewParagraphYThreshold) {
			// 	// this actually works because this is considered a word but is actually rendered as HTML in the reader
			// 	newContent.push("<br/>");
			// }
		}

	}
	// we're done iterating through the "words" to fix punctuation
	// but we might still have something left in the queue. so add it
	newContent.push(curWordQueue.join(''));
	console.log('Total number of words after processing:', newContent.length);


	// also add the last word, because we haven't processed it
	if (nextWord) {
		newContent.push(nextWord.text);
	} else if (contentIframes.length > 0) {
		// only show this second error if a page was detected, but no words found
		console.warn('Only found 0 or 1 word?');
		// alert('ERROR: SwiftRead detected a page, but could not extract any text on this page.');
		alert('ERROR: SwiftRead does not support Kindle Cloud Reader.');
		chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'error', eventAction: 'only-zero-or-one-word-in-kindle-book', eventLabel: window.location.href }, function (response) { });
	}

	// console.log('newContent:',newContent);

	delete contentWithBounds;


	console.log('Total number of words final:', newContent.length)
	content = newContent.join(" "); // join with space, so words are "separated". join with paragraph separators later?
	console.log('Total number of characters with spaces:', newContent.length)
	// console.log(content);



	// track event
	chrome.runtime.sendMessage({
		action: "pushEvent",
		eventCategory: 'read-format',
		eventAction: 'extract-text',
		eventLabel: 'kindle-cloud',
		eventValue: newContent.length
	}, function (response) {
		// console.log('pushEvent response:',response);
	});

	// send extracted text
	chrome.runtime.sendMessage({ action: "extractor", html: content, keepRaw: true, source: 'kindle-cloud-reader' }, function (response) {
		console.log('Sent extracted text with number of characters:', content.length)
	});


}

