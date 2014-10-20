; (function ($) {

    $.fn.linkContainer = function (options) {
        options = _.defaults(options, {
            containerSelector: ":not(*)",
            linkSelector: ":not(*)",
            handler: null
        });

        $(this).on("click", options.containerSelector, function (e) {
            var $container = $(this);
            var $link = $container.find(options.linkSelector);
            if ($link.length == 1) {
                if (!$link.is("a")) {
                    $link = $link.find("a");
                    if ($link.length != 1) {
                        return;
                    }
                }
            }
            
            if ($link.attr("href")) {
                if (typeof options.handler == "function") {
                    options.handler($link);
                } else {
                    $(document).trigger("loading-start");
                    window.location = $link.attr("href");
                }
            }
        });

    };
    var name2id = function(name) {
        var id = "";
        for (var i = 0; i < name.length; i++) {
            var c = name.charAt(i);
            if (c >= 'A' && c <= 'Z') id += c;
            else if (c >= 'a' && c <= 'z') id += c;
            else if (c >= '0' && c <= '9') id += c;
            else if (c == '_' || c == '-' || c == ':') id += c;
            else id += '_';
        }
        return id;
    };

    //Get "id-name" contexts for elements
    var getContexts = function(e, ctx) {
        ctx = ctx || {contexts: [], elements:[]};
        for (var i = 0; i < e.childNodes.length; i++) {
            var child = e.childNodes[i];
            if (child.nodeType == 1) {
                if (child.hasAttribute("data-object-context")) {
                    var attr = child.getAttribute("data-object-context");
                    var isArray = document.getElementById(name2id(attr) + "__array") ? true : false;
                    var newCtx = getContexts(child);
                    newCtx.root = child;
                    newCtx.array = isArray;
                    newCtx.oldName = attr;
                    newCtx.oldId = name2id(attr);
                    ctx.contexts.push(newCtx);
                } else {
                    if (child.hasAttribute("id") || child.hasAttribute("name") || child.hasAttribute("for")) {
                        ctx.elements.push(child);
                    }
                    getContexts(child, ctx);
                }
            }
        }
        return ctx;
    };
    //Update IDs based on "id-name" contexts for elements
    var processContexts = function(ctx) {
        ctx.newName = ctx.newName || ctx.oldName;
        ctx.root = ctx.root || $("[data-object-context=" + ctx.oldName)[0];
        if (ctx.root) {
            ctx.root.setAttribute("data-object-context", ctx.newName);
        }
        var j = 0;
        for (var i = 0; i < ctx.contexts.length; i++) {
            if (ctx.array) {
                ctx.contexts[i].newName = ctx.newName + "." + j;
                j++;
            } else if (ctx.oldName) {
                ctx.contexts[i].newName = ctx.newName + ctx.contexts[i].oldName.substr(ctx.oldName.length);
            } else {
                ctx.contexts[i].newName = ctx.contexts[i].oldName;
            }
            ctx.contexts[i].newId = name2id(ctx.contexts[i].newName);
            processContexts(ctx.contexts[i]);
        }
        if (ctx.oldName) {
            for (var k = 0 ; k < ctx.elements.length; k++) {
                var e = ctx.elements[k];
                var id = e.getAttribute("id");
                var name = e.getAttribute("name");
                var forv = e.getAttribute("for");
                if (id && id.substr(0, ctx.oldId.length) == ctx.oldId) {
                    e.setAttribute("id", ctx.newId + id.substr(ctx.oldId.length));
                }
                if (forv && forv.substr(0, ctx.oldId.length) == ctx.oldId) {
                    e.setAttribute("for", ctx.newId + forv.substr(ctx.oldId.length));
                }
                if (name && name.substr(0, ctx.oldName.length) == ctx.oldName) {
                    e.setAttribute("name", ctx.newName + name.substr(ctx.oldName.length));
                }
            }
        }
    };
    $.fn.updateIds = function() {
        for (var i = 0; i < this.length; i++) {
            var contexts = getContexts(this[i]);
            processContexts(contexts);
        }
    };
    
    //Convert an object to array
    //Object must have keys: { "$array": true, 0:.., 1:.., ... }
    //Used when making JSON arrays from forms
    var extractArrays = function (obj) {
        if (typeof obj == "object") {
            for (var k in obj) {
                if (k != "$array") {
                    obj[k] = extractArrays(obj[k]);
                }
            }
            if (obj["$array"]) {
                var keys = [];
                for (var i in obj) {
                    if (!isNaN(i * 1)) keys.push(i);
                }
                keys.sort(function(a, b) {
                    a = a * 1;
                    b = b * 1;
                    if (a < b) return -1;
                    if (a > b) return 1;
                    return 0;
                });
                var result = [];
                for (var j = 0; j < keys.length; j++) {
                    result.push(obj[keys[j]]);
                }
                return result;
            }
        }
        return obj;
    };
    $.fn.serializeJSON = function () {
		var json = {};
		jQuery.map($(this).serializeArray(), function (n, i) {
		    //Process dot
		    var names = n['name'].split(".");
		    var o = json;
		    for (var j = 0; j < names.length; j++) {
		        var name = names[j];
		        if (typeof o[name] === "undefined") {
		            //Do not write values that already exist
		            o[name] = (j == names.length - 1) ? n['value'] : {};
		        }
		        o = o[name];
		    }
		});
        //Now process array-like items
		return extractArrays(json);
    };
    $.fn.setChecked = function(value) {
        for (var i = 0; i < this.length; i++) {
            var e = this[i];
            if (e.tagName == "INPUT" && e.type == "checkbox") {
                e.checked = value ? true : false;
                var next = e.nextElementSibling || e.nextSibling;
                if (next && next.tagName == "INPUT" || next.name == e.name) {
                    next.value = e.checked ? "true" : "false";
                }
            }
        }
    };
    
	$.objectToFormFields = function(obj) {
	    var toFormField = function(o) {
	        var arr = [];
	        if (typeof o == "function") {
	            return arr;
	        } else if (typeof o == "object") {
	            if (o instanceof Array) {
	                for (var i = 0; i < o.length; i++) {
	                    arr.push(toFormField(o[i]));
	                }
	            } else {
	                for (var i in o) {
	                    var data = toFormField(o[i]);
	                    for (var j = 0; j < data.length; j++) {
	                        data[j].key = data[j].key ? i + "." + data[j].key : i;
	                        arr.push(data[j]);
	                    }
	                }
	            }
	        } else {
	            arr.push({ key: "", value: o });
	        }
	        return arr;
	    };

	    var objData = toFormField(obj);
	    var result = {};
	    for (var i = 0; i < objData.length; i++) {
	        var key = objData[i].key;
	        var value = objData[i].value;
	        if (typeof result[key] != "undefined") {
	            if (typeof result[key] != "object" || !(result[key] instanceof Array)) {
	                result[key] = [result[key]];
	            }
	            result[key].push(value);
	        } else {
	            result[key] = value;
	        }
	    }
	    return result;
	};
  
	$.fn.cancelWorkflow = function (action) {
	    $(this).executeCommand("Cancel", action);
	};

	$.fn.cancelScenario = function (action) {
	    $(this).executeCommand("CancelWorkflow", action);
	};
    
	$.fn.retryActivity = function (action) {
	    $(this).executeCommand("Retry", action);
	};
    
    $.fn.executeCommand = function(command, action) {
        $(this).each(function() {
            $(this).click(function() {
                action = action || $(this).data("action") || $(this).attr('href');
                var form = $("<form method='post' action='" + action + "'><input type='hidden' name='CommandName' value='" + command + "'></form>").appendTo($("body"));
                form.submit();
                return false;
            });
        });
    };

	$.fn.toolbar = function(options) {
		var defaults = { "linkSelector": "" };
		var config = $.extend({ }, defaults, options || {});

		$("li:not(.disabled)", this).live("click", function(e) {
			var $li = $(this);
			var $target = $(e.target);
			// если источник события -- ссылка, содержащаяся в li
			if (e.target != $li[0] && $target.is(config.linkSelector)) {
				$(document).trigger("loading-start");
				window.location.href = $target.attr("href");
			}
			else {
				// ищем ссылку и вызываем
			    $li.find(config.linkSelector).click();
			}
			return false;
		});

		return $(this);
	};

	$.fn.category = function(options) {
		var defaults = {
			"contentClass": ".category-content", 
			"categoriesContainer" : $(document)
		};
		var config = $.extend({ }, defaults, options || {});
		var EXPANDED = "expanded";
		var COLLAPSED = "collapsed";
		var CLOSE_OTHER = "closeOther";
		
		var $this = $(this);

		$this.live("collapse", function() {
			var $category = $(this);
			$category.removeClass(EXPANDED).addClass(COLLAPSED).next(config.contentClass).hide();
		}).live("expand", function () {
			var $category = $(this);
			$category.removeClass(COLLAPSED).addClass(EXPANDED).next(config.contentClass).slideDown();
		});
		
		$this.live("click", function(e) {
			var $category = $(this);
			if ($category.is("." + EXPANDED)) {
				$category.removeClass(EXPANDED).addClass(COLLAPSED)
					.next(config.contentClass).slideUp("normal"/*, function() {
						if (ContentDialog.instanceExists()) {
							ContentDialog.getLatestInstance().normalize();
						}
					}*/);
			}
			else {
				if ($category.hasClass(CLOSE_OTHER)) {
					$(".category", config.categoriesContainer).removeClass(EXPANDED).addClass(COLLAPSED).next(config.contentClass).slideUp();
				}
				$category.removeClass(COLLAPSED).addClass(EXPANDED).next(config.contentClass)
					.slideDown("normal"/*, function () {
						if (ContentDialog.instanceExists()) {
							ContentDialog.getLatestInstance().normalize();
						}
				}*/);
			}
			e.preventDefault();
			return false;
		});

		return $this;
	};
	
	$.fn.spinbox = function(options) {
		var defaults = { wrapperSelector: ".spinbox-wrapper" };
		var config = $.extend({ }, defaults, options || {});
		var checkValue = function($self, value) {
			//Make it fast, so that we can check on each keyUp w/o lags
			if (!$self[0]) {
				return;
			}
			if (typeof(value) == "undefined") {
				value = $self[0].value;
			}
			
			if (typeof $self.min == "undefined") {
				$self.min = parseInt($self.data("min"));
				if (isNaN($self.min)) $self.min = 0;
			}
			if (typeof $self.max == "undefined") {
				$self.max = parseInt($self.data("max"));
				if (isNaN($self.max)) $self.max = Infinity;
			}

			if (value || (value*1 == 0)) {
				var v = parseInt(value);
				if (isNaN(v)) {
					v = $self.min;
				} else {
					if (v > $self.max) {
						v = $self.max;
					}
					if (v < $self.min) {
						v = $self.min;
					}
				}
				$self[0].value= v;
			}
		};

		var checkAllValues = function($wrapper) {
			$wrapper.each(function(index, target) {
				var $input = $(target).find("input");
				checkValue($input);
			});
		};

		checkAllValues($(this));
		
		$(document).on("click", config.wrapperSelector + " .arrow", function(e) {
			var $arrow = $(this);
			var $input = $arrow.closest(config.wrapperSelector).find("input");
			$input.trigger($arrow.is(".up") ? "more" : "less");
			$input.trigger("change");
		});

		$(document)
		.on("blur", config.wrapperSelector + " input", function(e) {
			checkValue($(e.target));	
		}).on("keydown", config.wrapperSelector + " input", function (e) {
			// 38 - up
			// 40 - down
			
			switch(e.keyCode) {
				case 38:
					$(this).trigger("more");
					return false;
				case 40:
					$(this).trigger("less");
					return false;
			}
			
			return true;
		}).on("more", config.wrapperSelector + " input", function (e) {
			var $inp = $(this);
			var v = $inp.val() ? parseInt($inp.val()) : 0;
			var step = $inp.data("step") || 1;
			v += step;
			checkValue($inp, v);
		}).on("less", config.wrapperSelector + " input", function (e) {
			var $inp = $(this);
			var v = $inp.val() ? parseInt($inp.val()) : 0;
			var step = $inp.data("step") || 1;
			v -= step;
			checkValue($inp, v);
		});
		$("form").on("submit", function() {
			checkAllValues($(config.wrapperSelector, $(this)));
		}).on("form-pre-serialize", function () {
			checkAllValues($(config.wrapperSelector, $(this)));
		});
		
	};

	$.fn.watermarkedTextbox = function(options) {
		$(this).each(function (index, target) {
			var $target = $(target);
			var watermarkText = $target.attr("watermark");
			if(watermarkText)
				$(target).watermark(watermarkText,  {useNative: false, className:"qui_watermark"});
		});
	};

	// for qui buttons
	$.fn.disableButton = function() {
		var $this = $(this);
		
		$this.each(function() {
			var $target = $(this);
			if ($target.is("button")) {
				$target.attr("disabled", true).closest(".qui_btn_cmd").addClass("qui_disabled");
			}
		});

		return $this;
	};
	$.fn.enableButton = function() {
		var $this = $(this);
		
		$this.each(function() {
			var $target = $(this);
			if ($target.is("button")) {
				$target.attr("disabled", false).closest(".qui_btn_cmd").removeClass("qui_disabled");
			}
		});
		
		return $this;
	};
	$.fn.initTabs = function (switchCallback) {
	    var $target = $(this);
        $("a.tab-link", $target).click(function () {
            var toggle = true;
            $(".tab-content").each(function () {
                var $tab = $(this);
                if (!$tab.hasClass("hidden")) {
                    if (typeof switchCallback == "function") {
                        var result = switchCallback.apply(this);
                        if (typeof result != "undefined" && !result) {
                            toggle = false;
                        }
                    }
                    if (toggle) {
                        $(this).addClass("hidden");
                    }
                }
            });
            if (!toggle) {
                return false;
            }
            $("a.tab-link", $target).each(function () {
                $(this).closest("li").removeClass("qui_selected");
                $(this).closest("li").find(".qui_div_right").removeClass("hidden");
            });

            $(this).closest("li").addClass("qui_selected");
            $(this).closest("li").prev().find(".qui_div_right").addClass("hidden");
            $($(this).attr("href").substring($(this).attr("href").indexOf("#"))).removeClass("hidden");

            return false;
        });
	    return $target;
	};
	$.fn.handleRequestError = function (xhr, response) {
	    var $content = $(this);
	    if (response || response === "") {
	        if (typeof (response) == "object") {
	            if (typeof response.Result != "undefined") {
	                if (!response.Result) {
	                    ModelState.clearErrors($content);
	                    ModelState.process(response, $content);
	                    $(document).trigger("loading-stop");
	                    return true;
	                }
	            } else {
	                ModelState.clearErrors($content);
	                ModelState.process(response, $content);
	                $(document).trigger("loading-stop");
	                return true;
	            }
	        }
	    } else if (/json/.test(xhr.getResponseHeader("Content-Type"))) {
            var o = null;
            try {
                o = JSON.parse(xhr.responseText);
            } catch(e) {
            }
            if (o) {
                ModelState.clearErrors($content);
                ModelState.process(o, $content);
                $(document).trigger("loading-stop");
                return true;
            }
        }
        return false;
    };

    $.fn.verticalLayout = function(footerSelector) {
        //Updates layout as follows:
        //+-----------+
        //| Element 1 |
        //+-----------+
        //| Element 2 |
        //+-----------+
        //|   ...     +
        //+-----------|
        //|           |
        //|  Content  |
        //|           |
        //+-----------+
        //| Footer(*) |
        //+-----------+

        var offsetTop = 0;
        var $this = $(this);
        var len = $(this).length;
        var footerId = -1;
        $this.each(function(i, el) {
            var $el = $(el);
            if (!footerSelector || !$el.is(footerSelector)) {
                $el.css("top", offsetTop + "px");
                $el.show();
                offsetTop += $el.outerHeight();
            } else if (footerSelector) {
                footerId = i;
            }
        });

        if (footerId > 0) {
            var $footer = $($this[footerId]);
            $footer.show();
            $($this[footerId - 1]).css("bottom", $footer.outerHeight());
        }
    };

    $.fn.adjustLeftPanel = function(leftPanel, content, spacing) {
        //Updates layout as follows:
        //
        //+-------------------------------------------+
        //|                                           |
        //|   Screen                                  |
        //|        +----------------------+           |
        //|        |  This (centered)     |           |
        //|        +-------+--------------------------+
        //|        |       |                          |
        //|        | Left  |         Content          |
        //|        | Panel |                          |
        //|        |       |                          |
        //|        +-------+--------------------------+
        //|        |                      |           |
        //+-------------------------------+-----------+
        //
        var $this = $(this);
        var $leftPanel = $(leftPanel, $this);
        var $content = $(content, $this);
        if ($leftPanel.length > 0) {
            var newWidth = ($(window).width() + $this.outerWidth()) / 2 - $leftPanel.outerWidth() - spacing;
            $content.css({
                "left": $leftPanel.outerWidth() + spacing,
                "overflow": "auto",
                "width": newWidth
            });
        }
    }
})(jQuery);

