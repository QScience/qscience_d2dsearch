<?php
/**
 * @file
 *
 * Builds and displays the necessary forms for the search page.
 */

define('QSCIENCE_D2DSEARCH_MAX_QUERY_LENGTH', 64);

/**
 * Menu callback; builds the search page.
 */
function qscience_d2dsearch_main() {
  drupal_set_title('QScience D2D Search');
  drupal_add_css(drupal_get_path('module', 'qscience_d2dsearch') . '/css/qscience_d2dsearch.css');

  $build['main'] = array(
    '#title' => t('Search for papers in your friends network.'),
    '#type' => 'fieldset',
  );

  // If there are no friends, disable the search. (TODO: keep local search only).
  $friends = d2d_api_friend_get();
  if (empty($friends)) {
    drupal_set_message(t('QScience Search disabled.'), 'warning');
    $build['main']['disabled'] = array(
      '#prefix' => t('<strong>Warning! Search disabled</strong>.</br><div id="discoverd2d">'),
      '#markup' => t('<span "whatsup">You have no friends :(</span> Explore the QScience network, and find relevant communities and new QScience instances in the <a href="@d2dserver" target="_blank">D2D Server</a>.', array('@d2dserver' => url('http://d2d.inn.ac'))),
      '#suffix' => '</div>',
    );
    return $build;
  }

  $build['main'][] = drupal_get_form('qscience_d2dsearch_form_search');

  $addPaperBox = <<<HEREDOC
<div id="qsr_dialog-form" title="Import paper" style="display: none">
<span id="qsr_dialog-form_errors" style="display: none"></span>
<label for="title">Title</label>
<input type="text" name="qsr_import_paper_title" id="qsr_import_paper_title" class="text ui-widget-content ui-corner-all" />
<span id="qsr_import_paper_authors">
<label for="qsr_import_paper_author">Author/s</label>
<input type="text" id="qsr_import_paper_author" value="" class="text ui-widget-content ui-corner-all" />
</span>
<label for="qsr_import_paper_journal">Journal</label>
<input type="text" id="qsr_import_paper_journal" class="text ui-widget-content ui-corner-all"/>
<label for="qsr_import_paper_year">Year (4 digits)</label>
<input type="text" id="qsr_import_paper_year" maxlength="4" class="text ui-widget-content ui-corner-all"/>
<label for="qsr_import_paper_link">External Link</label>
<input type="text" id="qsr_import_paper_link" class="text ui-widget-content ui-corner-all"/>
<label for="qsr_import_paper_abstract">Abstract</label>
<textarea id="qsr_import_paper_abstract" class="text ui-widget-content ui-corner-all"></textarea>
</div>
HEREDOC;

  $build['results'] = array(
    '#prefix' => $addPaperBox,
    '#markup' => '<div id="progressbar" style="display: none"><div class="progress-label">Search started...</div></div><div id="console" style="display: none"></div><span id="hideconsole" style="display: none"> >>hide console</span><div id="qscience_d2dsearch_results_header" style="display: none"><span id="qsr_found">Found: 0</span><span id="qsr_duplicates">Duplicates: 0</span><span id="qsr_displayed">Displayed: 0</span></div><div id="qscience_d2dsearch_results"></div>',
    '#suffix' => '<div id="paginator" style="display: none"><span id="prev_results" style="display: none"><<</span><span id="pages"></span><span style="display: none" id="next_results">>></span></div>',
  );

  $path = drupal_get_path('module', 'qscience_d2dsearch');
  drupal_add_library('system', 'ui.dialog');

  return $build;
}

/**
 * Form constructor for search interface.
 */
function qscience_d2dsearch_form_search() {

  $form['search_container'] = array(
    '#type' => 'container',
    '#attributes' => array('class' => array('container-inline')),
  );

  $form['search_container']['search_string'] = array(
    '#type' => 'textfield',
    '#size' => 40,
    '#maxlength' => QSCIENCE_D2DSEARCH_MAX_QUERY_LENGTH,
    '#required' => TRUE,
  );

  $form['search_container']['search_type'] = array(
    '#type' => 'select',
    '#options' => array(
      'local_only' => t('Local only'),
      //'single_friend' => t('Single Friend'),
      'friends' => t('Friends'),
      'friends_of_friends' => t('Friends of Friends'),
      'flood' => t('Flood Search'),
    ),
    '#default_value' => 'friends',
    '#required' => TRUE,
  );


  /*
  $form['search_container']['content_type'] = array(
    '#type' => 'select',
    //'#title' => t('Content type.'),
    '#options' => array(
      'papers' => t('Papers'),
      'news' => t('News'),
    ),
    '#default_value' => 'papers',
    '#required' => TRUE,
  );
  */

  $form['search_container']['submit'] = array(
    '#type' => 'submit',
    '#value' => t('Search'),
  );

  $form['advanced'] =  array(
    '#title' => t('Advanced options.'),
    '#type' => 'fieldset',
    '#collapsible' => TRUE,
    '#collapsed' => TRUE,
  );

  $form['advanced']['no_local_search'] = array(
    '#type' => 'checkbox',
    '#title' => t('Do not perform local search'),
    '#description' => t('Duplicates with entries in local database will not be detected.'),
    '#default_value' => 0,
  );

  $form['advanced']['date_container'] = array(
    '#type' => 'container',
    //'#attributes' => array('class' => array('container-inline')),
  );

  $form['advanced']['date_container']['date_from'] = array(
    '#type' => 'date',
    '#title' => t('From'),
    //'#description' => t('Include only content created after this date.'),
    '#default_value' => array(
      'year' => 1970,
      'month' => 1,
      'day' => 1,
    ),
    '#required' => TRUE,
  );

  $form['advanced']['date_container']['date_to'] = array(
    '#type' => 'date',
    '#title' => t('To'),
    //'#description' => t('Include in the search results content created up to this date.'),
    '#required' => TRUE,
  );

  return $form;
}

