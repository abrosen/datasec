//fgnass.github.com/spin.js#v1.2.2
(function (window, document, undefined) {

	/**
	* Copyright (c) 2011 Felix Gnass [fgnass at neteye dot de]
	* Licensed under the MIT license
	*/

	var prefixes = ['webkit', 'Moz', 'ms', 'O'], /* Vendor prefixes */
      animations = {}, /* Animation rules keyed by their name */
      useCssAnimations;

	/**
	* Utility function to create elements. If no tag name is given,
	* a DIV is created. Optionally properties can be passed.
	*/
	function createEl(tag, prop) {
		var el = document.createElement(tag || 'div'),
        n;

		for (n in prop) {
			el[n] = prop[n];
		}
		return el;
	}

	/**
	* Inserts child1 before child2. If child2 is not specified,
	* child1 is appended. If child2 has no parentNode, child2 is
	* appended first.
	*/
	function ins(parent, child1, child2) {
		if (child2 && !child2.parentNode) ins(parent, child2);
		parent.insertBefore(child1, child2 || null);
		return parent;
	}

	/**
	* Insert a new stylesheet to hold the @keyframe or VML rules.
	*/
	var sheet = (function () {
		var el = createEl('style');
		ins(document.getElementsByTagName('head')[0], el);
		return el.sheet || el.styleSheet;
	})();

	/**
	* Creates an opacity keyframe animation rule and returns its name.
	* Since most mobile Webkits have timing issues with animation-delay,
	* we create separate rules for each line/segment.
	*/
	function addAnimation(alpha, trail, i, lines) {
		var name = ['opacity', trail, ~ ~(alpha * 100), i, lines].join('-'),
        start = 0.01 + i / lines * 100,
        z = Math.max(1 - (1 - alpha) / trail * (100 - start), alpha),
        prefix = useCssAnimations.substring(0, useCssAnimations.indexOf('Animation')).toLowerCase(),
        pre = prefix && '-' + prefix + '-' || '';

		if (!animations[name]) {
			sheet.insertRule(
        '@' + pre + 'keyframes ' + name + '{' +
        '0%{opacity:' + z + '}' +
        start + '%{opacity:' + alpha + '}' +
        (start + 0.01) + '%{opacity:1}' +
        (start + trail) % 100 + '%{opacity:' + alpha + '}' +
        '100%{opacity:' + z + '}' +
        '}', 0);
			animations[name] = 1;
		}
		return name;
	}

	/**
	* Tries various vendor prefixes and returns the first supported property.
	**/
	function vendor(el, prop) {
		var s = el.style,
        pp,
        i;

		if (s[prop] !== undefined) return prop;
		prop = prop.charAt(0).toUpperCase() + prop.slice(1);
		for (i = 0; i < prefixes.length; i++) {
			pp = prefixes[i] + prop;
			if (s[pp] !== undefined) return pp;
		}
	}

	/**
	* Sets multiple style properties at once.
	*/
	function css(el, prop) {
		for (var n in prop) {
			el.style[vendor(el, n) || n] = prop[n];
		}
		return el;
	}

	/**
	* Fills in default values.
	*/
	function merge(obj) {
		for (var i = 1; i < arguments.length; i++) {
			var def = arguments[i];
			for (var n in def) {
				if (obj[n] === undefined) obj[n] = def[n];
			}
		}
		return obj;
	}

	/**
	* Returns the absolute page-offset of the given element.
	*/
	function pos(el) {
		var o = { x: el.offsetLeft, y: el.offsetTop };
		while ((el = el.offsetParent)) {
			o.x += el.offsetLeft;
			o.y += el.offsetTop;
		}
		return o;
	}

	/** The constructor */
	var Spinner = function Spinner(o) {
		if (!this.spin) return new Spinner(o);
		this.opts = merge(o || {}, Spinner.defaults, defaults);
	},
  defaults = Spinner.defaults = {
  	lines: 12, // The number of lines to draw
  	length: 7, // The length of each line
  	width: 5, // The line thickness
  	radius: 10, // The radius of the inner circle
  	color: '#000', // #rgb or #rrggbb
  	speed: 1, // Rounds per second
  	trail: 100, // Afterglow percentage
  	opacity: 1 / 4,
  	fps: 20
  },
  proto = Spinner.prototype = {
  	spin: function (target) {
  		this.stop();
  		var self = this,
          el = self.el = css(createEl(), { position: 'relative' }),
          ep, // element position
          tp; // target position

  		if (target) {
  			tp = pos(ins(target, el, target.firstChild));
  			ep = pos(el);
  			css(el, {
  				left: (target.offsetWidth >> 1) - ep.x + tp.x + 'px',
  				top: (target.offsetHeight >> 1) - ep.y + tp.y + 'px'
  			});
  		}
  		el.setAttribute('aria-role', 'progressbar');
  		self.lines(el, self.opts);
  		if (!useCssAnimations) {
  			// No CSS animation support, use setTimeout() instead
  			var o = self.opts,
            i = 0,
            fps = o.fps,
            f = fps / o.speed,
            ostep = (1 - o.opacity) / (f * o.trail / 100),
            astep = f / o.lines;

  			(function anim() {
  				i++;
  				for (var s = o.lines; s; s--) {
  					var alpha = Math.max(1 - (i + s * astep) % f * ostep, o.opacity);
  					self.opacity(el, o.lines - s, alpha, o);
  				}
  				self.timeout = self.el && setTimeout(anim, ~ ~(1000 / fps));
  			})();
  		}
  		return self;
  	},
  	stop: function () {
  		var el = this.el;
  		if (el) {
  			clearTimeout(this.timeout);
  			if (el.parentNode) el.parentNode.removeChild(el);
  			this.el = undefined;
  		}
  		return this;
  	}
  };
	proto.lines = function (el, o) {
		var i = 0,
        seg;

		function fill(color, shadow) {
			return css(createEl(), {
				position: 'absolute',
				width: (o.length + o.width) + 'px',
				height: o.width + 'px',
				background: color,
				boxShadow: shadow,
				transformOrigin: 'left',
				transform: 'rotate(' + ~ ~(360 / o.lines * i) + 'deg) translate(' + o.radius + 'px' + ',0)',
				borderRadius: (o.width >> 1) + 'px'
			});
		}
		for (; i < o.lines; i++) {
			seg = css(createEl(), {
				position: 'absolute',
				top: 1 + ~(o.width / 2) + 'px',
				transform: 'translate3d(0,0,0)',
				opacity: o.opacity,
				animation: useCssAnimations && addAnimation(o.opacity, o.trail, i, o.lines) + ' ' + 1 / o.speed + 's linear infinite'
			});
			if (o.shadow) ins(seg, css(fill('#000', '0 0 4px ' + '#000'), { top: 2 + 'px' }));
			ins(el, ins(seg, fill(o.color, '0 0 1px rgba(0,0,0,.1)')));
		}
		return el;
	};
	proto.opacity = function (el, i, val) {
		if (i < el.childNodes.length) el.childNodes[i].style.opacity = val;
	};

	/////////////////////////////////////////////////////////////////////////
	// VML rendering for IE
	/////////////////////////////////////////////////////////////////////////

	/** 
	* Check and init VML support
	*/
	(function () {

	try {
		var s = css(createEl('group'), {}),
		i;
		s.style.behavior = 'url(#default#VML)';
		if (!vendor(s, 'transform') && s.adj) {

			// VML support detected. Insert CSS rules ...
			for (i = 4; i--; ) sheet.addRule(['group', 'roundrect', 'fill', 'stroke'][i], 'behavior:url(#default#VML)');

			proto.lines = function (el, o) {
				var r = o.length + o.width,
		s = 2 * r;

				function grp() {
					return css(createEl('group', { coordsize: s + ' ' + s, coordorigin: -r + ' ' + -r }), { width: s, height: s });
				}

				var g = grp(),
		margin = ~(o.length + o.radius + o.width) + 'px',
		i;

				function seg(i, dx, filter) {
					ins(g,
		ins(css(grp(), { rotation: 360 / o.lines * i + 'deg', left: ~ ~dx }),
		ins(css(createEl('roundrect', { arcsize: 1 }), {
			width: r,
			height: o.width,
			left: o.radius,
			top: -o.width >> 1,
			filter: filter
		}),
		createEl('fill', { color: o.color, opacity: o.opacity }),
		createEl('stroke', { opacity: 0 }) // transparent stroke to fix color bleeding upon opacity change
		)
		)
		);
				}

				if (o.shadow) {
					for (i = 1; i <= o.lines; i++) {
						seg(i, -2, 'progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)');
					}
				}
				for (i = 1; i <= o.lines; i++) {
					seg(i);
				}
				return ins(css(el, {
					margin: margin + ' 0 0 ' + margin,
					zoom: 1
				}), g);
			};
			proto.opacity = function (el, i, val, o) {
				var c = el.firstChild;
				o = o.shadow && o.lines || 0;
				if (c && i + o < c.childNodes.length) {
					c = c.childNodes[i + o]; c = c && c.firstChild; c = c && c.firstChild;
					if (c) c.opacity = val;
				}
			};
		}
		else {
			var s = css(createEl('group'), {});
			useCssAnimations = vendor(s, 'animation');
		}
	}
	catch(e) {
		var s = css(createEl('group'), {});
		useCssAnimations = vendor(s, 'animation');
	}
		
	})();

	window.Spinner = Spinner;

})(window, document);

