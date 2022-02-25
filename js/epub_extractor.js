let currentTab;
let pacerIndexCount = 0;

let viewer;
let viewerBounds;

let iframe;
let iframeDocument;

const TAGS_TO_KEEP = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'U', 'I', 'B', 'P', 'EM', 'DEL', 'SMALL', 'BLOCKQUOTE', 'OL', 'UL', 'LI', 'CAPTION', 'CODE', 'TABLE', 'TD', 'TR', 'FIGCAPTION'];

function getUserIsPRO() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "userIsPRO" }, function (response) {
            // console.log('userIsPRO message response:', response);
            if (response.success === true) resolve(response.isPRO);
            else reject();
        })
    });
}
async function checkShowePub(callback) {
    // get if user is a PRO user. if so, redirect to reader
    const userIsPRO = await getUserIsPRO();
    if (userIsPRO === true) {
        // execute normally
        callback();
    } else {
        // otherwise, redirect to landing page with explanation
        chrome.runtime.sendMessage({ action: "redirectToPaid", featureName: "epub_reader" }, function (response) {

        });
    }

}


function bfsKeepNodes(body, debug = false) {
    const queue = [];
    let currentEl = body;
    let currentTagName;

    let nodesToKeep = [];

    function pushChildren(currentEl) {
        for (let i = 0; i < currentEl.children.length; i++) {
            queue.push(currentEl.children[i]);
        }
    }
    function innerTextLengthOfChildren(currentEl) {
        const currentChildren = Array.prototype.slice.call(currentEl.children);
        const childInnerTextLengths = currentChildren.map((childEl) => childEl.innerText.length);
        const childInnerTextLength = childInnerTextLengths.reduce((partialSum, a) => partialSum + a, 0);
        return childInnerTextLength;
    }

    while (currentEl) {

        // if (debug) console.log('currentEl: ', currentEl);
        currentTagName = currentEl.tagName.toUpperCase();
        // if (debug) console.log('currentTagName: ', currentTagName);
        if (debug) console.log(currentEl.getBoundingClientRect());

        // check if current node is a node to keep
        if (TAGS_TO_KEEP.includes(currentTagName)) {
            nodesToKeep.push(currentEl);
            // keep the current node and do NOT push its children
        }
        else {
            // it's something like a body, div or a span
            // if div, some edge cases to handle
            if (currentTagName === 'DIV') {
                // edge case for div: div only contains text
                if (currentEl.innerText.length > 0 && currentEl.children.length === 0) {
                    nodesToKeep.push(currentEl);
                }
                // edge case for div: div has text as a direct descendant but also children 
                else if (currentEl.innerText.length > innerTextLengthOfChildren(currentEl) && currentEl.children.length > 0) {
                    nodesToKeep.push(currentEl);
                }
                // otherwise, push all children
                else {
                    pushChildren(currentEl);
                }

            }
            // otherwise, push all the children
            else {
                pushChildren(currentEl);
            }

        }
        currentEl = queue.shift(); // could be undefined

    }

    // console.log('nodesToKeep: ', nodesToKeep);
    return nodesToKeep;

}

// BFS to properly tokenize text
function traverseAndTokenize(root) {

    const queue = [];

    var wordIndexCount = 0;

    while (root) {
        // console.log('current node: ', root);

        // queue traversal with current node's children
        [...root.children].forEach(child => queue.push(child));

        // process current node
        $(root).contents().each(function () {
            // console.log('nodeType: ', this.nodeType);
            // console.log('content: ', this);

            let nonWhitespace = /(\S+)/gm;

            // if nodeType is text
            if (this.nodeType == 3) {
                var text = this.nodeValue; // text
                var matches = text.split(nonWhitespace); // words and spaces
                // console.log('tokens :', matches);

                // we split on actual words, e.g. we didn't get the single token array [""]
                if (matches.length !== 1) {

                    // add the span to all words
                    // add another span to all spaces
                    var curWordsWithSpan = [];
                    for (var i = 0; i < matches.length; i++) {
                        var curWord = matches[i];
                        var curWordTrimmed = curWord.trim();
                        // console.log('word: ', curWord);
                        // console.log('length: ', curWord.length);

                        // if word is not empty string
                        if (curWord !== '') {
                            // determine the token type
                            if (curWordTrimmed.length === 0) {
                                // trimmed word is empty
                                tokenType = 'space';
                            } else {
                                tokenType = 'word';
                            }
                            // console.log('tokenType: ', tokenType);

                            var oldWordLength = curWord.length;
                            // leave spaces alone
                            if (tokenType == 'space') {

                            }

                            // put spans around tokens
                            // some data is populated with 0 because these will be populated later
                            if (tokenType !== 'word') {
                                // curWord = "<span class='sr-token sr-token-" + tokenType + "' data-type='" + tokenType + "' data-index='" + pacerIndexCount + "' >" + curWord + "</span>";
                            } else {
                                curWord = "<span class='sr-token sr-token-" + tokenType + "' data-type='" + tokenType + "' data-index='" + pacerIndexCount + "' data-word-index='0' >" + curWord + "</span>";
                                wordIndexCount++;
                            }
                            // console.log('curWord: ', curWord);
                            curWordsWithSpan.push(curWord);
                            pacerIndexCount++;

                        }
                    }

                    curWordsWithSpan = curWordsWithSpan.join('');
                    // console.log('curWordsWithSpan: ', curWordsWithSpan);

                    // change inline
                    $(this).replaceWith(curWordsWithSpan);

                }

            }

        });

        // continue traversal
        root = queue.shift();

    }

}

