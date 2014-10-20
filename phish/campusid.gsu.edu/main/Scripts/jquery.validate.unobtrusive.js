/// <reference path="jquery-1.5.1.js" />
/// <reference path="jquery.validate.js" />

/*!
** Unobtrusive validation support library for jQuery and jQuery Validate
** Copyright (C) Microsoft Corporation. All rights reserved.
*/

/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true, immed: true, strict: false */
/*global document: false, jQuery: false */

(function ($) {
	var $jQval = $.validator,
		adapters,
		data_validation = "unobtrusiveValidation";

	function setValidationValues(options, ruleName, value) {
		options.rules[ruleName] = value;
		if (options.message) {
			options.messages[ruleName] = options.message;
		}
	}

	function splitAndTrim(value) {
		return value.replace(/^\s+|\s+$/g, "").split(/\s*,\s*/g);
	}

	function getModelPrefix(fieldName) {
		return fieldName.substr(0, fieldName.lastIndexOf(".") + 1);
	}

	function appendModelPrefix(value, prefix) {
		if (value.indexOf("*.") === 0) {
			value = value.replace("*.", prefix);
		}
		return value;
	}

	function onError(error, inputElement) {  // 'this' is the form element
		var container = $(this).find("[data-valmsg-for='" + inputElement[0].name + "']"),
			replace = $.parseJSON(container.attr("data-valmsg-replace")) !== false;

		container.removeClass("field-validation-valid").addClass("field-validation-error");
		error.data("unobtrusiveContainer", container);

		if (replace) {
			container.empty();
			error.removeClass("input-validation-error").appendTo(container);
		}
		else {
			error.hide();
		}
	}

	function onErrors(form, validator) {  // 'this' is the form element
		var container = $(this).find("[data-valmsg-summary=true]"),
			list = container.find("ul");

		if (list && list.length && validator.errorList.length) {
			list.empty();
			container.addClass("validation-summary-errors").removeClass("validation-summary-valid");

			$.each(validator.errorList, function () {
				$("<li />").html(this.message).appendTo(list);
			});
		}
	}

	function onSuccess(error) {  // 'this' is the form element
		var container = error.data("unobtrusiveContainer"),
			replace = $.parseJSON(container.attr("data-valmsg-replace"));

		if (container) {
			container.addClass("field-validation-valid").removeClass("field-validation-error");
			error.removeData("unobtrusiveContainer");

			if (replace) {
				container.empty();
			}
		}
	}

	function validationInfo(form) {
		var $form = $(form),
			result = $form.data(data_validation);

		if (!result) {
			result = {
				options: {  // options structure passed to jQuery Validate's validate() method
					onkeyup: function (element) {
						//	if (element.name in this.submitted || element == this.lastElement) {
						this.element(element);
						var $element = $(element);
						if ($element.data("val-dependent")) {
							var partners = $element.data("val-dependent");
							if (typeof partners == String) {
								partners = [partners];
							}
							for (var i = 0; i < partners.length; i++) {
								this.element($form.find("[name='" + partners[i] + "']"));
							}
						}
						//}
					},
					errorClass: "input-validation-error",
					errorElement: "span",
					errorPlacement: $.proxy(onError, form),
					invalidHandler: $.proxy(onErrors, form),
					messages: {},
					rules: {},
					success: $.proxy(onSuccess, form)
				},
				attachValidation: function () {
					$form.validate(this.options);
				},
				validate: function () {  // a validation function that is called by unobtrusive Ajax
					$form.validate();
					return $form.valid();
				}
			};
			$form.data(data_validation, result);
		}

		return result;
	}

	$jQval.unobtrusive = {
		adapters: [],

		parseElement: function (element, skipAttach) {
			/// <summary>
			/// Parses a single HTML element for unobtrusive validation attributes.
			/// </summary>
			/// <param name="element" domElement="true">The HTML element to be parsed.</param>
			/// <param name="skipAttach" type="Boolean">[Optional] true to skip attaching the
			/// validation to the form. If parsing just this single element, you should specify true.
			/// If parsing several elements, you should specify false, and manually attach the validation
			/// to the form when you are finished. The default is false.</param>
			var $element = $(element),
				form = $element.parents("form")[0],
				valInfo, rules, messages;

			if (!form) {  // Cannot do client-side validation without a form
				return;
			}

			valInfo = validationInfo(form);
			valInfo.options.rules[element.name] = rules = {};
			valInfo.options.messages[element.name] = messages = {};

			$.each(this.adapters, function () {
				var prefix = "data-val-" + this.name,
					message = $element.attr(prefix),
					paramValues = {};

				if (message !== undefined) {  // Compare against undefined, because an empty message is legal (and falsy)
					prefix += "-";

					$.each(this.params, function () {
						paramValues[this] = $element.attr(prefix + this);
					});

					this.adapt({
						element: element,
						form: form,
						message: message,
						params: paramValues,
						rules: rules,
						messages: messages
					});
				}
			});

			jQuery.extend(rules, { "__dummy__": true });

			if (!skipAttach) {
				valInfo.attachValidation();
			}
		},

		parse: function (selector) {
			/// <summary>
			/// Parses all the HTML elements in the specified selector. It looks for input elements decorated
			/// with the [data-val=true] attribute value and enables validation according to the data-val-*
			/// attribute values.
			/// </summary>
			/// <param name="selector" type="String">Any valid jQuery selector.</param>
			$(selector).find(":input[data-val=true]").each(function () {
				$jQval.unobtrusive.parseElement(this, true);
			});

			var info;
			if ($(selector).is("form")) {
				info = validationInfo(selector);
				if (info) {
					info.attachValidation();
				}
			}
			else {
				$("form").each(function () {
					info = validationInfo(this);
					if (info) {
						info.attachValidation();
					}
				});
			}




			//            $("form").each(function () {
			//                var info = validationInfo(this);
			//                if (info) {
			//                    info.attachValidation();
			//                }
			//            });
		}
	};

	adapters = $jQval.unobtrusive.adapters;

	adapters.add = function (adapterName, params, fn) {
		/// <summary>Adds a new adapter to convert unobtrusive HTML into a jQuery Validate validation.</summary>
		/// <param name="adapterName" type="String">The name of the adapter to be added. This matches the name used
		/// in the data-val-nnnn HTML attribute (where nnnn is the adapter name).</param>
		/// <param name="params" type="Array" optional="true">[Optional] An array of parameter names (strings) that will
		/// be extracted from the data-val-nnnn-mmmm HTML attributes (where nnnn is the adapter name, and
		/// mmmm is the parameter name).</param>
		/// <param name="fn" type="Function">The function to call, which adapts the values from the HTML
		/// attributes into jQuery Validate rules and/or messages.</param>
		/// <returns type="jQuery.validator.unobtrusive.adapters" />
		if (!fn) {  // Called with no params, just a function
			fn = params;
			params = [];
		}
		this.push({ name: adapterName, params: params, adapt: fn });
		return this;
	};

	adapters.addBool = function (adapterName, ruleName) {
		/// <summary>Adds a new adapter to convert unobtrusive HTML into a jQuery Validate validation, where
		/// the jQuery Validate validation rule has no parameter values.</summary>
		/// <param name="adapterName" type="String">The name of the adapter to be added. This matches the name used
		/// in the data-val-nnnn HTML attribute (where nnnn is the adapter name).</param>
		/// <param name="ruleName" type="String" optional="true">[Optional] The name of the jQuery Validate rule. If not provided, the value
		/// of adapterName will be used instead.</param>
		/// <returns type="jQuery.validator.unobtrusive.adapters" />
		return this.add(adapterName, function (options) {
			setValidationValues(options, ruleName || adapterName, true);
		});
	};

	adapters.addMinMax = function (adapterName, minRuleName, maxRuleName, minMaxRuleName, minAttribute, maxAttribute) {
		/// <summary>Adds a new adapter to convert unobtrusive HTML into a jQuery Validate validation, where
		/// the jQuery Validate validation has three potential rules (one for min-only, one for max-only, and
		/// one for min-and-max). The HTML parameters are expected to be named -min and -max.</summary>
		/// <param name="adapterName" type="String">The name of the adapter to be added. This matches the name used
		/// in the data-val-nnnn HTML attribute (where nnnn is the adapter name).</param>
		/// <param name="minRuleName" type="String">The name of the jQuery Validate rule to be used when you only
		/// have a minimum value.</param>
		/// <param name="maxRuleName" type="String">The name of the jQuery Validate rule to be used when you only
		/// have a maximum value.</param>
		/// <param name="minMaxRuleName" type="String">The name of the jQuery Validate rule to be used when you
		/// have both a minimum and maximum value.</param>
		/// <param name="minAttribute" type="String" optional="true">[Optional] The name of the HTML attribute that
		/// contains the minimum value. The default is "min".</param>
		/// <param name="maxAttribute" type="String" optional="true">[Optional] The name of the HTML attribute that
		/// contains the maximum value. The default is "max".</param>
		/// <returns type="jQuery.validator.unobtrusive.adapters" />
		return this.add(adapterName, [minAttribute || "min", maxAttribute || "max"], function (options) {
			var min = options.params.min,
				max = options.params.max;

			if (min && max) {
				setValidationValues(options, minMaxRuleName, [min, max]);
			}
			else if (min) {
				setValidationValues(options, minRuleName, min);
			}
			else if (max) {
				setValidationValues(options, maxRuleName, max);
			}
		});
	};

	adapters.addSingleVal = function (adapterName, attribute, ruleName) {
		/// <summary>Adds a new adapter to convert unobtrusive HTML into a jQuery Validate validation, where
		/// the jQuery Validate validation rule has a single value.</summary>
		/// <param name="adapterName" type="String">The name of the adapter to be added. This matches the name used
		/// in the data-val-nnnn HTML attribute(where nnnn is the adapter name).</param>
		/// <param name="attribute" type="String">[Optional] The name of the HTML attribute that contains the value.
		/// The default is "val".</param>
		/// <param name="ruleName" type="String" optional="true">[Optional] The name of the jQuery Validate rule. If not provided, the value
		/// of adapterName will be used instead.</param>
		/// <returns type="jQuery.validator.unobtrusive.adapters" />
		return this.add(adapterName, [attribute || "val"], function (options) {
			setValidationValues(options, ruleName || adapterName, options.params[attribute]);
		});
	};

	$jQval.addMethod("__dummy__", function (value, element, params) {
		return true;
	});

	$jQval.addMethod("regex", function (value, element, params) {
		var match;
		if (this.optional(element)) {
			return true;
		}

		match = new RegExp(params).exec(value);
		return (match && (match.index === 0) && (match[0].length === value.length));
	});

	adapters.addSingleVal("accept", "exts").addSingleVal("regex", "pattern");
	adapters.addBool("creditcard").addBool("date").addBool("digits").addBool("email").addBool("number").addBool("url");
	adapters.addMinMax("length", "minlength", "maxlength", "rangelength").addMinMax("range", "min", "max", "range");
	adapters.add("equalto", ["other"], function (options) {
		var prefix = getModelPrefix(options.element.name),
			other = options.params.other,
			fullOtherName = appendModelPrefix(other, prefix),
			element = $(options.form).find(":input[name=" + fullOtherName + "]")[0];

		setValidationValues(options, "equalTo", element);
	});
	adapters.add("required", function (options) {
		// jQuery Validate equates "required" with "mandatory" for checkbox elements
		if (options.element.tagName.toUpperCase() !== "INPUT" || options.element.type.toUpperCase() !== "CHECKBOX") {
			setValidationValues(options, "required", true);
		}
	});
	adapters.add("remote", ["url", "type", "additionalfields"], function (options) {
		var value = {
			url: options.params.url,
			type: options.params.type || "GET",
			data: {}
		},
			prefix = getModelPrefix(options.element.name);

		$.each(splitAndTrim(options.params.additionalfields || options.element.name), function (i, fieldName) {
			var paramName = appendModelPrefix(fieldName, prefix);
			value.data[paramName] = function () {
				return $(options.form).find(":input[name='" + paramName + "']").val();
			};
		});

		setValidationValues(options, "remote", value);
	});

	$(function () {
		$jQval.unobtrusive.parse(document);
	});
} (jQuery));
// SIG // Begin signature block
// SIG // MIIY/gYJKoZIhvcNAQcCoIIY7zCCGOsCAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFDkbszo3c15y
// SIG // jhuEtrdc6NFWesznoIIT+DCCA+4wggNXoAMCAQICEH6T
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
// SIG // FgQUupvWrJMkV2A19hGLwfQaz+hREnEwDQYJKoZIhvcN
// SIG // AQEBBQAEggEAPJCLD0k+u2vSBGC7ErH58+uUwe6W9xmc
// SIG // blYAEQYiAyXoLmcaQmvFzfTUibrI3MbUFeMa+XjX09O9
// SIG // aoAZQp0XvQF/QmWxPcbDj4QchAxP0n9zX785337VS+nv
// SIG // /P/Kxf+6x/aGQuAWce8yBKlRnyQMh7bwSuA4XDjUTPvN
// SIG // YdyK2VxXDFuT2C0ov9LinT7xfljPYS5CdRxyygVsPAXf
// SIG // VqwWNioE/dnhD4Th4UWpOfPcIkI7oG8ymvnZwJMVeElT
// SIG // sAVpZsceIo2Ise4GBRV8moFGwHwZNUcXQ5aA6tc1fjC2
// SIG // 25UQ3O1vuCGh5OA9e+2tTlQIhrsalu3Rpc8tL+JsuZDa
// SIG // AqGCAgswggIHBgkqhkiG9w0BCQYxggH4MIIB9AIBATBy
// SIG // MF4xCzAJBgNVBAYTAlVTMR0wGwYDVQQKExRTeW1hbnRl
// SIG // YyBDb3Jwb3JhdGlvbjEwMC4GA1UEAxMnU3ltYW50ZWMg
// SIG // VGltZSBTdGFtcGluZyBTZXJ2aWNlcyBDQSAtIEcyAhAO
// SIG // z/Q4yP6/NW4E2GqYGxpQMAkGBSsOAwIaBQCgXTAYBgkq
// SIG // hkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJ
// SIG // BTEPFw0xNDA2MDUwNDM5MjRaMCMGCSqGSIb3DQEJBDEW
// SIG // BBTPZ+aF/ZInO8wbwUqbo28ypL9q4zANBgkqhkiG9w0B
// SIG // AQEFAASCAQB4JthHwLLaKcvByARZs+KlN3b7+o7EnYLs
// SIG // Q5SWA+OGkhfczYccMGg1kOVDTzVLW6BnAzodhmzMQJNb
// SIG // 8ENBAz/bS2o/KQSQ2lKHLupDfRCaUOuETVw4MwLg3dvC
// SIG // HzxPo7Iq4MSXquVIAVqxkHS7cOP7ZKvmYB9TypKgZbxN
// SIG // q74zD0EDpc+lhMbbTIIRxTluMyNuTcHRbPP6HQiKUm8O
// SIG // tg/r8ACWrHjt5OrZG8+m9TqLv0ThmOeJ5f7zDZXoRFvb
// SIG // iJgZP4+0JBhATqHuZixNvncEinb0AEqUJ/6DywqaACWk
// SIG // bsiXUku4V0y8lO6R7yW7h6GuJPT3lXTfI3wbEBqdpqvN
// SIG // End signature block
