/**
 * @file
 * Javascript support of the search interface.
 */
jQuery(document).ready(function(){
    var counter = 0; var ids = "";
    (function worker() {
        $.ajax({
            url: '?q=qscience_search/get_result',
            data: { 'query_id': Drupal.settings.query_id, 'ids': ids },
            type: 'POST',
            success: function(data) {
                // debugger;
                ids = data.ids;
	        $("#qscience_d2dsearch_results").append(data.new_results);
	        counter += 5;
	        $("#qscience_d2dsearch_progress")
                    .html("This search " + counter + "% done.");
            },
            error: function() {
                // debugger;
                //alert('failure');
	        counter = 100;
	        $("#qscience_d2dsearch_progress")
                    .html("This search " + counter + "% done.");
	    },
            complete: function() {
                // debugger;
                // Schedule the next request when the current one's complete
	        if (counter < 100) {
      	            setTimeout(worker, 500);
	        }
            }
        });
    })()
});
