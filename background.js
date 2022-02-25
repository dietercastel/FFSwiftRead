var state = {
  openedProLanding: false,
  openedProWindowId: null,
  openedProTabId: null,
  settingsStore: null
}

var curTabUrl = "";
var completedFlag = false;

console.log('extension id: ', chrome.runtime.getURL(""));


// settings
async function getUserLicense() {
  return state.settingsStore.getSettingFromStorage(state.settingsStore.USER_LICENSE_KEY);
}
function getDefaultUserFeatures() {
  return state.settingsStore.getDefaultSettings()[state.settingsStore.USER_SETTINGS_JSON_KEY];
}
async function getUserFeatures() {
  return state.settingsStore.getSettingFromStorage(state.settingsStore.USER_SETTINGS_JSON_KEY);
}
async function userIsPRO() {
  const userFeatures = await getUserFeatures();
  const defaultUserFeatures = getDefaultUserFeatures();
  const userLicense = await getUserLicense();
  console.log('userFeatures:', userFeatures);
  console.log('defaultUserFeatures:', defaultUserFeatures);
  console.log('userLicense:', userLicense);

  return (JSON.stringify(userFeatures).length !== JSON.stringify(defaultUserFeatures).length && userLicense !== null);
}

var settingsStore = new SettingsStore();
settingsStore.isInitialized.then(function () {
  state.settingsStore = settingsStore;
});

// // maybe one day i'll bring up the updated screen to remind users of spreed
// function onUpdate() {
//     //console.log("Extension Updated");
//     chrome.tabs.create({url: "updated.html"});

//     localStorage.setItem("notfirsttime",0);
//     localStorage.setItem("selectedText","");
// }

// function getVersion() {
//     var details = chrome.app.getDetails();
//     return details.version;
// }

// // Check if the version has changed.
// var currVersion = getVersion();
// var prevVersion = localStorage['spreed-version']
// if (currVersion != prevVersion) {
// // Check if we just installed this extension.
// if (typeof prevVersion == 'undefined') {
//   onInstall();
// } else {

//   //check if major update (3 or fewer version number)
//   tokens = currVersion.split('.');
//   if (tokens.length<=3) {
//     onUpdate();
//   }
// }
//   localStorage['spreed-version'] = currVersion;
// }

// on install
chrome.runtime.onInstalled.addListener(function (object) {
  if (chrome.runtime.OnInstalledReason.INSTALL === object.reason) {
    // alert('installed for first time');
    chrome.tabs.create({ url: "start.html" });
  } else if (chrome.runtime.OnInstalledReason.UPDATE === object.reason) {

  }
});

// on uninstall
chrome.runtime.setUninstallURL("https://swiftread.com/uninstalled");




// LOGIC TO GET CURRENTLY ACTIVE TAB
var activeTabId;

chrome.tabs.onActivated.addListener(function (activeInfo) {
  activeTabId = activeInfo.tabId;
  console.log('setting activeTabId:', activeTabId);
});

function getActiveTab(callback) {

  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    var tab = tabs[0];

    // console.log('active tab:',tab);


    if (typeof (tab) !== "undefined" && tab.hasOwnProperty("url") === true) {
      // console.log('returning active tab:',tab);
      callback(tab);
    } else {
      chrome.tabs.get(activeTabId, function (tab) {
        if (tab) {
          // console.log('returning active tab after fetching it:',tab);
          callback(tab);
        } else {
          // console.error('No active tab identified.');
        }
      });

    }

  });
}





var waitUntil = function (fn, condition, interval, timeout = 2000) {
  interval = interval || 100;

  const maxTries = timeout / interval;
  let tries = 0;

  var shell = function () {
    var timer = setInterval(
      function () {
        if (tries === maxTries) {
          clearInterval(timer);
          delete timer;
        }

        var check;

        try { check = !!(condition()); } catch (e) { check = false; }

        if (check) {
          clearInterval(timer);
          delete timer;
          fn();
        }

        tries++;
      },
      interval
    );
  };

  return shell;
};