/**
 * Form validation handler for qscience_d2dsearch_form_search().
 */
function qscience_d2dsearch_form_search_validate($form, &$form_state) {

  // TODO put only in network search mode ?
//  if (isset($form_state['values']['search_string']) &&
//    strlen($form_state['values']['search_string']) < 3) {
//    form_set_error('search_string', t('Please type at least 3 charachters as search string.'));
//  }

  $fromArray = $form_state['values']['date_from'];
  $fromTS = mktime(0, 0, 0,
            intval($fromArray['month']),
            intval($fromArray['day']),
            intval($fromArray['year']));

  $now = time();
  if ($fromTS > $now) {
    form_set_error('date_from', t('From date cannot be in the future.'));
  }

  $toArray = $form_state['values']['date_to'];
  $toTS = mktime(24, 0, 0, $toArray['month'], $toArray['day'], $toArray['year']);

  if ($fromTS > $toTS) {
    form_set_error('to_from', t('To date cannot preceed From date.'));
  }

  $form_state['values']['date_from'] = $fromTS;
  $form_state['values']['date_to'] = $toTS;

  if ($form_state['values']['no_local_search']
      && $form_state['values']['search_type'] === 'local_only') {
      form_set_error('no_local_search',
                     t('Conflicting options selected. Search aborted.'));
  }
}

/**
 * Form submission handler for qscience_d2dsearch_form_search().
 */
function qscience_d2dsearch_form_search_submit($form, &$form_state) {
  $query_array = array(
    'search_string' => $form_state['values']['search_string'],
    //'content_type' => $form_state['values']['content_type'],
    'content_type' => 'papers',
    'search_type' => $form_state['values']['search_type'],
    'date_from' => $form_state['values']['date_from'],
    'date_to' => $form_state['values']['date_to'],
  );

  $imploded_query = d2d_implode($query_array);
  if ($imploded_query === FALSE) {
    drupal_set_message(t('An error occurred while preparing the query to send out. Search aborted.',
                         'error'));
    return;
  }

  switch ($form_state['values']['search_type']) {
  case 'local_only':
      $friends = array();
      $n_hops = 0;
      break;
  case 'friends':
      $friends = NULL;
      $n_hops = 1;
      break;
  case 'friends_of_friends':
      $friends = NULL;
      $n_hops = 2;
      break;
  case 'flood':
      $friends = NULL;
      $n_hops = NULL;
  }

  $do_local_search = !check_plain($form_state['values']['no_local_search']);
  // Local search always performed.
  $query_id = d2dsearch_query_start('qscience_d2dsearch_papers',
                                    $imploded_query,
                                    $friends,
                                    $n_hops,
                                    $do_local_search
  );

  if (!_d2dsearch_check_query_id($query_id)) {
    drupal_set_message(t('Failed performing search.'));
  }
  else {
    $form_state['rebuild'] = TRUE;
    $installFolder = drupal_get_path('module','qscience_d2dsearch').'/';
    $path = drupal_get_path('module', 'qscience_d2dsearch');
    $my_instance = d2d_api_own_instance_get();
    $my_url = substr($my_instance['url'], 0,
                     strpos($my_instance['url'], 'xmlrpc.php'));

    drupal_add_library('system', 'ui.progressbar');
    drupal_add_library('system', 'ui.autocomplete');
    drupal_add_js(array(
      'query_id' => $query_id,
      'installFolder' => $installFolder,
      'my_instance' => $my_url,
      'searchType' => $form_state['values']['search_type'],
      'clean_url' => variable_get('clean_url', 0),
    ), 'setting');
    drupal_add_js($path . '/js/levenshtein.js');
    drupal_add_js($path . '/js/nddb-full.js');
    drupal_add_js($path . '/js/sprintf.js');
    // Token-input library.
    drupal_add_css($path . '/css/token-input.css');
    drupal_add_js($path . '/js/jquery.tokeninput.js');
    // The search script.
    drupal_add_js($path . '/js/search.js');
  }
}


