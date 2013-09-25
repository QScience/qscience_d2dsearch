<?php

/**
 * @file
 *
 */


function _qscience_d2dsearch_news_get($url) {
  $news = array();
  $news['http://localhost/drupal_a/xmlrpc.php'] =
    array(
      array('title' => 'News mining might have predicted Arab Spring', 'time' => 1315915200),
      array('title' => 'When We\'re Cowed by the Crowd', 'time' => 1306584000),
      array('title' => 'A More Human Virtual Crowd.  A new vision-based approach could help prevent crowd disasters.', 'time' => 1303300800),
      array('title' => 'Earth project aims to \'simulate everything\'', 'time' => 1293537600),
      array('title' => 'Towards a socio-economic knowledge accelerator', 'time' => 1249473600),
    );
  $news['http://localhost/drupal_b/xmlrpc.php'] =
    array(
      array('title' => 'What Causes Deadly \'Crowd-Quakes\'?', 'time' => 1303473600),
      array('title' => 'Wisdom about Crowds.  To model the behaviour of humans en masse, treat them as people, not molecules', 'time' => 1303300800),
      array('title' => 'Current Driving Conditions Michigan', 'time' => 1276689600),
      array('title' => 'about the Workshop on "Coping with Crises in Complex Socio-Economic Systems"', 'time' => 1248523200),
    );
  $news['http://localhost/drupal_c/xmlrpc.php'] =
    array(
      array('title' => 'Predicting crowd behaviour', 'time' => 1303387200),
      array('title' => 'How crowds move: because people want to be free', 'time' => 1303214400),
      array('title' => 'Who should pay for the police?', 'time' => 1276516800),
      array('title' => 'CCSS Conference pictures and videos online', 'time' => 1248523200),
    );
  $news['http://localhost/drupal_d/xmlrpc.php'] =
    array(
      array('title' => 'The strange but extremely valuable science of how pedestrians behave', 'time' => 1324123200),
      array('title' => 'Computational models to predict disasters', 'time' => 1308830400),
      array('title' => 'QScience 2012', 'time' => 1325376000),
    );
  if (array_key_exists($url, $news)) {
    return $news[$url];
  }
  else {
    return array();
  }
}
function _qscience_d2dsearch_news_callback($query) {
  watchdog('d2dsearch', '_qscience_d2dsearch_news_callback(...)');
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