function strip(html, keepStyles = false) {

  let targetNodeNames = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'U', 'I', 'B', 'P', 'EM', 'DEL', 'SMALL', 'OL', 'UL', 'LI'];
  // console.log('initial html: ', html);

  if (keepStyles === true) {

    const anyTagR = /<\/?((\w+)\s?.*?)>/ig;
    const allTagMatches = [...html.matchAll(anyTagR)];
    // console.log('allTagMatches: ', allTagMatches);

    // replace non target tags
    let newHTML = '';
    let curIndex = 0;
    for (let i = 0; i < allTagMatches.length; i++) {
      const curMatch = allTagMatches[i];
      // console.log('curMatch: ', curMatch);
      const curTag = curMatch[2];
      const curTagContent = curMatch[1];

      // add any text preceding the tag
      if (curMatch.index > curIndex) {
        newHTML += html.slice(curIndex, curMatch.index);
        // console.log('newHTML after adding text preceding tag: ', newHTML);
      }
      // add the tag
      const newTag = curMatch[0].replace(
        curTagContent,
        targetNodeNames.includes(curTag.toUpperCase()) ? curTag : "span"
      );
      newHTML += newTag;
      // console.log('newHTML after adding new tag: ', newHTML);
      curIndex = curMatch.index + curMatch[0].length;

    }
    // add any text after last tag, if any
    if (curIndex < html.length) {
      newHTML += html.slice(curIndex, html.length);
    }

    // remove the span tags
    newHTML = newHTML.replaceAll('<span>', '');
    newHTML = newHTML.replaceAll('</span>', '');

    // console.log('new html: ', newHTML);

    return newHTML;

  } else {
    // shortcut: get the "inner HTML"
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    // any < > to be rendered should ber replaced with the html code already

    let finalContent = tmp.textContent || tmp.innerText || "";
    // make sure to replace any < > with the html code
    finalContent = finalContent.replace(/\</g, '&lt;');
    finalContent = finalContent.replace(/\>/g, '&gt;');

    // console.log('finalContent with all tags stripped: ', finalContent);

    return finalContent;
  }

}



function openSpreed() {
  // console.log('openSpreed() called...');

  //get url
  //getAndStoreUrl();

  //get html
  //getAndStoreHtml();

  setTimeout(function () { setupPopupWindow() }, 500);

}

//TEXT SELECTION HOTKEY
/* The function that finds and returns the selected text */
var funcToInject = function () {
  var selection = window.getSelection();
  return (selection.rangeCount > 0) ? selection.toString() : '';
};

/* This line converts the above function to string
 * (and makes sure it will be called instantly) */
var jsCodeStr = ';(' + funcToInject + ')();';



function preAutoExtractContent(tab) {
  // set currently active tab
  // console.log('tab:',tab);
  localStorage.setItem("currentTabId", tab.id);

  // set currently active tab
  let url = new URL(tab.url);
  if (!url) {
    pushEvent("error", "null-url-in-preAutoExtractContent", JSON.stringify(tab));
  }
  try {
    // try extracting domain, url could be null
    let domain = url.hostname;
    localStorage.setItem("currentDomain", domain);
  } catch (error) {
    pushEvent("error", "thrown-error-when-setting-currentDomain-in-preAutoExtractContent", JSON.stringify(tab));
  }

  // reset selected text
  localStorage.setItem("selectedText", "");
}

let executeScriptsForKindle = function (tab) {
  // extract text from amazon kindle cloud reader
  // console.log('executing kindle content extractor...');
  executeScriptsForKindleTabId(tab.id);
};
let executeScriptsForKindleTabId = function (tabId) {
  pushEvent("content-extractor", "run-kindle-cloud");
  console.log('RUNNING KINDLE CLOUD READER EXTRACTION SCRIPT');
  chrome.tabs.executeScript(tabId, { file: "jquery.js" });
  chrome.tabs.executeScript(tabId, { file: "js/settings_store.js" });
  chrome.tabs.executeScript(tabId, { file: "js/kindle_cloud_reader_extractor.js" });
}