/**
 * Menu callback; output the results of a search as a JSON object.
 *
 * @see _qscience_d2dsearch_get_new_results()
 */
function qscience_d2dsearch_get_results() {
  $ids_displayed = '';
  $new_results = '';
  if (isset($_POST['query_id'])) {
    $query_id = check_plain($_POST['query_id']);
    if (_d2dsearch_check_query_id($query_id)) {
      if (isset($_POST['ids'])) {
        $ids = check_plain($_POST['ids']);
      }
      else {
        $ids = '';
      }
      $ids = d2d_explode($ids);
      if ($ids === FALSE) {
        $ids = array();
      }
      $new_results = _qscience_d2dsearch_get_new_results($query_id, $ids);
      $ids_displayed = d2d_implode($ids);
    }
  }
  drupal_json_output(array(
    'ids' => $ids_displayed,
    'new_results' => $new_results,
  ));
}

/**
 * Fetches and formats new results that have been asyncronously added to db.
 *
 * @param string $query_id
 *   The id of the query of interest.
 * @param array $ids
 *   Array of ids of results already fetched.
 *
 * @return string $output
 *   Formatted output string to be sent out.
 */
function _qscience_d2dsearch_get_new_results($query_id, &$ids) {
  if (!_d2dsearch_lock_acquire('d2dsearch_query_cache', D2DSEARCH_ACQUIRE_TIMEOUT)) {
    return;
  }

  $db_result = db_query('SELECT qid as qid, instance_id as instance_id FROM {d2dsearch_query_cache} WHERE query_id=:query_id', array(':query_id' => $query_id));
  if ($record = $db_result->fetchObject()) {
    $qid = $record->qid;
  }
  else {
    $qid = NULL;
  }
  lock_release('d2dsearch_query_cache');
  if (is_null($qid)) {
    return '' ;
  }
  if (!_d2dsearch_lock_acquire('d2dsearch_result_cache', D2DSEARCH_ACQUIRE_TIMEOUT)) {
    return '';
  }
  if (empty($ids)) {
    $result = db_query('SELECT id, instance_id, result, timestamp FROM {d2dsearch_result_cache} WHERE qid=:qid', array(':qid' => $qid));
  }
  else {
    $result = db_query('SELECT id, instance_id, result, timestamp FROM {d2dsearch_result_cache} WHERE qid=:qid AND id NOT IN (:ids)', array(':qid' => $qid, ':ids' => $ids));
  }
  $records = $result->fetchAll();
  if (empty($records)) {
    return '';
  }
  $out = array();
  foreach ($records as $record) {
    $ids[] = $record->id;
    $results = d2d_explode($record->result);
    if ($results === FALSE) {
      continue;
    }
    foreach ($results as $result) {
      $exploded_result = d2d_explode($result);
      if ($exploded_result !== FALSE) {
        $check = d2d_check_array($exploded_result, array(
          'friend' => 'is_string',
          'friend_url' => 'is_string',
          'title' => 'is_string',
          'abstractField' => 'is_string',
          'authors' => 'is_string',
          'journal' => 'is_string',
          'time' => 'd2d_check_convert_int',
        ));
        if (!$check) {
          watchdog('qscience_d2dsearch', 'Received malformed result: ' . $result);
          continue;
        }

        // Exploding authors.
        $exploded_authors = d2d_explode($exploded_result['authors']);
        if ($exploded_authors !== FALSE) {
            $exploded_result['authors'] = $exploded_authors;
        }
        else {
            $exploded_result['authors'] = array();
        }

        $out[] = $exploded_result;
      }
    }
  }
  return $out;
}

///**
// * Implements hook_theme().
// */
//function qscience_d2dsearch_theme() {
//	return array(
//		'qscience_d2dsearch_form_search' => array(
//			'render element' => 'form'
//		),
//	);
//}
//
///**
// * Theme function.
// *
// * The theme function has the same name as the form,
// * so will automatically be called when rendering the form.
// */
//function theme_qscience_d2dsearch_form_search($variables) {
//	// Isolate the form definition form the $variables array
//	$form = $variables['form'];
//	$output = '<h2>' . t('Please enter your information below') . '</h2>';
//	// Put the entire structure into a div that can be used for
//	// CSS purposes
//	$output .= '<div id="qscience_d2dsearch_main_form">';
//  $output .= '<div id="qscience_d2dsearch_searchbar">';
//	$output .= drupal_render($form['search_string']);
//  $output .= '</div>';
//  $output .= '<div id="qscience_d2dsearch_centered">';
//	$output .= drupal_render($form['content_type']);
//  $output .= drupal_render($form['search_type']);
//  $output .= drupal_render($form['submit']);
//  $output .= '</div>';
//  $output .= '</div>';
//  $output .= '<div id="qscience_d2dsearch_advanced">';
//
//  $output .= '</div>';
//
//	// Pass the remaining form elements through drupal_render_children()
//	$output .= drupal_render_children($form);
//	// return the output
//	return $output;
//}