function getVisibleNodesInIframe(iframe, nodesToKeep, debug = false) {
    const iframeBounds = iframe.getBoundingClientRect();
    if (debug) console.log('iframe bounds: ', iframeBounds);

    let visibleNodes = [];

    for (let i = 0; i < nodesToKeep.length; i++) {
        let currentNode = nodesToKeep[i];
        const currentNodeBounds = currentNode.getBoundingClientRect();
        const currentNodeOffset = $(currentNode).offset();

        if (debug) console.log('currentNode: ', currentNode);
        if (debug) console.log('currentNodeBounds: ', currentNodeBounds);
        if (debug) console.log('currentNodeOffset: ', currentNodeOffset);

        // get if node is partially visible
        const viewerMinX = viewerBounds.x;
        const viewerMaxX = viewerMinX + viewerBounds.width;
        const viewerMinY = viewerBounds.y;
        const viewerMaxY = (viewerMinY + viewerBounds.height);

        if (debug) console.log('viewer x min:', viewerMinX);
        if (debug) console.log('viewer x max:', viewerMaxX);
        if (debug) console.log('viewer y min:', viewerMinY);
        if (debug) console.log('viewer x max:', viewerMaxY);

        if (
            (
                (
                    ((currentNodeBounds.x + currentNodeBounds.width) + iframeBounds.x) > viewerMinX
                    && ((currentNodeBounds.x + currentNodeBounds.width) + iframeBounds.x) < viewerMaxX
                ) || (
                    (currentNodeBounds.x + iframeBounds.x) > viewerMinX
                    && (currentNodeBounds.x + iframeBounds.x) < viewerMaxX
                )
            ) && (
                (
                    ((currentNodeBounds.y + currentNodeBounds.height) + iframeBounds.y) > viewerMinY
                    && ((currentNodeBounds.y + currentNodeBounds.height) + iframeBounds.y) < viewerMaxY
                ) || (
                    (currentNodeBounds.y + iframeBounds.y) > viewerMinY
                    && (currentNodeBounds.y + iframeBounds.y) < viewerMaxY
                )
            )
        ) {
            if (debug) console.log('is visible? ', true);
            visibleNodes.push(currentNode);
        } else {
            if (debug) console.log('is visible? ', false);
        }
    }

    // console.log('visibleNodes: ', visibleNodes);
    return visibleNodes;
}

function getCssProperty(elem, property) {
    return window.getComputedStyle(elem, null).getPropertyValue(property);
}
function extractVisibleNodesFromIframe(iframe, body) {

    const nodesToKeep = bfsKeepNodes(body);
    // console.log('iframe: ', iframe);
    // console.log('nodesToKeep: ', nodesToKeep);

    let visibleNodes = getVisibleNodesInIframe(iframe, nodesToKeep);
    // console.log('visibleNodes: ', visibleNodes);
    let processedVisibleNodes = [];

    // tokenize "visible" words with sr-token divs
    for (let i = 0; i < visibleNodes.length; i++) {
        let curVisibleNode = visibleNodes[i];
        traverseAndTokenize(visibleNodes[i]);
        let visibleNodeClone = curVisibleNode.cloneNode(true);

        // iterate through sr-tokens in this node, check if visible (so we only show visible WORDS)
        $(curVisibleNode).find('.sr-token').each(function () {
            // console.log('token: ', this);
            let visibleTokens = getVisibleNodesInIframe(iframe, [this]);
            // console.log('visibleTokens: ', visibleTokens);

            if (visibleTokens.length === 0) {
                // console.log('token was NOT visible');
                let dataIndex = $(this).data('index');
                let nonVisibleWordClone = $(visibleNodeClone).find('[data-index="' + dataIndex + '"]');
                // console.log('removing non visible word in ghost dom: ', nonVisibleWordClone);
                // remove element from ghost dom
                nonVisibleWordClone.remove();
            }
            else {
                // console.log('token was visible');
            }
        });

        // TODO: clean up sr-token tags for readability? yeah probably...
        // console.log('processed visibleNodeClone: ', visibleNodeClone);
        processedVisibleNodes.push(visibleNodeClone);
    }

    return processedVisibleNodes;
}