let executeScriptsForGdocs = function (tab) {
  executeScriptsForGdocsTabId(tab.id);
}
let executeScriptsForGdocsTabId = function (tabId) {
  // console.log('injecting gdcos scripts into:',tabId);
  pushEvent("content-extractor", "run-google-doc");
  chrome.tabs.executeScript(tabId, { file: "jquery.js" });
  chrome.tabs.executeScript(tabId, { file: "js/settings_store.js" });
  chrome.tabs.executeScript(tabId, { file: "js/google_docs_extractor.js" });
}
async function handleAutoExtractContent(tab, domain, pollDomain) {

  console.log('attempting to auto extract content:');
  console.log('tab:', tab);
  console.log('domain:', domain);
  console.log('pollDomain:', pollDomain);

  // check if on kindle cloud reader
  if (
    domain !== null &&
    (
      domain.includes('read.amazon')
      || domain.includes('leer.amazon')
      || domain.includes('lire.amazon')
      || domain.includes('lesen.amazon')
      || domain.includes('leggi.amazon')
      || tab.title.toLowerCase().includes('kindle cloud reader')
    )
  ) {

    preAutoExtractContent(tab);

    // user must be on PRO
    if (await userIsPRO() === true) {

      // console.log('on amazon cloud reader...');
      executeScriptsForKindle(tab);

    } else {
      // if user is a free user, do NOT redirect to the Pro purchase page for kindle cloud reader anymore
      // since support was dropped in May 2021

      // attemptRedirectToPaid('kindle_cloud_extract', tab.url + ", " + tab.title);
    }



  }

  else if (domain.includes('docs.google.com')) {
    // reset selected text
    preAutoExtractContent(tab);

    if (await userIsPRO() === true) {

      executeScriptsForGdocs(tab);

    }
    else {
      attemptRedirectToPaid('google_docs_extract', tab.url + ", " + tab.title);
    }

  }
  // other page
  else {
    if (pollDomain === null) {
      // reset selected text
      preAutoExtractContent(tab);

      pushEvent("content-extractor", "run-misc");
      console.log('executing jquery script...');
      await chrome.tabs.executeScript(tab.id, { file: "jquery.js" });
      console.log('executing extractor script...');
      await chrome.tabs.executeScript(tab.id, { file: "extractor.js" });
    }

  }
}
function autoExtractContent(pollDomain = null, tabId = null) {

  let url = null;
  let domain = null;
  console.log('---autoExtractContent---');
  if (tabId === null) {
    getActiveTab(function (tab) {
      console.log('get active tab in auto extract content:', tab);
      // active tab might not have a url (like if it's the extensions page)
      try {
        url = new URL(tab.url);
        localStorage.setItem("curUrl", url);
        if (!url) {
          pushEvent("error", "null-url-in-autoExtractContent", JSON.stringify(tab));
        }

        domain = url.hostname;
        localStorage.setItem("curDomain", domain);

      }
      catch (err) {
        console.error(err);
        console.error(tab);
        pushEvent("error", "error-in-active-tab-autoExtractContent", JSON.stringify(err));
      }
      handleAutoExtractContent(tab, domain, pollDomain);
    });

  } else {
    // TODO: make sure user has tabs permission enabled at this point
    console.log('get specific tab in auto extract content:', tabId);
    chrome.tabs.get(tabId, function (tab) {

      // if there was a chrome API error
      if (chrome.runtime.lastError) {
        var errorMsg = chrome.runtime.lastError.message
        pushEvent("error", "could-not-get-specific-tabId-in-autoExtractContent", errorMsg);
      }

      try {
        url = new URL(tab.url);
        localStorage.setItem("curUrl", url);
        if (!url) {
          pushEvent("error", "null-url-in-autoExtractContent", JSON.stringify(tab));
        }

        domain = url.hostname;
        localStorage.setItem("curDomain", domain);

      }
      catch (err) {
        console.error(err);
        console.error(tab);
        pushEvent("error", "error-in-specific-tab-autoExtractContent", JSON.stringify(err));
      }
      // console.log('tab-specific auto extract:', url, domain, tab);
      handleAutoExtractContent(tab, domain, pollDomain);
    });

  }

}

