window.Notification = {};
window.Notification.success = function (text, $elem) {
	var $popup = $elem || $(".success.popup");
	var queueName = "showSuccess";
	$($popup).queue(queueName, function (next) {
		$popup.find(".text").text(text).end().show();
		next.call(this);
	})
	.delay(2000, queueName)
	.queue(queueName, function () {
		$popup.hide();
	});

	$($popup).dequeue(queueName);
};

window.Notification.warning = function (options) {
    options = (typeof (options) == "object") ? options : { html: options.toString() };
    var dialog = new ContentDialog($.extend({
        buttons: [
            {
            	"class": "ok",
            	"id": "dialog-ok",
                click: function () {
                    dialog.destroy();
                    return false;
                }
            }
        ],
        dialog: $.extend({
            width: 640,
            height: "auto",
            resizable: true,
            position: "center"
        }, options.dialog || {})
    }, options));
};

window.Notification.sessionEndWarning = function (options) {
	window.Notification.warning({
		formUrl: options.formUrl,
		buttons: [
            {
            	"class": "ok",
            	click: function () {
            		if (options.redirectUrl) {
            			window.location = options.redirectUrl;
            		}
            		else {
            			window.location.reload();
            		}
            		
            		return false;
            	}
            }
        ],
		dialog: {
			position: "top"
		},
		disableSessionWarning: true
	});
};

// **** Aggregative methods ---------------------------------------------------------------
//
window.Notification.errors = [];
$.extend(window.Notification.errors, {
	show: function ($content) {
		if (typeof $content == "undefined") {
			$content = $(document);
		}
		for (var i = 0; i < Notification.errors.length; i++) {
			this[i].show($content, false);
		}
		this.$content = $content;

		window.mainVerticalLayout();
	},
	hide: function () {
		for (var i = 0; i < Notification.errors.length; i++) {
			this[i].hide(false);
		}
		window.mainVerticalLayout();
	},
	destroy: function () {
		for (var i = 0; i < this.length; i++) {
			this[i].destroy(false);
		}
	
		window.mainVerticalLayout();

		this.splice(0, window.Notification.errors.length);
	}
});

window.Notification.clearErrors = function () {
	Notification.errors.destroy();
	$("#errors-placeholder .pageErrors").find(".notification.error").remove();
};
// errors factory
window.Notification.createErrors = function (obj, clean) {
	if (clean || true) {
		window.Notification.clearErrors();
	}
	
	if (typeof obj == "string") {
		Notification.errors.push(new Notification.Error(obj));
	}
	// obj is an instance of JsonResponse class
	//
	else if (obj.Errors) {
	    if (!obj.Result) {
	        // if obj.Errors exist
	        if (obj.Errors.length) {
	            for (var i = 0; i < obj.Errors.length; i++) {
	                Notification.errors.push(new Notification.Error(obj.Errors[i]));
	            }
	        }
	        else {
	            // use obj.Message as error message
	            Notification.errors.push(new Notification.Error(obj.Message));
	        }
	    }
	}
	else {
		// obj is ModelState object
	    if (obj.Common) {
	        obj.Errors = obj.Errors || [];
	    }
		// obj is jsoned ModelState object
		else if (obj.responseText) {
			var json = obj.responseText;
			try {
				// parse it (may throw exception)
				obj = jQuery.parseJSON(json);
			}
			catch (e) {
				// create error from responseText and return
				Notification.errors.push(new Notification.Error(obj.responseText));
				return Notification.errors;
			}
		}
		
		// create errors from normalized ModelState object
		for (i = 0; i < obj.Common.Errors.length; i++) {
			var e = obj.Common.Errors[i];
			Notification.errors.push(new Notification.Error(e.Exception ? e.Exception : e.ErrorMessage));
		}
		
	}
	return Notification.errors;
};

