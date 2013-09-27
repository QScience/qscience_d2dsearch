<?php

/**
 * @file
 *
 * Performs a query search for papers in the local database
 */

/**
 * Performs the search.
 */
function _qscience_d2dsearch_papers_get($imploded_query) {


  $exploded_query = d2d_explode($imploded_query);
  if ($exploded_query === FALSE) {
    return FALSE;
  }

  $search_string = $exploded_query['search_string'];
  $query = new EntityFieldQuery();

  $from = $exploded_query['date_from'];
  $to = $exploded_query['date_to'];

  $query = new EntityFieldQuery();
  // Query explanation:
  // status == 1 means "published" (visible to non-admins).
  $query->entityCondition('entity_type', 'node')
        ->entityCondition('bundle', 'paper')
        ->propertyCondition('status', 1)
        ->propertyCondition('title', '%' . db_like($search_string) . '%', 'LIKE')
        ->propertyOrderBy('created', 'DESC');

  if ($from != $to) {
    $query
      ->propertyCondition('created', array($from, $to), 'BETWEEN');
  }
  else {
    $query
      ->propertyCondition('created', '=', $from);
  }

  $result = $query->execute();

  $items = array();
  if (isset($result['node'])) {
    $items_nids = array_keys($result['node']);
    $items = entity_load('node', $items_nids);
  }

  return $items;
}

function _qscience_d2dsearch_papers_callback($imploded_query) {
  watchdog('d2dsearch', '_qscience_d2dsearch_papers_callback executed.');

  $items = _qscience_d2dsearch_papers_get($imploded_query);
  if (empty($items)) {
    return FALSE;
  }
  $my_instance = d2d_api_own_instance_get();
  $my_name = $my_instance['name'];
  $my_url = substr($my_instance['url'], 0,
                   strpos($my_instance['url'], 'xmlrpc.php'));

  $result_array = array();
  // TODO: load other fields, like author reference.
  foreach($items as $item) {
    $abstract = empty($item->abstract) ?
        'no abstract' : $item->abstract['und'][0]['value'];
    $record = array(
      'friend' => $my_name,
      'friend_url' => $my_url,
      'title' => $item->title,
      'abstractField' => $abstract,
      'time' => $item->created,
    );
    $result_array[] = d2d_implode($record);
  }

  watchdog('qscience_d2dsearch', 'returning: ' . var_export($result_array, TRUE));

  if (empty($result_array)) {
    return FALSE;
  }
  return d2d_implode($result_array);
}
