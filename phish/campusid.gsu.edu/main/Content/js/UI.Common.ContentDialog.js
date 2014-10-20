; (function ($) {

	var dataFilter = function (data, type) {
		//		if (type == 'html' || String(data).indexOf('<form') != -1) {
		//			var f = getForm(data);
		//			if (f != null) {
		//				return {
		//					form: f,
		//					__ResultIsHtmlForm: true
		//				};
		//			}
		//		}

		//		data = jQuery.parseJSON(data);
		return data;
	};

	window.ContentDialog = function (options) {
	    var self = this;
		var defaults = {
			// model of the view
			model: {},
			// default object for inner dialog
			dialog: {},
			// event handlers
			opening: function() {
				$(document).trigger("loading-start");
			},
			opened: function() {
				$(document).trigger("loading-stop");
			},
			closing: function() {
			},
			closed: function() {
			},
			destroying: function() {
			},
			destroyed: function() {
			},

			// buttons need to display
			buttons: null,
			formUrl: null,
			useFormAction: false,
	        validate: false,
	        method: "GET",
	        formContentType: "application/x-www-form-urlencoded",
	        contentType: "application/x-www-form-urlencoded",
	        data: { },
	        disableSessionWarning: false
	    };

	    this.options = $.extend({ }, defaults, options);

	    var data = this.options.data;
	    this.model = this.options.model;

	    if (this.options.contentType == 'application/json') {
	        data = JSON.stringify(data);
	    }

	    if (typeof(self.options.opening) == 'function') self.options.opening.call(self);

	    if (this.options.formUrl) {
	        $.ajax(this.options.formUrl, {
	            contentType: this.options.contentType,
	            data: data,
	            dataType: "html",
	            type: this.options.method,
	            traditional: this.options.traditional || false,
	            success: $.proxy(ContentDialog.prototype.openContentDialog, this),
	            disableSessionWarning: this.options.disableSessionWarning
	        });
	    } else {
	        this.openContentDialog(this.options.html);
	    }
	    // memorize link to created dialog in static property
		window.ContentDialog._instances.push(self);
		$(window).resize($.proxy(function () { return this.normalize(false); }, self));
		
	};

	ContentDialog.prototype = {
		destroy: function (wasSaved) {
			var self = this;
			if (this.$wrapper) {
				this.options.destroying.call(this);
				var $dialog = this.$wrapper;
				$dialog.dialog("destroy");
				$dialog.remove();
			}
			
			if (this.$editor) {
				this.$editor.destroy();
			}
			
			if (this.$form) {
				this.$form.removeData("dialog");
			}
			
			if (this.$content) {
				this.$content.removeData("dialog");
			}

		    window.ContentDialog._instances = _.reject(window.ContentDialog._instances, function(i) { return this == i; });
			
			self.options.destroyed.call(self, wasSaved);
		},
		close: function () {
			if (this.$wrapper) {
				this.options.closing.call(this);
				this.$wrapper.dialog('close'); //.dialog('destroy');
				this.options.closed.call(this);
			}
		},
		
		normalize: function (contentWasUpdated) {
			var self = this;
			if (typeof contentWasUpdated == "undefined")
				contentWasUpdated = true;

				var $titleBar = self.$wrapper.parent().children("div.ui-dialog-titlebar");
			
				if (contentWasUpdated && self.$wrapper.is(':data(dialog)')) {
				var dialogHeight = self.$wrapper.dialog("option", "height");
				var maxHeight = $(window).height() - $titleBar.height() - self.$toolbar.height() + (self.$content.height() - self.$content.outerHeight());
				if (dialogHeight && (dialogHeight != "auto")) {
					var minHeight = Math.min(parseInt(dialogHeight), maxHeight);
					self.$wrapper.dialog("option", "minHeight", minHeight + "px");
					self.$content.css("min-height", minHeight + "px");
					self.$wrapper.dialog("option", "height", "auto");
				}
				if ($.browser.msie && (parseFloat($.browser.version) <= 7.0)) {

					var overflow = self.$content[0].style.overflow;
					var overflowX = self.$content[0].style.overflowX;

					if (!overflow || !overflowX) {
						//if Overflow is not explicitly set, we'll make it Hidden to deal with IE7 incorrect scroll bars problem
						self.$content.css("overflow-x", "hidden");
					}
					//Workaround for IE7 problem with position:relative and overflow:auto child elements: just set position:relative for container
					self.$content.css("position", "relative");
				}

			}
			
			
			//Possibly need to recalculate...
			var maxHeight = $(window).height() - $titleBar.height() - self.$toolbar.height() + (self.$content.height() - self.$content.outerHeight());
			
			var currentMinHeight = parseInt(self.$content.css("min-height"));
			currentMinHeight = isNaN(currentMinHeight) ? 0: currentMinHeight;
			
			self.$content.css("max-height", Math.max(currentMinHeight, maxHeight));
			//IE 7 dialog("option", "position", ...) is buggy
			
			self.$wrapper.parent().css({left: Math.round(($(window).width() - self.$wrapper.parent().width()) / 2) + "px", top:"0px"});
		
			return true;
		},
		

		replaceContent: function (content) {
		    if (this.$content) {
		        
                if (this.$form) {
                    this.$form.removeData("validator");
                }
                
			    this.$content.html(content);
			    
			    if (this.options.validate && jQuery.validator.unobtrusive) {
			        jQuery.validator.unobtrusive.parse(this.$container);
			    }

				this.normalize();
			}
		},
		replaceFormContent: function (content) {
		    if (this.$form) {
		        
		        this.$form.removeData("validator");

			    this.$form.html(content);
			    
			    if (this.options.validate && jQuery.validator.unobtrusive) {
			        jQuery.validator.unobtrusive.parse(this.$form);
			    }

				this.normalize();
			}
		},
		setDialogTitle: function (title) {
			this.options.dialog.title = title;
			if (this.$wrapper) {
				this.$wrapper.dialog('option', 'title', title);
			}
		},
		createUrl: function (url, data) {
			if (!data) {
				return url;
			}
			var qs = $.param(data);
			if (qs.length > 0) {
				var sep = '?';
				if (url && url.indexOf('?') !== -1)
					sep = '&';
				return url + sep + qs;
			} else {
				return url;
			}
		},
		///	<summary>
		///		Create form dialog from html
		///	</summary>
		openContentDialog: function (response) {
		    

		    var self = this;
			var html = response.responseText ? response.responseText : response;
			var $html = $(html); // .trim()??? Not working in IE

			if (typeof (self.options.beforeOpen) == 'function') self.options.beforeOpen.call(self, $html, response);

			var $wrapper;
			var $content;
			if (!($wrapper = self.$wrapper)) {
				$wrapper = self.$wrapper = $("<div>").attr({ "class": "ui-wrapper" }).css("overflow", "hidden");
				$content = self.$content = $("<div>").attr({ "class": "ui-dialog-inner-content" 
					+ (self.options.contentContainerClass ? " " + self.options.contentContainerClass : "") });
				
				$content.appendTo($wrapper);
			}
			else {
				$content = self.$content;
			}
			$content.data("dialog", self);
			
			

			var $toolbar = self.$toolbar = $("<div>").attr({ "class": "qui_action_bar qui_gradient_bar qui_enabled" }).append($("<div>").attr({ "class": "qui_items" }));
				// creating buttons of the dialog
				// 
				if (self.options.buttons) {
					self.$wrapper.append(this.$toolbar);
					$.each(self.options.buttons, function (i, e) {
						var buttonColor;
						if (e.role) {
							// if button role specified
							buttonColor = e.role == "main" ? "blue" : "silver"; 
						}
						else {
							// the first button is main
							buttonColor = i == 0 ? "blue" : "silver";
						}
							
							
						// by default we show icon near the button
						if (typeof e.icon === "undefined") {
							e.icon = true;
						}
						var wrapperClass = e["class"] 
							+ " qui_btn_cmd qui_enabled qui_size_m " 
							+ "qui_color_" + buttonColor;
						
						var $buttonWrapper = $("<span>", { "class": wrapperClass });
						var $button = $("<button>", {
							// use 'class' as id if 'id' not presented
							"id" : e["id"] ? e["id"] : e["class"], 
							// use 'class' as key if 'text' not presented
							"text": e["text"] || ContentDialog.buttonsTexts[e["class"]]
						});
						if (e.click) {
							$button.click($.proxy(e.click, self));
						}
						$buttonWrapper.append($button);
						$toolbar.find(".qui_items").append($buttonWrapper);
						
					});
				}
			// add content without scripts (scripts will be added later)
			$html.filter(":not(script)").appendTo($content.empty());

			var $form = $content.find("form");
			if ($form.size()) {
				self.$form = $form;
				$form.data("dialog", self);
			
				if (self.options.validate && self.options.validate === true) {
					if (jQuery.validator && jQuery.validator.unobtrusive &&
						jQuery.validator.unobtrusive.parse) {
						jQuery.validator.unobtrusive.parse($form);
					}
				}

				//init form  data
				var formAction = self.options.formUrl;
				if (!formAction || self.options.useFormAction)
					formAction = self.createUrl($form.attr("action"));

			}

		    var title = self.options.title || $form.attr("data-title"); 
			var dialogOptions = {
				modal: true,
				resizable: false,
				title: "",
				close: function () { self.destroy(false); }
			
			};

			dialogOptions = $.extend({
				"width": "auto",
				"height": "auto",
				"position": "top",
				"closeOnEscape": false,
				"show": {
					effect: "blind" , 
					complete: function () {
						var me = this;
						setTimeout(function () {
							 // focus on the first text input element in the dialog
							$("input:text:visible:enabled:first:not(.no-autofocus)", me).focus();
						}, 200);
					}
				} , 
				"open": function (){
					self.normalize();
					if (typeof (self.options.opened) == 'function') self.options.opened.call(self, $wrapper);
				},
				"hide": {
					effect: "blind", 
					direction: "top" , 
					duration: 1000
				},
				"draggable": false
			}, dialogOptions, self.options.dialog);
			
			//Resize is buggy and unnecessary
			dialogOptions.resizable = false;
			
			//IE7 dialog("option", "position", ...) is buggy, so only "top" is supported
			dialogOptions.position = "top";

			$wrapper.dialog(dialogOptions);
			
			// this is for IE 7
			// it works with width:auto badly so i have to set width of the dialog explicitly
			$wrapper.dialog("option", "width", $wrapper.parent().width());
		    
		    //Now we can set dialog title, so it would fit width
			$wrapper.dialog("option", "title", title);

			
			// insert scripts only when content is places inside the dialog
			$html.filter("script").appendTo($content);

			$form.ajaxForm({
						url: formAction ? formAction : "",
						contentType: self.options.formContentType,
						dataType: self.options.formDataType,
					//					dataType: "html",
					//					dataFilter: dataFilter,
					//					iframe: this.options.iframe,
						error:
							$.proxy(function (xhr, status, e) {
							    if (this.$content.handleRequestError(xhr)) return;
								this.destroy();
								e = e || new Error("Unknown error");
								e["executor"] = xhr;
								if (typeof (this.options.error) == 'function')
									this.options.error.call(this, xhr, status, e);
							}, self),
						success:
							$.proxy(function (result, statusText, xhr ) {
								if (typeof (this.options.endRequest) == 'function') {
									this.options.endRequest.call(this, result, statusText, xhr );
								}

							}, self)
					});

			//no need to normalize here, as it is called on dialog open
		}
	};

	ContentDialog._instances = [];
	ContentDialog.instanceExists = function() {
		return ContentDialog._instances.length > 0;
	};
	ContentDialog.getLatestInstance = function() {
		return ContentDialog._instances[ContentDialog._instances.length - 1];
	};
})(jQuery);