// **** Error --------------------------------------------------------------------------------
//
window.Notification.Error = function (message, stackTrace, isWarning) {
	var self = this;
	this._items = [];

	this._message = "";
	this._stackTrace = "";
	this._isWarning = false;

	if (typeof message == "string") {
		this._message = message;
		if (arguments.length == 3) {
			this._stackTrace = stackTrace;
			this._isWarning = isWarning;
		}
		else if (arguments.length == 2) {
			if (typeof stackTrace == "boolean") {
				this._isWarning = stackTrace;
			}
			else {
				this._stackTrace = stackTrace;
			}
		}
	}
	else {
		// message is parsed Exception object
		// 2 parameters
		this._isWarning = !!stackTrace;
		var exception = message;
		if (exception.detail) {
			//it is FaultException<CommonFault>
			this._message = exception.detail.Message;
			this._stackTrace = exception.detail.StackTrace;
			
			if (exception.detail.ServerMessages) {
				for (var i = 0; i < exception.detail.ServerMessages.length; i++) {
					this._items.push(exception.detail.ServerMessages[i]);
				}
			}
		}
		else if (exception.Message) {
			this._message = exception.Message;
			//TODO: check if Items can be displayed separately from Stack trace
			var stackTraceString = exception.StackTraceString ? exception.StackTraceString : exception.StackTrace;
			if (stackTraceString) {
				this._stackTrace = stackTraceString;
				if (exception.Items && exception.Items.length > 0) {
					for (var i = 0; i < exception.Items.length; i++) {
						this._items.push(exception.Items[i]);
					}
				}
			}
		}
	}
	
	return self;
};


window.Notification.Error.prototype = {
	show: function ($content, normalize) {
		if (!this.$error) {
			var $errorsPlaceholder = $("#errors-placeholder");
			this.$error = $errorsPlaceholder.find("." + (this._isWarning ? "warning" : "error") + ".hidden").clone().removeClass("hidden");
			this.$error.appendTo($(".pageErrors", $content ? $content : $(document)));
			this.$error
				.find(".message").text(this._message).end()
				.find(".stackTrace").text(this._stackTrace);
			if (this._items.length > 0) {
				var $ul = $("<ul>");
				for (var i = 0; i < this._items.length; i++) {
				    $ul.append($('<li class="message item">' + this._items[i] + '</li>'));
				}
				this.$error.find(".message").after($ul);
			}
		}
		else 
		{
			this.$error.show();
		}
		this.$error.data("error", this);

		this.$content = $content;

		if ((typeof normalize == "undefined") || normalize) {
			
		    window.mainVerticalLayout();
		}
	},
	hide: function (normalize) {
		if (this.$error) {
			this.$error.hide();

			if ((typeof normalize == "undefined") || normalize) {
			    window.mainVerticalLayout();
				
			}
		}
	},
	destroy: function (normalize) {
		if (this.$error) {
			this.$error.removeData("error");
			this.$error.remove();
			delete this.$error;

			if ((typeof normalize == "undefined") || normalize) {
		
			    window.mainVerticalLayout();
			}
			
			this.$content = null;
		}
	}
};

jQuery(function ($) {
	var $stackTrace = $('.stackTrace');
	$('.error-message').click(function () {
	    if ($stackTrace.length) {
	        if ($stackTrace.is(":visible")) {
	            $stackTrace.hide();
	        } else {
	            $stackTrace.show();
	        }
	        window.mainVerticalLayout();
	    }
	});
});

// ****   Loading ------------------------------------------------------------------------

window.Notification.Loading = { };
window.Notification.Loading.show = function ($elem) {
	var $loadingOverlay = $(".loading-overlay");
	var $loadingWrapper = $(".loading-wrapper");
	var $loading = $elem || $("#main-loading");
	$loadingWrapper.show();
	$loading.focus();
	$loadingOverlay.fadeTo("slow", 0.3);
	if (!$elem) {
		var opts = {
			lines: 12, // The number of lines to draw
			length: 7, // The length of each line
			width: 4, // The line thickness
			radius: 10, // The radius of the inner circle
			color: '#000', // #rgb or #rrggbb
			trail: 60, // Afterglow percentage
			speed: 1.0, // Rounds per second
			shadow: false // Whether to render a shadow
		};

		var data = $loading.data();
		if (!data.spinner)
			data.spinner = new Spinner(opts).spin($loading[0]);

	}
};
window.Notification.Loading.hide = function ($elem) {
	var $loading = $elem || $(".loading.main");
	var $loadingOverlay = $(".loading-overlay");
	var $loadingWrapper = $(".loading-wrapper");

	$loadingOverlay.hide();
	$loadingWrapper.hide();
	var data = $loading.data();
	if (data.spinner) {
		data.spinner.stop();
		delete data.spinner;
	}
};