// SIG // Begin signature block
// SIG // MIIY/gYJKoZIhvcNAQcCoIIY7zCCGOsCAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFPc18RtLHklg
// SIG // yRRWEUxl7lGc77hFoIIT+DCCA+4wggNXoAMCAQICEH6T
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
// SIG // FgQUjgLg6kjrVzmtgv5kNdJ6fNvi4wswDQYJKoZIhvcN
// SIG // AQEBBQAEggEAdOHBypPpC5oKvRK5zfi1ja5PNziBwG9z
// SIG // 3xVLOtY/TVvmAOGhk5vYfE7GrsP5EoMBue1MUyukjivf
// SIG // H0h4WAGB9kMENiP1+0Rzs8/150AayOAgdEFcGRGnvhbt
// SIG // U3e4KovAfdTuGkwnJ9P2GDT4PIR0DQXM8h4+kcFG1u43
// SIG // iYMRNeOIcAIihTuaxvwyiKdqRtc0IoimstWxd1y8bids
// SIG // UXb+yTiD+LEZ4N+fuhZarzgZDTLt5l4SxljGWl5FcaEH
// SIG // fRDCqQxmaSCW+o5F+wR9abPIuJEeMdJFC2DAaN5QRM+1
// SIG // 5ti4Cq1xHbp70NPCcydejI7Dnfj4DbytN90QcL+Dimba
// SIG // 26GCAgswggIHBgkqhkiG9w0BCQYxggH4MIIB9AIBATBy
// SIG // MF4xCzAJBgNVBAYTAlVTMR0wGwYDVQQKExRTeW1hbnRl
// SIG // YyBDb3Jwb3JhdGlvbjEwMC4GA1UEAxMnU3ltYW50ZWMg
// SIG // VGltZSBTdGFtcGluZyBTZXJ2aWNlcyBDQSAtIEcyAhAO
// SIG // z/Q4yP6/NW4E2GqYGxpQMAkGBSsOAwIaBQCgXTAYBgkq
// SIG // hkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJ
// SIG // BTEPFw0xNDA2MDUwNDM4MThaMCMGCSqGSIb3DQEJBDEW
// SIG // BBRNgzZ1AliBdNwOTG3w+2PPHRJWuTANBgkqhkiG9w0B
// SIG // AQEFAASCAQA0xkAFWMYBNoOYypFAJxk7Vi6wS41SQzDs
// SIG // ekgTVbEwXPBYt8ABJ2RbonAs0JYyR6bcVLYS9VAsmlOO
// SIG // lhmVYteOiCAOcBwxgcip5lDld7MwUJDJV+RFJQVbvYka
// SIG // DHpzoPn2dd24ZFIWubJ/ZV9FLbWJ6HmfABZsRxhdN+kB
// SIG // 8NutR6fyg12sFsWu7QQxKb2+mnXxcBg+47TV7eaBa28m
// SIG // sh5vLEZqzQLlM1po627cdenWFctffKS0+2nNPLe6/1SH
// SIG // fzypxw/Y01r41GaCT3VtSPcHLaCeEgRoQTDOI3QM1E5y
// SIG // DoMXdJMNcGTC+ZsB8Odw5ccPlHKujTm3Eql2lsNSMhvx
// SIG // End signature block
