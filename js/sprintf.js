/**
 * # JSUS: JavaScript UtilS.
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Collection of general purpose javascript functions. JSUS helps!
 *
 * http://nodegame.github.io/JSUS/
 */

/* Taken from JSUS */

/**
 * ### JSUS.getElement
 *
 * Creates a generic HTML element with id and attributes as specified,
 * and returns it.
 *
 * @see JSUS.addAttributes2Elem
 */
JSUS.getElement = function (elem, id, attributes) {
    var e = document.createElement(elem);
    if ('undefined' !== typeof id) {
        e.id = id;
    }
    return this.addAttributes2Elem(e, attributes);
};

/**
 * ### JSUS.addElement
 *
 * Creates a generic HTML element with id and attributes as specified,
 * appends it to the root element, and returns it.
 *
 * @see JSUS.getElement
 * @see JSUS.addAttributes2Elem
 *
 */
JSUS.addElement = function (elem, root, id, attributes) {
    var el = this.getElement(elem, id, attributes);
    return root.appendChild(el);
};

/**
 * ### JSUS.addAttributes2Elem
 *
 * Adds attributes to an HTML element and returns it.
 *
 * Attributes are defined as key-values pairs.
 * Attributes 'style', and 'label' are ignored.
 *
 * @see JSUS.style
 * @see JSUS.addLabel
 */
JSUS.addAttributes2Elem = function (e, a) {
    if (!e || !a) return e;
    if ('object' != typeof a) return e;
    var specials = ['id', 'label'];
    for (var key in a) {
        if (a.hasOwnProperty(key)) {
            if (!JSUS.in_array(key, specials)) {
                e.setAttribute(key,a[key]);
            } else if (key === 'id') {
                e.id = a[key];
            }

            // TODO: handle special cases
            // <!--
            //                else {
            //
            //                    // If there is no parent node, the legend cannot be created
            //                    if (!e.parentNode) {
            //                        node.log('Cannot add label: no parent element found', 'ERR');
            //                        continue;
            //                    }
            //
            //                    this.addLabel(e.parentNode, e, a[key]);
            //                }
            // -->
        }
    }
    return e;
};


/**
 * ### JSUS.sprintf
 *
 * Builds up a decorated HTML text element
 *
 * Performs string substitution from an args object where the first
 * character of the key bears the following semantic:
 *
 * 	- '@': variable substitution with escaping
 * 	- '!': variable substitution without variable escaping
 *  - '%': wraps a portion of string into a _span_ element to which is possible
 *  		to associate a css class or id. Alternatively, it also possible to
 *  		add in-line style. E.g.:
 *
 * ```javascript
 * 	sprintf('%sImportant!%s An error has occurred: %pre@err%pre', {
 * 		'%pre': {
 * 			style: 'font-size: 12px; font-family: courier;'
 * 		},
 * 		'%s': {
 * 			id: 'myId',
 * 			'class': 'myClass',
 * 		},
 * 		'@err': 'file not found',
 * 	}, document.body);
 * ```
 *
 * @param {string} string A text to transform
 * @param {object} args Optional. An object containing the spans to apply to the string
 * @param {Element} root Optional. An HTML element to which append the string. Defaults, a new _span_ element
 *
 */
JSUS.sprintf = function(string, args, root) {

    var text, textNode, span, idx_start, idx_finish, idx_replace, idxs;
    var tmp, spans, key, i;

    // If no formatting arguments are provided, just create a string
    // and inserted into a span tag. If a root element is provided, add it.
    if (!args) {
        tmp = document.createElement('span');
        tmp.appendChild(document.createTextNode(string));
        if (!root) {
            return tmp;
        }
        else {
            return root.appendChild(tmp);
        }
    }

    root = root || document.createElement('span');
    spans = {};

    // Transform arguments before inserting them.
    for (key in args) {
	if (args.hasOwnProperty(key)) {

	    // pattern not found
	    if (idx_start === -1) continue;

	    switch(key[0]) {

	    case '%': // span

		idx_start = string.indexOf(key);
		idx_replace = idx_start + key.length;
		idx_finish = string.indexOf(key, idx_replace);

		if (idx_finish === -1) {
		    JSUS.log('Error. Could not find closing key: ' + key);
		    continue;
		}

		spans[idx_start] = key;

		break;

	    case '@': // replace and sanitize
		string = string.replace(key, escape(args[key]));
		break;

	    case '!': // replace and not sanitize
		string = string.replace(key, args[key]);
		break;

	    default:
		JSUS.log('Identifier not in [!,@,%]: ' + key[0]);

	    }
	}
    }

    // No span to creates.
    if (!JSUS.size(spans)) {
	return document.createTextNode(string);
    }

    // Re-assamble the string.

    idxs = JSUS.keys(spans).sort(function(a, b){ return a - b; });
    idx_finish = 0;
    for (i = 0; i < idxs.length; i++) {

	// add span
	key = spans[idxs[i]];
	idx_start = string.indexOf(key);

	// add fragments of string
	if (idx_finish !== idx_start-1) {
	    root.appendChild(document.createTextNode(string.substring(idx_finish, idx_start)));
	}

	idx_replace = idx_start + key.length;
	idx_finish = string.indexOf(key, idx_replace);

	span = JSUS.getElement('span', null, args[key]);

	text = string.substring(idx_replace, idx_finish);

	span.appendChild(document.createTextNode(text));

	root.appendChild(span);
	idx_finish = idx_finish + key.length;
    }

    // add the final part of the string
    if (idx_finish !== string.length) {
	root.appendChild(document.createTextNode(string.substring(idx_finish)));
    }

    return root;
}