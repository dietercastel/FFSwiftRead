let homepageUrl = chrome.runtime.getManifest().homepage_url;

document.addEventListener('DOMContentLoaded', function () {

	document.getElementById("google-docs-spreed-pro").addEventListener('click', function (event) {
		event.preventDefault();

		chrome.runtime.sendMessage({ action: "redirectToPaid", featureName: "google_docs_instructions" }, function (response) {

		});
	});

	document.getElementById("go-to-google-docs-button").addEventListener('click', function (event) {
		event.preventDefault();

		chrome.tabs.create({ url: 'https://docs.google.com' });

	})

	// replace review links
	$('.a-homepage-url').attr('href', homepageUrl);

});