function extractText(fromSwiftRead = false) {
    const readerBounds = document.body.getBoundingClientRect();
    // console.log('reader: ', document.body);
    // console.log('readerBounds: ', readerBounds);

    viewerDiv = document.getElementById('viewer');
    // console.log('viewerDiv: ', viewerDiv);
    viewerBounds = viewerDiv.getBoundingClientRect();
    // console.log('viewerBounds: ', viewerBounds);

    var iframes = viewerDiv.getElementsByTagName("iframe");
    // console.log('iframes: ', iframes);

    if (iframes.length > 0) {
        iframe = iframes[0];
        // console.log('iframe: ', iframe);
        // console.log('iframe bounds: ', iframe.getBoundingClientRect());

        iframeDocument = iframe.contentWindow.document;
        // console.log('iframeDocument: ', iframeDocument);

        const iframeDocumentBounds = iframeDocument.body.getBoundingClientRect();
        // console.log('iframeDocumentBounds: ', iframeDocumentBounds);

        var innerText = iframeDocument.body.innerText.trim();
        // console.log('innerText: ', innerText);

        // only open swiftread if there's text on this page (not just images)
        if (innerText.length === 0 && fromSwiftRead === false) {
            alert("There doesn't seem to be any text on this page. Please turn to a page with text then open SwiftRead.");
            return;
        }
        else {
            // return only visible html
            let visibleNodes = extractVisibleNodesFromIframe(iframe, iframeDocument.body);
            let visibleHTML = "";
            for (let i = 0; i < visibleNodes.length; i++) {
                const visibleNode = visibleNodes[i];
                const innerHTML = visibleNode.innerHTML;
                const outerHTML = visibleNode.outerHTML;
                let transformedInnerHTML = innerHTML;
                // transformers
                if (visibleNode.tagName === 'DIV') {
                    // if visible node is a div, enclose everything on the inside with a p and add the inner HTML
                    transformedInnerHTML = '<p>' + transformedInnerHTML + '</p>';
                    visibleHTML += transformedInnerHTML;
                }
                else {
                    // otherwise, add the element's complete HTML
                    visibleHTML += outerHTML;
                }
            }

            // console.log('visibleHTML: ', visibleHTML);
            // console.log('visibleHTML length: ', visibleHTML.length);

            // check that we extracted text when we were supposed to
            if (visibleHTML.length === 0 && innerText.length > 0) {
                alert("SwiftRead could not extract from this page, even though text was detected. Please report this bug to help@swiftread.com and attach this ePub file.");
                return;
            } else if (visibleHTML.length === 0) {
                alert("SwiftRead could not detect any text on this page. If you think this is an error, please report to help@swiftread.com and attach this ePub file.");
                return;
            }

            return visibleHTML;
        }
    } else {
        alert('No ePub frame detected. Send ePub and this error message to help@swiftread.com');
    }

}

