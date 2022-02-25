var anon = () => { console.log('anonymous update function for testing. remove me.') };

var settingKeysAndUpdateFunction;

var colorPickerObjects = {
}; // to be populated automatically later

var settingOverlayState = {
	hotkeyListenerOn: false,
	listenedHotkeys: [],
	listenedHotkeyWordCharacters: 0,
	listenedHotkeyModifiers: 0,
	listenedHotkeySettingKey: null,
	listenedHotkeyElement: null,
	updateFunction: null,
	openedProLanding: false,
	openedProWindowId: null,
	openedProTabId: null
};

const renderSettings = () => {
	return new Promise((resolve, reject) => {
		$("#settings-overlay").load("../settings.html", (textResponse, status) => {
			if (status === 'success') {
				$("#settings-overlay").fadeIn('fast');
				$("#page-turn").fadeOut('fast'); // fade out a layer that's lower than settings but higher than base
				resolve();
			} else {
				reject();
			}

		});
	});
}

function waitForSettingsStore() {
	return new Promise((resolve, reject) => {
		var wait = setInterval(
			function () {
				if (state.settingsStore !== null || typeof state.settingsStore === 'undefined') {
					clearInterval(wait);
					resolve();
				}
			},
			10
		);
	});
}

function handleRadioClick({ element, settingKey, value }) {
	state.settingsStore.setSetting(settingKey, element.prop('value'));

	// handle any dependent setting
	handleDependentSetting(element);
	element.blur();
}
function handleCheckboxClick({ element, settingKey, value }) {
	state.settingsStore.setSetting(settingKey, element.prop('checked').toString());
	handleDependentSetting(element);
	element.blur();
}
function handleRangeChange({ element, settingKey, value }) {
	state.settingsStore.setSetting(settingKey, element.val());
	// update value output
	_updateRangeOutput(element);
	element.blur();
}
function handleTextInputChange({ element, settingKey, value }) {
	state.settingsStore.setSetting(settingKey, element.val());
	element.blur();
}
function handleColorChange({ element, settingKey, value }) {
	state.settingsStore.setSetting(settingKey, value);
}
function handleHotkeyChange({ element, settingKey, value }) {
	// remove focus
	element.blur();

	// start hotkey listener
	listenForNewHotkey(element, settingKey);
}
function handleSettingClick({
	event = null,
	handleClickFunction,
	updateFunction,
	settingKey,
	element,
	value = null
}) {

	// 1st level: handle click function is undefined
	if (typeof (handleClickFunction) === 'undefined') {
		// no handler specified, means user does not have access to setting
		event.preventDefault();

		attemptRedirectToPaid(settingKey);
	}
	else if (typeof (handleClickFunction) !== 'undefined') {
		// 2nd level: handle click function exists, but element is still "paid"
		// console.log(settingKey);
		// console.log(element);
		// console.log(value);

		if (element.data('paid') === true) {
			event.preventDefault();

			attemptRedirectToPaid(settingKey);
		}
		// handle click function exists, user can access

		else {
			// track setting option click
			let proString = 'free';
			if (getUserLicense() !== null) {
				proString = 'pro';
			}
			pushEvent("setting-option-click", settingKey, proString);

			handleClickFunction({
				settingKey: settingKey,
				element: element,
				value: value
			});

			if (typeof (updateFunction) !== 'undefined') {
				updateFunction();
			}

			// NOTE: updateFunction for a particular settingKey may not be defined here. could be intentional (e.g. hotkey handlers don't have an updated), or it could be a mistake: e.g. forgot to implement the required updateFunction after adding a new setting

		}
	} else {
		console.error("handleClickFunction is null.");
	}
}
function attemptRedirectToPaid(settingKey) {
	pushEvent("in-app-upgrade-redirect", settingKey);
	if (settingOverlayState.openedProLanding === false) {
		redirectToPaid(settingKey);
	}
	else if (settingOverlayState.openedProWindowId !== null && settingOverlayState.openedProTabId !== null) {
		// try to redirect to existing pro page
		// focus on window of pro page
		chrome.windows.update(settingOverlayState.openedProWindowId, { focused: true }, function (window) {

			if (chrome.runtime.lastError) {
				// can't show window
				console.log(chrome.runtime.lastError.message);

				redirectToPaid(settingKey);
			} else {
				// focus on tab of pro page
				chrome.tabs.update(settingOverlayState.openedProTabId, { active: true }, function (tab) {
					if (chrome.runtime.lastError) {
						// can't show tab
						console.log(chrome.runtime.lastError.message);

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
			settingOverlayState.openedProLanding = true;
			settingOverlayState.openedProWindowId = tab.windowId;
			settingOverlayState.openedProTabId = tab.id;
		}
	);


}

function handleDependentSetting(input) {
	// console.log('input.val(): ', input.val());
	const dependentSettingKey = input.data('dependent-setting');
	if (dependentSettingKey === undefined) { // no dependent setting
		return;
	}
	const parentSettingType = input.prop('type');
	// console.log('parentSettingType: ', parentSettingType);

	let curInputVal;
	if (parentSettingType === 'radio') {
		const checkedVal = input.filter(':checked').val();
		// console.log(checkedVal);
		curInputVal = checkedVal === 'true' ? true : false;
	} else if (parentSettingType === 'checkbox') {
		const checkedVal = input.prop('checked');
		curInputVal = checkedVal;
	} else {
		curInputVal = input.val() === 'true' ? true : false;
	}


	// if it's a color picker
	if (dependentSettingKey in colorPickerObjects) {
		// console.log('dependent setting is a color picker');
		// console.log(colorPickerObjects);
		const colorPicker = colorPickerObjects[dependentSettingKey];
		// console.log(colorPicker);
		// console.log('curInputVal: ', curInputVal);

		if (curInputVal === true) {
			// console.log('enabling the color picker');
			colorPicker.enable();
		} else {
			// console.log('disabling the color picker');
			colorPicker.disable();
		}
	}
	else {
		// if it's a normal control
		const dependentSettingKeyTokens = dependentSettingKey.split(',');
		for (const dependentSettingKeyToken of dependentSettingKeyTokens) {
			const dependentSetting = $("input[name='" + dependentSettingKeyToken + "']");

			if (dependentSetting.length > 0) {

				if (curInputVal === true) {
					dependentSetting.prop('disabled', false);
				} else {
					dependentSetting.prop('disabled', true);
				}

			} else {
				console.error('dependent setting ' + dependentSettingKeyToken + ' not found for parent setting ' + input.prop('name'));
			}
		}


	}
}
function _updateRangeOutput(input) {
	// update range output display
	const rangeOutput = $(`output[for=${$(input).prop('name')}`);
	rangeOutput.html($(input).val());

}
function initOpenSpreedHotkeyListener() {
	const openSpreedButton = $("a[name='open-spreed']");
	// get the right command
	chrome.commands.getAll(function (commands) {
		for (command of commands) {
			if (command.name === 'open-spreed') {
				// update ui
				openSpreedButton.html(command.shortcut);
				openSpreedButton.on('click', function () {
					chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
				});
			}
		}
	});

}
function listenForNewHotkey(hotkeyElement, settingKey, updateFunction) {
	if (settingOverlayState.hotkeyListenerOn === false) {
		// turn on hotkey listener
		// console.log('turning on hotkey listener...');
		settingOverlayState.hotkeyListenerOn = true;
		settingOverlayState.listenedHotkeySettingKey = settingKey;
		settingOverlayState.listenedHotkeyElement = hotkeyElement;
		settingOverlayState.hotkeyUpdateFunction = updateFunction;
		// update ui
		settingOverlayState.listenedHotkeyElement.html("Listening for keys...");
		settingOverlayState.listenedHotkeyElement.toggleClass('is-light');
	}

}
function turnOffHotkeyListener() {
	if (settingOverlayState.hotkeyListenerOn === true) {
		// turn off listener
		settingOverlayState.hotkeyListenerOn = false;
		// reset hotkey listener
		settingOverlayState.listenedHotkeyElement.toggleClass('is-light');
		settingOverlayState.listenedHotkeys = [];
		settingOverlayState.listenedHotkeyWordCharacters = 0;
		settingOverlayState.listenedHotkeyModifiers = 0;
		settingOverlayState.listenedHotkeySettingKey = null;
		settingOverlayState.listenedHotkeyElement = null;
	}

}
function stopListeningForNewHotkey() {
	if (settingOverlayState.hotkeyListenerOn === true) {
		// make sure user didn't save ONLY a modifier
		if (settingOverlayState.listenedHotkeys.length == 1 && settingOverlayState.listenedHotkeyModifiers == 1) {
			// console.log('clearing hotkeys saved because only saved a modifier key');
			settingOverlayState.listenedHotkeys = [];
			settingOverlayState.listenedHotkeyElement.html(getSetting(settingOverlayState.listenedHotkeySettingKey));
			// flash negative
			const curElement = settingOverlayState.listenedHotkeyElement
			curElement.toggleClass('is-danger');
			setTimeout(() => {
				curElement.toggleClass('is-danger');
			}, 500);
		}
		// console.log('last keys saved: ', settingOverlayState.listenedHotkeys);
		// save last key(s) pressed
		if (settingOverlayState.listenedHotkeys.length > 0) {
			// save
			// console.log('saving keys as hotkeys...');
			const hotkeyString = settingOverlayState.listenedHotkeys.join("+");
			state.settingsStore.setSetting(settingOverlayState.listenedHotkeySettingKey, hotkeyString);
			// update ui
			settingOverlayState.listenedHotkeyElement.html(hotkeyString);
			// flash positive
			const curElement = settingOverlayState.listenedHotkeyElement
			curElement.toggleClass('is-success');
			setTimeout(() => {
				curElement.toggleClass('is-success');
			}, 500);

		}
		// TODO make sure there aren't any conflicts with existing hotkeys

		turnOffHotkeyListener();

	}
}
function _getKeyFromEvent(event) {
	const keyAsCharCode = String.fromCharCode(event.keyCode);
	const isWordCharacter = keyAsCharCode.match(/\w/) === null ? false : true;
	// console.log(keyAsCharCode);
	// console.log(isWordCharacter);
	// console.log(event);
	if (isWordCharacter === true) {
		return [keyAsCharCode, isWordCharacter];
	} else {
		// if not character, probably some sort of modifier
		// handle space special case
		let key = event.key.trim();
		if (key.length == 0) {
			return [event.code, true];
		}
		// handle modifiers
		if (hotkeys.shift) {
			// console.log('shift is pressed!');
			key = 'Shift';
			return [key, false];
		}
		else if (hotkeys.ctrl) {
			// console.log('ctrl is pressed!');
			key = 'Ctrl';
			return [key, false];
		}
		else if (hotkeys.control) {
			// console.log('control is pressed!');
			key = 'control';
			return [key, false];
		}
		else if (hotkeys.alt) {
			// console.log('alt is pressed!');
			key = 'Alt';
			return [key, false];
		}
		else if (hotkeys.option) {
			// console.log('option is pressed!');
			key = 'Option';
			return [key, false];
		}
		else if (hotkeys.command) {
			// console.log('command is pressed!');
			key = 'Command';
			return [key, false];
		}
		else if (hotkeys.cmd) {
			// console.log('cmd is pressed!');
			key = 'Cmd';
			return [key, false];
		}

		// handle arrows
		if (event.key.includes('Arrow')) {
			return [event.key.replace('Arrow', ''), true];
		}

		// otherwise it's probably a symbol
		return [event.key, true];

	}
}
function handleHotkeyListener(event, handler) {
	// console.log('is hotkey listener on? ', settingOverlayState.hotkeyListenerOn);
	if (settingOverlayState.hotkeyListenerOn === true) {
		event.preventDefault();

		if (event.type === 'keydown') {
			// once user has released keys
			// console.log('keyup:', event.type, handler, handler.key);

			// handle listening for hotkeys
			// console.log(hotkeys.getPressedKeyCodes());
			// settingOverlayState.listenedHotkeys = hotkeys.getPressedKeyCodes();
			const [key, isWordCharacter] = _getKeyFromEvent(event);
			// console.log('recorded key:', key);
			// console.log('is word character?', isWordCharacter);
			// only store maximum two keys, one actual character
			if (settingOverlayState.listenedHotkeys.length <= 2) {
				// if actual character
				if (isWordCharacter === true) {
					// and we haven't heard one yet
					if (settingOverlayState.listenedHotkeyWordCharacters < 1) {
						// store it
						settingOverlayState.listenedHotkeys.push(key);
						settingOverlayState.listenedHotkeyWordCharacters += 1;
					}
				}
				// if a modifier
				else {
					// and we haven't heard one yet
					if (settingOverlayState.listenedHotkeyModifiers < 1) {
						// store it
						settingOverlayState.listenedHotkeys.push(key);
						settingOverlayState.listenedHotkeyModifiers += 1;
					}
				}
			}



			// console.log(event);
		} else if (event.type === 'keyup') {

			stopListeningForNewHotkey();
		}

	} else {

		if (event.key === "Escape") {
			// close settings
			closeSettings();
		}
		// key pressed but do nothing
	}


}
async function populateSettings() {

	// populate settings from settings store
	await waitForSettingsStore();

	const initialSettings = state.settingsStore.getAllSettings();
	settingKeysAndUpdateFunction = state.settingsStore.getSetting(state.settingsStore.USER_SETTINGS_JSON_KEY);

	for (const [settingKey, functionMap] of Object.entries(settingKeysAndUpdateFunction)) {

		const updateFunctionName = functionMap['updateFunction'];
		const handleClickFunctionName = functionMap['handleClickFunction'];
		// console.log('settingKey:', settingKey);
		// console.log('updateFunctionName:',updateFunctionName);
		// console.log('handleClickFunctionName:',handleClickFunctionName);

		const updateFunction = window[updateFunctionName];
		const handleClickFunction = window[handleClickFunctionName];

		// console.log(settingKey);
		// first look for input fields
		let input = $("input[name='" + settingKey + "']");
		// otherwise look for buttons (like hotkey buttons)
		if (input.length === 0) {
			input = $("button[name='" + settingKey + "']");
		}

		if (input.length === 0) {
			console.error(settingKey + ' setting was not found on page.');
		} else {
			// console.log('input:', input);
			const inputType = input.prop('type');
			// console.log('inputType:', inputType);

			// get setting value
			const settingValue = state.settingsStore.getSetting(settingKey);
			// console.log('settingValue: ', settingValue);

			// tag input with paid label if appropriate
			if (typeof (handleClickFunctionName) === 'undefined') {
				let label = input.parent().children('label');
				if (label.length === 0) {
					label = input.parents('.hotkey-field').find('label');
				}
				label.append('&nbsp;<span class="tag is-info">PRO</span>');
			}

			// initialize each type and handle clicks
			// radio
			if (inputType === "radio") {
				// console.log('initializing radio:',settingKey);
				// it's a simple radio button
				// initialize
				let radioWValue = input.filter("input:radio[value='" + settingValue + "']");
				radioWValue.prop('checked', true); // check the associated value

				// handle enable/disable of any dependent setting
				handleDependentSetting(input);


				// on change
				input.on('click', function (event) {
					handleSettingClick({
						event: event,
						handleClickFunction: handleClickFunction,
						updateFunction: updateFunction,
						element: $(this),
						settingKey: settingKey
					});

					// console.log($(this).prop('name'));
					// console.log($(this).prop('value'));

				});


			}
			// hotkeys
			else if (inputType === "submit") {
				// initialize
				$(input).html(settingValue);

				// on click
				input.on('click', function (event) {
					handleSettingClick({
						event: event,
						handleClickFunction: handleClickFunction,
						element: $(this),
						settingKey: settingKey
					});

				});
			}
			else if (inputType === "checkbox") {
				// init element
				if (settingValue === 'true') {
					input.prop('checked', true);
				} else {
					input.removeProp('checked');
				}

				// handle dependent setting
				handleDependentSetting(input);

				input.on('click', function (event) {
					handleSettingClick({
						event: event,
						handleClickFunction: handleClickFunction,
						updateFunction: updateFunction,
						element: $(this),
						settingKey: settingKey
					});

				});


			}
			else if (inputType === "range") {
				// initialize control
				$(input).val(settingValue);
				_updateRangeOutput(input);

				// initialize input change listener
				input.on('input', function (event) {
					// set new setting value
					handleSettingClick({
						event: event,
						handleClickFunction: handleClickFunction,
						updateFunction: updateFunction,
						element: $(this),
						settingKey: settingKey
					});

				});

			}
			// color picker (starts as hidden)
			else if (inputType === "hidden") {
				const hiddenType = input.data('hidden-type');
				if (hiddenType === "color-picker") {
					// initialize color picker element
					const pickr = Pickr.create({
						el: "input[name='" + settingKey + "']",
						theme: 'monolith',

						swatches: null,
						position: 'right-end',
						default: settingValue,
						closeOnScroll: true,
						comparison: false,

						components: {

							// Main components
							preview: true,
							opacity: false,
							hue: true,

							// Input / output Options
							interaction: {
								input: true,
								clear: false,
								save: false
							}
						}
					});

					// on color picker change
					pickr.on('changestop', function (instance) {
						const curColor = instance.getColor().toHEXA().toString();
						// console.log('instance:', instance);
						// console.log('this:', this);
						// console.log(curColor);

						handleSettingClick({
							handleClickFunction: handleClickFunction,
							updateFunction: updateFunction,
							settingKey: settingKey,
							element: input,
							value: curColor
						});

					});

					// store picker object
					colorPickerObjects[settingKey] = pickr;

				} else {
					console.error('Hidden input type ' + hiddenType + ' not implemented.');
				}
			}
			else if (inputType === "text") {
				// initialize control
				$(input).val(settingValue);

				// initialize input change listener
				input.on('change', function (event) {

					// set new setting value
					handleSettingClick({
						event: event,
						handleClickFunction: handleClickFunction,
						updateFunction: updateFunction,
						element: $(this),
						settingKey: settingKey
					});

				});
			}
			else {
				console.warn('Unhandled input type detected:', input, inputType);
			}
		}

	};

}

async function populateColorSchemeSettings() {
	// console.log('populating color scheme settings...');
	const colorSchemeSettings = getSetting(state.settingsStore.SETTING_COLOR_SCHEMES_KEY);
	// console.log(colorSchemeSettings);
	const currentColorScheme = getSetting(state.settingsStore.SETTING_CURRENT_COLOR_SCHEME_KEY);
	// initialize each color scheme radio option
	for (const [key, values] of Object.entries(colorSchemeSettings)) {
		// const input = $("input[value='"+key+"']");
		const input = $(`input[value='${key}'][name='currentColorScheme']`)
		// console.log(input);
		if (input.length == 1) {
			// select if is currently set color scheme
			if (currentColorScheme === key) {
				input.prop('checked', true);
			}

			// style the element
			const colorSchemePreview = input.parents('.color-scheme').children('.color-scheme-preview');
			// console.log(colorSchemePreview);

			// set background color
			const bgColor = values[state.settingsStore.SETTING_COLOR_SCHEME_BACKGROUND_COLOR_KEY];
			// console.log(bgColor);
			colorSchemePreview.css('background-color', bgColor);

			// set text color
			const fontColor = values[state.settingsStore.SETTING_COLOR_SCHEME_FONT_COLOR_KEY];
			colorSchemePreview.css('color', fontColor);

			// highlight color
			const highlightColor = values[state.settingsStore.SETTING_COLOR_SCHEME_HIGHLIGHT_COLOR_KEY];
			const highlightedLetter = colorSchemePreview.children('.highlighted-letter');
			// console.log(highlightedLetter);
			highlightedLetter.css('color', highlightColor);

			// label as paid/free
			const colorSchemeProEnabled = state.settingsStore.getSetting(state.settingsStore.USER_LICENSE_KEY) !== null ? true : false;
			if (values['type'] === 'paid' && colorSchemeProEnabled !== true) {
				// span
				colorSchemePreview.after('<span class="tag is-info">PRO</span>');

				// attribute
				input.data('paid', true);
			}

		} else {
			console.error(`color scheme ${key} not found in HTML or too many found on page.`);
		}
	}

}
async function populateFontSettings() {
	const fontSettings = getSetting(state.settingsStore.SETTING_FONTS_KEY);
	// console.log(fontSettings);
	const currentFont = getSetting(state.settingsStore.SETTING_CURRENT_FONT_KEY);

	Object.entries(fontSettings).forEach(([key, values]) => {
		const input = $(`input[value='${key}'][name='currentFont']`);
		if (input.length == 1) {
			// select if is currently set font
			if (currentFont === key) {
				input.prop('checked', true);
			}

			// style the element
			const fontPreview = input.parents('label');

			// set font in css
			fontPreview.css('font-family', `${values[state.settingsStore.SETTING_FONT_NAME_KEY]}, ${values[state.settingsStore.SETTING_FONT_BACKUP_KEY]}`);

			// label as paid/free
			const fontProEnabled = state.settingsStore.getSetting(state.settingsStore.USER_LICENSE_KEY) !== null ? true : false;
			if (values['type'] === 'paid' && fontProEnabled !== true) {
				// span
				fontPreview.after('&nbsp;<span class="tag is-info">PRO</span>');

				// attribute
				input.data('paid', true);
			}


		} else {
			console.error(`font ${key} not found in HTML or too many found on page.`);
		}
	});

}


function showSpreedVersion() {
	loadManifest((response) => {
		// Parse JSON string into object
		let manifestJson = JSON.parse(response);
		const version = manifestJson.version;
		let proString = "";
		if (JSON.stringify(getUserFeatures()).length !== JSON.stringify(getDefaultUserFeatures()).length && getUserLicense() !== null) {
			proString = "PRO";
		}
		$('#spreed-version').html(`${version} ${proString}`);

	});

}


function toggleLicenseKeyBox() {
	const isExpanded = $("#license-key-content").css('display') === 'none' ? false : true;
	if (isExpanded === false) {
		// expand
		$("#license-key-content").slideDown('fast');
		// replace caret
		const curCaretHTML = $("#license-key-header-caret").html();
		const newCaretHTML = curCaretHTML.replace('up', 'down');
		$("#license-key-header-caret").html(newCaretHTML);
	} else {
		// collapse
		$("#license-key-content").slideUp('fast');
		// replace caret
		const curCaretHTML = $("#license-key-header-caret").html();
		const newCaretHTML = curCaretHTML.replace('down', 'up');
		$("#license-key-header-caret").html(newCaretHTML);
	}
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
function initLicenseKeyBox() {
	const licenseKey = state.settingsStore.getSetting(state.settingsStore.USER_LICENSE_KEY);
	// console.log('licenseKey:', licenseKey);
	if (licenseKey !== null) {
		$("#license-key-box").hide();
	} else {
		$("#license-key-box").show();
	}
}
function initLicenseKeyHandler() {
	// header click
	$("#license-key-header").on('click', function () {
		toggleLicenseKeyBox();
	});

	// init box
	initLicenseKeyBox();

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
							licenseKeyLoading(false, "SwiftRead PRO successfully unlocked! Reloading...");

							// reset the license key box
							initLicenseKeyBox();

							// collapse
							setTimeout(function () {
								// if settings are open, re-initialize
								if (state.settingsShown === true) {
									openSettings();
								}
								// remove upgrade message
								getControlsMessage();
							}, 2000);
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
}

async function openSettings() {
	state.settingsShown = true;
	// pause reader
	pause();

	// unbind any needed keys. TODO unbind all other hotkeys, using "scope"?
	$(document).unbind('keydown.space', bindPlay);

	// render settings page overlay by injecting html
	await renderSettings();

	// tooltips
	tippy('.setting-tippy', { allowHTML: true, delay: [0, 1000], });

	// any listeners
	// settings close button
	document.getElementById('settings-close-button').addEventListener('click', function () {
		// close settings
		closeSettings();
	});

	// populate settings
	await populateSettings();
	// populate color scheme settings
	await populateColorSchemeSettings();
	await populateFontSettings();

	// hotkey listener
	hotkeys.deleteScope('app');
	hotkeys('*', { scope: 'settings', keyup: true }, handleHotkeyListener);
	hotkeys.setScope('settings');

	// handle chrome hotkey button presses
	initOpenSpreedHotkeyListener();

	// init license key handling
	initLicenseKeyHandler();

	// show spreed version
	showSpreedVersion();


}

function closeSettings() {
	// console.log('closing settings...');

	$("#settings-overlay").fadeOut('fast', function () {
		$("#settings-overlay").html("");
	});
	$("#page-turn").fadeIn('fast');

	// rebind space TODO rebind other hotkeys, using "scope"?
	$(document).bind('keydown.space', 'space', bindPlay);

	// delete settings hotkey scope
	turnOffHotkeyListener();
	hotkeys.deleteScope('settings');

	reloadAppHotkeys();

	// reset any state
	settingOverlayState.openedProLanding = false;

	state.settingsShown = false;
}


function initSettings() {
	// add click listeners
	// settings button on app
	document.getElementById('settings-group').addEventListener("click", function () {
		// on click:
		pushEvent("spreed-app-control", "click-settings");

		// open settings
		openSettings();

	}, false);

}

// on spreed window load
window.addEventListener('DOMContentLoaded', (event) => {
	initSettings();
});