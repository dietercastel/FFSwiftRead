let homepageUrl = chrome.runtime.getManifest().homepage_url;

spreedPastedButtonClick = function () {
	//save text in textarea
	pastedString = $('#paste-textarea').val();

	//send message to open spreed
	chrome.runtime.sendMessage({ action: "openSpreedWithPasted", pastedText: pastedString }, function (response) {
	});

}


function handleEnter(evt) {

	if (evt.keyCode == 13 && evt.shiftKey) {
		spreedPastedButtonClick();
		evt.preventDefault();
	}
}



$(document).ready(function () {
	//add listener
	$('#spreed-pasted-button').click(spreedPastedButtonClick);
	$('#paste-textarea').keydown(handleEnter).keypress(handleEnter);

	// replace review links
	$('.a-homepage-url').attr('href', homepageUrl);
});




