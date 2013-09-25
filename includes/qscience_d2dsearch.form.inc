<?php


/**
 * @file
 *
 * Builds and displays the necessary forms for the search page.
 */

/**

   CHECK THIS

   Drupal automatically provides path based overrides; so if the path to your
   custom page is, say, 'custom/page/path' you can create a template file called
   'page--custom--page--path.tpl.php`, which will only be used for that page.
*/

define('QSCIENCE_D2DSEARCH_MAX_QUERY_LENGTH', 64);

/**
 * Menu callback; builds the search page.
 */
function qscience_d2dsearch_main() {
  $build['main'] = array(
    '#title' => t('Search for papers, and other relevant content in your friends network.'),
    '#type' => 'fieldset',
  );

  drupal_add_css(drupal_get_path('module', 'qscience_d2dsearch') . '/css/qscience_d2dsearch.css');

  $friends = d2d_api_friend_get();

  if (empty($friends)) {
    drupal_set_message(t('QScience Search disabled.'), 'warning');
    $build['main']['disabled'] = array(
      '#prefix' => t('<strong>Warning! Search disabled</strong>.</br><div id="discoverd2d">'),
      '#markup' => t('<span "whatsup">What\'s up bro?! You have no friends!</span> Explore the QScience network, and find relevant communities and new QScience instances in the <a href="@d2dserver" target="_blank">D2D Server</a>.',
                 array('@d2dserver' => url('http://d2dplace.inn.ac'))),
      '#suffix' => '</div>',
    );

    return $build;
  }

  $build['main'][] = drupal_get_form('qscience_d2dsearch_form_search');
  return $build;
}

/**
 * Form constructor for search interface.
 */
function qscience_d2dsearch_form_search() {
  $form['search_string'] = array(
    '#type' => 'textfield',
    '#title' => t('Your query string'),
    '#size' => 40,
    '#maxlength' => QSCIENCE_D2DSEARCH_MAX_QUERY_LENGTH,
    '#required' => TRUE,
  );

  $form['contenttype'] = array(
    '#type' => 'select',
    '#title' => t('Content type.'),
    '#options' => array(
      'papers' => t('Papers'),
      'news' => t('News'),
    ),
    '#default_value' => 'papers',
    '#required' => TRUE,
  );

  $form['searchtype'] = array(
    '#type' => 'select',
    '#title' => t('Content type.'),
    '#options' => array(
      'single_friend' => t('Single Friend'),
      'all_friends' => t('All Friends'),
      'friends_of_friends' => t('Friends of Friends'),
      'flood' => t('Flood Search'),
    ),
    '#default_value' => 'flood',
    '#required' => TRUE,
  );

  $form['date_from'] = array(
    '#type' => 'date',
    '#title' => t('From'),
    '#description' => t('Include only content more recent than this date'),
    '#required' => TRUE,
  );

  $form['date_to'] = array(
    '#type' => 'date',
    '#title' => t('To'),
    '#description' => t('Include in the search results content created up to this date.'),
    '#required' => TRUE,
  );

  $form['submit'] = array(
    '#type' => 'submit',
    '#value' => t('Search'),
    '#suffix' => '<div id="qscience_d2dsearch_progress"></div><div id="qscience_d2dsearch_results"></div>',
  );
  return $form;
}

/**
 * Form validation handler for qscience_d2dsearch_form_search().
 */
function qscience_d2dsearch_form_search_validate($form, &$form_state) {
  // TODO
}

/**
 * Form submission handler for qscience_d2dsearch_form_search().
 */
function qscience_d2dsearch_form_search_submit($form, &$form_state) {
  // TODO: serialize conditions and query string into one string
  $query_id = d2dsearch_query_start('qscience_d2dsearch_papers', $form_state['values']['search_string']);

  if (!_d2dsearch_check_query_id($query_id)) {
    drupal_set_message(t('Failed performing search.'));
  }
  else {
    $form_state['rebuild'] = TRUE;
    drupal_add_js(array('query_id' => $query_id), 'setting');
    drupal_add_js('http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js', 'external');
    drupal_add_js(drupal_get_path('module', 'qscience_d2dsearch') . '/js/search.js');
  }
}


/**
 * Menu callback; output the results of a search as a JSON object.
 *
 * @see  _qscience_d2dsearch_get_new_results()
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
  $output = '';
  foreach ($records as $record) {
    $ids[] = $record->id;
    $results = d2d_explode($record->result);
    if ($results === FALSE) {
      continue;
    }
    foreach ($results as $result) {
      $exploded_result = d2d_explode($result);
      if ($exploded_result !== FALSE && d2d_check_array($exploded_result, array('title' => 'is_string', 'time' => 'd2d_check_convert_int', 'name' => 'is_string'))) {
        $output .= '<div style="border:1px dashed #f00; margin:5px; padding:5px">';
        $output .= '<b>' . check_plain($exploded_result['name']) . '</b>';
        $output .= ' ';
        $output .= date('F j, Y', $exploded_result['time']);
        $output .= '<br/>';
        $output .= check_plain($exploded_result['title']);
        $output .= '</div>';
      }
    }
  }
  return $output;
}