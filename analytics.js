// var _gaq = _gaq || [];
// _gaq.push(['_setAccount', 'UA-35748958-3']);
// if (!window.location.href.includes("background.html")) {
// 	_gaq.push(['_trackPageview']);
// }


function getRandomToken() {
	// E.g. 8 * 32 = 256 bits token
	var randomPool = new Uint8Array(32);
	crypto.getRandomValues(randomPool);
	var hex = '';
	for (var i = 0; i < randomPool.length; ++i) {
		hex += randomPool[i].toString(16);
	}
	// E.g. db18458e2782b2b77e36769c569e263a53885a9944dd0a861e5064eac16f1a
	return hex;
}

const GA_TRACKING_ID = "UA-35748958-3";
let GA_CLIENT_ID;

chrome.storage.sync.get('clientid', function (items) {
	var clientid = items.clientid;
	if (clientid) {
		useToken(clientid);
	} else {
		clientid = getRandomToken();
		chrome.storage.sync.set({ clientid: clientid }, function () {
			useToken(clientid);
		});
	}
	function useToken(clientid) {
		GA_CLIENT_ID = clientid;
	}
});

function pushEvent(category, action, label = null, value = null) {
	if (typeof (GA_CLIENT_ID) !== 'undefined') {
		try {
			let request = new XMLHttpRequest();
			let message =
				"v=1&tid=" + GA_TRACKING_ID +
				"&cid= " + GA_CLIENT_ID +
				"&t=event&ec=" + category +
				"&ea=" + action;

			if (label != null) {
				message += "&el=" + label;
			}
			if (value != null) {
				message += "&ev=" + value;
			}

			// console.log("Send event: ", message);
			request.open("POST", "https://www.google-analytics.com/collect", true);
			request.send(message);

		} catch (e) {
			this._log("Error sending report to Google Analytics.\n" + e);
		}
	} else {
		console.log('Cannot send event, GA_CLIENT_ID not set: ', GA_CLIENT_ID);
	}

}