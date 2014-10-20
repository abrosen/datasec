/*!
* jQuery Form Plugin
* version: 3.14 (30-JUL-2012)
* @requires jQuery v1.3.2 or later
*
* Examples and documentation at: http://malsup.com/jquery/form/
* Project repository: https://github.com/malsup/form
* Dual licensed under the MIT and GPL licenses:
*    http://malsup.github.com/mit-license.txt
*    http://malsup.github.com/gpl-license-v2.txt
*/
/*global ActiveXObject alert */
; (function ($) {
	"use strict";

	/*
	Usage Note:
	-----------
	Do not use both ajaxSubmit and ajaxForm on the same form.  These
	functions are mutually exclusive.  Use ajaxSubmit if you want
	to bind your own submit handler to the form.  For example,

	$(document).ready(function() {
	$('#myForm').on('submit', function(e) {
	e.preventDefault(); // <-- important
	$(this).ajaxSubmit({
	target: '#output'
	});
	});
	});

	Use ajaxForm when you want the plugin to manage all the event binding
	for you.  For example,

	$(document).ready(function() {
	$('#myForm').ajaxForm({
	target: '#output'
	});
	});
    
	You can also use ajaxForm with delegation (requires jQuery v1.7+), so the
	form does not have to exist when you invoke ajaxForm:

	$('#myForm').ajaxForm({
	delegation: true,
	target: '#output'
	});
    
	When using ajaxForm, the ajaxSubmit function will be invoked for you
	at the appropriate time.
	*/

	/**
	* Feature detection
	*/
	var feature = {};
	feature.fileapi = $("<input type='file'/>").get(0).files !== undefined;
	feature.formdata = window.FormData !== undefined;

	/**
	* ajaxSubmit() provides a mechanism for immediately submitting
	* an HTML form using AJAX.
	*/
	$.fn.ajaxSubmit = function (options) {
		/*jshint scripturl:true */

		// fast fail if nothing selected (http://dev.jquery.com/ticket/2752)
		if (!this.length) {
			log('ajaxSubmit: skipping submit process - no element selected');
			return this;
		}

		var method, action, url, $form = this;

		if (typeof options == 'function') {
			options = { success: options };
		}

		method = this.attr('method');
		action = this.attr('action');
		url = (typeof action === 'string') ? $.trim(action) : '';
		url = url || window.location.href || '';
		if (url) {
			// clean url (don't include hash vaue)
			url = (url.match(/^([^#]+)/) || [])[1];
		}

		options = $.extend(true, {
			url: url,
			success: $.ajaxSettings.success,
			type: method || 'GET',
			iframeSrc: /^https/i.test(window.location.href || '') ? 'javascript:false' : 'about:blank'
		}, options);

		// hook for manipulating the form data before it is extracted;
		// convenient for use with rich editors like tinyMCE or FCKEditor
		var veto = {};
		this.trigger('form-pre-serialize', [this, options, veto]);
		if (veto.veto) {
			log('ajaxSubmit: submit vetoed via form-pre-serialize trigger');
			return this;
		}

		// provide opportunity to alter form data before it is serialized
		if (options.beforeSerialize && options.beforeSerialize(this, options) === false) {
			log('ajaxSubmit: submit aborted via beforeSerialize callback');
			return this;
		}

		var traditional = options.traditional;
		if (traditional === undefined) {
			traditional = $.ajaxSettings.traditional;
		}

		var elements = [];
		var qx, a = this.formToArray(options.semantic, elements);
		if (options.data) {
			options.extraData = options.data;
			qx = $.param(options.data, traditional);
		}

		// give pre-submit callback an opportunity to abort the submit
		if (options.beforeSubmit && options.beforeSubmit(a, this, options) === false) {
			log('ajaxSubmit: submit aborted via beforeSubmit callback');
			return this;
		}

		// fire vetoable 'validate' event
		this.trigger('form-submit-validate', [a, this, options, veto]);
		if (veto.veto) {
			log('ajaxSubmit: submit vetoed via form-submit-validate trigger');
			return this;
		}

		var q = $.param(a, traditional);
		if (qx) {
			q = (q ? (q + '&' + qx) : qx);
		}
		if (options.type.toUpperCase() == 'GET') {
			options.url += (options.url.indexOf('?') >= 0 ? '&' : '?') + q;
			options.data = null;  // data is null for 'get'
		}
		else {
			options.data = q; // data is the query string for 'post'
		}

		var callbacks = [];
		if (options.resetForm) {
			callbacks.push(function () { $form.resetForm(); });
		}
		if (options.clearForm) {
			callbacks.push(function () { $form.clearForm(options.includeHidden); });
		}

		// perform a load on the target only if dataType is not provided
		if (!options.dataType && options.target) {
			var oldSuccess = options.success || function () { };
			callbacks.push(function (data) {
				var fn = options.replaceTarget ? 'replaceWith' : 'html';
				$(options.target)[fn](data).each(oldSuccess, arguments);
			});
		}
		else if (options.success) {
			callbacks.push(options.success);
		}

		options.success = function (data, status, xhr) { // jQuery 1.4+ passes xhr as 3rd arg
			var context = options.context || this;    // jQuery 1.4+ supports scope context 
			for (var i = 0, max = callbacks.length; i < max; i++) {
				callbacks[i].apply(context, [data, status, xhr || $form, $form]);
			}
		};

		// are there files to upload?
		var fileInputs = $('input:file:enabled[value]', this); // [value] (issue #113)
		var hasFileInputs = fileInputs.length > 0;
		var mp = 'multipart/form-data';
		var multipart = ($form.attr('enctype') == mp || $form.attr('encoding') == mp);

		var fileAPI = feature.fileapi && feature.formdata;
		log("fileAPI :" + fileAPI);
		var shouldUseFrame = (hasFileInputs || multipart) && !fileAPI;

		// options.iframe allows user to force iframe mode
		// 06-NOV-09: now defaulting to iframe mode if file input is detected
		if (options.iframe !== false && (options.iframe || shouldUseFrame)) {
			// hack to fix Safari hang (thanks to Tim Molendijk for this)
			// see:  http://groups.google.com/group/jquery-dev/browse_thread/thread/36395b7ab510dd5d
			if (options.closeKeepAlive) {
				$.get(options.closeKeepAlive, function () {
					fileUploadIframe(a);
				});
			}
			else {
				fileUploadIframe(a);
			}
		}
		else if ((hasFileInputs || multipart) && fileAPI) {
			fileUploadXhr(a);
		}
		else {
			$.ajax(options);
		}

		// clear element array
		for (var k = 0; k < elements.length; k++)
			elements[k] = null;

		// fire 'notify' event
		this.trigger('form-submit-notify', [this, options]);
		return this;

		// XMLHttpRequest Level 2 file uploads (big hat tip to francois2metz)
		function fileUploadXhr(a) {
			var formdata = new FormData();

			for (var i = 0; i < a.length; i++) {
				formdata.append(a[i].name, a[i].value);
			}

			if (options.extraData) {
				for (var p in options.extraData)
					if (options.extraData.hasOwnProperty(p))
						formdata.append(p, options.extraData[p]);
			}

			options.data = null;

			var s = $.extend(true, {}, $.ajaxSettings, options, {
				contentType: false,
				processData: false,
				cache: false,
				type: 'POST'
			});

			if (options.uploadProgress) {
				// workaround because jqXHR does not expose upload property
				s.xhr = function () {
					var xhr = jQuery.ajaxSettings.xhr();
					if (xhr.upload) {
						xhr.upload.onprogress = function (event) {
							var percent = 0;
							var position = event.loaded || event.position; /*event.position is deprecated*/
							var total = event.total;
							if (event.lengthComputable) {
								percent = Math.ceil(position / total * 100);
							}
							options.uploadProgress(event, position, total, percent);
						};
					}
					return xhr;
				};
			}

			s.data = null;
			var beforeSend = s.beforeSend;
			s.beforeSend = function (xhr, o) {
				o.data = formdata;
				if (beforeSend)
					beforeSend.call(this, xhr, o);
			};
			$.ajax(s);
		}

		// private function for handling file uploads (hat tip to YAHOO!)
		function fileUploadIframe(a) {
			var form = $form[0], el, i, s, g, id, $io, io, xhr, sub, n, timedOut, timeoutHandle;
			var useProp = !!$.fn.prop;

			if ($(':input[name=submit],:input[id=submit]', form).length) {
				// if there is an input with a name or id of 'submit' then we won't be
				// able to invoke the submit fn on the form (at least not x-browser)
				alert('Error: Form elements must not have name or id of "submit".');
				return;
			}

			if (a) {
				// ensure that every serialized input is still enabled
				for (i = 0; i < elements.length; i++) {
					el = $(elements[i]);
					if (useProp)
						el.prop('disabled', false);
					else
						el.removeAttr('disabled');
				}
			}

			s = $.extend(true, {}, $.ajaxSettings, options);
			s.context = s.context || s;
			id = 'jqFormIO' + (new Date().getTime());
			if (s.iframeTarget) {
				$io = $(s.iframeTarget);
				n = $io.attr('name');
				if (!n)
					$io.attr('name', id);
				else
					id = n;
			}
			else {
				$io = $('<iframe name="' + id + '" src="' + s.iframeSrc + '" />');
				$io.css({ position: 'absolute', top: '-1000px', left: '-1000px' });
			}
			io = $io[0];


			xhr = { // mock object
				aborted: 0,
				responseText: null,
				responseXML: null,
				status: 0,
				statusText: 'n/a',
				getAllResponseHeaders: function () { },
				getResponseHeader: function () { },
				setRequestHeader: function () { },
				abort: function (status) {
					var e = (status === 'timeout' ? 'timeout' : 'aborted');
					log('aborting upload... ' + e);
					this.aborted = 1;
					// #214
					if (io.contentWindow.document.execCommand) {
						try { // #214
							io.contentWindow.document.execCommand('Stop');
						} catch (ignore) { }
					}
					$io.attr('src', s.iframeSrc); // abort op in progress
					xhr.error = e;
					if (s.error)
						s.error.call(s.context, xhr, e, status);
					if (g)
						$.event.trigger("ajaxError", [xhr, s, e]);
					if (s.complete)
						s.complete.call(s.context, xhr, e);
				}
			};

			g = s.global;
			// trigger ajax global events so that activity/block indicators work like normal
			if (g && 0 === $.active++) {
				$.event.trigger("ajaxStart");
			}
			if (g) {
				$.event.trigger("ajaxSend", [xhr, s]);
			}

			if (s.beforeSend && s.beforeSend.call(s.context, xhr, s) === false) {
				if (s.global) {
					$.active--;
				}
				return;
			}
			if (xhr.aborted) {
				return;
			}

			// add submitting element to data if we know it
			sub = form.clk;
			if (sub) {
				n = sub.name;
				if (n && !sub.disabled) {
					s.extraData = s.extraData || {};
					s.extraData[n] = sub.value;
					if (sub.type == "image") {
						s.extraData[n + '.x'] = form.clk_x;
						s.extraData[n + '.y'] = form.clk_y;
					}
				}
			}

			var CLIENT_TIMEOUT_ABORT = 1;
			var SERVER_ABORT = 2;

			function getDoc(frame) {
				var doc = frame.contentWindow ? frame.contentWindow.document : frame.contentDocument ? frame.contentDocument : frame.document;
				return doc;
			}

			// Rails CSRF hack (thanks to Yvan Barthelemy)
			var csrf_token = $('meta[name=csrf-token]').attr('content');
			var csrf_param = $('meta[name=csrf-param]').attr('content');
			if (csrf_param && csrf_token) {
				s.extraData = s.extraData || {};
				s.extraData[csrf_param] = csrf_token;
			}

			// take a breath so that pending repaints get some cpu time before the upload starts
			function doSubmit() {
				// make sure form attrs are set
				var t = $form.attr('target'), a = $form.attr('action');

				// update form attrs in IE friendly way
				form.setAttribute('target', id);
				if (!method) {
					form.setAttribute('method', 'POST');
				}
				if (a != s.url) {
					form.setAttribute('action', s.url);
				}

				// ie borks in some cases when setting encoding
				if (!s.skipEncodingOverride && (!method || /post/i.test(method))) {
					$form.attr({
						encoding: 'multipart/form-data',
						enctype: 'multipart/form-data'
					});
				}

				// support timout
				if (s.timeout) {
					timeoutHandle = setTimeout(function () { timedOut = true; cb(CLIENT_TIMEOUT_ABORT); }, s.timeout);
				}

				// look for server aborts
				function checkState() {
					try {
						var state = getDoc(io).readyState;
						log('state = ' + state);
						if (state && state.toLowerCase() == 'uninitialized')
							setTimeout(checkState, 50);
					}
					catch (e) {
						log('Server abort: ', e, ' (', e.name, ')');
						cb(SERVER_ABORT);
						if (timeoutHandle)
							clearTimeout(timeoutHandle);
						timeoutHandle = undefined;
					}
				}

				// add "extra" data to form if provided in options
				var extraInputs = [];
				try {
					if (s.extraData) {
						for (var n in s.extraData) {
							if (s.extraData.hasOwnProperty(n)) {
								// if using the $.param format that allows for multiple values with the same name
								if ($.isPlainObject(s.extraData[n]) && s.extraData[n].hasOwnProperty('name') && s.extraData[n].hasOwnProperty('value')) {
									extraInputs.push(
                               $('<input type="hidden" name="' + s.extraData[n].name + '">').attr('value', s.extraData[n].value)
                                   .appendTo(form)[0]);
								} else {
									extraInputs.push(
                               $('<input type="hidden" name="' + n + '">').attr('value', s.extraData[n])
                                   .appendTo(form)[0]);
								}
							}
						}
					}

					if (!s.iframeTarget) {
						// add iframe to doc and submit the form
						$io.appendTo('body');
						if (io.attachEvent)
							io.attachEvent('onload', cb);
						else
							io.addEventListener('load', cb, false);
					}
					setTimeout(checkState, 15);
					form.submit();
				}
				finally {
					// reset attrs and remove "extra" input elements
					form.setAttribute('action', a);
					if (t) {
						form.setAttribute('target', t);
					} else {
						$form.removeAttr('target');
					}
					$(extraInputs).remove();
				}
			}

			if (s.forceSync) {
				doSubmit();
			}
			else {
				setTimeout(doSubmit, 10); // this lets dom updates render
			}

			var data, doc, domCheckCount = 50, callbackProcessed;

			function cb(e) {
				if (xhr.aborted || callbackProcessed) {
					return;
				}
				try {
					doc = getDoc(io);
				}
				catch (ex) {
					log('cannot access response document: ', ex);
					e = SERVER_ABORT;
				}
				if (e === CLIENT_TIMEOUT_ABORT && xhr) {
					xhr.abort('timeout');
					return;
				}
				else if (e == SERVER_ABORT && xhr) {
					xhr.abort('server abort');
					return;
				}

				if (!doc || doc.location.href == s.iframeSrc) {
					// response not received yet
					if (!timedOut)
						return;
				}
				if (io.detachEvent)
					io.detachEvent('onload', cb);
				else
					io.removeEventListener('load', cb, false);

				var status = 'success', errMsg;
				try {
					if (timedOut) {
						throw 'timeout';
					}

					var isXml = s.dataType == 'xml' || doc.XMLDocument || $.isXMLDoc(doc);
					log('isXml=' + isXml);
					if (!isXml && window.opera && (doc.body === null || !doc.body.innerHTML)) {
						if (--domCheckCount) {
							// in some browsers (Opera) the iframe DOM is not always traversable when
							// the onload callback fires, so we loop a bit to accommodate
							log('requeing onLoad callback, DOM not available');
							setTimeout(cb, 250);
							return;
						}
						// let this fall through because server response could be an empty document
						//log('Could not access iframe DOM after mutiple tries.');
						//throw 'DOMException: not available';
					}

					//log('response detected');
					var docRoot = doc.body ? doc.body : doc.documentElement;
					xhr.responseText = docRoot ? docRoot.innerHTML : null;
					xhr.responseXML = doc.XMLDocument ? doc.XMLDocument : doc;
					if (isXml)
						s.dataType = 'xml';
					xhr.getResponseHeader = function (header) {
						var headers = { 'content-type': s.dataType };
						return headers[header];
					};
					// support for XHR 'status' & 'statusText' emulation :
					if (docRoot) {
						xhr.status = Number(docRoot.getAttribute('status')) || xhr.status;
						xhr.statusText = docRoot.getAttribute('statusText') || xhr.statusText;
					}

					var dt = (s.dataType || '').toLowerCase();
					var scr = /(json|script|text)/.test(dt);
					if (scr || s.textarea) {
						// see if user embedded response in textarea
						var ta = doc.getElementsByTagName('textarea')[0];
						if (ta) {
							xhr.responseText = ta.value;
							// support for XHR 'status' & 'statusText' emulation :
							xhr.status = Number(ta.getAttribute('status')) || xhr.status;
							xhr.statusText = ta.getAttribute('statusText') || xhr.statusText;
						}
						else if (scr) {
							// account for browsers injecting pre around json response
							var pre = doc.getElementsByTagName('pre')[0];
							var b = doc.getElementsByTagName('body')[0];
							if (pre) {
								xhr.responseText = pre.textContent ? pre.textContent : pre.innerText;
							}
							else if (b) {
								xhr.responseText = b.textContent ? b.textContent : b.innerText;
							}
						}
					}
					else if (dt == 'xml' && !xhr.responseXML && xhr.responseText) {
						xhr.responseXML = toXml(xhr.responseText);
					}

					try {
						data = httpData(xhr, dt, s);
					}
					catch (e) {
						status = 'parsererror';
						xhr.error = errMsg = (e || status);
					}
				}
				catch (e) {
					log('error caught: ', e);
					status = 'error';
					xhr.error = errMsg = (e || status);
				}

				if (xhr.aborted) {
					log('upload aborted');
					status = null;
				}

				if (xhr.status) { // we've set xhr.status
					status = (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) ? 'success' : 'error';
				}

				// ordering of these callbacks/triggers is odd, but that's how $.ajax does it
				if (status === 'success') {
					if (s.success)
						s.success.call(s.context, data, 'success', xhr);
					if (g)
						$.event.trigger("ajaxSuccess", [xhr, s]);
				}
				else if (status) {
					if (errMsg === undefined)
						errMsg = xhr.statusText;
					if (s.error)
						s.error.call(s.context, xhr, status, errMsg);
					if (g)
						$.event.trigger("ajaxError", [xhr, s, errMsg]);
				}

				if (g)
					$.event.trigger("ajaxComplete", [xhr, s]);

				if (g && ! --$.active) {
					$.event.trigger("ajaxStop");
				}

				if (s.complete)
					s.complete.call(s.context, xhr, status);

				callbackProcessed = true;
				if (s.timeout)
					clearTimeout(timeoutHandle);

				// clean up
				setTimeout(function () {
					if (!s.iframeTarget)
						$io.remove();
					xhr.responseXML = null;
				}, 100);
			}

			var toXml = $.parseXML || function (s, doc) { // use parseXML if available (jQuery 1.5+)
				if (window.ActiveXObject) {
					doc = new ActiveXObject('Microsoft.XMLDOM');
					doc.async = 'false';
					doc.loadXML(s);
				}
				else {
					doc = (new DOMParser()).parseFromString(s, 'text/xml');
				}
				return (doc && doc.documentElement && doc.documentElement.nodeName != 'parsererror') ? doc : null;
			};
			var parseJSON = $.parseJSON || function (s) {
				/*jslint evil:true */
				return window['eval']('(' + s + ')');
			};

			var httpData = function (xhr, type, s) { // mostly lifted from jq1.4.4

				var ct = xhr.getResponseHeader('content-type') || '',
                xml = type === 'xml' || !type && ct.indexOf('xml') >= 0,
                data = xml ? xhr.responseXML : xhr.responseText;

				if (xml && data.documentElement.nodeName === 'parsererror') {
					if ($.error)
						$.error('parsererror');
				}
				if (s && s.dataFilter) {
					data = s.dataFilter(data, type);
				}
				if (typeof data === 'string') {
					if (type === 'json' || !type && ct.indexOf('json') >= 0) {
						data = parseJSON(data);
					} else if (type === "script" || !type && ct.indexOf("javascript") >= 0) {
						$.globalEval(data);
					}
				}
				return data;
			};
		}
	};

	/**
	* ajaxForm() provides a mechanism for fully automating form submission.
	*
	* The advantages of using this method instead of ajaxSubmit() are:
	*
	* 1: This method will include coordinates for <input type="image" /> elements (if the element
	*    is used to submit the form).
	* 2. This method will include the submit element's name/value data (for the element that was
	*    used to submit the form).
	* 3. This method binds the submit() method to the form for you.
	*
	* The options argument for ajaxForm works exactly as it does for ajaxSubmit.  ajaxForm merely
	* passes the options argument along after properly binding events for submit elements and
	* the form itself.
	*/
	$.fn.ajaxForm = function (options) {
		options = options || {};
		options.delegation = options.delegation && $.isFunction($.fn.on);

		// in jQuery 1.3+ we can fix mistakes with the ready state
		if (!options.delegation && this.length === 0) {
			var o = { s: this.selector, c: this.context };
			if (!$.isReady && o.s) {
				log('DOM not ready, queuing ajaxForm');
				$(function () {
					$(o.s, o.c).ajaxForm(options);
				});
				return this;
			}
			// is your DOM ready?  http://docs.jquery.com/Tutorials:Introducing_$(document).ready()
			log('terminating; zero elements found by selector' + ($.isReady ? '' : ' (DOM not ready)'));
			return this;
		}

		if (options.delegation) {
			$(document)
            .off('submit.form-plugin', this.selector, doAjaxSubmit)
            .off('click.form-plugin', this.selector, captureSubmittingElement)
            .on('submit.form-plugin', this.selector, options, doAjaxSubmit)
            .on('click.form-plugin', this.selector, options, captureSubmittingElement);
			return this;
		}

		return this.ajaxFormUnbind()
        .bind('submit.form-plugin', options, doAjaxSubmit)
        .bind('click.form-plugin', options, captureSubmittingElement);
	};

	// private event handlers    
	function doAjaxSubmit(e) {
		/*jshint validthis:true */
		var options = e.data;
		if (!e.isDefaultPrevented()) { // if event has been canceled, don't proceed
			e.preventDefault();
			$(this).ajaxSubmit(options);
		}
	}

	function captureSubmittingElement(e) {
		/*jshint validthis:true */
		var target = e.target;
		var $el = $(target);
		if (!($el.is(":submit,input:image"))) {
			// is this a child element of the submit el?  (ex: a span within a button)
			var t = $el.closest(':submit');
			if (t.length === 0) {
				return;
			}
			target = t[0];
		}
		var form = this;
		form.clk = target;
		if (target.type == 'image') {
			if (e.offsetX !== undefined) {
				form.clk_x = e.offsetX;
				form.clk_y = e.offsetY;
			} else if (typeof $.fn.offset == 'function') {
				var offset = $el.offset();
				form.clk_x = e.pageX - offset.left;
				form.clk_y = e.pageY - offset.top;
			} else {
				form.clk_x = e.pageX - target.offsetLeft;
				form.clk_y = e.pageY - target.offsetTop;
			}
		}
		// clear form vars
		setTimeout(function () { form.clk = form.clk_x = form.clk_y = null; }, 100);
	}


	// ajaxFormUnbind unbinds the event handlers that were bound by ajaxForm
	$.fn.ajaxFormUnbind = function () {
		return this.unbind('submit.form-plugin click.form-plugin');
	};

	/**
	* formToArray() gathers form element data into an array of objects that can
	* be passed to any of the following ajax functions: $.get, $.post, or load.
	* Each object in the array has both a 'name' and 'value' property.  An example of
	* an array for a simple login form might be:
	*
	* [ { name: 'username', value: 'jresig' }, { name: 'password', value: 'secret' } ]
	*
	* It is this array that is passed to pre-submit callback functions provided to the
	* ajaxSubmit() and ajaxForm() methods.
	*/
	$.fn.formToArray = function (semantic, elements) {
		var a = [];
		if (this.length === 0) {
			return a;
		}

		var form = this[0];
		var els = semantic ? form.getElementsByTagName('*') : form.elements;
		if (!els) {
			return a;
		}

		var i, j, n, v, el, max, jmax;
		for (i = 0, max = els.length; i < max; i++) {
			el = els[i];
			n = el.name;
			if (!n) {
				continue;
			}

			if (semantic && form.clk && el.type == "image") {
				// handle image inputs on the fly when semantic == true
				if (!el.disabled && form.clk == el) {
					a.push({ name: n, value: $(el).val(), type: el.type });
					a.push({ name: n + '.x', value: form.clk_x }, { name: n + '.y', value: form.clk_y });
				}
				continue;
			}

			v = $.fieldValue(el, true);
			if (v && v.constructor == Array) {
				if (elements)
					elements.push(el);
				for (j = 0, jmax = v.length; j < jmax; j++) {
					a.push({ name: n, value: v[j] });
				}
			}
			else if (feature.fileapi && el.type == 'file' && !el.disabled) {
				if (elements)
					elements.push(el);
				var files = el.files;
				if (files.length) {
					for (j = 0; j < files.length; j++) {
						a.push({ name: n, value: files[j], type: el.type });
					}
				}
				else {
					// #180
					a.push({ name: n, value: '', type: el.type });
				}
			}
			else if (v !== null && typeof v != 'undefined') {
				if (elements)
					elements.push(el);
				a.push({ name: n, value: v, type: el.type, required: el.required });
			}
		}

		if (!semantic && form.clk) {
			// input type=='image' are not found in elements array! handle it here
			var $input = $(form.clk), input = $input[0];
			n = input.name;
			if (n && !input.disabled && input.type == 'image') {
				a.push({ name: n, value: $input.val() });
				a.push({ name: n + '.x', value: form.clk_x }, { name: n + '.y', value: form.clk_y });
			}
		}
		return a;
	};

	/**
	* Serializes form data into a 'submittable' string. This method will return a string
	* in the format: name1=value1&amp;name2=value2
	*/
	$.fn.formSerialize = function (semantic) {
		//hand off to jQuery.param for proper encoding
		return $.param(this.formToArray(semantic));
	};

	/**
	* Serializes all field elements in the jQuery object into a query string.
	* This method will return a string in the format: name1=value1&amp;name2=value2
	*/
	$.fn.fieldSerialize = function (successful) {
		var a = [];
		this.each(function () {
			var n = this.name;
			if (!n) {
				return;
			}
			var v = $.fieldValue(this, successful);
			if (v && v.constructor == Array) {
				for (var i = 0, max = v.length; i < max; i++) {
					a.push({ name: n, value: v[i] });
				}
			}
			else if (v !== null && typeof v != 'undefined') {
				a.push({ name: this.name, value: v });
			}
		});
		//hand off to jQuery.param for proper encoding
		return $.param(a);
	};

	/**
	* Returns the value(s) of the element in the matched set.  For example, consider the following form:
	*
	*  <form><fieldset>
	*      <input name="A" type="text" />
	*      <input name="A" type="text" />
	*      <input name="B" type="checkbox" value="B1" />
	*      <input name="B" type="checkbox" value="B2"/>
	*      <input name="C" type="radio" value="C1" />
	*      <input name="C" type="radio" value="C2" />
	*  </fieldset></form>
	*
	*  var v = $(':text').fieldValue();
	*  // if no values are entered into the text inputs
	*  v == ['','']
	*  // if values entered into the text inputs are 'foo' and 'bar'
	*  v == ['foo','bar']
	*
	*  var v = $(':checkbox').fieldValue();
	*  // if neither checkbox is checked
	*  v === undefined
	*  // if both checkboxes are checked
	*  v == ['B1', 'B2']
	*
	*  var v = $(':radio').fieldValue();
	*  // if neither radio is checked
	*  v === undefined
	*  // if first radio is checked
	*  v == ['C1']
	*
	* The successful argument controls whether or not the field element must be 'successful'
	* (per http://www.w3.org/TR/html4/interact/forms.html#successful-controls).
	* The default value of the successful argument is true.  If this value is false the value(s)
	* for each element is returned.
	*
	* Note: This method *always* returns an array.  If no valid value can be determined the
	*    array will be empty, otherwise it will contain one or more values.
	*/
	$.fn.fieldValue = function (successful) {
		for (var val = [], i = 0, max = this.length; i < max; i++) {
			var el = this[i];
			var v = $.fieldValue(el, successful);
			if (v === null || typeof v == 'undefined' || (v.constructor == Array && !v.length)) {
				continue;
			}
			if (v.constructor == Array)
				$.merge(val, v);
			else
				val.push(v);
		}
		return val;
	};

	/**
	* Returns the value of the field element.
	*/
	$.fieldValue = function (el, successful) {
		var n = el.name, t = el.type, tag = el.tagName.toLowerCase();
		if (successful === undefined) {
			successful = true;
		}

		if (successful && (!n || el.disabled || t == 'reset' || t == 'button' ||
        (t == 'checkbox' || t == 'radio') && !el.checked ||
        (t == 'submit' || t == 'image') && el.form && el.form.clk != el ||
        tag == 'select' && el.selectedIndex == -1)) {
			return null;
		}

		if (tag == 'select') {
			var index = el.selectedIndex;
			if (index < 0) {
				return null;
			}
			var a = [], ops = el.options;
			var one = (t == 'select-one');
			var max = (one ? index + 1 : ops.length);
			for (var i = (one ? index : 0); i < max; i++) {
				var op = ops[i];
				if (op.selected) {
					var v = op.value;
					if (!v) { // extra pain for IE...
						v = (op.attributes && op.attributes['value'] && !(op.attributes['value'].specified)) ? op.text : op.value;
					}
					if (one) {
						return v;
					}
					a.push(v);
				}
			}
			return a;
		}
		return $(el).val();
	};

	/**
	* Clears the form data.  Takes the following actions on the form's input fields:
	*  - input text fields will have their 'value' property set to the empty string
	*  - select elements will have their 'selectedIndex' property set to -1
	*  - checkbox and radio inputs will have their 'checked' property set to false
	*  - inputs of type submit, button, reset, and hidden will *not* be effected
	*  - button elements will *not* be effected
	*/
	$.fn.clearForm = function (includeHidden) {
		return this.each(function () {
			$('input,select,textarea', this).clearFields(includeHidden);
		});
	};

	/**
	* Clears the selected form elements.
	*/
	$.fn.clearFields = $.fn.clearInputs = function (includeHidden) {
		var re = /^(?:color|date|datetime|email|month|number|password|range|search|tel|text|time|url|week)$/i; // 'hidden' is not in this list
		return this.each(function () {
			var t = this.type, tag = this.tagName.toLowerCase();
			if (re.test(t) || tag == 'textarea') {
				this.value = '';
			}
			else if (t == 'checkbox' || t == 'radio') {
				this.checked = false;
			}
			else if (tag == 'select') {
				this.selectedIndex = -1;
			}
			else if (includeHidden) {
				// includeHidden can be the value true, or it can be a selector string
				// indicating a special test; for example:
				//  $('#myForm').clearForm('.special:hidden')
				// the above would clean hidden inputs that have the class of 'special'
				if ((includeHidden === true && /hidden/.test(t)) ||
                 (typeof includeHidden == 'string' && $(this).is(includeHidden)))
					this.value = '';
			}
		});
	};

	/**
	* Resets the form data.  Causes all form elements to be reset to their original value.
	*/
	$.fn.resetForm = function () {
		return this.each(function () {
			// guard against an input with the name of 'reset'
			// note that IE reports the reset function as an 'object'
			if (typeof this.reset == 'function' || (typeof this.reset == 'object' && !this.reset.nodeType)) {
				this.reset();
			}
		});
	};

	/**
	* Enables or disables any matching elements.
	*/
	$.fn.enable = function (b) {
		if (b === undefined) {
			b = true;
		}
		return this.each(function () {
			this.disabled = !b;
		});
	};

	/**
	* Checks/unchecks any matching checkboxes or radio buttons and
	* selects/deselects and matching option elements.
	*/
	$.fn.selected = function (select) {
		if (select === undefined) {
			select = true;
		}
		return this.each(function () {
			var t = this.type;
			if (t == 'checkbox' || t == 'radio') {
				this.checked = select;
			}
			else if (this.tagName.toLowerCase() == 'option') {
				var $sel = $(this).parent('select');
				if (select && $sel[0] && $sel[0].type == 'select-one') {
					// deselect all other options
					$sel.find('option').selected(false);
				}
				this.selected = select;
			}
		});
	};

	// expose debug var
	$.fn.ajaxSubmit.debug = false;

	// helper fn for console logging
	function log() {
		if (!$.fn.ajaxSubmit.debug)
			return;
		var msg = '[jquery.form] ' + Array.prototype.join.call(arguments, '');
		if (window.console && window.console.log) {
			window.console.log(msg);
		}
		else if (window.opera && window.opera.postError) {
			window.opera.postError(msg);
		}
	}

})(jQuery);

// SIG // Begin signature block
// SIG // MIIY/gYJKoZIhvcNAQcCoIIY7zCCGOsCAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFGD1SbiWXQ0c
// SIG // Kg4Yr/xijO4oiWkFoIIT+DCCA+4wggNXoAMCAQICEH6T
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
// SIG // FgQUJp0V0RNdy2/1sHakB7YyWxzDoT8wDQYJKoZIhvcN
// SIG // AQEBBQAEggEAOL6bESvF7QOsOopK2faM/FvYjhjTGLU0
// SIG // 0ZwWmR9UWs5Ws1ioQ3USP1ftW/JTtWktEbON2ZRwHVXV
// SIG // ET8O1mzUzupmFAFC6ONUhQbOlBsZTdghUc9GpD9N+VN/
// SIG // 8Iystq2Em0b3T2ZV+Z2nOrEnl4jJTdZeBCm0j6TJZfIi
// SIG // q5giU+E/g+r4hyTPRus2n3nb3HF+tM3bxR1rMW71c19A
// SIG // 4RDpWVNb7LEdhBvjYRZICH8KQDPyRuedApeR+xh9lOe6
// SIG // +8OFk3BdmkABj1QPSp6epqwWpLkB/52jZXnMtX756eJO
// SIG // K0VKn2xOLLeX8lkMg9mgTHzjdoODmLYpFdli/Zmkxzgj
// SIG // CqGCAgswggIHBgkqhkiG9w0BCQYxggH4MIIB9AIBATBy
// SIG // MF4xCzAJBgNVBAYTAlVTMR0wGwYDVQQKExRTeW1hbnRl
// SIG // YyBDb3Jwb3JhdGlvbjEwMC4GA1UEAxMnU3ltYW50ZWMg
// SIG // VGltZSBTdGFtcGluZyBTZXJ2aWNlcyBDQSAtIEcyAhAO
// SIG // z/Q4yP6/NW4E2GqYGxpQMAkGBSsOAwIaBQCgXTAYBgkq
// SIG // hkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJ
// SIG // BTEPFw0xNDA2MDUwNDM5MTVaMCMGCSqGSIb3DQEJBDEW
// SIG // BBT3jGFHLOWIiAekOl5Xv/bjHDwLsDANBgkqhkiG9w0B
// SIG // AQEFAASCAQAC+X59TsMQX+APhJ6hAbm6I3tOnTjH7Wb7
// SIG // nMkyhHehecnfDuN1Q17i2FhqPBHsX7JU5NGwD+/Dblc3
// SIG // x++RcFeikztUaNFQzmHyuirEuWbNOfsOpQq3YqQQ9Eju
// SIG // xfGCWmawtrD5TiMq3Y07hAFYG4HgpkxAyPH4nzZwlBqo
// SIG // YeShYp5mJHa0pWEkYjIKfA/mMS+gHD5Q/yL3S3uPjVx8
// SIG // wVBvxHZNAtaT2fBYd3AUA4tawpCaHgp1Ovp9soDtict7
// SIG // H0BUGW93Tv85YmSr7hRdTPMv7PoKVHDgnvUp12oQtJkq
// SIG // Dghmx1gFhg8Or3Ge2RCS7oNEwMMNIamnwAeJPkI9QX9O
// SIG // End signature block