// SIG // Begin signature block
// SIG // MIIY/gYJKoZIhvcNAQcCoIIY7zCCGOsCAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFA0Cm8Lc6Em5
// SIG // FPMBh3agC6okD91XoIIT+DCCA+4wggNXoAMCAQICEH6T
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
// SIG // FgQURP7ngtLBVu5TqzZYT+I5lzESQzIwDQYJKoZIhvcN
// SIG // AQEBBQAEggEAkJENSHTzrafLu0N8WGOcsPPMqstXMLBa
// SIG // HXnbRv7eozkjZ8TJIdib6lCO2vEal9xi9nkTjqMhKElH
// SIG // 1kzRPh0NHt7W7KsjFSlJNOxV0ijANWGEgIRYowAbgDed
// SIG // 9KZciTMl4MkfOD/HrhMwM3JrhRkb8UZzVwBp84Wp/YzW
// SIG // 4RYk02ylsBCC0gYzyjYY1Vl1TkQ8efxniYRXoNkzoIV3
// SIG // dAnxDy208NEGYfcXLkRuD3iNKroprmUVC6agtz53l+IO
// SIG // HJdNgPW4pweFLnwRRQkpVawjJubYosFFJxBi+7hFawdI
// SIG // +j7GgVXfWTYsExmFX/GyAIKK7E7x5/Bs4U+lS8heqFgq
// SIG // hqGCAgswggIHBgkqhkiG9w0BCQYxggH4MIIB9AIBATBy
// SIG // MF4xCzAJBgNVBAYTAlVTMR0wGwYDVQQKExRTeW1hbnRl
// SIG // YyBDb3Jwb3JhdGlvbjEwMC4GA1UEAxMnU3ltYW50ZWMg
// SIG // VGltZSBTdGFtcGluZyBTZXJ2aWNlcyBDQSAtIEcyAhAO
// SIG // z/Q4yP6/NW4E2GqYGxpQMAkGBSsOAwIaBQCgXTAYBgkq
// SIG // hkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJ
// SIG // BTEPFw0xNDA2MDUwNDM5MzZaMCMGCSqGSIb3DQEJBDEW
// SIG // BBTAb62tq9RDVAE+jHD+P6DQz2QSXDANBgkqhkiG9w0B
// SIG // AQEFAASCAQCcjhvOYzCi36J6UlfwSS9rEf1rnmRuwVPR
// SIG // YKRjUumiD4kTaGLhmQVm4307Xiw+m9in0bWFgAPZZmhA
// SIG // HjXwD1/+slFtRqQQcnFkQ7fKPVwdKRu30OD/6n0Rd9SL
// SIG // hyXGjzwH28kE1nVnA7wWopVYkJAKxffZN3wkbyyK8LMd
// SIG // cDhuspSHgm3VlFk3YQMzeAr1FfrH9E3WiRitOY6p+fwd
// SIG // pABq4WJytEsb1g0N1xLpYTE/UptnfvZ56nOgteL9Znpj
// SIG // fYfx1L+mecMg6ntUKCUag9Hm2SuJmQjYs83FwGHk9Mgg
// SIG // FMR5VlFknHsJ8bevgwv2SfXxIvVrAyPsGeDp1xvDNNSL
// SIG // End signature block
