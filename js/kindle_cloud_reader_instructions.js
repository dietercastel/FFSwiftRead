let homepageUrl = chrome.runtime.getManifest().homepage_url;

document.addEventListener('DOMContentLoaded', function () {

	document.getElementById("kindle-spreed-pro").addEventListener('click', function (event) {
		event.preventDefault();

		chrome.runtime.sendMessage({ action: "redirectToPaid", featureName: "kindle_cloud_instructions" }, function (response) {

		});
	});

	document.getElementById("go-to-kindle-cloud-button").addEventListener('click', function (event) {
		event.preventDefault();

		chrome.tabs.create({ url: 'https://read.amazon.com' });

	});

	// replace review links
	$('.a-homepage-url').attr('href', homepageUrl);
});