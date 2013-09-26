/**
 * @file
 * Javascript support of the search interface.
 */
jQuery(document).ready(function(){
    var forceStop, ids, INCREMENT;
    var resultDiv, progressDiv, table;
    var progressbar, console;
    var db;

    db = new NDDB();

    db.on('insert', function(o) {
        addResult(o, db.length);
    });

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
        var title;

        // Creating the div container.
        div = document.createElement('div');

        // Will use this id to refine search;
        div.id = "qsr_" + idx;

        div.className = 'qscience_search_result';

        // Creating 3 nested divs;
        friend = document.createElement('div');
        div.className = 'qscience_search_result_friend';

        content = document.createElement('div');
        content.className = 'qscience_search_result_content';

        actions = document.createElement('div');
        actions.className = 'qscience_search_result_actions';

        // Adding content to each div.
        friend.appendChild(document.createTextNode(data.friend));

        title = document.createElement('h2');
        title.className =  'qscience_search_result_title';
        title.appendChild(document.createTextNode(data.title));

        content.appendChild(title);
        content.appendChild(document.createTextNode(data.abstract));


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
