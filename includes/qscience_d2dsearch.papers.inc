<?php

/**
 * @file
 *
 * Performs a query search for papers in the local database
 */

/**
 * Performs the search.
 */
function _qscience_d2dsearch_papers_get($query, $conditions) {

}

function _qscience_d2dsearch_papers_callback($query) {
  watchdog('d2dsearch', '_qscience_d2dsearch_papers_callback executed.');
  //d2d_get_self_instance($my_id, $my_d2d_id, $my_url, $my_public_key);
  $my_instance = d2d_api_own_instance_get();
  $my_name = $my_instance['name'];
  $news = _qscience_d2dsearch_news_get($my_instance['url']);
  $result_array = array();
  $query = strtolower($query);
  foreach ($news as $record) {
    if (strpos(strtolower($record['title']), $query) !== FALSE) {
      $record['name'] = $my_name;
      $result_array[] = d2d_implode($record);
    }
  }
  watchdog('qscience_d2dsearch', 'returning: ' . var_export($result_array, TRUE));
  if (empty($result_array)) {
    return FALSE;
  }
  return d2d_implode($result_array);
}
