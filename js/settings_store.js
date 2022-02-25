var SettingsStore = class {
    constructor() {
        this.DEFAULT_HIGHLIGHT_COLOR = '#f6861f';
        this.DEFAULT_BACKGROUND_COLOR = '#272727';
        this.DEFAULT_FONT_COLOR = '#ffffff';
        this.DEFAULT_COLOR_SCHEME = 'white-on-black';
        this.DEFAULT_FONT = 'georgia';
        this.DEFAULT_LETTER_SPACING = '0.5';

        // keys
        this.SETTING_HIHGLIGHT_ENABLED_KEY = 'highlightColorEnabled';
        this.SETTING_HIHGLIGHT_COLOR_KEY = 'highlightColor';
        this.SETTING_HIGHLIGHT_COLOR_USE_CUSTOM_KEY = 'highlightColorUseCustom';
        this.SETTING_START_TIMER_ENABLED_KEY = 'startTimerEnabled';
        this.SETTING_START_TIMER_LENGTH_KEY = 'startTimerLength';
        this.SETTING_MICROPAUSE_NUMBERS_ENABLED_KEY = 'micropauseNumbersEnabled';
        this.SETTING_MICROPAUSE_PUNCTUATION_ENABLED_KEY = 'micropausePunctuationEnabled';
        this.SETTING_MICROPAUSE_LONGWORDS_ENABLED_KEY = 'micropauseLongWordsEnabled';
        this.SETTING_MICROPAUSE_PARAGRAPH_ENABLED_KEY = 'micropauseParagraphEnabled';
        this.SETTING_MICROPAUSE_NUMBERS_FACTOR_KEY = 'micropauseNumbersFactor';
        this.SETTING_MICROPAUSE_PUNCTUATION_FACTOR_KEY = 'micropausePunctuationFactor';
        this.SETTING_MICROPAUSE_ENDING_PUNCTUATION_FACTOR_KEY = 'micropauseEndingPunctuationFactor';
        this.SETTING_MICROPAUSE_LONGWORDS_FACTOR_KEY = 'micropauseLongWordsFactor';
        this.SETTING_MICROPAUSE_PARGRAPH_FACTOR_KEY = 'micropauseParagraphFactor';
        this.SETTING_BACKGROUND_COLOR_ENABLED_KEY = 'backgroundColorEnabled';
        this.SETTING_BACKGROUND_COLOR_KEY = 'backgroundColor';
        this.SETTING_FONT_COLOR_ENABLED_KEY = 'fontColorEnabled';
        this.SETTING_FONT_COLOR_KEY = 'fontColor';
        this.SETTING_WPM_INTERVAL_KEY = 'wpmInterval';
        this.SETTING_CONTEXT_DISPLAY_KEY = 'contextDisplayStyle';
        this.SETTING_COMBINE_BIGWORD_WITH_CONTEXT_KEY = 'combineBigwordWithContextEnabled'; // i.e. enable multi-line context or not (single-line)
        this.SETTING_CONTEXT_OPACITY_KEY = 'contextOpacity';
        this.SETTING_AUTO_PAGE_TURN_ENABLED_KEY = 'autoPageTurnEnabled';
        this.SETTING_SANITIZATION_RULE_KEY = 'sanitizationRule';
        this.SETTING_FOCUS_LETTER_INDICATOR_ENABLED_KEY = 'focusLetterIndicatorEnabled';
        this.SETTING_CONTEXT_FROM_RIGHT_ENABLED_KEY = 'contextFromRightEnabled';

        this.SETTING_HOTKEY_REWIND_KEY = 'hotkeyRewind';
        this.SETTING_HOTKEY_FORWARD_KEY = 'hotkeyForward';
        this.SETTING_HOTKEY_RESET_KEY = 'hotkeyReset';
        this.SETTING_HOTKEY_QUIT_KEY = 'hotkeyQuit';
        this.SETTING_HOTKEY_HIDE_KEY = 'hotkeyHide';
        this.SETTING_HOTKEY_WPM_INCREASE_KEY = 'hotkeyWPMIncrease';
        this.SETTING_HOTKEY_WPM_DECREASE_KEY = 'hotkeyWPMDecrease';
        this.SETTING_HOTKEY_CHUNK_SIZE_INCREASE_KEY = 'hotkeyChunkSizeIncrease';
        this.SETTING_HOTKEY_CHUNK_SIZE_DECREASE_KEY = 'hotkeyChunkSizeDecrease';
        this.SETTING_HOTKEY_FONT_SIZE_INCREASE_KEY = 'hotkeyFontSizeIncrease';
        this.SETTING_HOTKEY_FONT_SIZE_DECREASE_KEY = 'hotkeyFontSizeDecrease';
        this.SETTING_HOTKEY_FULLSCREEN_KEY = 'hotkeyFullscreen';
        this.SETTING_HOTKEY_PAGE_LEFT = 'hotkeyPageLeft';
        this.SETTING_HOTKEY_PAGE_RIGHT = 'hotkeyPageRight';
        this.SETTING_TOGGLE_CONTEXT_MODE = 'hotkeyToggleContextMode';

        this.SETTING_COLOR_SCHEMES_KEY = 'colorSchemes';
        this.SETTING_COLOR_SCHEME_FONT_COLOR_KEY = 'colorSchemeFontColor';
        this.SETTING_COLOR_SCHEME_BACKGROUND_COLOR_KEY = 'colorSchemeBackgroundColor';
        this.SETTING_COLOR_SCHEME_HIGHLIGHT_COLOR_KEY = 'colorSchemeHighlightColor';
        this.SETTING_CURRENT_COLOR_SCHEME_KEY = 'currentColorScheme';
        this.SETTING_FONTS_KEY = 'fonts';
        this.SETTING_FONT_NAME_KEY = 'fontName';
        this.SETTING_FONT_BACKUP_KEY = 'fontBackup';
        this.SETTING_CURRENT_FONT_KEY = 'currentFont';
        this.SETTING_TEXT_SCROLLER_ENABLED_KEY = 'textScrollerEnabled';
        this.SETTING_LETTER_SPACING_KEY = 'letterSpacing';

        this.USER_LICENSE_KEY = 'licenseKey';
        this.USER_SETTINGS_JSON_KEY = 'settingsJson';


        // local settings, with defaults
        var _default_settings = {};
        _default_settings[this.SETTING_HIHGLIGHT_ENABLED_KEY] = 'true';
        _default_settings[this.SETTING_HIGHLIGHT_COLOR_USE_CUSTOM_KEY] = 'false';
        _default_settings[this.SETTING_HIHGLIGHT_COLOR_KEY] = this.DEFAULT_HIGHLIGHT_COLOR;
        _default_settings[this.SETTING_START_TIMER_ENABLED_KEY] = 'true';
        _default_settings[this.SETTING_START_TIMER_LENGTH_KEY] = 2;
        _default_settings[this.SETTING_MICROPAUSE_NUMBERS_ENABLED_KEY] = 'true';
        _default_settings[this.SETTING_MICROPAUSE_PUNCTUATION_ENABLED_KEY] = 'true';
        _default_settings[this.SETTING_MICROPAUSE_LONGWORDS_ENABLED_KEY] = 'true';
        _default_settings[this.SETTING_MICROPAUSE_PARAGRAPH_ENABLED_KEY] = 'true';
        _default_settings[this.SETTING_MICROPAUSE_NUMBERS_FACTOR_KEY] = 0.5;
        _default_settings[this.SETTING_MICROPAUSE_PUNCTUATION_FACTOR_KEY] = 0.9;
        _default_settings[this.SETTING_MICROPAUSE_ENDING_PUNCTUATION_FACTOR_KEY] = 1.1;
        _default_settings[this.SETTING_MICROPAUSE_LONGWORDS_FACTOR_KEY] = 0.5;
        _default_settings[this.SETTING_MICROPAUSE_PARGRAPH_FACTOR_KEY] = 1.1;
        _default_settings[this.SETTING_BACKGROUND_COLOR_ENABLED_KEY] = 'false';
        _default_settings[this.SETTING_BACKGROUND_COLOR_KEY] = this.DEFAULT_BACKGROUND_COLOR;
        _default_settings[this.SETTING_FONT_COLOR_ENABLED_KEY] = 'false';
        _default_settings[this.SETTING_FONT_COLOR_KEY] = this.DEFAULT_FONT_COLOR;
        _default_settings[this.SETTING_TEXT_SCROLLER_ENABLED_KEY] = 'true';
        _default_settings[this.SETTING_LETTER_SPACING_KEY] = this.DEFAULT_LETTER_SPACING;
        _default_settings[this.SETTING_WPM_INTERVAL_KEY] = 50;
        _default_settings[this.SETTING_CONTEXT_DISPLAY_KEY] = 'on-pause';
        _default_settings[this.SETTING_COMBINE_BIGWORD_WITH_CONTEXT_KEY] = 'true';
        _default_settings[this.SETTING_CONTEXT_OPACITY_KEY] = 0.5;
        _default_settings[this.SETTING_AUTO_PAGE_TURN_ENABLED_KEY] = 'false';
        _default_settings[this.SETTING_SANITIZATION_RULE_KEY] = "\\s?\\[.*?\\d+.*?\\]"; // need to double escape so that input shows escape characters
        _default_settings[this.SETTING_FOCUS_LETTER_INDICATOR_ENABLED_KEY] = 'false';
        _default_settings[this.SETTING_CONTEXT_FROM_RIGHT_ENABLED_KEY] = 'false';

        _default_settings[this.SETTING_HOTKEY_REWIND_KEY] = 'J';
        _default_settings[this.SETTING_HOTKEY_RESET_KEY] = ';';
        _default_settings[this.SETTING_HOTKEY_FORWARD_KEY] = 'L';
        _default_settings[this.SETTING_HOTKEY_QUIT_KEY] = 'Q';
        _default_settings[this.SETTING_HOTKEY_HIDE_KEY] = 'H';
        _default_settings[this.SETTING_HOTKEY_WPM_INCREASE_KEY] = '=';
        _default_settings[this.SETTING_HOTKEY_WPM_DECREASE_KEY] = '-';
        _default_settings[this.SETTING_HOTKEY_CHUNK_SIZE_INCREASE_KEY] = ']';
        _default_settings[this.SETTING_HOTKEY_CHUNK_SIZE_DECREASE_KEY] = '[';
        _default_settings[this.SETTING_HOTKEY_FONT_SIZE_INCREASE_KEY] = 'Up';
        _default_settings[this.SETTING_HOTKEY_FONT_SIZE_DECREASE_KEY] = 'Down';
        _default_settings[this.SETTING_HOTKEY_FULLSCREEN_KEY] = 'F';
        _default_settings[this.SETTING_HOTKEY_PAGE_LEFT] = 'N';
        _default_settings[this.SETTING_HOTKEY_PAGE_RIGHT] = 'M';
        _default_settings[this.SETTING_TOGGLE_CONTEXT_MODE] = 'C';

        _default_settings[this.USER_LICENSE_KEY] = null;
        // for storing the settings json, which maps handler functions to each setting
        _default_settings[this.USER_SETTINGS_JSON_KEY] = {
            "highlightColor": {
            },
            "highlightColorEnabled": {
                "updateFunction": "updateCustomStyleElements",
                "handleClickFunction": "handleCheckboxClick"
            },
            "highlightColorUseCustom": {
            },
            "backgroundColor": {
            },
            "backgroundColorEnabled": {
            },
            "fontColor": {
            },
            "fontColorEnabled": {
            },
            "startTimerEnabled": {
                "updateFunction": "getTimerDelay",
                "handleClickFunction": "handleCheckboxClick"
            },
            "startTimerLength": {
            },
            "micropauseNumbersEnabled": {
                "updateFunction": "getMicropauseSettings",
                "handleClickFunction": "handleCheckboxClick"
            },
            "micropausePunctuationEnabled": {
                "updateFunction": "getMicropauseSettings",
                "handleClickFunction": "handleCheckboxClick"
            },
            "micropauseLongWordsEnabled": {
                "updateFunction": "getMicropauseSettings",
                "handleClickFunction": "handleCheckboxClick"
            },
            "micropauseParagraphEnabled": {
                "updateFunction": "getMicropauseSettings",
                "handleClickFunction": "handleCheckboxClick"
            },
            "micropauseNumbersFactor": {
            },
            "micropausePunctuationFactor": {
            },
            "micropauseEndingPunctuationFactor": {
            },
            "micropauseLongWordsFactor": {
            },
            "micropauseParagraphFactor": {
            },
            "contextDisplayStyle": {
                "updateFunction": "updateContextDisplayStyle",
                "handleClickFunction": "handleRadioClick"
            },
            "combineBigwordWithContextEnabled": {
                "updateFunction": "updateContextDisplayStyle",
                "handleClickFunction": "handleRadioClick"
            },
            "contextOpacity": {
                "updateFunction": "updateCustomStyleElements",
                "handleClickFunction": "handleRangeChange"
            },
            "autoPageTurnEnabled": {
            },
            "sanitizationRule": {
            },
            "focusLetterIndicatorEnabled": {
                "updateFunction": "getFocusLetterIndicatorSettings",
                "handleClickFunction": "handleCheckboxClick"
            },
            "contextFromRightEnabled": {
                "updateFunction": "updateContextDisplayStyle",
                "handleClickFunction": "handleCheckboxClick"
            },

            "hotkeyRewind": {
            },
            "hotkeyReset": {
            },
            "hotkeyForward": {
            },
            "hotkeyQuit": {
            },
            "hotkeyWPMIncrease": {
            },
            "hotkeyWPMDecrease": {
            },
            "hotkeyChunkSizeIncrease": {
            },
            "hotkeyChunkSizeDecrease": {
            },
            "hotkeyFontSizeIncrease": {
            },
            "hotkeyFontSizeDecrease": {
            },
            "hotkeyFullscreen": {
            },
            "hotkeyPageLeft": {
            },
            "hotkeyPageRight": {
            },
            "hotkeyToggleContextMode": {
            },

            "textScrollerEnabled": {
            },
            "letterSpacing": {
            },
            "wpmInterval": {
                "updateFunction": "getWPMInterval",
                "handleClickFunction": "handleRangeChange"
            },
            "currentColorScheme": {
                "updateFunction": "updateCustomStyleElements",
                "handleClickFunction": "handleRadioClick"
            },
            "currentFont": {
                "updateFunction": "updateCustomStyleElements",
                "handleClickFunction": "handleRadioClick"
            }
        };

        _default_settings[this.SETTING_COLOR_SCHEMES_KEY] = {
            'white-on-black': {
                colorSchemeFontColor: '#ffffff',
                colorSchemeBackgroundColor: '#272727',
                colorSchemeHighlightColor: '#f6861f',
                type: 'free'
            },
            'black-on-white': {
                colorSchemeFontColor: '#222222',
                colorSchemeBackgroundColor: '#fafafa',
                colorSchemeHighlightColor: '#f6861f',
                type: 'free'
            },
            'beige': {
                colorSchemeBackgroundColor: '#f8eed4',
                colorSchemeFontColor: '#836f5e',
                colorSchemeHighlightColor: '#f6861f',
                type: 'free'
            },
            'black-on-white-max': {
                colorSchemeFontColor: '#000000',
                colorSchemeBackgroundColor: '#ffffff',
                colorSchemeHighlightColor: '#205B6F',
                type: 'paid'
            },
            'black-on-white-9': {
                colorSchemeFontColor: '#454545',
                colorSchemeBackgroundColor: '#fafafa',
                colorSchemeHighlightColor: '#204765',
                type: 'paid'
            },
            'black-on-white-45': {
                colorSchemeFontColor: '#6B6B6B',
                colorSchemeBackgroundColor: '#fafafa',
                colorSchemeHighlightColor: '#537180',
                type: 'paid'
            },
            'white-on-black-45': {
                colorSchemeFontColor: '#fafafa',
                colorSchemeBackgroundColor: '#6B6B6B',
                colorSchemeHighlightColor: '#E1D39C',
                type: 'paid'
            },
            'white-on-blue': {
                colorSchemeFontColor: '#ffffff',
                colorSchemeBackgroundColor: '#0b3045',
                colorSchemeHighlightColor: '#E1D39C',
                type: 'paid'
            },
            'white-on-blue-45': {
                colorSchemeFontColor: '#CCCCCC',
                colorSchemeBackgroundColor: '#205B6F',
                colorSchemeHighlightColor: '#DFC882',
                type: 'paid'
            },
            'blue-on-yellow-45': {
                colorSchemeFontColor: '#107876',
                colorSchemeBackgroundColor: '#FFF3A8',
                colorSchemeHighlightColor: '#467750',
                type: 'paid'
            },
            'blue-on-blue-45': {
                colorSchemeFontColor: '#155A7E',
                colorSchemeBackgroundColor: '#A9D3E5',
                colorSchemeHighlightColor: '#355F3D',
                type: 'paid'
            },
            'blue-on-white-45': {
                colorSchemeFontColor: '#1D79AA',
                colorSchemeBackgroundColor: '#fafafa',
                colorSchemeHighlightColor: '#487F52',
                type: 'paid'
            },
            'black-on-yellow-45': {
                colorSchemeFontColor: '#6B6B6B',
                colorSchemeBackgroundColor: '#FFF3A8',
                colorSchemeHighlightColor: '#447474',
                type: 'paid'
            },
            'black-on-blue-45': {
                colorSchemeFontColor: '#616161',
                colorSchemeBackgroundColor: '#A9D3E5',
                colorSchemeHighlightColor: '#466372',
                type: 'paid'
            },
            'black-on-blue': {
                colorSchemeFontColor: '#333333',
                colorSchemeBackgroundColor: '#A9D3E5',
                colorSchemeHighlightColor: '#00346B',
                type: 'paid'
            },

        };
        _default_settings[this.SETTING_CURRENT_COLOR_SCHEME_KEY] = this.DEFAULT_COLOR_SCHEME;


        _default_settings[this.SETTING_FONTS_KEY] = {
            'georgia': {
                fontName: 'Georgia',
                fontBackup: 'serif',
                type: 'free'
            },
            'open-sans': {
                fontName: 'Open Sans',
                fontBackup: 'sans-serif',
                type: 'paid'
            },
            'bookerly': {
                fontName: 'Bookerly',
                fontBackup: 'serif',
                type: 'paid'
            },
            'garamond': {
                fontName: 'Garamond',
                fontBackup: 'serif',
                type: 'paid'
            },
            'helvetica-neue': {
                fontName: 'Helvetica Neue',
                fontBackup: 'sans-serif',
                type: 'paid'
            },
            'merriweather': {
                fontName: 'Merriweather',
                fontBackup: 'serif',
                type: 'paid'
            },
            'minion': {
                fontName: 'Minion',
                fontBackup: 'serif',
                type: 'paid'
            },
            'tisa': {
                fontName: 'Tisa',
                fontBackup: 'serif',
                type: 'paid'
            },
            'dyslexie': {
                fontName: 'Dyslexie',
                fontBackup: 'sans-serif',
                type: 'paid'
            },
            'arial': {
                fontName: 'Arial',
                fontBackup: 'sans-serif',
                type: 'free'
            },
        };
        _default_settings[this.SETTING_CURRENT_FONT_KEY] = this.DEFAULT_FONT;




        var _settings = null;

        // getters
        this.getAllSettings = function () {
            if (_settings !== null) {
                return _settings;
            }
            else {
                throw "Settings store not yet initialized. Use its 'isInitialized' promise.";
            }
        }
        this.getSetting = function (key) {
            if (_settings !== null) {
                return _settings[key];
            }
            else {
                throw "Settings store not yet initialized. Use its 'isInitialized' promise.";
            }
        }
        this.getSettingFromStorage = function (key) {
            return new Promise((resolve, reject) => {
                chrome.storage.sync.get([key], function (result) {
                    const value = result[key];
                    if (typeof (value) === "undefined") {
                        // not in storage, check default settings
                        if (_settings !== null) {
                            resolve(_settings[key]);
                        }
                        else {
                            reject(`Setting key '${key}' not in storage or default settings.`);
                        }
                    } else {
                        resolve(value);
                    }

                });
            });
        }
        // setters
        this.setSetting = function (key, value, callback = null) {
            if (_settings !== null) {
                // set setting locally
                _settings[key] = value;

                // set setting in storage
                var setting = {};
                setting[key] = value;
                chrome.storage.sync.set(setting, callback);
            } else {
                throw "Settings store not yet initialized. Use its 'isInitialized' promise.";
            }

        }
        this.getSettingKey = function (identifier) {
            return this[identifier];
        }
        this.getDefaultSettings = function () {
            return _default_settings;
        }

        // finish initialization: set local settings to defaults + what's in storage.
        // i.e. sync local settings to union of what's in storage + defaults, but only once / upon initialization
        // because local settings will match storage settings, upon app reload, if any of the settings change (e.g. from options)
        // getting settings from storage is async, so create a promise
        this.isInitialized = new Promise(function (resolve, reject) {
            chrome.storage.sync.get(null, function (result) {
                // now have all settings from storage
                // initialize with settings, union/overwrite with settings from storage
                var initialSettings = {
                    ..._default_settings,
                    ...result
                };
                _settings = initialSettings;
                resolve();
            });
        });


    }

    clear(callback = null) {
        // clear settings sync
        chrome.storage.sync.clear(callback)
    }

}