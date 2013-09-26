/**
 * @file
 * Javascript support of the search interface.
 */
jQuery(document).ready(function(){
    var BASE_PATH;
    var forceStop, ids, INCREMENT;
    var resultDiv, progressDiv, table;
    var progressbar, console;
    var abs1, ab2, ABS_MAX_LENGTH;
    var db;

    // Creating database.
    db = new NDDB();
    db.on('insert', function(o) {
        addResult(o, db.length);
    });

    BASE_PATH = Drupal.settings.basePath;
    ABS_MAX_LENGTH = 100;
    INCREMENT = 10;
    forceStop = false;
    ids = "";

    resultDiv = document.getElementById('qscience_d2dsearch_results');

    myConsole = document.getElementById('console');
    myConsole.style.display = '';

    progressbar = jQuery( "#progressbar" );
    progressbar.toggle();

    progressLabel = jQuery( ".progress-label" );
    progressbar.progressbar({
        value: false,
        change: function() {
            progressLabel.text( progressbar.progressbar( "value" ) + "%" );
        },
        complete: function() {
            progressLabel.text( "Search completed." );
        }
    });

    function toggleAbsOld(eId, imgId) {
        var e, img;
        e = document.getElementById(eId);
        img = document.getElementById(imgId);
        if (e.style.display === 'block') {
            e.style.display = 'none';
            img.src = BASE_PATH + 'sites/all/modules/qscience_d2dsearch/images/plus.png';
        }
        else {
            e.style.display = 'block';
            img.src =  BASE_PATH + 'sites/all/modules/qscience_d2dsearch/images/minus.png';
        }
    }

    function toggleAbs(img) {
        var e, eId;
        eId = 'abs_' + img.id.substr('toggler_'.length);
        e = document.getElementById(eId);
        if (e.style.display === 'block') {
            e.style.display = 'none';
            img.src = BASE_PATH + 'sites/all/modules/qscience_d2dsearch/images/plus.png';
        }
        else {
            e.style.display = 'block';
            img.src =  BASE_PATH + 'sites/all/modules/qscience_d2dsearch/images/minus.png';
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
        var div, friend, content, actions;
        var title, abstractField;
        var toggler;

        // Creating the div container.
        div = document.createElement('div');

        // Will use this id to refine search;
        div.id = "qsr_" + idx;

        div.className = 'qscience_search_result';

        // Creating 3 nested divs;
        friend = document.createElement('div');
        friend.className = 'qscience_search_result_friend';

        content = document.createElement('div');
        content.className = 'qscience_search_result_content';

        actions = document.createElement('div');
        actions.className = 'qscience_search_result_actions';

        // Adding content to each div.
        friend.appendChild(document.createTextNode(data.friend));

        title = document.createElement('span');
        title.className = 'qscience_search_result_title';
        title.appendChild(document.createTextNode(data.title));

        abstractField = document.createElement('span');
        abstractField.className = 'qscience_search_result_abstract';

        // Display only first part of the abstract if it is too long.
        if (data.abstractField.length > ABS_MAX_LENGTH) {
            toggler = document.createElement('img');
            toggler.id = 'toggler_' + idx;
            //toggler.src = BASE_PATH + 'sites/all/qscience_d2dsearch/images/plus.png';
            toggler.src = 'http://localhost/17/sites/all/modules/qscience_d2dsearch/images/plus.png';

            abs1 = document.createElement('span');
            abs1.appendChild(document.createTextNode(
                data.abstractField.substr(0, ABS_MAX_LENGTH)));

            abs2 = document.createElement('span');
            abs2.style.display = 'none';
            abs2.id = 'abs_' + idx;
            abs2.appendChild(document.createTextNode(
                data.abstractField.substr(ABS_MAX_LENGTH)));


            toggler.onclick = function() {
                toggleAbs(this);
            };


            abstractField.appendChild(abs1);
            abstractField.appendChild(abs2);
            abstractField.appendChild(toggler);

        }
        else {
            abstractField.appendChild(document.createTextNode(data.abstractField));
        }

        content.appendChild(title);
        content.appendChild(abstractField);

        actions.appendChild(document.createTextNode('ACTIONS!'));

        div.appendChild(friend);
        div.appendChild(content);
        div.appendChild(actions);

        // Appending the new result into the result div.
        resultDiv.appendChild(div);
    }

    (function worker() {
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

                log('info', 'new data received');

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
      	            setTimeout(worker, 500);
	        }
            }
        });
    })()
});
