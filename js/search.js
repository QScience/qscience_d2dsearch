/**
 * @file
 * Javascript support of the search interface.
 */
jQuery(document).ready(function(){
    var BASE_PATH, MODULE_PATH;
    var ids, INCREMENT;
    var resultDiv, progressDiv, table;
    var progressbar, console, header;
    var MY_INSTANCE, SEARCH_TYPE;
    var abs1, ab2, ABS_MAX_LENGTH;
    var hideconsole;
    var displayed, duplicates, found;
    var countDuplicates, countDisplayed;
    var MIN_LEV_DIST;
    var db;

    // Creating database.
    db = new NDDB({
        update: { indexes: true }
    });
    db.on('insert', function(o) {
        o.idx = db.length;
        o.similar = [];
        addResult(o, db.length);
    });
    db.on('update', function(o, update) {
        var friendCountSpan, parentDiv, childDiv;
        if ('undefined' === typeof update.similar) return;
        // Update.similar must be an array containing all previous similar items.
        o.similar.push(update.similar);
        update.similar = o.similar;
        childDiv = update.div;
        delete update.div;

        // The updated object o contains the id of the div to update.
        friendCountSpan = document.getElementById('qsr_friend_more_' + o.idx);
        if (friendCountSpan) {
            friendCountSpan.innerHTML = '+' + o.similar.length;
            friendCountSpan.style.display = '';
            parentDiv = document.getElementById('qsr_similar_' + o.idx);
            parentDiv.appendChild(childDiv);

            friendCountSpan.onclick = function() {
                if (parentDiv.style.display === '') {
                    parentDiv.style.display = 'none';
                }
                else {
                    parentDiv.style.display = '';
                }
            }

        }
        else {
            log('error', 'could not find similar result with id: ' + o.idx);
        }
    });
    db.index('idx', function(o) {
        return o.idx;
    });

    // Init constants.
    BASE_PATH = Drupal.settings.basePath;
    MODULE_PATH = BASE_PATH + Drupal.settings.installFolder + '/';
    MY_INSTANCE = Drupal.settings.my_instance;
    SEARCH_TYPE = Drupal.settings.searchType;
    ABS_MAX_LENGTH = 100;
    INCREMENT = 10;
    MIN_LEV_DIST = 5;

    // Init other variables.

    // The list of ids (to be sent on every request).
    ids = '';
    // The number of duplicates results, according to the similarity distance.
    countDuplicates = 0;

    // Fetching existing divs and other elements.
    header = document.getElementById('qscience_d2dsearch_results_header');
    resultDiv = document.getElementById('qscience_d2dsearch_results');

    found = document.getElementById('qsr_found');
    displayed = document.getElementById('qsr_displayed');
    duplicates = document.getElementById('qsr_duplicates');

    myConsole = document.getElementById('console');
    myConsole.style.display = '';

    hideconsole = document.getElementById('hideconsole');
    hideconsole.style.display = '';

    hideconsole.onclick = function() {
        if (myConsole.style.height === '0px') {
            myConsole.style.height = '50px';
            hideconsole.innerHTML = ' >> hide console';
        }
        else {
            myConsole.style.height = '0px';
            hideconsole.innerHTML = ' >> show console';
        }
    };

    // Creating the Progress Bar.
    progressbar = jQuery( "#progressbar" );
    progressbar.toggle();

    progressLabel = jQuery( ".progress-label" );
    progressbar.progressbar({
        value: false,
        change: function() {
            progressLabel.text( progressbar.progressbar( "value" ) + "%" );
        },
        complete: function() {
            var checkAgain;
            checkAgain = document.createElement('span');
            checkAgain.id = "checkAgain";
            checkAgain.appendChild(document.createTextNode('Check again'));
            checkAgain.onclick = function() {
                // Reset progress bar status.
                progressbar.progressbar({ value: 0 });
                log('info', 'search restarted');
                worker();
            }
            progressLabel.html( "Search completed. " );
            progressLabel.append(checkAgain);
        }
    });

    function updateHeader(obj) {
        if ('undefined' !== typeof obj.found) {
            found.innerHTML = 'Found: ' + obj.found;
        }
        if ('undefined' !== typeof obj.duplicates) {
            duplicates.innerHTML = 'Duplicates: ' + obj.duplicates;
        }
        if ('undefined' !== typeof obj.displayed) {
            displayed.innerHTML = 'Displayed: ' + obj.displayed;
        }
    }

    function isSamePub(idx, title) {
        var i, len, item;
        i = 0, len = db.db.length;
        for ( ; i < len ; i++ ) {
            item = db.db[i];
            if (item.idx === idx) continue;
            if (levenshtein(title, item.title) < MIN_LEV_DIST) {
                return item.idx;
            }
        }
        return -1;
    }

    function toggleAbs(dots) {
        var e, id, dots;
        id = dots.id.substr('qsr_abs_dots_'.length);
        e = document.getElementById('abs_' + id);
        // dots = document.getElementById('_' + id);
        if (e.style.display === 'block') {
            e.style.display = 'none';
            //img.src = MODULE_PATH + 'images/plus.png';
            dots.innerHTML = '(...)';
        }
        else {
            e.style.display = 'block';
            //img.src =  MODULE_PATH + 'images/minus.png';
            dots.innerHTML = '(hide)';
        }
    }
    function progress() {
        var val = progressbar.progressbar( "value" ) || 0;
        progressbar.progressbar( "value", val + INCREMENT );
    }

    function log(level, text) {
        var args = {
            '!level': level,
            '%pre': { 'class': level }
        };
        JSUS.sprintf('%pre!level - ' + text + '%pre', args, myConsole);
        // Scroll to keep the last line always visible.
        myConsole.scrollTop = myConsole.scrollHeight
    }

    function addResult(data, idx) {
        var div, friend, content, actions, similar;
        var friendLink, moreFriends, duplicatedTextSpan;
        var title, underTitle, authors, journal, authorsString, abstractField;
        var abs1, abs2, dots, toggler;
        var idxExisting, sameDiv, sameFriend, sameFriendSpan;
        var i, len;

        // Creating the div container.
        div = document.createElement('div');

        // Will use this id to refine search;
        div.id = "qsr_" + idx;

        div.className = 'qscience_search_result';

        // Creating all divs;

        friend = document.createElement('div');
        friend.className = 'qscience_search_result_friend';
        friend.id = 'qsr_friend_' + idx;

        content = document.createElement('div');
        content.className = 'qscience_search_result_content';

        actions = document.createElement('div');
        actions.className = 'qscience_search_result_actions';

        similar = document.createElement('div');
        similar.className = 'qscience_search_result_similar';
        similar.id = 'qsr_similar_' + idx;
        similar.style.display = 'none';

        // Adding content to each div.

        // Friend.
        if (data.friend_url === MY_INSTANCE) {
            div.className = div.className + ' ' + 'my_result';
            friend.appendChild(document.createTextNode('Local result'));
        }
        else {
            friendLink = document.createElement('a');
            friendLink.href = data.friend_url;
            friendLink.target = '_blank';
            friendLink.appendChild(document.createTextNode(data.friend));
            friend.appendChild(friendLink);
        }

        // Span for similar results count.
        sameFriendSpan = document.createElement('span');
        sameFriendSpan.id = 'qsr_friend_more_' + idx;
        sameFriendSpan.className = 'qsr_friend_more';
        sameFriendSpan.style.display = 'none';
        friend.appendChild(sameFriendSpan);

        // Content.

        // Title.
        title = document.createElement('span');
        title.className = 'qscience_search_result_title';
        title.appendChild(document.createTextNode(data.title));

        // Under title.
        underTitle = document.createElement('span');
        underTitle.className = 'qsr_underTitle';

        // Authors.
        if (data.authors.length) {
            authors = document.createElement('span');
            authors.className = "qsr_authors";

            authorsString = '';
            len = data.authors.length;
            for (i = 0; i < len; i++) {
                authorsString += data.authors[i];
                if (i !== (len - 1)) {
                    authorsString += ', ';
                }
            }
            // Add a separator if a journal is found.
            if (data.journal !== '') {
                authorsString += ' - ';
            }
            authors.appendChild(document.createTextNode(authorsString));
            underTitle.appendChild(authors);
        }

        // Journal.
        if (data.journal !== '') {
            journal = document.createElement('span');
            journal.className = 'qsr_journal';
            journal.appendChild(document.createTextNode(data.journal));
            underTitle.appendChild(journal);
        }

        // Abstract.
        abstractField = document.createElement('span');
        abstractField.className = 'qscience_search_result_abstract';

        // Display only first part of the abstract if it is too long.
        if (data.abstractField.length > ABS_MAX_LENGTH) {
            //toggler = document.createElement('img');
            //toggler.id = 'toggler_' + idx;
            //toggler.src = MODULE_PATH + 'images/plus.png';

            abs1 = document.createElement('span');
            abs1.appendChild(document.createTextNode(
                data.abstractField.substr(0, ABS_MAX_LENGTH)));

            dots = document.createElement('span');
            dots.id = 'qsr_abs_dots_' + idx;
            dots.className = 'qsr_abs_dots';
            dots.appendChild(document.createTextNode('(...)'));

            abs2 = document.createElement('span');
            abs2.style.display = 'none';
            abs2.id = 'abs_' + idx;
            abs2.appendChild(document.createTextNode(
                data.abstractField.substr(ABS_MAX_LENGTH)));

            dots.onclick = function() {
                toggleAbs(this);
            };

            abstractField.appendChild(abs1);
            abstractField.appendChild(abs2);
            abstractField.appendChild(dots);
            // abstractField.appendChild(toggler);
        }
        else {
            abstractField.appendChild(document.createTextNode(data.abstractField));
        }

        // Adding title, underTitle, and abstract to main content div.
        content.appendChild(title);
        content.appendChild(underTitle);
        content.appendChild(abstractField);

        // Similar.
        duplicatedTextSpan = document.createElement('span');
        duplicatedTextSpan.className = 'duplicatedText';
        duplicatedTextSpan.appendChild(document.createTextNode('Duplicated results:'));
        similar.appendChild(duplicatedTextSpan);

        // Actions.
        actions.appendChild(document.createTextNode('ACTIONS!'));

        div.appendChild(friend);
        div.appendChild(content);
        div.appendChild(actions);
        div.appendChild(similar);

        // Is this already existing ?
        idxExisting = isSamePub(idx, data.title);
        if (idxExisting === -1) {
            // Appending the new result into the result div.
            resultDiv.appendChild(div);
            log('info', data.friend_url + ': new result added.');
            updateHeader({
                found: db.db.length,
                displayed: db.db.length
            });
        }
        else {
            db.idx.update(idxExisting, {
                similar: idx,
                div: div
            });
            log('info', data.friend_url + ': similar result found.');
            updateHeader({
                found: db.db.length,
                duplicates: ++countDuplicates,
                displayed: db.db.length
            });
        }
    }

// jQuery worker for AJAX requests.

    log('info', SEARCH_TYPE + ' search started...');

    function worker() {
        jQuery.ajax({
            url: '?q=qscience_search/get_result',
            data: { 'query_id': Drupal.settings.query_id, 'ids': ids },
            type: 'POST',
            success: function(data) {
                var i, len;

                // Update the progress bar.
                progress();

                if (!data) {
                    log('error', 'no data received');
                    return;
                }
                if (!data.ids || !data.new_results) {
                    log('silly', 'no new data');
                    return;
                }
                //log(data.new_results);
                log('info', 'new data received.');

                ids = data.ids;

                len = data.new_results.length;
                for (i = 0; i < len; i++){
                    db.insert(data.new_results[i]);
                }
            },
            error: function() {
                // debugger;
                alert('failure');
	        jQuery("#qscience_d2dsearch_progress")
                    .html("This search " + counter + "% done.");
	    },
            complete: function() {
                // debugger;
                // Schedule the next request when the current one's complete
	        if (progressbar.progressbar( "value" ) < 100) {
      	            setTimeout(worker, 1000);
	        }
                else {
                    log('info', 'search completed.');
                    if (ids === '') {
                        found.innerHTML = 'No results found.';
                    }
                }
            }
        });
    }

    // Start search.
    worker();
});
