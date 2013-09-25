<?php

/**
 * @file
 *
 * Performs a query search for papers in the local database
 */

/**
 * Performs the search.
 */
function _qscience_d2dsearch_papers_get() {
  $news = array(
    array('title' => 'News mining might have predicted Arab Spring', 'time' => 1315915200),
    array('title' => 'When We\'re Cowed by the Crowd', 'time' => 1306584000),
    array('title' => 'A More Human Virtual Crowd.  A new vision-based approach could help prevent crowd disasters.', 'time' => 1303300800),
    array('title' => 'Earth project aims to \'simulate everything\'', 'time' => 1293537600),
    array('title' => 'Towards a socio-economic knowledge accelerator', 'time' => 1249473600),
  );

  return $news;
  //$query = db_select('d2d_public_keys', 'k')
  //    ->fields('k')
  //    ->condition('k.id', $id);

}

function _qscience_d2dsearch_papers_callback($query) {
  watchdog('d2dsearch', '_qscience_d2dsearch_papers_callback executed.');

  $my_instance = d2d_api_own_instance_get();
  $my_name = $my_instance['name'];
  $news = _qscience_d2dsearch_papers_get();
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