// SIG // Begin signature block
// SIG // MIIY/gYJKoZIhvcNAQcCoIIY7zCCGOsCAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFAIlTw6nQm9f
// SIG // 4qiypNoLcMg/FxSqoIIT+DCCA+4wggNXoAMCAQICEH6T
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
// SIG // FgQU7vFWhOijQ2QOCWToA9Fk/ygb730wDQYJKoZIhvcN
// SIG // AQEBBQAEggEAnQYlLEHtdWQSQ8CtVKJf+n75kFHaViSO
// SIG // 6vemjzwuwCCKi9vz5l3b71Ev9LyH0tN6QRHKiU3C6JS1
// SIG // AC+Ff5abY4kl5/2QMRKl4r5RMNwDwPrDHVwOvAiLSmvk
// SIG // 9ZpfA6clpsIZpTHXaxLhHV/LYZahim03AyC9pFAtsnm8
// SIG // hSswmkCAidHpQpg2WqWLGkM3yNMZX/YOmzg8f2aMNZv7
// SIG // bxNPrWlZtyMzOpx+tTujbxS3CNjdeWHKS5/pNRdv/5Ft
// SIG // 8QUWObRcZNrLgxDt+jLaro9TU0atlOKERNdooYVj0jfZ
// SIG // wpWlwZaJnfGfyF5JaNJT/BFtPxtglBZILFOVwcbZXek+
// SIG // JaGCAgswggIHBgkqhkiG9w0BCQYxggH4MIIB9AIBATBy
// SIG // MF4xCzAJBgNVBAYTAlVTMR0wGwYDVQQKExRTeW1hbnRl
// SIG // YyBDb3Jwb3JhdGlvbjEwMC4GA1UEAxMnU3ltYW50ZWMg
// SIG // VGltZSBTdGFtcGluZyBTZXJ2aWNlcyBDQSAtIEcyAhAO
// SIG // z/Q4yP6/NW4E2GqYGxpQMAkGBSsOAwIaBQCgXTAYBgkq
// SIG // hkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJ
// SIG // BTEPFw0xNDA2MDUwNDM4MDhaMCMGCSqGSIb3DQEJBDEW
// SIG // BBRvphH9OsdvxO9w+pX3rrsFKKULXzANBgkqhkiG9w0B
// SIG // AQEFAASCAQBvzo6wmviRaTVZKvc+HVWPh3wXHAy5tP+Z
// SIG // eJ7DqmbZDLeXx9wpaqgOFnjfrr6WM+IumrOst4zklCk/
// SIG // rYeUUMb6P17kbC3R1Ad/ePjvCWYszMEx+VzX5D3s+PxD
// SIG // //jRLJfeA4FkzCh7TIel6gv1l3UT2D1z2+eq5+Jt0kPl
// SIG // tfmFqHmx8xlyattHVzef+fqpdMY2E4GWVK9yU145/G4O
// SIG // LvcyTcbSyFwdan/jlcln0P1giYZ7iYEKjl7izmV17Lo1
// SIG // BhBc3MsCVUU6+pN9sKbwdTMlF+SEJB055rKhMvH5ISuA
// SIG // v/4DxdJUrjUGqZ3jzMk19AX5xxsQ01nfptUhysN71XUB
// SIG // End signature block