function openSpreedWithText(callback = null) {
  //wait until selected text is set again, shouldn't take more than a few seconds
  waitUntil(
    function () {
      // the code you want to run here...
      console.log('open swiftread after non-empty selected text');
      openSpreed();

      if (callback) callback();
    },
    function () {
      // the code that tests here... (return true if test passes; false otherwise)
      return !!(localStorage.getItem('selectedText') !== '');
    },
    50 // amount to wait between checks
  )();
}
function autoExtractContentAndOpenSpreed() {
  console.log('auto extract and open swiftread called');
  autoExtractContent();

  openSpreedWithText();

}


// event tracking
// use pushEvent from analytics.js



// redirect
function attemptRedirectToPaid(settingKey, eventData = null) {
  pushEvent("in-app-upgrade-redirect", settingKey, eventData);
  if (state.openedProLanding === false) {
    redirectToPaid(settingKey);
  }
  else if (state.openedProWindowId !== null && state.openedProTabId !== null) {
    // try to redirect to existing pro page
    // focus on window of pro page
    chrome.windows.update(state.openedProWindowId, { focused: true }, function (window) {

      if (chrome.runtime.lastError) {
        // can't show window
        console.error(chrome.runtime.lastError.message);

        redirectToPaid(settingKey);
      } else {
        // focus on tab of pro page
        chrome.tabs.update(state.openedProTabId, { active: true }, function (tab) {
          if (chrome.runtime.lastError) {
            // can't show tab, maybe because it was closed already
            // console.error(chrome.runtime.lastError.message);

            redirectToPaid(settingKey);
          }
        });
      }

    });
  }
}
function redirectToPaid(featureName) {
  chrome.tabs.create(
    {
      url: "https://swiftread.com/pro?utm_source=extension&utm_medium=internal&utm_campaign=pro_feature_" + featureName
    },
    function (tab) {
      // focus the window that the new tab is in
      chrome.windows.update(tab.windowId, { focused: true });

      // track that we've redirected once already
      state.openedProLanding = true;
      state.openedProWindowId = tab.windowId;
      state.openedProTabId = tab.id;
    }
  );

}

// open spreed hokey
chrome.commands.onCommand.addListener(function (cmd) {
  if (cmd === 'open-spreed') {

    getActiveTab(function (tab) {

      // only execute on non-pdf.js pages
      if (tab.url && tab.url.includes('extension://') && tab.url.includes('pdf.js')) {
        console.log('SwiftRead not run. Page like PDF reader detected, which should have its own command listener.');
      } else if (tab.url && tab.url.includes('extension://') && tab.url.includes('epub_reader')) {
        console.log('SwiftRead not run. Page like ePub reader detected, which should have its own command listener.');
      } else {

        //alert('open spreed hotkey pressed');
        /* Inject the code into all frames of the active tab */
        chrome.tabs.executeScript({
          code: jsCodeStr,
          allFrames: true   //  <-- inject into all frames, as the selection
          //      might be in an iframe, not the main page
        }, function (selectedTextPerFrame) {
          if (chrome.runtime.lastError) {
            /* Report any error */
            // this should only happen if user tries to read a chrome extension page (internal or external)
            console.error('WARNING: SwiftRead not run. Try selecting text, right-clicking, then clicking "SwiftRead selected text". Error: ' + chrome.runtime.lastError.message);
            alert('SwiftRead isn\'t able to auto-extract content from Chrome extension pages. Try selecting text, right-clicking, then clicking "SwiftRead selected text". If you think this is an error, email help@swiftread.com with a screenshot.');
          }
          // console.log('selectedTextPerFrame: ', selectedTextPerFrame);

          if (selectedTextPerFrame && (selectedTextPerFrame[0].length > 0) && (typeof (selectedTextPerFrame[0]) === 'string')) {

            //alert('something selected');
            /* The results are as expected */
            // console.log('Selected text: ' + selectedTextPerFrame[0]);


            //alert(selectedTextPerFrame[0].length);
            localStorage.setItem("openMode", "3");
            localStorage.setItem("keepRaw", 'true');
            localStorage.removeItem("currentDomain");
            localStorage.setItem("selectedText", selectedTextPerFrame[0]);
            setupPopupWindow();
          }

          else if (selectedTextPerFrame && selectedTextPerFrame[0].length == 0) {
            //nothing selected, we want to auto content extract
            localStorage.setItem("openMode", "1");
            autoExtractContentAndOpenSpreed();
          } else if (!selectedTextPerFrame) {
            // likely because of some error above that prevented spreed from recognizing that there's either no or some selected text
          }


        });

      }



    });
  }


});






chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {

    // console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
    // console.log('message received:',request);
    //alert('message received');

    if (request.action == "divSelect") {
      if (request.allText.length > 0) {
        localStorage.setItem("openMode", "2");
        localStorage.removeItem("currentDomain");
        localStorage.setItem("selectedText", request.allText);
        //test = localStorage.getItem("allText");
        //alert(test);
        //sendResponse({farewell: "goodbye"});

      }
    }


    else if (request.action == "openSpreedFromButton") {
      let openMode = 0;
      if (request.hasOwnProperty("openMode") === true) {
        openMode = request.openMode;
      }
      localStorage.setItem("openMode", openMode.toString());
      sendResponse({
        success: true
      });
      autoExtractContentAndOpenSpreed();
    }

    else if (request.action == "getCurDomain") {
      sendResponse({
        curDomain: localStorage.getItem("curDomain"),
        extensionUrl: localStorage.getItem("extensionUrl"),
        curUrl: localStorage.getItem("curUrl")
      });
    }

    else if (request.action == "addToBlacklist") {
      blacklistString = localStorage.getItem("blacklist");
      blacklistString += ", " + request.curDomain;
      localStorage.setItem("blacklist", blacklistString);
      sendResponse({
        success: true
      });
    }

    else if (request.action == "openSpreedWithPasted") {
      localStorage.setItem("openMode", "6");
      localStorage.setItem("keepRaw", 'true');
      localStorage.removeItem("currentDomain");
      localStorage.setItem("selectedText", request.pastedText);
      setTimeout(function () { setupPopupWindow() }, 0);
      sendResponse({
        success: true
      });
    }

    else if (request.action == "extractor") { //the end point for all auto content extractor calls
      // console.log('extracted html received:', request.html);
      console.log('extracted html received char length:', request.html.length);

      // if told to keep raw
      if (request.keepRaw && request.keepRaw === true) {
        localStorage.setItem("selectedText", request.html);
        localStorage.setItem("keepRaw", 'true');
      } else {
        // otherwise, keep the style tags (e.g. for a website), strip other HTML tags
        let htmlStripped = strip(request.html, keepStyles = true);

        // console.log('htmlStripped:',htmlStripped);
        localStorage.setItem("selectedText", htmlStripped);
        localStorage.setItem("keepRaw", 'false');
      }

      if (request.hasOwnProperty('source') && request.source === 'kindle-cloud-reader') {
        // logging for kindle cloud reader
        console.log('Extracted text received from Kindle Cloud Reader, num characters:', request.html.length);
        console.log('Extracted text stored from Kindle Cloud Reader, num characters:', localStorage.getItem("selectedText").length);
      }

      sendResponse({
        success: true
      });
    }

    else if (request.action == "openSpreedFromMenu") {
      localStorage.setItem("openMode", "8");
      autoExtractContentAndOpenSpreed();
    }

    else if (request.action == "autoExtractContent") {
      let pollDomain = null;
      if (request.hasOwnProperty("pollDomain") === true) {
        pollDomain = request.pollDomain;
      }
      let tabId = null;
      if (request.hasOwnProperty("tabId") === true) {
        tabId = request.tabId;
      }
      autoExtractContent(pollDomain, tabId);
      sendResponse({
        success: true
      });
    }

    else if (request.action == "getExtractedContent") {
      console.log('---start---');
      console.log('getExtractedContent from tab ', sender.tab);
      if (request.hasOwnProperty('source')) {
        console.log('source:', request.source);
      }
      const extractedContent = localStorage.getItem("selectedText");
      console.log('sending extracted content. num chars: ', extractedContent.length);
      console.log('extractedContent: ', extractedContent);
      console.log('---end---');

      sendResponse({
        extractedContent: extractedContent
      });

    }

    else if (request.action == "getWPMSpeed") {
      wpm = localStorage.getItem("speed");
      chunkSize = localStorage.getItem("chunkSize");
      if (wpm == null) {
        wpm = 400;
      }
      if (chunkSize == null) {
        chunkSize = 1;
      }
      sendResponse({
        wpm: wpm,
        chunkSize: chunkSize
      });
    }

    else if (request.action == "getCurrentTab") {
      sendResponse({
        success: true,
        tab: sender.tab
      });
    }

    else if (request.action == "userIsPRO") {
      // chrome extensions api promise workaround: https://stackoverflow.com/questions/53024819/chrome-extension-sendresponse-not-waiting-for-async-function
      (async () => {
        const isPRO = await userIsPRO();
        sendResponse({
          success: true,
          isPRO: isPRO
        });
      })();
    }

    else if (request.action == "redirectToPaid") {
      attemptRedirectToPaid(request.featureName);
      sendResponse({
        success: true
      });

    }

    else if (request.action == "pushEvent") {
      // console.log('background received pushEvent:',request);
      let label = null;
      let value = null;
      if (request.hasOwnProperty('eventLabel') === true) {
        label = request.eventLabel;
      }
      if (request.hasOwnProperty('eventValue') === true) {
        value = request.eventValue;
      }

      pushEvent(request.eventCategory, request.eventAction, label, value);

      sendResponse({
        success: true
      });
    }

    else if (request.action == "openSpreedWithText") {
      console.log('openSpreedWithText received:', request);
      openSpreedWithText(() => {
        sendResponse({
          success: true
        });
      });
    }

    else if (request.action == "setVarsForPageTurn") {
      // console.log('setVarsForPageTurn request:',request);

      if (request.hasOwnProperty('currentDomain') && request.currentDomain) {
        localStorage.setItem("currentDomain", request.currentDomain);
      } else if (request.hasOwnProperty('currentDomain') && !request.currentDomain) {
        localStorage.removeItem("currentDomain");
      }

      if (request.hasOwnProperty('currentTabId') && request.currentTabId) {
        localStorage.setItem("currentTabId", request.currentTabId);
      } else if (request.hasOwnProperty('currentTabId') && !request.currentTabId) {
        localStorage.removeItem("currentTabId");
      }

      sendResponse({
        success: true
      });
    }

    else if (request.action == "storeKindleLocation") {
      localStorage.setItem("kindleLocationString", request.locationString);
      sendResponse({
        success: true
      });
    }
    else if (request.action == "storeGdocsLocation") {
      localStorage.setItem("gdocsLocationString", request.locationString);
      sendResponse({
        success: true
      });
    }
    else if (request.action == "storePDFLocation") {
      localStorage.setItem("pdfLocationString", request.locationString);
      sendResponse({
        success: true
      });
    }

    else if (request.action == "gdocsPageTurn") {
      if (request.direction === "left") chrome.tabs.executeScript(request.tabId, { file: "js/pageTurnDirection_left.js" });
      else if (request.direction === "right") chrome.tabs.executeScript(request.tabId, { file: "js/pageTurnDirection_right.js" });
      executeScriptsForGdocsTabId(request.tabId);
      sendResponse({
        success: true
      });
    }
    else if (request.action == "kindlePageTurn") {
      if (request.direction === "left") chrome.tabs.executeScript(request.tabId, { file: "js/pageTurnDirection_left.js" });
      else if (request.direction === "right") chrome.tabs.executeScript(request.tabId, { file: "js/pageTurnDirection_right.js" });
      executeScriptsForKindleTabId(request.tabId);
      sendResponse({
        success: true
      });
    }

    else if (request.action == "saveWindowDimensions") {
      localStorage.setItem("width", request.width);
      localStorage.setItem("height", request.height);
      sendResponse({
        success: true
      });
    }


    return true;

  });


