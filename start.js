let homepageUrl = chrome.runtime.getManifest().homepage_url;

document.addEventListener('DOMContentLoaded', function () {


	// document.getElementById("go-to-kindle-cloud-button").addEventListener('click', function(event) {
	// 	event.preventDefault();

	// 	chrome.tabs.create({url:'pages/kindle_cloud_reader_instructions.html'}, function(tab) {
	//         pushEvent("start instructions next page", "kindle cloud");
	//     });
	// });

	document.getElementById("go-to-pdf-button").addEventListener('click', function (event) {
		event.preventDefault();

		chrome.tabs.create({ url: '/js/pdf.js/web/viewer.html?file=/data/welcome.pdf' }, function (tab) {
			pushEvent("start instructions next page", "pdf reader");
		});
	});

	document.getElementById("go-to-google-docs-button").addEventListener('click', function (event) {
		event.preventDefault();

		chrome.tabs.create({ url: 'pages/google_docs_instructions.html' }, function (tab) {
			pushEvent("start instructions next page", "google docs");
		});
	});

	document.getElementById("kindle-spreed-pro").addEventListener('click', function (event) {
		event.preventDefault();

		chrome.runtime.sendMessage({ action: "redirectToPaid", featureName: "start_instructions" }, function (response) {

		});
	});

	// replace review links
	$('.a-homepage-url').attr('href', homepageUrl);

});