let homepageUrl = chrome.runtime.getManifest().homepage_url;

spreedThis = function () {
    pushEvent("spreed menu item", "spreed current page");
    //spreed this page. current default is text selector mode
    window.close();

    chrome.runtime.sendMessage({ action: "openSpreedFromMenu" }, function (response) {
        //console.log(response.farewell);

    });

}

spreedPasted = function (e) {
    e.preventDefault();
    pushEvent("spreed menu item", "open paste window");

    setTimeout(function () {
        chrome.tabs.create({ url: "spreedPaste.html" });

    }, 200);

}

showStatistics = function (e) {
    e.preventDefault();
    pushEvent("spreed menu item", "open stats window");


    setTimeout(function () {
        chrome.tabs.create({ url: "statistics.html?utm_source=extension_menu&utm_medium=internal&utm_campaign=statistics_menu_item" });

    }, 200);

}


showHowtouse = function (e) {
    e.preventDefault();
    pushEvent("spreed menu item", "open how to use");
    setTimeout(function () {
        chrome.tabs.create({ url: "start.html" });

    }, 200);


}

showDonate = function (e) {
    e.preventDefault();
    pushEvent("spreed menu item", "click-donate");
    setTimeout(function () {
        chrome.tabs.create({ url: 'https://www.paypal.com/donate?hosted_button_id=S76JFJWDVUEPQ' });

    }, 200);


}

showWriteReview = function (e) {
    e.preventDefault();
    pushEvent("spreed menu item", "click-write-review");
    setTimeout(function () {
        chrome.tabs.create({ url: homepageUrl }, function (tab) {
            chrome.windows.update(tab.windowId, { focused: true });
            pushEvent("spreed menu item", "open write review");
        });

    }, 200);
}

showKindleCloud = function (e) {
    e.preventDefault();
    pushEvent("spreed menu item", "click-kindle-cloud");
    setTimeout(function () {
        chrome.tabs.create({ url: 'pages/kindle_cloud_reader_instructions.html' }, function (tab) {
            pushEvent("spreed menu item", "open kindle cloud");
        });

    }, 200);


}

showPdf = async function (e) {
    e.preventDefault();
    pushEvent("spreed menu item", "click-pdf");
    setTimeout(async function () {
        chrome.tabs.create({
            url: '/js/pdf.js/web/viewer.html?file=/data/welcome.pdf'
        });
    }, 200);
}

showePub = async function (e) {
    e.preventDefault();
    pushEvent("spreed menu item", "click-epub");
    setTimeout(async function () {
        chrome.tabs.create({
            url: '/pages/epub_reader.html'
        });
    }, 200);
}
showGoogleDocs = function (e) {
    e.preventDefault();
    pushEvent("spreed menu item", "click-google-docs");
    setTimeout(function () {
        chrome.tabs.create({ url: 'pages/google_docs_instructions.html' }, function (tab) {
            pushEvent("spreed menu item", "open google docs");
        });
    }, 200);
}

showEnterProLicense = function (e) {
    e.preventDefault();
    pushEvent("spreed menu item", "enter-pro-license");

    setTimeout(function () {
        chrome.tabs.create({ url: 'pages/enter_pro_license_key.html' }, function (tab) {
            pushEvent("spreed menu item", "open pro license key page");
        });
    }, 200);
}

showAbout = function (e) {
    e.preventDefault();
    pushEvent("spreed menu item", "about");
    setTimeout(function () {
        chrome.tabs.create({ url: 'https://swiftread.com/about' }, function (tab) {
            chrome.windows.update(tab.windowId, { focused: true });
        });

    }, 200);
}


// settings
var state = {
    settingsStore: null
}
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

    // ON DOCUMENT READY
    $(document).ready(function () {

        // get if user is pro
        userIsPRO().then((isPRO) => {
            if (isPRO === true) {
                $('#menu-link-enter-pro-license').hide();
            } else {
                // if not, show enter license key menu item
                $('#menu-link-enter-pro-license').click(showEnterProLicense);
            }
        });

        //add click listeners
        $('#menu-link-spreedthis').click(spreedThis);
        $('#menu-link-spreedpasted').click(spreedPasted);
        $('#menu-link-statistics').click(showStatistics);
        $('#menu-link-howtouse').click(showHowtouse);
        // $('#menu-link-donate').click(showDonate);
        // $('#menu-link-kindle-cloud').click(showKindleCloud);
        $('#menu-link-pdf').click(showPdf);
        $('#menu-link-epub').click(showePub);
        $('#menu-link-google-docs').click(showGoogleDocs);
        $('#menu-link-write-review').click(showWriteReview);
        $('#menu-about').click(showAbout);


        // get open spreed hotkey
        chrome.commands.getAll(function (commands) {
            for (command of commands) {
                if (command.name === 'open-spreed') {
                    // update ui
                    $('#spreedthis-hotkey').html(command.shortcut);
                }
            }
        });

    });

});