function getePubNumChars() {
    var viewerDiv = document.getElementById('viewer');
    var iframes = viewerDiv.getElementsByTagName("iframe");
    if (iframes.length > 0) {
        var iframe = iframes[0].contentWindow.document;
        if (iframe.body) return iframe.body.innerHTML.length;
        else return 0;
    } else {
        return 0;
    }
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
function sendExtractedTextAndOpenSwiftRead(html, setVarsForPageTurn = true) {
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
            chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'error', eventAction: 'epub-reader-no-currentTab-in-autoextract' }, function (response) {
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
    chrome.runtime.sendMessage({ action: "pushEvent", eventCategory: 'read-format', eventAction: 'extract-text', eventLabel: 'epub' }, function (response) {
    });

    if (html) {
        setCurrentTabIdPromise.then(() => {
            // send extracted text
            // console.log('sending extracted text...');
            return sendMessagePromise({ action: "extractor", html: html, keepRaw: false });
        }, (errorMsg) => {
            alert("Error extracting text: " + errorMsg + " \n\nPlease close this tab, re-open it, and try again. If this error re-occurs, please email help@swiftread.com with a screenshot.");
        }).then(() => {
            // open spreed window
            // console.log('opening window...');
            chrome.runtime.sendMessage({ action: "openSpreedWithText" }, function (response) {
                if (response.success) {
                    // console.log('open swiftread successful');
                    setTimeout(() => {
                        const oldClasses = document.getElementById('swiftread').className;
                        // console.log('oldClasses: ', oldClasses);
                        document.getElementById('swiftread').className = oldClasses.replaceAll('loading', '');
                    }, 1000);

                }
            });
        }, (errorMsg) => {
            alert("Error extracting text: " + errorMsg + " \n\nPlease close this tab, re-open it, and try again. If this error re-occurs, please email help@swiftread.com with a screenshot.");
        });
    }


}

function openSwiftReadOnePub() {

    checkShowePub(function () {
        // extract rendered text
        const html = extractText();

        // open swiftread with it
        sendExtractedTextAndOpenSwiftRead(html);
    });

}

function getCurrentTab() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "getCurrentTab" }, function (response) {
            if (response.success === true) {
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

window.addEventListener('DOMContentLoaded', async function () {


    // get current tab
    // console.log('getting current tab...');
    currentTab = await getCurrentTab(); // TODO: can this fail?
});

// listen to chrome command to auto extract
chrome.commands.onCommand.addListener(async function (command) {
    // make sure command is on this tab / this tab is active
    const isOnCurrentTab = await currentTabIsActive();
    // console.log('chrome command detected. isOnCurrentTab:', isOnCurrentTab);

    if (isOnCurrentTab && command === 'open-spreed') {
        if (!document.getElementById('swiftread').className.includes('loading')) {
            document.getElementById('swiftread').className += ' loading';
        }
        // check if there's selected text
        var selection = window.getSelection();
        // console.log('selection length: ', selection.toString().length);

        if (selection.rangeCount > 0 && selection.toString().length > 0) {
            // console.log('detected selection');
            const text = selection.toString();
            // send and open, but disable page turn
            sendExtractedTextAndOpenSwiftRead(text, setVarsForPageTurn = false);
        } else {
            // if there's no selected text, auto-extract
            openSwiftReadOnePub();
        }

    }
});

function waitUntilPageChanged() {
    let prevNumChars = getePubNumChars();
    let numIterationsConstant = 0;
    let curNumChars;
    const timeout = 5000;
    let timeElapsed = 0;

    return new Promise((resolve, reject) => {
        let check = setInterval(function () {
            curNumChars = getePubNumChars();
            if (curNumChars !== prevNumChars) {
                prevNumChars = curNumChars;
            } else {
                numIterationsConstant += 1;
            }
            if (numIterationsConstant >= 10) {
                clearInterval(check);
                resolve(true);
            }
            timeElapsed += 10;
            if (timeElapsed >= timeout) {
                clearInterval(check);
                reject("Wait for ePub page change timed out");
            }
        }, 10);
    });
}

// SET UP MESSAGE LISTENERS
chrome.runtime.onMessage.addListener(

    function (request, sender, sendResponse) {
        // console.log('message received:',request);

        let sourceTabId;
        switch (request.action) {
            case "ePubPageTurn":

                (async () => {

                    sourceTabId = request.sourceTabId;
                    const forward = request.forward;
                    // console.log('forward:', forward);

                    // get page turn button
                    let pageTurnButton;
                    if (forward === true) {
                        pageTurnButton = document.getElementById("next");
                    } else {
                        pageTurnButton = document.getElementById("prev");
                    }

                    if (!pageTurnButton || pageTurnButton.style.visibility === 'hidden') {
                        // there wasn't a next page
                        sendResponse({ success: false, status: 'no-next-page' });
                        return;
                    }

                    // actually turn the page
                    pageTurnButton.click();

                    // console.log('getePubNumChars:', getePubNumChars());
                    // wait until new page is loaded
                    await waitUntilPageChanged();

                    // console.log('getePubNumChars:', getePubNumChars());
                    // extract content but pass in the fact that this was from an open swiftread window
                    const html = extractText(fromSwiftRead = true);

                    await sendMessagePromise({ action: "extractor", html: html, keepRaw: false });

                    // send it to spreed and reload
                    chrome.runtime.sendMessage({ action: "reloadSpreed" }, function (response) {
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