// common initializations
//
jQuery(function ($) {


	// main loading events
	//
	$(document).bind("loading-start", function (data) {
		Notification.Loading.show();
	}).bind("loading-stop", function (data) {
		Notification.Loading.hide();
	});
	//		.bind("normalize", function () {
	//		$(".page.toolbar").css("top", $("#main").offset().top);
	//		$(window).resize();
	//	});

	$(".notification").live("mouseenter", function () {
		$(this).find(".close-button").css("visibility", "visible");
	}).live("mouseleave", function () {
		$(this).find(".close-button").css("visibility", "hidden");
	}).live("click", function (e) {
		if ($(e.target).is(".close-button, .close-button *")) {
			var $error = $(this).data("error");
			if ($error) {
				$error.destroy();
			} else {
				$(this).remove();
				window.mainVerticalLayout();
			}
		}
		e.preventDefault();
	    e.stopPropagation();
		return false;
	});
});

// SIG // Begin signature block
// SIG // MIIY/gYJKoZIhvcNAQcCoIIY7zCCGOsCAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFO+wWQfxtg2N
// SIG // iou6VoLWwtBhWzDGoIIT+DCCA+4wggNXoAMCAQICEH6T
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
// SIG // FgQUmphkcEPJygYriCL4rctrCBw1/t4wDQYJKoZIhvcN
// SIG // AQEBBQAEggEAYCx7a3y2/VoEE5hPpt7h5T1ICluq24km
// SIG // FFXjg02t1Cb92XGoZT0mNbOje2AZ+NAxLntZ4PDXcFCs
// SIG // xkKFQrilLgQK8Js/i8c21eBBk8UxerkoK01E10LScvH6
// SIG // VLsZuScs8Oab1rNlFjpjY6eoNHk/8PkroVhkfHpZtTbB
// SIG // Rz0rl8pAUgu8k+vDqb0Ne7+sYJZSFOp0uDFgaaA7sB9P
// SIG // pP5e0A5/BuAOhVod7XsrYm7ToCidstG8HR7vjDFBheG9
// SIG // WHoNcKQMlCfHKWVI30Me+raswhZoPVGfzi3U3/ChgpQr
// SIG // jNsAzHfbC29hkLF0bTiJ6tz6wt4rkhdAAeStEdiEcU1T
// SIG // VqGCAgswggIHBgkqhkiG9w0BCQYxggH4MIIB9AIBATBy
// SIG // MF4xCzAJBgNVBAYTAlVTMR0wGwYDVQQKExRTeW1hbnRl
// SIG // YyBDb3Jwb3JhdGlvbjEwMC4GA1UEAxMnU3ltYW50ZWMg
// SIG // VGltZSBTdGFtcGluZyBTZXJ2aWNlcyBDQSAtIEcyAhAO
// SIG // z/Q4yP6/NW4E2GqYGxpQMAkGBSsOAwIaBQCgXTAYBgkq
// SIG // hkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJ
// SIG // BTEPFw0xNDA2MDUwNDM4MzZaMCMGCSqGSIb3DQEJBDEW
// SIG // BBTSf0mI9pCyv65PZmerehS/SQcq8DANBgkqhkiG9w0B
// SIG // AQEFAASCAQB+ODmK6uGLI1aAugKKF1dY4fPR3JLgXwTM
// SIG // jEzBvoI1ZEllwGI64CN6GECG890uWXClob7GxadaXWrh
// SIG // JA3uX8BwDjfsUhgZZEOB5PGVgAl4hMWCWYqAK0XK7YUN
// SIG // RXTpgo7VHpOfScg1wkn2VH3GRYhTRreyK2vamFQVMqGN
// SIG // MGVtZlzp764rQME6igcUt5jBbru9Sbg6ChyE2JkEB1/m
// SIG // 2nAM8tfVrpNhPHnDd5f+rD+d2mW3JjwBaeP7E0rhl5lZ
// SIG // ItPSzbB/raT3VO9OEP9evfuAW1bgmhjY0gXVxGVk3TjV
// SIG // CvO3/QeE6l/dKgUONvx14Wqkm+5sxx892UhN4YIZTp50
// SIG // End signature block
