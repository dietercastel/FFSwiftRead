let homepageUrl = chrome.runtime.getManifest().homepage_url;

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

var state = {
	settingsStore: null
}
function setUserLicense(licenseKey) {
	state.settingsStore.setSetting(state.settingsStore.USER_LICENSE_KEY, licenseKey);
}
function setUserFeatures(featuresJSON) {
	state.settingsStore.setSetting(state.settingsStore.USER_SETTINGS_JSON_KEY, featuresJSON);
}
function getDefaultUserFeatures() {
	return state.settingsStore.getDefaultSettings()[state.settingsStore.USER_SETTINGS_JSON_KEY];
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
function licenseKeyLoading(isLoading, message = "", isError = false) {
	if (isLoading === true) {
		$("#license-key-message").css("display", "none");
		$("#license-key-message").html("");
		$("#license-key-message").removeClass("has-text-danger")
		$("#license-key-submit").addClass("is-loading");
	} else {
		$("#license-key-message").css("display", "block");
		$("#license-key-message").html(message);
		if (isError === true) {
			$("#license-key-message").addClass("has-text-danger");
		}
		$("#license-key-submit").removeClass("is-loading");
	}
}

var settingsStore = new SettingsStore();
settingsStore.isInitialized.then(function () {

	state.settingsStore = settingsStore;

	$(document).ready(function () {

		// license key submit listener
		$("#license-key-submit").on('click', function (event) {
			event.preventDefault();
			licenseKeyLoading(true);

			// get settings given license key
			const licenseKey = $("#license-key").val();

			if (licenseKey.length > 0) {

				let maxPoll = 5;
				let pollTries = 0;
				let lastError = null;
				let lastErrorMessage = null;
				var poller = setInterval(function () {

					pollTries += 1;
					if (pollTries > maxPoll) {
						clearInterval(poller);

						licenseKeyLoading(false, lastErrorMessage, isError = true);
					}
					else {
						requestUserSettingsJsonKey(
							licenseKey,
							function () {
								// successful response from server, paid user exists
								clearInterval(poller);
								licenseKeyLoading(false, "SwiftRead PRO successfully unlocked!");
								// hide submit button
								$("#license-key-submit").hide();

							},
							function (error, errorMessage) {
								// error response from server or not found
								console.error(errorMessage);
								console.error(error);
								lastError = error;
								lastErrorMessage = errorMessage;
							}
						);
					}

				}, 2000);

			} else {
				// license key is empty
				licenseKeyLoading(false, "Empty license key", isError = true);
			}

		});

	});

});

$(document).ready(function () {
	// replace review links
	$('.a-homepage-url').attr('href', homepageUrl);
});