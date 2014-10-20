/**
* Note: While Microsoft is not the author of this file, Microsoft is
* offering you a license subject to the terms of the Microsoft Software
* License Terms for Microsoft ASP.NET Model View Controller 3.
* Microsoft reserves all other rights. The notices below are provided
* for informational purposes only and are not the license terms under
* which Microsoft distributed this file.
*
* jQuery Validation Plugin 1.8.0
*
* http://bassistance.de/jquery-plugins/jquery-plugin-validation/
* http://docs.jquery.com/Plugins/Validation
*
* Copyright (c) 2006 - 2011 Jörn Zaefferer
*/

(function ($) {

	$.extend($.fn, {
		// http://docs.jquery.com/Plugins/Validation/validate
		validate: function (options) {

			// if nothing is selected, return nothing; can't chain anyway
			if (!this.length) {
				options && options.debug && window.console && console.warn("nothing selected, can't validate, returning nothing");
				return;
			}

			// check if a validator for this form was already created
			var validator = $.data(this[0], 'validator');
			if (validator) {
				return validator;
			}

			validator = new $.validator(options, this[0]);
			$.data(this[0], 'validator', validator);

			if (validator.settings.onsubmit) {

				// allow suppresing validation by adding a cancel class to the submit button
				this.find("input, button").filter(".cancel").click(function () {
					validator.cancelSubmit = true;
				});

				// when a submitHandler is used, capture the submitting button
				if (validator.settings.submitHandler) {
					this.find("input, button").filter(":submit").click(function () {
						validator.submitButton = this;
					});
				}

				// validate the form on submit
				this.submit(function (event) {
					if (validator.settings.debug)
					// prevent form submit to be able to see console output
						event.preventDefault();

					function handle() {
						if (validator.settings.submitHandler) {
							if (validator.submitButton) {
								// insert a hidden input as a replacement for the missing submit button
								var hidden = $("<input type='hidden'/>").attr("name", validator.submitButton.name).val(validator.submitButton.value).appendTo(validator.currentForm);
							}
							validator.settings.submitHandler.call(validator, validator.currentForm);
							if (validator.submitButton) {
								// and clean up afterwards; thanks to no-block-scope, hidden can be referenced
								hidden.remove();
							}
							return false;
						}
						return true;
					}

					// prevent submit for invalid forms or custom submit handlers
					if (validator.cancelSubmit) {
						validator.cancelSubmit = false;
						return handle();
					}
					if (validator.form()) {
						if (validator.pendingRequest) {
							validator.formSubmitted = true;
							return false;
						}
						return handle();
					} else {
						validator.focusInvalid();
						return false;
					}
				});
			}

			return validator;
		},
		// http://docs.jquery.com/Plugins/Validation/valid
		valid: function () {
			if ($(this[0]).is('form')) {
				return this.validate().form();
			} else {
				var valid = true;
				var validator = $(this[0].form).validate();
				this.each(function () {
					valid &= validator.element(this);
				});
				return valid;
			}
		},
		// attributes: space seperated list of attributes to retrieve and remove
		removeAttrs: function (attributes) {
			var result = {},
			$element = this;
			$.each(attributes.split(/\s/), function (index, value) {
				result[value] = $element.attr(value);
				$element.removeAttr(value);
			});
			return result;
		},
		// http://docs.jquery.com/Plugins/Validation/rules
		rules: function (command, argument) {
			var element = this[0];

			if (command) {
				var settings = $.data(element.form, 'validator').settings;
				var staticRules = settings.rules;
				var existingRules = $.validator.staticRules(element);
				switch (command) {
					case "add":
						$.extend(existingRules, $.validator.normalizeRule(argument));
						staticRules[element.name] = existingRules;
						if (argument.messages)
							settings.messages[element.name] = $.extend(settings.messages[element.name], argument.messages);
						break;
					case "remove":
						if (!argument) {
							delete staticRules[element.name];
							return existingRules;
						}
						var filtered = {};
						$.each(argument.split(/\s/), function (index, method) {
							filtered[method] = existingRules[method];
							delete existingRules[method];
						});
						return filtered;
				}
			}

			var data = $.validator.normalizeRules(
		$.extend(
			{},
			$.validator.metadataRules(element),
			$.validator.classRules(element),
			$.validator.attributeRules(element),
			$.validator.staticRules(element)
		), element);

			// make sure required is at front
			if (data.required) {
				var param = data.required;
				delete data.required;
				data = $.extend({ required: param }, data);
			}

			return data;
		}
	});

	// Custom selectors
	$.extend($.expr[":"], {
		// http://docs.jquery.com/Plugins/Validation/blank
		blank: function (a) { return !$.trim("" + a.value); },
		// http://docs.jquery.com/Plugins/Validation/filled
		filled: function (a) { return !!$.trim("" + a.value); },
		// http://docs.jquery.com/Plugins/Validation/unchecked
		unchecked: function (a) { return !a.checked; }
	});

	// constructor for validator
	$.validator = function (options, form) {
		this.settings = $.extend(true, {}, $.validator.defaults, options);
		this.currentForm = form;
		this.init();
	};

	$.validator.format = function (source, params) {
		if (arguments.length == 1)
			return function () {
				var args = $.makeArray(arguments);
				args.unshift(source);
				return $.validator.format.apply(this, args);
			};
		if (arguments.length > 2 && params.constructor != Array) {
			params = $.makeArray(arguments).slice(1);
		}
		if (params.constructor != Array) {
			params = [params];
		}
		$.each(params, function (i, n) {
			source = source.replace(new RegExp("\\{" + i + "\\}", "g"), n);
		});
		return source;
	};

	$.extend($.validator, {

		defaults: {
			messages: {},
			groups: {},
			rules: {},
			errorClass: "error",
			validClass: "valid",
			errorElement: "label",
			focusInvalid: true,
			errorContainer: $([]),
			errorLabelContainer: $([]),
			onsubmit: true,
			ignore: [],
			ignoreTitle: false,
			onfocusin: function (element) {
				this.lastActive = element;

				// hide error label and remove error class on focus if enabled
				if (this.settings.focusCleanup && !this.blockFocusCleanup) {
					this.settings.unhighlight && this.settings.unhighlight.call(this, element, this.settings.errorClass, this.settings.validClass);
					this.addWrapper(this.errorsFor(element)).hide();
				}
			},
			onfocusout: function (element) {
				if (!this.checkable(element) && (element.name in this.submitted || !this.optional(element))) {
					this.element(element);
				}
			},
			onkeyup: function (element) {
				if (element.name in this.submitted || element == this.lastElement) {
					this.element(element);
				}
			},
			onclick: function (element) {
				// click on selects, radiobuttons and checkboxes
				if (element.name in this.submitted)
					this.element(element);
				// or option elements, check parent select in that case
				else if (element.parentNode.name in this.submitted)
					this.element(element.parentNode);
			},
			highlight: function (element, errorClass, validClass) {
				$(element).addClass(errorClass).removeClass(validClass);
			},
			unhighlight: function (element, errorClass, validClass) {
				$(element).removeClass(errorClass).addClass(validClass);
			}
		},

		// http://docs.jquery.com/Plugins/Validation/Validator/setDefaults
		setDefaults: function (settings) {
			$.extend($.validator.defaults, settings);
		},

		messages: {
			required: "This field is required.",
			remote: "Please fix this field.",
			email: "Please enter a valid email address.",
			url: "Please enter a valid URL.",
			date: "Please enter a valid date.",
			dateISO: "Please enter a valid date (ISO).",
			number: "Please enter a valid number.",
			digits: "Please enter only digits.",
			creditcard: "Please enter a valid credit card number.",
			equalTo: "Please enter the same value again.",
			accept: "Please enter a value with a valid extension.",
			maxlength: $.validator.format("Please enter no more than {0} characters."),
			minlength: $.validator.format("Please enter at least {0} characters."),
			rangelength: $.validator.format("Please enter a value between {0} and {1} characters long."),
			range: $.validator.format("Please enter a value between {0} and {1}."),
			max: $.validator.format("Please enter a value less than or equal to {0}."),
			min: $.validator.format("Please enter a value greater than or equal to {0}.")
		},

		autoCreateRanges: false,

		prototype: {

			init: function () {
				this.labelContainer = $(this.settings.errorLabelContainer);
				this.errorContext = this.labelContainer.length && this.labelContainer || $(this.currentForm);
				this.containers = $(this.settings.errorContainer).add(this.settings.errorLabelContainer);
				this.submitted = {};
				this.valueCache = {};
				this.pendingRequest = 0;
				this.pending = {};
				this.invalid = {};
				this.reset();

				var groups = (this.groups = {});
				$.each(this.settings.groups, function (key, value) {
					$.each(value.split(/\s/), function (index, name) {
						groups[name] = key;
					});
				});
				var rules = this.settings.rules;
				$.each(rules, function (key, value) {
					rules[key] = $.validator.normalizeRule(value);
				});

				function delegate(event) {
					var validator = $.data(this[0].form, "validator"),
					eventType = "on" + event.type.replace(/^validate/, "");
					validator.settings[eventType] && validator.settings[eventType].call(validator, this[0]);
				}
				$(this.currentForm)
				.validateDelegate(":text, :password, :file, select, textarea", "focusin focusout keyup", delegate)
				.validateDelegate(":radio, :checkbox, select, option", "click", delegate);

				if (this.settings.invalidHandler)
					$(this.currentForm).bind("invalid-form.validate", this.settings.invalidHandler);
			},

			// http://docs.jquery.com/Plugins/Validation/Validator/form
			form: function () {
				this.checkForm();
				$.extend(this.submitted, this.errorMap);
				this.invalid = $.extend({}, this.errorMap);
				if (!this.valid())
					$(this.currentForm).triggerHandler("invalid-form", [this]);
				this.showErrors();
				return this.valid();
			},

			checkForm: function () {
				this.prepareForm();
				for (var i = 0, elements = (this.currentElements = this.elements()); elements[i]; i++) {
					this.check(elements[i]);
				}
				return this.valid();
			},

			// http://docs.jquery.com/Plugins/Validation/Validator/element
			element: function (element) {
				element = this.clean(element);
				this.lastElement = element;
				this.prepareElement(element);
				this.currentElements = $(element);
				var result = this.check(element);
				if (result) {
					delete this.invalid[element.name];
				} else {
					this.invalid[element.name] = true;
				}
				if (!this.numberOfInvalids()) {
					// Hide error containers on last error
					this.toHide = this.toHide.add(this.containers);
				}
				this.showErrors();
				return result;
			},

			// http://docs.jquery.com/Plugins/Validation/Validator/showErrors
			showErrors: function (errors) {
				if (errors) {
					// add items to error list and map
					$.extend(this.errorMap, errors);
					this.errorList = [];
					for (var name in errors) {
						this.errorList.push({
							message: errors[name],
							element: this.findByName(name)[0]
						});
					}
					// remove items from success list
					this.successList = $.grep(this.successList, function (element) {
						return !(element.name in errors);
					});
				}
				this.settings.showErrors
				? this.settings.showErrors.call(this, this.errorMap, this.errorList)
				: this.defaultShowErrors();
			},

			// http://docs.jquery.com/Plugins/Validation/Validator/resetForm
			resetForm: function () {
				if ($.fn.resetForm)
					$(this.currentForm).resetForm();
				this.submitted = {};
				this.prepareForm();
				this.hideErrors();
				this.elements().removeClass(this.settings.errorClass);
			},

			numberOfInvalids: function () {
				return this.objectLength(this.invalid);
			},

			objectLength: function (obj) {
				var count = 0;
				for (var i in obj)
					count++;
				return count;
			},

			hideErrors: function () {
				this.addWrapper(this.toHide).hide();
			},

			valid: function () {
				return this.size() == 0;
			},

			size: function () {
				return this.errorList.length;
			},

			focusInvalid: function () {
				if (this.settings.focusInvalid) {
					try {
						$(this.findLastActive() || this.errorList.length && this.errorList[0].element || [])
					.filter(":visible")
					.focus()
						// manually trigger focusin event; without it, focusin handler isn't called, findLastActive won't have anything to find
					.trigger("focusin");
					} catch (e) {
						// ignore IE throwing errors when focusing hidden elements
					}
				}
			},

			findLastActive: function () {
				var lastActive = this.lastActive;
				return lastActive && $.grep(this.errorList, function (n) {
					return n.element.name == lastActive.name;
				}).length == 1 && lastActive;
			},

			elements: function () {
				var validator = this,
				rulesCache = {};

				// select all valid inputs inside the form (no submit or reset buttons)
				// workaround $Query([]).add until http://dev.jquery.com/ticket/2114 is solved
				//
				// Pavel Myagkov: this workaround doesn't work, use another ($(':input',this.currentForm)) instead of  $([]).add(this.currentForm.elements).filter(":input")
				return $(':input', this.currentForm)
			.not(":submit, :reset, :image, [disabled]")
			.not(this.settings.ignore)
			.filter(function () {
				!this.name && validator.settings.debug && window.console && console.error("%o has no name assigned", this);

				// select only the first element for each name, and only those with rules specified
				if (this.name in rulesCache || !validator.objectLength($(this).rules()))
					return false;

				rulesCache[this.name] = true;
				return true;
			});
			},

			clean: function (selector) {
				return $(selector)[0];
			},

			errors: function () {
				return $(this.settings.errorElement + "." + this.settings.errorClass, this.errorContext);
			},

			reset: function () {
				this.successList = [];
				this.errorList = [];
				this.errorMap = {};
				this.toShow = $([]);
				this.toHide = $([]);
				this.currentElements = $([]);
			},

			prepareForm: function () {
				this.reset();
				this.toHide = this.errors().add(this.containers);
			},

			prepareElement: function (element) {
				this.reset();
				this.toHide = this.errorsFor(element);
			},

			check: function (element) {
				element = this.clean(element);

				// if radio/checkbox, validate first element in group instead
				if (this.checkable(element)) {
					element = this.findByName(element.name).not(this.settings.ignore)[0];
				}

				var rules = $(element).rules();
				var dependencyMismatch = false;
				for (var method in rules) {
					var rule = { method: method, parameters: rules[method] };
					try {
						var result = $.validator.methods[method].call(this, element.value.replace(/\r/g, ""), element, rule.parameters);

						// if a method indicates that the field is optional and therefore valid,
						// don't mark it as valid when there are no other rules
						if (result == "dependency-mismatch") {
							dependencyMismatch = true;
							continue;
						}
						dependencyMismatch = false;

						if (result == "pending") {
							this.toHide = this.toHide.not(this.errorsFor(element));
							return;
						}

						if (!result) {
							this.formatAndAdd(element, rule);
							return false;
						}
					} catch (e) {
						this.settings.debug && window.console && console.log("exception occured when checking element " + element.id
						 + ", check the '" + rule.method + "' method", e);
						throw e;
					}
				}
				if (dependencyMismatch)
					return;
				if (this.objectLength(rules))
					this.successList.push(element);
				return true;
			},

			// return the custom message for the given element and validation method
			// specified in the element's "messages" metadata
			customMetaMessage: function (element, method) {
				if (!$.metadata)
					return;

				var meta = this.settings.meta
				? $(element).metadata()[this.settings.meta]
				: $(element).metadata();

				return meta && meta.messages && meta.messages[method];
			},

			// return the custom message for the given element name and validation method
			customMessage: function (name, method) {
				var m = this.settings.messages[name];
				return m && (m.constructor == String
				? m
				: m[method]);
			},

			// return the first defined argument, allowing empty strings
			findDefined: function () {
				for (var i = 0; i < arguments.length; i++) {
					if (arguments[i] !== undefined)
						return arguments[i];
				}
				return undefined;
			},

			defaultMessage: function (element, method) {
				return this.findDefined(
				this.customMessage(element.name, method),
				this.customMetaMessage(element, method),
				// title is never undefined, so handle empty string as undefined
				!this.settings.ignoreTitle && element.title || undefined,
				$.validator.messages[method],
				"<strong>Warning: No message defined for " + element.name + "</strong>"
			);
			},

			formatAndAdd: function (element, rule) {
				var message = this.defaultMessage(element, rule.method),
				theregex = /\$?\{(\d+)\}/g;
				if (typeof message == "function") {
					message = message.call(this, rule.parameters, element);
				} else if (theregex.test(message)) {
					message = jQuery.format(message.replace(theregex, '{$1}'), rule.parameters);
				}
				this.errorList.push({
					message: message,
					element: element
				});

				this.errorMap[element.name] = message;
				this.submitted[element.name] = message;
			},

			addWrapper: function (toToggle) {
				if (this.settings.wrapper)
					toToggle = toToggle.add(toToggle.parent(this.settings.wrapper));
				return toToggle;
			},

			defaultShowErrors: function () {
				for (var i = 0; this.errorList[i]; i++) {
					var error = this.errorList[i];
					this.settings.highlight && this.settings.highlight.call(this, error.element, this.settings.errorClass, this.settings.validClass);
					this.showLabel(error.element, error.message);
				}
				if (this.errorList.length) {
					this.toShow = this.toShow.add(this.containers);
				}
				if (this.settings.success) {
					for (var i = 0; this.successList[i]; i++) {
						this.showLabel(this.successList[i]);
					}
				}
				if (this.settings.unhighlight) {
					for (var i = 0, elements = this.validElements(); elements[i]; i++) {
						this.settings.unhighlight.call(this, elements[i], this.settings.errorClass, this.settings.validClass);
					}
				}
				this.toHide = this.toHide.not(this.toShow);
				this.hideErrors();
				this.addWrapper(this.toShow).show();
			},

			validElements: function () {
				return this.currentElements.not(this.invalidElements());
			},

			invalidElements: function () {
				return $(this.errorList).map(function () {
					return this.element;
				});
			},

			showLabel: function (element, message) {
				var label = this.errorsFor(element);
				if (label.length) {
					// refresh error/success class
					label.removeClass().addClass(this.settings.errorClass);

					// check if we have a generated label, replace the message then
					label.attr("generated") && label.html(message);
				} else {
					// create label
					label = $("<" + this.settings.errorElement + "/>")
					.attr({ "for": this.idOrName(element), generated: true })
					.addClass(this.settings.errorClass)
					.html(message || "");
					if (this.settings.wrapper) {
						// make sure the element is visible, even in IE
						// actually showing the wrapped element is handled elsewhere
						label = label.hide().show().wrap("<" + this.settings.wrapper + "/>").parent();
					}
					if (!this.labelContainer.append(label).length)
						this.settings.errorPlacement
						? this.settings.errorPlacement(label, $(element))
						: label.insertAfter(element);
				}
				if (!message && this.settings.success) {
					label.text("");
					typeof this.settings.success == "string"
					? label.addClass(this.settings.success)
					: this.settings.success(label);
				}
				this.toShow = this.toShow.add(label);
			},
			hideErrorsFor: function ($elements) {
				var self = this;
				$elements.each(function () {
					self.successList.push(self.clean(this));
				});
				
				//this.showErrors();
			},
			hideErrorsForPanel: function ($elements) {
				var self = this;
				$elements.each(function () {
					self.successList.push(self.clean(this));
				});

				this.showErrors();
			},
			errorsFor: function (element) {
				var name = this.idOrName(element);
				return this.errors().filter(function () {
					return $(this).attr('for') == name;
				});
			},

			idOrName: function (element) {
				return this.groups[element.name] || (this.checkable(element) ? element.name : element.id || element.name);
			},

			checkable: function (element) {
				return /radio|checkbox/i.test(element.type);
			},

			findByName: function (name) {
				// select by name and filter by form for performance over form.find("[name=...]")
				var form = this.currentForm;
				return $(document.getElementsByName(name)).map(function (index, element) {
					return element.form == form && element.name == name && element || null;
				});
			},

			getLength: function (value, element) {
				switch (element.nodeName.toLowerCase()) {
					case 'select':
						return $("option:selected", element).length;
					case 'input':
						if (this.checkable(element))
							return this.findByName(element.name).filter(':checked').length;
				}
				return value.length;
			},

			depend: function (param, element) {
				return this.dependTypes[typeof param]
				? this.dependTypes[typeof param](param, element)
				: true;
			},

			dependTypes: {
				"boolean": function (param, element) {
					return param;
				},
				"string": function (param, element) {
					return !!$(param, element.form).length;
				},
				"function": function (param, element) {
					return param(element);
				}
			},

			optional: function (element) {
				return !$.validator.methods.required.call(this, $.trim(element.value), element) && "dependency-mismatch";
			},

			startRequest: function (element) {
				if (!this.pending[element.name]) {
					this.pendingRequest++;
					this.pending[element.name] = true;
				}
			},

			stopRequest: function (element, valid) {
				this.pendingRequest--;
				// sometimes synchronization fails, make sure pendingRequest is never < 0
				if (this.pendingRequest < 0)
					this.pendingRequest = 0;
				delete this.pending[element.name];
				if (valid && this.pendingRequest == 0 && this.formSubmitted && this.form()) {
					$(this.currentForm).submit();
					this.formSubmitted = false;
				} else if (!valid && this.pendingRequest == 0 && this.formSubmitted) {
					$(this.currentForm).triggerHandler("invalid-form", [this]);
					this.formSubmitted = false;
				}
			},

			previousValue: function (element) {
				return $.data(element, "previousValue") || $.data(element, "previousValue", {
					old: null,
					valid: true,
					message: this.defaultMessage(element, "remote")
				});
			}

		},

		classRuleSettings: {
			required: { required: true },
			email: { email: true },
			url: { url: true },
			date: { date: true },
			dateISO: { dateISO: true },
			dateDE: { dateDE: true },
			number: { number: true },
			numberDE: { numberDE: true },
			digits: { digits: true },
			creditcard: { creditcard: true }
		},

		addClassRules: function (className, rules) {
			className.constructor == String ?
			this.classRuleSettings[className] = rules :
			$.extend(this.classRuleSettings, className);
		},

		classRules: function (element) {
			var rules = {};
			var classes = $(element).attr('class');
			classes && $.each(classes.split(' '), function () {
				if (this in $.validator.classRuleSettings) {
					$.extend(rules, $.validator.classRuleSettings[this]);
				}
			});
			return rules;
		},

		attributeRules: function (element) {
			var rules = {};
			var $element = $(element);

			for (var method in $.validator.methods) {
				var value = $element.attr(method);
				if (value) {
					rules[method] = value;
				}
			}

			// maxlength may be returned as -1, 2147483647 (IE) and 524288 (safari) for text inputs
			if (rules.maxlength && /-1|2147483647|524288/.test(rules.maxlength)) {
				delete rules.maxlength;
			}

			return rules;
		},

		metadataRules: function (element) {
			if (!$.metadata) return {};

			var meta = $.data(element.form, 'validator').settings.meta;
			return meta ?
			$(element).metadata()[meta] :
			$(element).metadata();
		},

		staticRules: function (element) {
			var rules = {};
			var validator = $.data(element.form, 'validator');
			if (validator.settings.rules) {
				rules = $.validator.normalizeRule(validator.settings.rules[element.name]) || {};
			}
			return rules;
		},

		normalizeRules: function (rules, element) {
			// handle dependency check
			$.each(rules, function (prop, val) {
				// ignore rule when param is explicitly false, eg. required:false
				if (val === false) {
					delete rules[prop];
					return;
				}
				if (val.param || val.depends) {
					var keepRule = true;
					switch (typeof val.depends) {
						case "string":
							keepRule = !!$(val.depends, element.form).length;
							break;
						case "function":
							keepRule = val.depends.call(element, element);
							break;
					}
					if (keepRule) {
						rules[prop] = val.param !== undefined ? val.param : true;
					} else {
						delete rules[prop];
					}
				}
			});

			// evaluate parameters
			$.each(rules, function (rule, parameter) {
				rules[rule] = $.isFunction(parameter) ? parameter(element) : parameter;
			});

			// clean number parameters
			$.each(['minlength', 'maxlength', 'min', 'max'], function () {
				if (rules[this]) {
					rules[this] = Number(rules[this]);
				}
			});
			$.each(['rangelength', 'range'], function () {
				if (rules[this]) {
					rules[this] = [Number(rules[this][0]), Number(rules[this][1])];
				}
			});

			if ($.validator.autoCreateRanges) {
				// auto-create ranges
				if (rules.min && rules.max) {
					rules.range = [rules.min, rules.max];
					delete rules.min;
					delete rules.max;
				}
				if (rules.minlength && rules.maxlength) {
					rules.rangelength = [rules.minlength, rules.maxlength];
					delete rules.minlength;
					delete rules.maxlength;
				}
			}

			// To support custom messages in metadata ignore rule methods titled "messages"
			if (rules.messages) {
				delete rules.messages;
			}

			return rules;
		},

		// Converts a simple string to a {string: true} rule, e.g., "required" to {required:true}
		normalizeRule: function (data) {
			if (typeof data == "string") {
				var transformed = {};
				$.each(data.split(/\s/), function () {
					transformed[this] = true;
				});
				data = transformed;
			}
			return data;
		},

		// http://docs.jquery.com/Plugins/Validation/Validator/addMethod
		addMethod: function (name, method, message) {
			$.validator.methods[name] = method;
			$.validator.messages[name] = message != undefined ? message : $.validator.messages[name];
			if (method.length < 3) {
				$.validator.addClassRules(name, $.validator.normalizeRule(name));
			}
		},

		methods: {

			// http://docs.jquery.com/Plugins/Validation/Methods/required
			required: function (value, element, param) {
				// check if dependency is met
				if (!this.depend(param, element))
					return "dependency-mismatch";
				switch (element.nodeName.toLowerCase()) {
					case 'select':
						// could be an array for select-multiple or a string, both are fine this way
						var val = $(element).val();
						return val && val.length > 0;
					case 'input':
						if (this.checkable(element))
							return this.getLength(value, element) > 0;
					default:
						return $.trim(value).length > 0;
				}
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/remote
			remote: function (value, element, param) {
				if (this.optional(element))
					return "dependency-mismatch";

				var previous = this.previousValue(element);
				if (!this.settings.messages[element.name])
					this.settings.messages[element.name] = {};
				previous.originalMessage = this.settings.messages[element.name].remote;
				this.settings.messages[element.name].remote = previous.message;

				param = typeof param == "string" && { url: param} || param;

				if (this.pending[element.name]) {
					return "pending";
				}
				if (previous.old === value) {
					return previous.valid;
				}

				previous.old = value;
				var validator = this;
				this.startRequest(element);
				var data = {};
				data[element.name] = value;
				$.ajax($.extend(true, {
					url: param,
					mode: "abort",
					port: "validate" + element.name,
					dataType: "json",
					data: data,
					success: function (response) {
						validator.settings.messages[element.name].remote = previous.originalMessage;
						var valid = response === true;
						if (valid) {
							var submitted = validator.formSubmitted;
							validator.prepareElement(element);
							validator.formSubmitted = submitted;
							validator.successList.push(element);
							validator.showErrors();
						} else {
							var errors = {};
							var message = response || validator.defaultMessage(element, "remote");
							errors[element.name] = previous.message = $.isFunction(message) ? message(value) : message;
							validator.showErrors(errors);
						}
						previous.valid = valid;
						validator.stopRequest(element, valid);
					}
				}, param));
				return "pending";
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/minlength
			minlength: function (value, element, param) {
				return this.optional(element) || this.getLength($.trim(value), element) >= param;
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/maxlength
			maxlength: function (value, element, param) {
				return this.optional(element) || this.getLength($.trim(value), element) <= param;
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/rangelength
			rangelength: function (value, element, param) {
				var length = this.getLength($.trim(value), element);
				return this.optional(element) || (length >= param[0] && length <= param[1]);
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/min
			min: function (value, element, param) {
				return this.optional(element) || value >= param;
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/max
			max: function (value, element, param) {
				return this.optional(element) || value <= param;
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/range
			range: function (value, element, param) {
				return this.optional(element) || (value >= param[0] && value <= param[1]);
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/email
			email: function (value, element) {
				// contributed by Scott Gonzalez: http://projects.scottsplayground.com/email_address_validation/
				return this.optional(element) || /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i.test(value);
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/url
			url: function (value, element) {
				// contributed by Scott Gonzalez: http://projects.scottsplayground.com/iri/
				return this.optional(element) || /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(value);
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/date
			date: function (value, element) {
				return this.optional(element) || !/Invalid|NaN/.test(new Date(value));
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/dateISO
			dateISO: function (value, element) {
				return this.optional(element) || /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(value);
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/number
			number: function (value, element) {
				return this.optional(element) || /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value);
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/digits
			digits: function (value, element) {
				return this.optional(element) || /^\d+$/.test(value);
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/creditcard
			// based on http://en.wikipedia.org/wiki/Luhn
			creditcard: function (value, element) {
				if (this.optional(element))
					return "dependency-mismatch";
				// accept only digits and dashes
				if (/[^0-9-]+/.test(value))
					return false;
				var nCheck = 0,
				nDigit = 0,
				bEven = false;

				value = value.replace(/\D/g, "");

				for (var n = value.length - 1; n >= 0; n--) {
					var cDigit = value.charAt(n);
					var nDigit = parseInt(cDigit, 10);
					if (bEven) {
						if ((nDigit *= 2) > 9)
							nDigit -= 9;
					}
					nCheck += nDigit;
					bEven = !bEven;
				}

				return (nCheck % 10) == 0;
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/accept
			accept: function (value, element, param) {
				param = typeof param == "string" ? param.replace(/,/g, '|') : "png|jpe?g|gif";
				return this.optional(element) || value.match(new RegExp(".(" + param + ")$", "i"));
			},

			// http://docs.jquery.com/Plugins/Validation/Methods/equalTo
			equalTo: function (value, element, param) {
				// bind to the blur event of the target in order to revalidate whenever the target field is updated
				// TODO find a way to bind the event just once, avoiding the unbind-rebind overhead

				var target = $(param).unbind(".validate-equalTo").bind("blur.validate-equalTo", function () {
					$(element).valid();
				});
				//$(element).valid();
				//				$(param).valid(); // check of related control
				return value == target.val();
			}

		}

	});

	// deprecated, use $.validator.format instead
	$.format = $.validator.format;

})(jQuery);

// ajax mode: abort
// usage: $.ajax({ mode: "abort"[, port: "uniqueport"]});
// if mode:"abort" is used, the previous request on that port (port can be undefined) is aborted via XMLHttpRequest.abort()
; (function ($) {
	var pendingRequests = {};
	// Use a prefilter if available (1.5+)
	if ($.ajaxPrefilter) {
		$.ajaxPrefilter(function (settings, _, xhr) {
			var port = settings.port;
			if (settings.mode == "abort") {
				if (pendingRequests[port]) {
					pendingRequests[port].abort();
				}
				pendingRequests[port] = xhr;
			}
		});
	} else {
		// Proxy ajax
		var ajax = $.ajax;
		$.ajax = function (settings) {
			var mode = ("mode" in settings ? settings : $.ajaxSettings).mode,
				port = ("port" in settings ? settings : $.ajaxSettings).port;
			if (mode == "abort") {
				if (pendingRequests[port]) {
					pendingRequests[port].abort();
				}
				return (pendingRequests[port] = ajax.apply(this, arguments));
			}
			return ajax.apply(this, arguments);
		};
	}
})(jQuery);

// provides cross-browser focusin and focusout events
// IE has native support, in other browsers, use event caputuring (neither bubbles)

// provides delegate(type: String, delegate: Selector, handler: Callback) plugin for easier event delegation
// handler is only called when $(event.target).is(delegate), in the scope of the jquery-object for event.target
; (function ($) {
	// only implement if not provided by jQuery core (since 1.4)
	// TODO verify if jQuery 1.4's implementation is compatible with older jQuery special-event APIs
	if (!jQuery.event.special.focusin && !jQuery.event.special.focusout && document.addEventListener) {
		$.each({
			focus: 'focusin',
			blur: 'focusout'
		}, function (original, fix) {
			$.event.special[fix] = {
				setup: function () {
					this.addEventListener(original, handler, true);
				},
				teardown: function () {
					this.removeEventListener(original, handler, true);
				},
				handler: function (e) {
					arguments[0] = $.event.fix(e);
					arguments[0].type = fix;
					return $.event.handle.apply(this, arguments);
				}
			};
			function handler(e) {
				e = $.event.fix(e);
				e.type = fix;
				return $.event.handle.call(this, e);
			}
		});
	};
	$.extend($.fn, {
		validateDelegate: function (delegate, type, handler) {
			return this.bind(type, function (event) {
				var target = $(event.target);
				if (target.is(delegate)) {
					return handler.apply(target, arguments);
				}
			});
		}
	});
})(jQuery);

// SIG // Begin signature block
// SIG // MIIY/gYJKoZIhvcNAQcCoIIY7zCCGOsCAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFKeIGs8sE0fV
// SIG // 8t1EpTzQeq2qWgjloIIT+DCCA+4wggNXoAMCAQICEH6T
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
// SIG // FgQUe9YN46i1unw380LJpPkZnXtSOhowDQYJKoZIhvcN
// SIG // AQEBBQAEggEAPWedESi+odFlA3YPWzr54q/fvxuz1tad
// SIG // h07151gtJn/yndpJRRpUSF/ag8rMVtBoJ7gHUimydKvX
// SIG // HckmduW35K/WvyNYLyl9j2fS1pwELFZnkXXz9oygDBvE
// SIG // 5gywbV0dT8HEq5egIXyZrhcQv+Sxa2bdLPcMbaIsmXIj
// SIG // tuRv/MgaJbvAzdWKDCM0bjEtF/N1gmSxG0CrOoY7pyA4
// SIG // u0yhjQcuGrI0w7O1h14AwMkIGPoM/DLqN3QRAx+JZygO
// SIG // CA3coIEtxGBokMo3yd94VBHBy/Phhgj2aLZe/t2EIxRT
// SIG // ttX6H8P+RmOK99rj4nQUaZPylE1EhFeMWpTUrMqFcQUT
// SIG // tKGCAgswggIHBgkqhkiG9w0BCQYxggH4MIIB9AIBATBy
// SIG // MF4xCzAJBgNVBAYTAlVTMR0wGwYDVQQKExRTeW1hbnRl
// SIG // YyBDb3Jwb3JhdGlvbjEwMC4GA1UEAxMnU3ltYW50ZWMg
// SIG // VGltZSBTdGFtcGluZyBTZXJ2aWNlcyBDQSAtIEcyAhAO
// SIG // z/Q4yP6/NW4E2GqYGxpQMAkGBSsOAwIaBQCgXTAYBgkq
// SIG // hkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJ
// SIG // BTEPFw0xNDA2MDUwNDM5MjFaMCMGCSqGSIb3DQEJBDEW
// SIG // BBTZulpVEzNghTP0N+VqOt8GtZkVBDANBgkqhkiG9w0B
// SIG // AQEFAASCAQAjjthAeGmaIsynAcO/OUpwRZ8m6P9Mi4k5
// SIG // Ga7PVJdvUqIouBCZRQaI1ilUclo/Ug4YwAnO7olkTm7I
// SIG // UFPc3z4cwOXjC384l+5PSdnr+QJ3TI1WOdxuAX06P5za
// SIG // WYDFyJdlEnmt3rmCHzpZQAgh3oWLWb01vEykyvjoAs2q
// SIG // iOtgnUCn86pQgpmZVZrcKrc++TAQ1kGzy4lE1k/KgkGM
// SIG // CMy13co8kUibVwO5S1DJSsuP9lcoJL279aT0uNuXXaG2
// SIG // D0pLrhTPmj7kWoWrOspBjgwbxijlC8/F70xa+/mK7XMk
// SIG // 9JuOYBo4WyZ/9ch0eIArGE3qphKacJIcbuGp8Cy2UIWR
// SIG // End signature block
