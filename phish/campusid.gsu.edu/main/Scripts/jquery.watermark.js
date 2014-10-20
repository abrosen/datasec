/*	
Watermark plugin for jQuery
Version: 3.1.4
http://jquery-watermark.googlecode.com/

Copyright (c) 2009-2012 Todd Northrop
http://www.speednet.biz/
	
August 13, 2012

Requires:  jQuery 1.2.3+
	
Dual licensed under the MIT or GPL Version 2 licenses.
See mit-license.txt and gpl2-license.txt in the project root for details.
------------------------------------------------------*/

(function ($, window, undefined) {

	var 
	// String constants for data names
	dataFlag = "watermark",
	dataClass = "watermarkClass",
	dataFocus = "watermarkFocus",
	dataFormSubmit = "watermarkSubmit",
	dataMaxLen = "watermarkMaxLength",
	dataPassword = "watermarkPassword",
	dataText = "watermarkText",

	// Copy of native jQuery regex use to strip return characters from element value
	rreturn = /\r/g,

	// Used to determine if type attribute of input element is a non-text type (invalid)
	rInvalidType = /^(button|checkbox|hidden|image|radio|range|reset|submit)$/i,

	// Includes only elements with watermark defined
	selWatermarkDefined = "input:data(" + dataFlag + "),textarea:data(" + dataFlag + ")",

	// Includes only elements capable of having watermark
	selWatermarkAble = ":watermarkable",

	// triggerFns:
	// Array of function names to look for in the global namespace.
	// Any such functions found will be hijacked to trigger a call to
	// hideAll() any time they are called.  The default value is the
	// ASP.NET function that validates the controls on the page
	// prior to a postback.
	// 
	// Am I missing other important trigger function(s) to look for?
	// Please leave me feedback:
	// http://code.google.com/p/jquery-watermark/issues/list
	triggerFns = [
		"Page_ClientValidate"
	],

	// Holds a value of true if a watermark was displayed since the last
	// hideAll() was executed. Avoids repeatedly calling hideAll().
	pageDirty = false,

	// Detects if the browser can handle native placeholders
	hasNativePlaceholder = ("placeholder" in document.createElement("input"));

	// Best practice: this plugin adds only one method to the jQuery object.
	// Also ensures that the watermark code is only added once.
	$.watermark = $.watermark || {

		// Current version number of the plugin
		version: "3.1.4",

		runOnce: true,

		// Default options used when watermarks are instantiated.
		// Can be changed to affect the default behavior for all
		// new or updated watermarks.
		options: {

			// Default class name for all watermarks
			className: "watermark",

			// If true, plugin will detect and use native browser support for
			// watermarks, if available. (e.g., WebKit's placeholder attribute.)
			useNative: true,

			// If true, all watermarks will be hidden during the window's
			// beforeunload event. This is done mainly because WebKit
			// browsers remember the watermark text during navigation
			// and try to restore the watermark text after the user clicks
			// the Back button. We can avoid this by hiding the text before
			// the browser has a chance to save it. The regular unload event
			// was tried, but it seems the browser saves the text before
			// that event kicks off, because it didn't work.
			hideBeforeUnload: true
		},

		// Hide one or more watermarks by specifying any selector type
		// i.e., DOM element, string selector, jQuery matched set, etc.
		hide: function (selector) {
			$(selector).filter(selWatermarkDefined).each(
			function () {
				$.watermark._hide($(this));
			}
		);
		},

		// Internal use only.
		_hide: function ($input, focus) {
			var elem = $input[0],
			inputVal = (elem.value || "").replace(rreturn, ""),
			inputWm = $input.data(dataText) || "",
			maxLen = $input.data(dataMaxLen) || 0,
			className = $input.data(dataClass);

			if ((inputWm.length) && (inputVal == inputWm)) {
				elem.value = "";

				// Password type?
				if ($input.data(dataPassword)) {

					if (($input.attr("type") || "") === "text") {
						var $pwd = $input.data(dataPassword) || [],
						$wrap = $input.parent() || [];

						if (($pwd.length) && ($wrap.length)) {
							$wrap[0].removeChild($input[0]); // Can't use jQuery methods, because they destroy data
							$wrap[0].appendChild($pwd[0]);
							$input = $pwd;
						}
					}
				}

				if (maxLen) {
					$input.attr("maxLength", maxLen);
					$input.removeData(dataMaxLen);
				}

				if (focus) {
					$input.attr("autocomplete", "off");  // Avoid NS_ERROR_XPC_JS_THREW_STRING error in Firefox

					window.setTimeout(
					function () {
						$input.select();  // Fix missing cursor in IE
					}
				, 1);
				}
			}

			className && $input.removeClass(className);
		},

		// Display one or more watermarks by specifying any selector type
		// i.e., DOM element, string selector, jQuery matched set, etc.
		// If conditions are not right for displaying a watermark, ensures that watermark is not shown.
		show: function (selector) {
			$(selector).filter(selWatermarkDefined).each(
			function () {
				$.watermark._show($(this));
			}
		);
		},

		// Internal use only.
		_show: function ($input) {
			var elem = $input[0],
			val = (elem.value || "").replace(rreturn, ""),
			text = $input.data(dataText) || "",
			type = $input.attr("type") || "",
			className = $input.data(dataClass);

			if (((val.length == 0) || (val == text)) && (!$input.data(dataFocus))) {
				pageDirty = true;

				// Password type?
				if ($input.data(dataPassword)) {

					if (type === "password") {
						var $pwd = $input.data(dataPassword) || [],
						$wrap = $input.parent() || [];

						if (($pwd.length) && ($wrap.length)) {
							$wrap[0].removeChild($input[0]); // Can't use jQuery methods, because they destroy data
							$wrap[0].appendChild($pwd[0]);
							$input = $pwd;
							$input.attr("maxLength", text.length);
							elem = $input[0];
						}
					}
				}

				// Ensure maxLength big enough to hold watermark (input of type="text" or type="search" only)
				if ((type === "text") || (type === "search")) {
					var maxLen = $input.attr("maxLength") || 0;

					if ((maxLen > 0) && (text.length > maxLen)) {
						$input.data(dataMaxLen, maxLen);
						$input.attr("maxLength", text.length);
					}
				}

				className && $input.addClass(className);
				elem.value = text;
			}
			else {
				$.watermark._hide($input);
			}
		},

		// Hides all watermarks on the current page.
		hideAll: function () {
			if (pageDirty) {
				$.watermark.hide(selWatermarkAble);
				pageDirty = false;
			}
		},

		// Displays all watermarks on the current page.
		showAll: function () {
			$.watermark.show(selWatermarkAble);
		}
	};

	$.fn.watermark = $.fn.watermark || function (text, options) {
		///	<summary>
		///		Set watermark text and class name on all input elements of type="text/password/search" and
		/// 	textareas within the matched set. If className is not specified in options, the default is
		/// 	"watermark". Within the matched set, only input elements with type="text/password/search"
		/// 	and textareas are affected; all other elements are ignored.
		///	</summary>
		///	<returns type="jQuery">
		///		Returns the original jQuery matched set (not just the input and texarea elements).
		/// </returns>
		///	<param name="text" type="String">
		///		Text to display as a watermark when the input or textarea element has an empty value and does not
		/// 	have focus. The first time watermark() is called on an element, if this argument is empty (or not
		/// 	a String type), then the watermark will have the net effect of only changing the class name when
		/// 	the input or textarea element's value is empty and it does not have focus.
		///	</param>
		///	<param name="options" type="Object" optional="true">
		///		Provides the ability to override the default watermark options ($.watermark.options). For backward
		/// 	compatibility, if a string value is supplied, it is used as the class name that overrides the class
		/// 	name in $.watermark.options.className. Properties include:
		/// 		className: When the watermark is visible, the element will be styled using this class name.
		/// 		useNative (Boolean or Function): Specifies if native browser support for watermarks will supersede
		/// 			plugin functionality. If useNative is a function, the return value from the function will
		/// 			determine if native support is used. The function is passed one argument -- a jQuery object
		/// 			containing the element being tested as the only element in its matched set -- and the DOM
		/// 			element being tested is the object on which the function is invoked (the value of "this").
		///	</param>
		/// <remarks>
		///		The effect of changing the text and class name on an input element is called a watermark because
		///		typically light gray text is used to provide a hint as to what type of input is required. However,
		///		the appearance of the watermark can be something completely different: simply change the CSS style
		///		pertaining to the supplied class name.
		///		
		///		The first time watermark() is called on an element, the watermark text and class name are initialized,
		///		and the focus and blur events are hooked in order to control the display of the watermark.  Also, as
		/// 	of version 3.0, drag and drop events are hooked to guard against dropped text being appended to the
		/// 	watermark.  If native watermark support is provided by the browser, it is detected and used, unless
		/// 	the useNative option is set to false.
		///		
		///		Subsequently, watermark() can be called again on an element in order to change the watermark text
		///		and/or class name, and it can also be called without any arguments in order to refresh the display.
		///		
		///		For example, after changing the value of the input or textarea element programmatically, watermark()
		/// 	should be called without any arguments to refresh the display, because the change event is only
		/// 	triggered by user actions, not by programmatic changes to an input or textarea element's value.
		/// 	
		/// 	The one exception to programmatic updates is for password input elements:  you are strongly cautioned
		/// 	against changing the value of a password input element programmatically (after the page loads).
		/// 	The reason is that some fairly hairy code is required behind the scenes to make the watermarks bypass
		/// 	IE security and switch back and forth between clear text (for watermarks) and obscured text (for
		/// 	passwords).  It is *possible* to make programmatic changes, but it must be done in a certain way, and
		/// 	overall it is not recommended.
		/// </remarks>

		if (!this.length) {
			return this;
		}

		var hasClass = false,
		hasText = (typeof (text) === "string");

		if (hasText) {
			text = text.replace(rreturn, "");
		}

		if (typeof (options) === "object") {
			hasClass = (typeof (options.className) === "string");
			options = $.extend({}, $.watermark.options, options);
		}
		else if (typeof (options) === "string") {
			hasClass = true;
			options = $.extend({}, $.watermark.options, { className: options });
		}
		else {
			options = $.watermark.options;
		}

		if (typeof (options.useNative) !== "function") {
			options.useNative = options.useNative ? function () { return true; } : function () { return false; };
		}

		return this.each(
		function () {
			var $input = $(this);

			if (!$input.is(selWatermarkAble)) {
				return;
			}

			// Watermark already initialized?
			if ($input.data(dataFlag)) {

				// If re-defining text or class, first remove existing watermark, then make changes
				if (hasText || hasClass) {
					$.watermark._hide($input);

					if (hasText) {
						$input.data(dataText, text);
					}

					if (hasClass) {
						$input.data(dataClass, options.className);
					}
				}
			}
			else {

				// Detect and use native browser support, if enabled in options
				if (
					(hasNativePlaceholder)
					&& (options.useNative.call(this, $input))
					&& (($input.attr("tagName") || "") !== "TEXTAREA")
				) {
					// className is not set because current placeholder standard doesn't
					// have a separate class name property for placeholders (watermarks).
					if (hasText) {
						$input.attr("placeholder", text);
					}

					// Only set data flag for non-native watermarks
					// [purposely commented-out] -> $input.data(dataFlag, 1);
					return;
				}

				$input.data(dataText, hasText ? text : "");
				$input.data(dataClass, options.className);
				$input.data(dataFlag, 1); // Flag indicates watermark was initialized

				// Special processing for password type
				if (($input.attr("type") || "") === "password") {
					var $wrap = $input.wrap("<span>").parent(),
						$wm = $($wrap.html().replace(/type=["']?password["']?/i, 'type="text"'));

					$wm.data(dataText, $input.data(dataText));
					$wm.data(dataClass, $input.data(dataClass));
					$wm.data(dataFlag, 1);
					$wm.attr("maxLength", text.length);

					$wm.focus(
						function () {
							$.watermark._hide($wm, true);
						}
					).bind("dragenter",
						function () {
							$.watermark._hide($wm);
						}
					).bind("dragend",
						function () {
							window.setTimeout(function () { $wm.blur(); }, 1);
						}
					);

					$input.blur(
						function () {
							$.watermark._show($input);
						}
					).bind("dragleave",
						function () {
							$.watermark._show($input);
						}
					);

					$wm.data(dataPassword, $input);
					$input.data(dataPassword, $wm);
				}
				else {

					$input.focus(
						function () {
							$input.data(dataFocus, 1);
							$.watermark._hide($input, true);
						}
					).blur(
						function () {
							$input.data(dataFocus, 0);
							$.watermark._show($input);
						}
					).bind("dragenter",
						function () {
							$.watermark._hide($input);
						}
					).bind("dragleave",
						function () {
							$.watermark._show($input);
						}
					).bind("dragend",
						function () {
							window.setTimeout(function () { $.watermark._show($input); }, 1);
						}
					).bind("drop",
					// Firefox makes this lovely function necessary because the dropped text
					// is merged with the watermark before the drop event is called.
						function (evt) {
							var elem = $input[0],
								dropText = evt.originalEvent.dataTransfer.getData("Text");

							if ((elem.value || "").replace(rreturn, "").replace(dropText, "") === $input.data(dataText)) {
								elem.value = dropText;
							}

							$input.focus();
						}
					);
				}

				// In order to reliably clear all watermarks before form submission,
				// we need to replace the form's submit function with our own
				// function.  Otherwise watermarks won't be cleared when the form
				// is submitted programmatically.
				if (this.form) {
					var form = this.form,
						$form = $(form);

					if (!$form.data(dataFormSubmit)) {
						$form.submit($.watermark.hideAll);

						// form.submit exists for all browsers except Google Chrome
						// (see "else" below for explanation)
						if (form.submit) {
							$form.data(dataFormSubmit, form.submit);

							form.submit = (function (f, $f) {
								return function () {
									var nativeSubmit = $f.data(dataFormSubmit);

									$.watermark.hideAll();

									if (nativeSubmit.apply) {
										nativeSubmit.apply(f, Array.prototype.slice.call(arguments));
									}
									else {
										nativeSubmit();
									}
								};
							})(form, $form);
						}
						else {
							$form.data(dataFormSubmit, 1);

							// This strangeness is due to the fact that Google Chrome's
							// form.submit function is not visible to JavaScript (identifies
							// as "undefined").  I had to invent a solution here because hours
							// of Googling (ironically) for an answer did not turn up anything
							// useful.  Within my own form.submit function I delete the form's
							// submit function, and then call the non-existent function --
							// which, in the world of Google Chrome, still exists.
							form.submit = (function (f) {
								return function () {
									$.watermark.hideAll();
									delete f.submit;
									f.submit();
								};
							})(form);
						}
					}
				}
			}

			$.watermark._show($input);
		}
	);
	};

	// The code included within the following if structure is guaranteed to only run once,
	// even if the watermark script file is included multiple times in the page.
	if ($.watermark.runOnce) {
		$.watermark.runOnce = false;

		$.extend($.expr[":"], {

			// Extends jQuery with a custom selector - ":data(...)"
			// :data(<name>)  Includes elements that have a specific name defined in the jQuery data
			// collection. (Only the existence of the name is checked; the value is ignored.)
			// A more sophisticated version of the :data() custom selector originally part of this plugin
			// was removed for compatibility with jQuery UI. The original code can be found in the SVN
			// source listing in the file, "jquery.data.js".
			data: $.expr.createPseudo ?
			$.expr.createPseudo(function (dataName) {
				return function (elem) {
					return !!$.data(elem, dataName);
				};
			}) :
			// support: jQuery <1.8
			function (elem, i, match) {
				return !!$.data(elem, match[3]);
			},

			// Extends jQuery with a custom selector - ":watermarkable"
			// Includes elements that can be watermarked, including textareas and most input elements
			// that accept text input.  It uses a "negative" test (i.e., testing for input types that DON'T
			// work) because the HTML spec states that you can basically use any type, and if it doesn't
			// recognize the type it will default to type=text.  So if we only looked for certain type attributes
			// we would fail to recognize non-standard types, which are still valid and watermarkable.
			watermarkable: function (elem) {
				var type,
				name = elem.nodeName;

				if (name === "TEXTAREA") {
					return true;
				}

				if (name !== "INPUT") {
					return false;
				}

				type = elem.getAttribute("type");

				return ((!type) || (!rInvalidType.test(type)));
			}
		});

		// Overloads the jQuery .val() function to return the underlying input value on
		// watermarked input elements.  When .val() is being used to set values, this
		// function ensures watermarks are properly set/removed after the values are set.
		// Uses self-executing function to override the default jQuery function.
		(function (valOld) {

			$.fn.val = function () {
				var args = Array.prototype.slice.call(arguments);

				// Best practice: return immediately if empty matched set
				if (!this.length) {
					return args.length ? this : undefined;
				}

				// If no args, then we're getting the value of the first element;
				// else we're setting values for all elements in matched set
				if (!args.length) {

					// If element is watermarked, get the underlying value;
					// else use native jQuery .val()
					if (this.data(dataFlag)) {
						var v = (this[0].value || "").replace(rreturn, "");
						return (v === (this.data(dataText) || "")) ? "" : v;
					}
					else {
						return valOld.apply(this);
					}
				}
				else {
					valOld.apply(this, args);
					$.watermark.show(this);
					return this;
				}
			};

		})($.fn.val);

		// Hijack any functions found in the triggerFns list
		if (triggerFns.length) {

			// Wait until DOM is ready before searching
			$(function () {
				var i, name, fn;

				for (i = triggerFns.length - 1; i >= 0; i--) {
					name = triggerFns[i];
					fn = window[name];

					if (typeof (fn) === "function") {
						window[name] = (function (origFn) {
							return function () {
								$.watermark.hideAll();
								return origFn.apply(null, Array.prototype.slice.call(arguments));
							};
						})(fn);
					}
				}
			});
		}

		$(window).bind("beforeunload", function () {
			if ($.watermark.options.hideBeforeUnload) {
				$.watermark.hideAll();
			}
		});
	}

})(jQuery, window);

// SIG // Begin signature block
// SIG // MIIY/gYJKoZIhvcNAQcCoIIY7zCCGOsCAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFDO+cO1qWjcP
// SIG // hGc5NSdDWfuCqlnXoIIT+DCCA+4wggNXoAMCAQICEH6T
// SIG // 6/t8xk5Z6kuad9QG/DswDQYJKoZIhvcNAQEFBQAwgYsx
// SIG // CzAJBgNVBAYTAlpBMRUwEwYDVQQIEwxXZXN0ZXJuIENh
// SIG // cGUxFDASBgNVBAcTC0R1cmJhbnZpbGxlMQ8wDQYDVQQK
// SIG // EwZUaGF3dGUxHTAbBgNVBAsTFFRoYXd0ZSBDZXJ0aWZp
// SIG // Y2F0aW9uMR8wHQYDVQQDExZUaGF3dGUgVGltZXN0YW1w
// SIG // aW5nIENBMB4XDTEyMTIyMTAwMDAwMFoXDTIwMTIzMDIz
// SIG // NTk1OVowXjELMAkGA1UEBhMCVVMxHTAbBgNVBAoTFFN5
// SIG // bWFudGVjIENvcnBvcmF0aW9uMTAwLgYDVQQDEydTeW1h
// SIG // bnRlYyBUaW1lIFN0YW1waW5nIFNlcnZpY2VzIENBIC0g
// SIG // RzIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIB
// SIG // AQCxrLNJVEuXHBIK2CV5kSJXKm/cuCbEQ3Nrwr8uUFr7
// SIG // FMJ2jkMBJUO0oeJF9Oi3e8N0zCLXtJQAAvdN7b+0t0Qk
// SIG // a81fRTvRRM5DEnMXgotptCvLmR6schsmTXEfsTHd+1Fh
// SIG // AlOmqvVJLAV4RaUvic7nmef+jOJXPz3GktxK+Hsz5HkK
// SIG // +/B1iEGc/8UDUZmq12yfk2mHZSmDhcJgFMTIyTsU2sCB
// SIG // 8B8NdN6SIqvK9/t0fCfm90obf6fDni2uiuqm5qonFn1h
// SIG // 95hxEbziUKFL5V365Q6nLJ+qZSDT2JboyHylTkhE/xni
// SIG // RAeSC9dohIBdanhkRc1gRn5UwRN8xXnxycFxAgMBAAGj
// SIG // gfowgfcwHQYDVR0OBBYEFF+a9W5czMx0mtTdfe8/2+xM
// SIG // gC7dMDIGCCsGAQUFBwEBBCYwJDAiBggrBgEFBQcwAYYW
// SIG // aHR0cDovL29jc3AudGhhd3RlLmNvbTASBgNVHRMBAf8E
// SIG // CDAGAQH/AgEAMD8GA1UdHwQ4MDYwNKAyoDCGLmh0dHA6
// SIG // Ly9jcmwudGhhd3RlLmNvbS9UaGF3dGVUaW1lc3RhbXBp
// SIG // bmdDQS5jcmwwEwYDVR0lBAwwCgYIKwYBBQUHAwgwDgYD
// SIG // VR0PAQH/BAQDAgEGMCgGA1UdEQQhMB+kHTAbMRkwFwYD
// SIG // VQQDExBUaW1lU3RhbXAtMjA0OC0xMA0GCSqGSIb3DQEB
// SIG // BQUAA4GBAAMJm495739ZMKrvaLX64wkdu0+CBl03X6ZS
// SIG // nxaN6hySCURu9W3rWHww6PlpjSNzCxJvR6muORH4KrGb
// SIG // sBrDjutZlgCtzgxNstAxpghcKnr84nodV0yoZRjpeUBi
// SIG // JZZux8c3aoMhCI5B6t3ZVz8dd0mHKhYGXqY4aiISo1EZ
// SIG // g362MIIEozCCA4ugAwIBAgIQDs/0OMj+vzVuBNhqmBsa
// SIG // UDANBgkqhkiG9w0BAQUFADBeMQswCQYDVQQGEwJVUzEd
// SIG // MBsGA1UEChMUU3ltYW50ZWMgQ29ycG9yYXRpb24xMDAu
// SIG // BgNVBAMTJ1N5bWFudGVjIFRpbWUgU3RhbXBpbmcgU2Vy
// SIG // dmljZXMgQ0EgLSBHMjAeFw0xMjEwMTgwMDAwMDBaFw0y
// SIG // MDEyMjkyMzU5NTlaMGIxCzAJBgNVBAYTAlVTMR0wGwYD
// SIG // VQQKExRTeW1hbnRlYyBDb3Jwb3JhdGlvbjE0MDIGA1UE
// SIG // AxMrU3ltYW50ZWMgVGltZSBTdGFtcGluZyBTZXJ2aWNl
// SIG // cyBTaWduZXIgLSBHNDCCASIwDQYJKoZIhvcNAQEBBQAD
// SIG // ggEPADCCAQoCggEBAKJjCzlEuLsjp0RJuw7/ofBhClOT
// SIG // sJjbrSwPSsVu/4Y8U1UPFc4EPyv9qZaW2b5heQtbyUyG
// SIG // duXgQ0sile7CK0PBn9hotI5AT+6FOLkRxSPyZFjwFTJv
// SIG // TlehroikAtcqHs1L4d1j1ReJMluwXplaqJ0oUA4X7pbb
// SIG // YTtFUR3PElYLkkf8q672Zj1HrHBy55LnX80QucSDZJQZ
// SIG // vSWA4ejSIqXQugJ6oXeTW2XD7hd0vEGGKtwITIySjJEt
// SIG // nndEH2jWqHR32w5bMotWizO92WPISZ06xcXqMwvS8aMb
// SIG // 9Iu+2bNXizveBKd6IrIkri7HcMW+ToMmCPsLvalPmQjh
// SIG // EChyqs0CAwEAAaOCAVcwggFTMAwGA1UdEwEB/wQCMAAw
// SIG // FgYDVR0lAQH/BAwwCgYIKwYBBQUHAwgwDgYDVR0PAQH/
// SIG // BAQDAgeAMHMGCCsGAQUFBwEBBGcwZTAqBggrBgEFBQcw
// SIG // AYYeaHR0cDovL3RzLW9jc3Aud3Muc3ltYW50ZWMuY29t
// SIG // MDcGCCsGAQUFBzAChitodHRwOi8vdHMtYWlhLndzLnN5
// SIG // bWFudGVjLmNvbS90c3MtY2EtZzIuY2VyMDwGA1UdHwQ1
// SIG // MDMwMaAvoC2GK2h0dHA6Ly90cy1jcmwud3Muc3ltYW50
// SIG // ZWMuY29tL3Rzcy1jYS1nMi5jcmwwKAYDVR0RBCEwH6Qd
// SIG // MBsxGTAXBgNVBAMTEFRpbWVTdGFtcC0yMDQ4LTIwHQYD
// SIG // VR0OBBYEFEbGaaMOShQe1UzaUmMXP142vA3mMB8GA1Ud
// SIG // IwQYMBaAFF+a9W5czMx0mtTdfe8/2+xMgC7dMA0GCSqG
// SIG // SIb3DQEBBQUAA4IBAQB4O7SRKgBM8I9iMDd4o4QnB28Y
// SIG // st4l3KDUlAOqhk4ln5pAAxzdzuN5yyFoBtq2MrRtv/Qs
// SIG // JmMz5ElkbQ3mw2cO9wWkNWx8iRbG6bLfsundIMZxD82V
// SIG // dNy2XN69Nx9DeOZ4tc0oBCCjqvFLxIgpkQ6A0RH83Vx2
// SIG // bk9eDkVGQW4NsOo4mrE62glxEPwcebSAe6xp9P2ctgwW
// SIG // K/F/Wwk9m1viFsoTgW0ALjgNqCmPLOGy9FqpAa8VnCwv
// SIG // SRvbIrvD/niUUcOGsYKIXfA9tFGheTMrLnu53CAJE3Hr
// SIG // ahlbz+ilMFcsiUk/uc9/yb8+ImhjU5q9aXSsxR08f5Lg
// SIG // w7wc2AR1MIIFTTCCBDWgAwIBAgIQAuQ/iw7HS88oo6zv
// SIG // RZXvazANBgkqhkiG9w0BAQUFADCBtDELMAkGA1UEBhMC
// SIG // VVMxFzAVBgNVBAoTDlZlcmlTaWduLCBJbmMuMR8wHQYD
// SIG // VQQLExZWZXJpU2lnbiBUcnVzdCBOZXR3b3JrMTswOQYD
// SIG // VQQLEzJUZXJtcyBvZiB1c2UgYXQgaHR0cHM6Ly93d3cu
// SIG // dmVyaXNpZ24uY29tL3JwYSAoYykxMDEuMCwGA1UEAxMl
// SIG // VmVyaVNpZ24gQ2xhc3MgMyBDb2RlIFNpZ25pbmcgMjAx
// SIG // MCBDQTAeFw0xMzA0MzAwMDAwMDBaFw0xNjA0MjkyMzU5
// SIG // NTlaMIGQMQswCQYDVQQGEwJVUzEOMAwGA1UECBMFVGV4
// SIG // YXMxEzARBgNVBAcTClJvdW5kIFJvY2sxDTALBgNVBAoU
// SIG // BERlbGwxPjA8BgNVBAsTNURpZ2l0YWwgSUQgQ2xhc3Mg
// SIG // MyAtIE1pY3Jvc29mdCBTb2Z0d2FyZSBWYWxpZGF0aW9u
// SIG // IHYyMQ0wCwYDVQQDFAREZWxsMIIBIjANBgkqhkiG9w0B
// SIG // AQEFAAOCAQ8AMIIBCgKCAQEA1iHqtBmG5YZDJsehquJC
// SIG // w3dkkgEaq7N8mYGCzQJr63vUOVoiyHefr6EhUHz3oWgC
// SIG // OJqmYiafFyOoD9C9A7oYdz6QKbTwOCnme9eR7dnpaCBE
// SIG // hJ62SHEkN0P3UA73FSDLjvCVQJzX8idgdsKydfOvbYbp
// SIG // uz/GYvH5kZ0Qc/blbHLrB4hblWiC1M9W1PLh2+ctBG3C
// SIG // H7/AHDWJ5AaOEdrj+HuXc7IkiiiUY7Ib/hICEs9FBFoq
// SIG // XryKd6FGbTbZFHci3ZWbs1dB5ZzJVdF0MFCCu7rEap/k
// SIG // JOIiZcUM+6E82ZjQ2F3ADcmekyYDfuDaIN7RqNBe+cJL
// SIG // aLp8u3F7jntFNQIDAQABo4IBezCCAXcwCQYDVR0TBAIw
// SIG // ADAOBgNVHQ8BAf8EBAMCB4AwQAYDVR0fBDkwNzA1oDOg
// SIG // MYYvaHR0cDovL2NzYzMtMjAxMC1jcmwudmVyaXNpZ24u
// SIG // Y29tL0NTQzMtMjAxMC5jcmwwRAYDVR0gBD0wOzA5Bgtg
// SIG // hkgBhvhFAQcXAzAqMCgGCCsGAQUFBwIBFhxodHRwczov
// SIG // L3d3dy52ZXJpc2lnbi5jb20vcnBhMBMGA1UdJQQMMAoG
// SIG // CCsGAQUFBwMDMHEGCCsGAQUFBwEBBGUwYzAkBggrBgEF
// SIG // BQcwAYYYaHR0cDovL29jc3AudmVyaXNpZ24uY29tMDsG
// SIG // CCsGAQUFBzAChi9odHRwOi8vY3NjMy0yMDEwLWFpYS52
// SIG // ZXJpc2lnbi5jb20vQ1NDMy0yMDEwLmNlcjAfBgNVHSME
// SIG // GDAWgBTPmanqeyb0S8mOj9fwBSbv49KnnTARBglghkgB
// SIG // hvhCAQEEBAMCBBAwFgYKKwYBBAGCNwIBGwQIMAYBAQAB
// SIG // Af8wDQYJKoZIhvcNAQEFBQADggEBABCdL9RfmYeCBQvb
// SIG // yGIalVCEBx8nxrElQIrEtPWcgxTxqS/7ap/mn3jVEWeq
// SIG // 3j5VqWaZ6/uyC4MejLBERChFqMA3uTuyOjsg/Tpw42MW
// SIG // Q2FRDE1gsUQ6eNvqr8bRLSqVNlilGqrAIEI5aYaDq/Ty
// SIG // bJ5+VTck+/Fq4iqCZWKdIOHYoh5BapPj1J4KmU95nHf9
// SIG // HtlYzR9JMF4J3T17WDjB6v1/lCnTXeFxMEq4f+23U63M
// SIG // 0fKcMbN8WgWB9uffN9mos+/ynRxOGXFusPTl/2RTmr5T
// SIG // tiI/E8oWGh+rLvHgOGEzCZSt1uDxGMVz8ybymPCmJt2y
// SIG // c7vuI0IBzBOBROr2BXAwggYKMIIE8qADAgECAhBSAOWq
// SIG // JVb8GobtlsnUSzPHMA0GCSqGSIb3DQEBBQUAMIHKMQsw
// SIG // CQYDVQQGEwJVUzEXMBUGA1UEChMOVmVyaVNpZ24sIElu
// SIG // Yy4xHzAdBgNVBAsTFlZlcmlTaWduIFRydXN0IE5ldHdv
// SIG // cmsxOjA4BgNVBAsTMShjKSAyMDA2IFZlcmlTaWduLCBJ
// SIG // bmMuIC0gRm9yIGF1dGhvcml6ZWQgdXNlIG9ubHkxRTBD
// SIG // BgNVBAMTPFZlcmlTaWduIENsYXNzIDMgUHVibGljIFBy
// SIG // aW1hcnkgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkgLSBH
// SIG // NTAeFw0xMDAyMDgwMDAwMDBaFw0yMDAyMDcyMzU5NTla
// SIG // MIG0MQswCQYDVQQGEwJVUzEXMBUGA1UEChMOVmVyaVNp
// SIG // Z24sIEluYy4xHzAdBgNVBAsTFlZlcmlTaWduIFRydXN0
// SIG // IE5ldHdvcmsxOzA5BgNVBAsTMlRlcm1zIG9mIHVzZSBh
// SIG // dCBodHRwczovL3d3dy52ZXJpc2lnbi5jb20vcnBhIChj
// SIG // KTEwMS4wLAYDVQQDEyVWZXJpU2lnbiBDbGFzcyAzIENv
// SIG // ZGUgU2lnbmluZyAyMDEwIENBMIIBIjANBgkqhkiG9w0B
// SIG // AQEFAAOCAQ8AMIIBCgKCAQEA9SNLXqXXirsy6dRX9+/k
// SIG // xyZ+rRmY/qidfZT2NmsQ13WBMH8EaH/LK3UezR0IjN9p
// SIG // lKc3o5x7gOCZ4e43TV/OOxTuhtTQ9Sc1vCULOKeMY50X
// SIG // owilq7D7zWpigkzVIdob2fHjhDuKKk+FW5ABT8mndhB/
// SIG // JwN8vq5+fcHd+QW8G0icaefApDw8QQA+35blxeSUcdZV
// SIG // AccAJkpAPLWhJqkMp22AjpAle8+/PxzrL5b65Yd3xrVW
// SIG // sno7VDBTG99iNP8e0fRakyiF5UwXTn5b/aSTmX/fze+k
// SIG // de/vFfZH5/gZctguNBqmtKdMfr27Tww9V/Ew1qY2jtaA
// SIG // dtcZLqXNfjQtiQIDAQABo4IB/jCCAfowEgYDVR0TAQH/
// SIG // BAgwBgEB/wIBADBwBgNVHSAEaTBnMGUGC2CGSAGG+EUB
// SIG // BxcDMFYwKAYIKwYBBQUHAgEWHGh0dHBzOi8vd3d3LnZl
// SIG // cmlzaWduLmNvbS9jcHMwKgYIKwYBBQUHAgIwHhocaHR0
// SIG // cHM6Ly93d3cudmVyaXNpZ24uY29tL3JwYTAOBgNVHQ8B
// SIG // Af8EBAMCAQYwbQYIKwYBBQUHAQwEYTBfoV2gWzBZMFcw
// SIG // VRYJaW1hZ2UvZ2lmMCEwHzAHBgUrDgMCGgQUj+XTGoas
// SIG // jY5rw8+AatRIGCx7GS4wJRYjaHR0cDovL2xvZ28udmVy
// SIG // aXNpZ24uY29tL3ZzbG9nby5naWYwNAYDVR0fBC0wKzAp
// SIG // oCegJYYjaHR0cDovL2NybC52ZXJpc2lnbi5jb20vcGNh
// SIG // My1nNS5jcmwwNAYIKwYBBQUHAQEEKDAmMCQGCCsGAQUF
// SIG // BzABhhhodHRwOi8vb2NzcC52ZXJpc2lnbi5jb20wHQYD
// SIG // VR0lBBYwFAYIKwYBBQUHAwIGCCsGAQUFBwMDMCgGA1Ud
// SIG // EQQhMB+kHTAbMRkwFwYDVQQDExBWZXJpU2lnbk1QS0kt
// SIG // Mi04MB0GA1UdDgQWBBTPmanqeyb0S8mOj9fwBSbv49Kn
// SIG // nTAfBgNVHSMEGDAWgBR/02Wnwt3su/AwCfNDOfoCrzMx
// SIG // MzANBgkqhkiG9w0BAQUFAAOCAQEAViLmNKTEYctIuQGt
// SIG // VqhkD9mMkcS7zAzlrXqgIn/fRzhKLWzRf3EafOxwqbHw
// SIG // T+QPDFP6FV7+dJhJJIWBJhyRFEewTGOMu6E01MZF6A2F
// SIG // JnMD0KmMZG3ccZLmRQVgFVlROfxYFGv+1KTteWsIDEFy
// SIG // 5zciBgm+I+k/RJoe6WGdzLGQXPw90o2sQj1lNtS0PUAo
// SIG // j5sQzyMmzEsgy5AfXYxMNMo82OU31m+lIL006ybZrg3n
// SIG // xZr3obQhkTNvhuhYuyV8dA5Y/nUbYz/OMXybjxuWnsVT
// SIG // doRbnK2R+qztk7pdyCFTwoJTY68SDVCHERs9VFKWiiyc
// SIG // PZIaCJoFLseTpUiR0zGCBHIwggRuAgEBMIHJMIG0MQsw
// SIG // CQYDVQQGEwJVUzEXMBUGA1UEChMOVmVyaVNpZ24sIElu
// SIG // Yy4xHzAdBgNVBAsTFlZlcmlTaWduIFRydXN0IE5ldHdv
// SIG // cmsxOzA5BgNVBAsTMlRlcm1zIG9mIHVzZSBhdCBodHRw
// SIG // czovL3d3dy52ZXJpc2lnbi5jb20vcnBhIChjKTEwMS4w
// SIG // LAYDVQQDEyVWZXJpU2lnbiBDbGFzcyAzIENvZGUgU2ln
// SIG // bmluZyAyMDEwIENBAhAC5D+LDsdLzyijrO9Fle9rMAkG
// SIG // BSsOAwIaBQCgcDAQBgorBgEEAYI3AgEMMQIwADAZBgkq
// SIG // hkiG9w0BCQMxDAYKKwYBBAGCNwIBBDAcBgorBgEEAYI3
// SIG // AgELMQ4wDAYKKwYBBAGCNwIBFTAjBgkqhkiG9w0BCQQx
// SIG // FgQUiIMnlXbs8bZzGiGcZbxdilc/1NcwDQYJKoZIhvcN
// SIG // AQEBBQAEggEAjjVV48tROCTUiPtfHR8J6VyZQdzHtkYz
// SIG // 3atIgzjAWGm5QKZ7rIAd+560KhJtyWLcbA8q9RzVUdKL
// SIG // 9N9/45beynwp47C0yTjo9BUXvsQfAaZm6K8WP/u7A7vB
// SIG // qzHFgwPjBw/r3Vwk1IlXfJRG3tpQt9Jfm80xdhy7RpRm
// SIG // qQeDb1IPYTV4fVuECqQRJAAHo7xR10hf5tp7AKE6G5FW
// SIG // Ax0w78n76AakbPVO/uMm+BZlXWFnZyVjrhi8+FzCgzX4
// SIG // 4INzTZcoQwWQWba+ITjIwHvJWQDR6ej398wogHROsSO3
// SIG // 95+4G+mKK0orvfsnMcPybPKgNxJ14kLKNOAJKLkRdi8i
// SIG // mqGCAgswggIHBgkqhkiG9w0BCQYxggH4MIIB9AIBATBy
// SIG // MF4xCzAJBgNVBAYTAlVTMR0wGwYDVQQKExRTeW1hbnRl
// SIG // YyBDb3Jwb3JhdGlvbjEwMC4GA1UEAxMnU3ltYW50ZWMg
// SIG // VGltZSBTdGFtcGluZyBTZXJ2aWNlcyBDQSAtIEcyAhAO
// SIG // z/Q4yP6/NW4E2GqYGxpQMAkGBSsOAwIaBQCgXTAYBgkq
// SIG // hkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJ
// SIG // BTEPFw0xNDA2MDUwNDM5MjhaMCMGCSqGSIb3DQEJBDEW
// SIG // BBT6KrAwsaoito4EsfFrkYy7HfG/yzANBgkqhkiG9w0B
// SIG // AQEFAASCAQBR35GuLtbXkKIw+qBv8Zn01Rjh7o+UFId/
// SIG // S0laz7uxQtzdlvDJDxXcUrC+9gh7K4OnZWqNRuJrpMpP
// SIG // +b7L0wj3KiUdqqiKVnrV8/u7mv95xZkU2WHh936Lrchy
// SIG // 268RIdc9fAFBtBDIfwL0ETeAMRY4aA/NMcH0XXEuSCQH
// SIG // 01M7S/9U1RYVKeE1imcRBLquy4PPwi43js/J71r3tVLi
// SIG // MlJuDl60dgRZ04HIpQAef7B8xCx/y8gSG2fqaexFSqzC
// SIG // gxOVAjnbf6eQc3PbyCRDHRIFDG8pchr+ooAtBTrNhVR6
// SIG // R210CqxZa8SJ5ta+2obvTu7TwHBWifCbLCYXEEeHLbUF
// SIG // End signature block