chrome.browserAction.onClicked.addListener(function (tab) { //Fired when User Clicks icon next to chrome address bar
  //launch menu
});




// CONTEXT MENU
async function openSpreedWithSelection(obj) { //works
  const isPRO = await userIsPRO();

  getActiveTab(function (tab) {

    console.log('open with selection for tab:', tab);

    // if on pdf.js page and is not a pro user, don't execute
    if (tab.url && tab.url.includes('extension://') && tab.url.includes('pdf.js') && !isPRO) {
      console.log('Right-click SwiftRead run on PDF reader, user not on PRO. Redirecting.');
      attemptRedirectToPaid('pdf_reader');

    } else if (tab.url && tab.url.includes('extension://') && tab.url.includes('epub_reader') && !isPRO) {
      console.log('Right-click SwiftRead run on ePub reader, user not on PRO. Redirecting.');
      attemptRedirectToPaid('epub_reader');

    } else {
      localStorage.setItem("openMode", "4");
      // console.log('Right-click selected text: ' + obj.selectionText);
      localStorage.removeItem("currentDomain");
      localStorage.setItem("keepRaw", 'true');
      localStorage.setItem("selectedText", obj.selectionText);
      setupPopupWindow();
    }

  });

}

function setupPopupWindow() {
  console.log('setting up pop up window');

  //alert(localStorage.getItem("selectedText"));
  //window width height
  var width = 1000;
  var height = 600;

  //detect OS
  var OSName = "Unknown OS";
  if (navigator.appVersion.indexOf("Win") != -1) OSName = "Windows";
  if (navigator.appVersion.indexOf("Mac") != -1) OSName = "MacOS";
  if (navigator.appVersion.indexOf("X11") != -1) OSName = "UNIX";
  if (navigator.appVersion.indexOf("Linux") != -1) OSName = "Linux";
  //console.log(OSName);
  if (OSName == "Windows") {
    width = 1000;
    height = 600;
  }
  // console.log('default width: ' + width);
  // console.log('default height: ' + height);

  if (localStorage.getItem("width") > 0 && localStorage.getItem("height") > 0) {
    width = localStorage.getItem("width");
    height = localStorage.getItem("height");
    // console.log('opening with saved width: ' + width);
    // console.log('opening with saved height: ' + height);
  }

  width = parseInt(width);
  height = parseInt(height);
  popupwindow("app.html", "", width, height);
}

function popupwindow(url, title, w, h) {
  var left = (screen.width / 2) - (w / 2);
  var top = (screen.height / 2) - (h / 2);

  chrome.windows.create({
    url: url,
    width: Math.round(w),
    height: Math.round(h),
    top: Math.round(top),
    left: Math.round(left),
    type: "popup"
  });

  // return window.open(url, title, 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);
}

// Create selection menu
var contexts = ["selection"];
for (var i = 0; i < contexts.length; i++) {
  var context = contexts[i];
  var title = "SwiftRead selected text";
  var id = chrome.contextMenus.create({
    "title": title, "contexts": [context],
    "onclick": openSpreedWithSelection
  });
  //console.log("'" + context + "' item:" + id);
}







// PDF handling
// file handling
if (chrome.fileBrowserHandler) {
  chrome.fileBrowserHandler.onExecute.addListener((id, details) => {
    if (id === 'open-as-pdf') {
      const entries = details.entries;
      for (const entry of entries) {
        chrome.tabs.create({
          url: chrome.runtime.getURL(
            '/data/pdf.js/web/viewer.html?file=' + encodeURIComponent(entry.toURL())
          )
        });
      }
    }
  });
}