/**
 * @file
 * Javascript support of the search interface.
 */
jQuery(document).ready(function(){
    // Base_path and QScience_search path as taken from Drupal.
    var BASE_PATH, MODULE_PATH;
    // The url of my instance (to check which results are local)
    var MY_INSTANCE;
    // The type of search (local, friends, friends of friends, flood)
    var SEARCH_TYPE;
    // Elements in the page.
    var resultDiv, progressDiv, progressbar, console, header;
    // Abstract parts and the max length of its first part.
    var abs1, ab2, ABS_MAX_LENGTH;
    // The hide console button.
    var hideconsole;
    // Elements in the header.
    var displayed, duplicates, found;
    // Counts elements duplicates and elements displayed.
    var countDuplicates, countDisplayed;
    // Elements of pagination.
    var paginator, prev_results, next_results, pages;
    // Last added page, and currently displayed page.
    var curLastPage, curDisplayedPage;
    // Minimal Levenshtein distance for two papers to be similar.
    var MIN_LEV_DIST;
    // NDDB database of pages, and results;
    var db, pagesDB;
    // How many results to display per page
    var displayN;
    // Button to open the jQuery dialog to import a paper.
    var importPaper;
    // Input elements of the jQuery dialog.
    var dlg, dlgAuthors, dlgAbstract, dlgTitle, dlgAuthor1, dlgYear;
    var dlgJournal, dlgLink, dlgErrors;
    // The jQuery input box for authors in the dialog.
    var authorTokenInput;
    // Year (usefule for validation).
    var YEAR;
    // Clean Url, module url.
    var CLEAN_URL, MODULE_URL;

    // Creating Pages database.
    pagesDB = new NDDB({
        update: { indexes: true }
    });
    pagesDB.index('page', function(o) {
        return o.page;
    });
    // Creating Results database.
    db = new NDDB({
        update: { indexes: true }
    });
    db.on('insert', function(o) {
        var idxExisting;
        o.idx = db.length;
        o.similar = [];
        o.div = createResultDiv(o, db.length);

        // Is this already existing ?
        idxExisting = isSamePub(o.idx, o.title);
        if (idxExisting === -1) {
            o.newResult = true;
            log('info', o.friend_url + ': new result added.');
        }
        else {
            o.newResult = false;
            db.idx.update(idxExisting, {
                similar: o.idx,
                div: o.div
            });
            log('info', o.friend_url + ': similar result found.');
            countDuplicates++;
        }
    });

    db.on('update', function(o, update) {
        var friendCountSpan, parentDiv, childDiv;
        if ('undefined' === typeof update.similar) return;
        // Update.similar must be an array containing all previous similar items.
        o.similar.push(update.similar);
        update.similar = o.similar;
        childDiv = update.div;
        delete update.div;

        if (o.title === 'Flache A (2002) Learning dynamics in social dilemmas.') {
            //debugger;
        }

        // The updated object o contains the id of the div to update.
        //friendCountSpan = document.getElementById('qsr_friend_more_' + o.idx);
        friendCountSpan = o.div.childNodes[2].childNodes[1];
        if (friendCountSpan) {
            friendCountSpan.innerHTML = '+' + o.similar.length;
            friendCountSpan.style.display = '';
            //parentDiv = document.getElementById('qsr_similar_' + o.idx);
            parentDiv = o.div.childNodes[4];
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
    db.view('appended', function(o) {
        return o.appended;
    });

    // Init constants.
    BASE_PATH = Drupal.settings.basePath;
    MODULE_PATH = BASE_PATH + Drupal.settings.installFolder;
    MY_INSTANCE = Drupal.settings.my_instance;
    SEARCH_TYPE = Drupal.settings.searchType;
    CLEAN_URL = Drupal.settings.clean_url === "1";
    MODULE_URL = BASE_PATH  + (CLEAN_URL ? '' : '?q=') + 'qscience_search/';
    ABS_MAX_LENGTH = 100;
    INCREMENT = 10;
    MIN_LEV_DIST = 5;
    YEAR = new Date().getFullYear()

    // Init other variables.

    // How many results display in the page.
    displayN = 100;
    countDisplayed = 0;
    countDuplicates = 0;
    curLastPage = 0;
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

    next_results = document.getElementById('next_results');
    prev_results = document.getElementById('prev_results');

    next_results.onclick = function() {
        pageClicked((curDisplayedPage + 1));
    };
    prev_results.onclick = function() {
        pageClicked((curDisplayedPage - 1));
    };

    pages = document.getElementById('pages');

    // Making hidden elements visible.
    myConsole = document.getElementById('console');
    myConsole.style.display = '';

    hideconsole = document.getElementById('hideconsole');
    hideconsole.style.display = '';

    header.style.display = '';

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

    paginator = document.getElementById('paginator');
    paginator.style.display = '';

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

    // Elements of the jQuery dialog.
    dlg = document.getElementById('qsr_dialog-form');
    dlgErrors = document.getElementById('qsr_dialog-form_errors');
    dlgAuthors = document.getElementById('qsr_import_paper_authors');
    dlgAbstract = document.getElementById('qsr_import_paper_abstract');
    dlgTitle = document.getElementById('qsr_import_paper_title');
    dlgAuthor1 = document.getElementById('qsr_import_paper_author_1');
    dlgYear = document.getElementById('qsr_import_paper_year');
    dlgJournal = document.getElementById('qsr_import_paper_journal');
    dlgLink = document.getElementById('qsr_import_paper_link');

    // Autocomplete in jQuery dialog
    function split( val ) {
        return val.split( /,\s*/ );
    }
    function extractLast( term ) {
        return split( term ).pop();
    }

    authorTokenInput = jQuery("#qsr_import_paper_author_1").tokenInput(
        MODULE_URL + 'autocomplete_author', {
            queryParam: 'term',
            //searchDelay: 2000,
            //minChars: 4,
            preventDuplicates: true,
            hintText: "Type something to start autocomplete",
            noResultsText: "No results :(",
            searchingText: "Searching...",
            onResult: function(data) {
                //debugger;
                return (data);

                var titles = [];
                for (var i = 0; i < data.length; i++) {
                    titles.push(data[i].title);
                }
                return (titles);
            }
        }
    );

    // Creating the jQuery dialog.
    jQuery( "#qsr_dialog-form" ).dialog({
        autoOpen: false,
        height: 500,
        width: 600,
        modal: true,
        buttons: {
            "Import paper": function() {
                var paper, i, len, args, valid, authors;
                valid = true, authors = [];
                // Clear previous errors.
                resetDialogErrors()
                // Validate input.
                if (dlgYear.value.length !== 4) {
                    JSUS.sprintf('year must have 4 digits.', null, dlgErrors);
                    valid = false;
                }
                if (isNaN(parseInt(dlgYear.value))) {
                    JSUS.sprintf('invalid year.', null, dlgErrors);
                    valid = false;
                }
                if (dlgYear.value < 0) {
                    JSUS.sprintf('year cannot be negative.', null, dlgErrors);
                    valid = false;
                }
                if (dlgTitle.value.trim().length < 3) {
                    JSUS.sprintf('invalid or missing title.', null, dlgErrors);
                    valid = false;
                }
                if (dlgJournal.value.trim().length < 3) {
                    JSUS.sprintf('invalid or missing journal.', null, dlgErrors);
                    valid = false;
                }

                authors = authorsTokenInput('get');

                if (!authors.length) {
                    JSUS.sprintf('insert at least one valid author.', null,
                                 dlgErrors);
                    valid = false;
                }
                else {
                    dlgErrors.style.display = '';
                    jQuery(dlg).scrollTop();
                }


                if (valid) {
                    paper = {};
                    // Taking the information from the displayed form.
                    paper.title = dlgTitle.value;
                    paper.authors = authors;
                    paper.year = dlgYear.value;
                    paper.link = dlgLink.value;
                    paper.journal = dlgJournal.value;
                    paper.abstractField = dlgAbstract.innerHTML;

                    jQuery.ajax({
                        url: MODULE_URL + 'import_paper',
                        data: { 'paper': JSON.stringify(paper) },
                        type: 'POST',
                        success: function(data) {
                            var importButton, idxPaper;
                            if (data.success) {
                                log('info', 'paper added to local database');
                                idxPaper = jQuery("#qsr_dialog-form").data('idxPaper')
                                importButton = document.getElementById('qsr_action_import_' + idxPaper);
                                importButton.onclick = null;
                                importButton.src = MODULE_PATH + 'images/added.png';
                                importButton.alt = 'Paper already added to local database.';
                                importButton.title = 'Paper already added to local database.';
                                alert('success!');
                                jQuery( "#qsr_dialog-form" ).dialog( "close" );
                            }
                            else {
                                log('error', 'failed to add paper to local database');
                                alert('fail: ' + data.message);
                            }

                        },
                        error: function() {
                            // debugger;
                            alert('generic failure');
	                }
                    });
                }
                else {

                }
            },
            Cancel: function() {
                jQuery( this ).dialog( "close" );
            }
        },
        close: function() {
            resetDialogErrors();
        }
    });

    function resetDialogErrors() {
        jQuery(dlgErrors).empty();
        dlgErrors.style.display = 'none';
        JSUS.sprintf('Submission errors:', null, dlgErrors);
    }


    function addAuthortoPaperBox(idx) {
        var label, input;
        input = document.createElement('input');
        input.type = 'text';
        input.id = 'qsr_import_paper_author_' + idx;
        input.className = "text ui-widget-content ui-corner-all";
        label = document.createElement('label');
        label['for'] = input.id;
        dlgAuthors.appendChild(label);
        dlgAuthors.appendChild(input);
    }

    function displayAddPaperBox(paper) {
        var authorCountDiff, i, len;
        var paperAuthors, paperInputs;
        dlgAbstract.value = paper.abstractField || '';
        dlgTitle.value = paper.title || '';
        dlgYear.value = paper.year || '';
        dlgJournal.value = paper.journal || '';
        dlgLink.value = paper.link || '';

        // Clear last selection.
        authorTokenInput.tokenInput('clear');
        // Populate with authors

        jQuery.ajax({
            url: MODULE_URL + 'resolve_authors',
            data: { 'authors': JSON.stringify(paper.authors) },
            type: 'POST',
            success: function(data) {
                var i, len, notFound, notFoundStr;
                notFoundStr = 'The following authors could not be resolved, please add them manually:';
                i = -1, len = paper.authors.length;
                for ( ; ++i < len ; ) {
                    if (data[paper.authors[i]]) {
                        authorTokenInput.tokenInput('add', {
                            id: data[paper.authors[i]],
                            name: paper.authors[i]
                        });
                    }
                    else {
                        notFoundStr += ' ' + i;
                        notFound = true;
                    }
                }
                if (notFound) {
                    alert(notFoundStr);
                }
            },
            error: function() {
                // debugger;
                alert('generic failure');
	    }
        });

        jQuery( "#qsr_dialog-form" )
            .data('idxPaper', paper.idx)
            .dialog( "open" );

    }


    function displayResults() {
        if (db.db.length >= displayN) {
            // We cannot append them directly before the above condition is met
            // because object is not yet inserted in db, and object.div is not
            // sync with the browser document.

            if (db.db.length % displayN === 0) {
                // Indexes are not build on first insert, so let's do it now.
                if (db.db.length === displayN) {
                    // pagesDB.rebuildIndexes();
                    displayLot(JSUS.seq(0, displayN - 1));
                }
                curLastPage = addPage(curLastPage, displayN);
            }
        }

        // Update header. 'displayed' was already updated, and db + 1 because
        // this element has not yet been inserted.
        updateHeader({
            found: (db.db.length + 1),
            duplicates: countDuplicates,
        });
    }

    function pageClicked(pageId) {
        var lastPage;

        next_results.style.display = '';
        prev_results.style.display = '';

        if (pageId === 1) {
            prev_results.style.display = 'none';
        }
        else if (pageId === curLastPage) {
            next_results.style.display = 'none';
        }

        // Re-set the last page as clickable.
        lastPage = pagesDB.page.get(curDisplayedPage);
        lastPage.span.className = '';
        lastPage.span.onclick = function() {
            pageClicked(lastPage.page);
        };

        // Make the new page non-clickable.
        page = pagesDB.page.get(pageId);
        page.span.className = 'curPage';
        page.span.onclick = null;

        // Set the new page as the current displayed page.
        curDisplayedPage = pageId;

        // Update display.
        displayLot(page.ids, true);

        // Scroll Up.
        resultDiv.scrollTop = 0;
        jQuery( resultDiv ).scrollTop();
    }

    function addPage(curLastPage, range) {
        var page, newLastPage, ids, from, to;
        // Making the next_result like visible in any case.
        next_results.style.display = '';
        // Computing ranges.
        newLastPage = curLastPage + 1;
        from = curLastPage * range;
        to = (newLastPage * range) - 1;
        ids = JSUS.seq(from, to);
        // Creating element.
        page = document.createElement('span');
        page.id = "page_" + newLastPage;
        if (curLastPage === 0) {
            // not clickable.
            page.className = 'curPage';
            // currently displayed.
            curDisplayedPage = newLastPage;
        }
        else {
            page.onclick = function() {
                pageClicked(newLastPage);
            }
        }
        page.appendChild(document.createTextNode(newLastPage));
        pages.appendChild(page);
        pagesDB.insert({
            span: page,
            ids: ids,
            page: newLastPage
        });
        return newLastPage
    }

    function displayLot(ids, only) {
        var i, len, appended;
        only = only || false;

        // TODO: there might be an overlap between new elements and old
        // elements. In this case, we should not remove such elements
        // and re-add them again.

        // Hiding currently displayed elements.
        if (only) {
            appended = db.appended.db;
            i = -1, len = appended.length;
            for ( ; ++i < len ; ) {
                makeResultInvisible(appended[i]);
            }
        }
        // Showing the new elements;
        i = -1, len = ids.length;
        for ( ; ++i < len ; ) {
            makeResultVisible(db.idx.get(ids[i]));
        }
    }

    function makeResultVisible(o) {
        if (!o.appended) {
            resultDiv.appendChild(o.div);
            db.idx.update(o.idx, { appended: true });
            // Update header.
            updateHeader({
                displayed: ++countDisplayed
            });
        }
    }

    function makeResultInvisible(o) {
        if (o.appended) {
            try {
                resultDiv.removeChild(o.div);
                db.idx.update(o.idx, { appended: false });
                // Update header.
                updateHeader({
                    displayed: --countDisplayed
                });
            }
            catch(e) {
                log('error', e);
            }
        }

    }

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
        if (e.style.display === 'block') {
            e.style.display = 'none';
            dots.innerHTML = '(...)';
        }
        else {
            e.style.display = 'block';
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

    function createResultDiv(data, idx) {
        var div, iconSide, friend, content, actions, similar;
        var paperIcon;
        var friendLink, moreFriends, duplicatedTextSpan;
        var title, underTitle, authors, journal, authorsString, abstractField;
        var abs1, abs2, dots;
        var sameDiv, sameFriend, sameFriendSpan;
        var i, len;

        // Creating the div container.
        div = document.createElement('div');

        // Will use this id to refine search;
        div.id = "qsr_" + idx;

        div.className = 'qscience_search_result';

        // Creating all divs;
        iconSide = document.createElement('span');
        iconSide.className = 'qscience_search_result_iconside';
        iconSide.id = 'qsr_iconside_' + idx;

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

        // IconSide.
        paperIcon = document.createElement('img');
        paperIcon.id = 'qsr_papericon_' + idx;
        paperIcon.src = MODULE_PATH + 'images/paper2.png';
        iconSide.appendChild(paperIcon);

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
        }
        else {
            abstractField.appendChild(document.createTextNode(data.abstractField));
        }

        // Adding title, underTitle, and abstract to main content div.
        content.appendChild(title);
        content.appendChild(document.createElement('br'));
        content.appendChild(underTitle);
        content.appendChild(document.createElement('br'))
        content.appendChild(abstractField);

        // Similar.
        duplicatedTextSpan = document.createElement('span');
        duplicatedTextSpan.className = 'duplicatedText';
        duplicatedTextSpan.appendChild(document.createTextNode('Duplicated results:'));
        similar.appendChild(duplicatedTextSpan);

        // Actions.
        if (data.friend_url !== MY_INSTANCE) {
            importPaper = document.createElement('img');
            importPaper.id = "qsr_action_import_" + idx;
            importPaper.src = MODULE_PATH + 'images/add.png';
            importPaper.alt = "Import paper in local database.";
            importPaper.title = "Import paper in local database.";
            importPaper.onclick = function() {
                displayAddPaperBox(data, idx);
            }
            actions.appendChild(importPaper);
        }
        // Add all divs to resultDiv.
        div.appendChild(iconSide);

        div.appendChild(actions);
        div.appendChild(friend);
        div.appendChild(content);
        div.appendChild(similar);

        return div;
    }

    // jQuery worker for AJAX requests.

    log('info', SEARCH_TYPE + ' search started...');

    function worker() {
        jQuery.ajax({
            url: MODULE_URL + 'get_result',
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
                    displayResults();
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
                }
            }
        });
    }

    // Start search.
    worker();
});
