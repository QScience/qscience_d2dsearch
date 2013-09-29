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
  $my_url = substr($my_instance['url'], 0,
                   strpos($my_instance['url'], 'xmlrpc.php'));
  $my_name = empty($my_instance['name']) ? $my_url : $my_instance['name'];

  $result_array = array();
  foreach ($items as $item) {

    // Loading authors.
    $authors = '';
    if (!empty($item->author_reference)) {
      // TODO support multilanguage.
      $authorRefs = $item->author_reference['und'];
      $authorNids = array();
      foreach($authorRefs as $ref) {
        $authorNids[] = $ref['target_id'];
      }
      $authorObjs = entity_load('node', $authorNids);
      $authors = array();
      foreach ($authorObjs as $author) {
        // TODO: Should take first and last separate ??
        // $first_name = $author->first_name['und'][0]['value'];
        // $last_name = $author->last_name['und'103][0]['value'];
        // $authors[] = array(
        //  'first_name' => $first_name,
        //  'last_name' => $last_name,
        // );
        $authors[] = $author->title;
      }
      $authors = d2d_implode($authors);
      if ($authors === FALSE) {
        $authors = '';
      }
    }

    // Loading Journal.
    $journal = '';
    if (!empty($item->journal_reference)) {
      // TODO support multilanguage.
      $journalNid = $item->journal_reference['und'][0]['target_id'];
      $journalObj = node_load($journalNid);
      $journal = $journalObj->title;
    }

    // Loading. abstract.
    // TODO support multilanguage.
    $abstract = empty($item->abstract) ?
        'no abstract' : $item->abstract['und'][0]['value'];

    $record = array(
      'friend' => $my_name,
      'friend_url' => $my_url,
      'title' => $item->title,
      'abstractField' => $abstract,
      'authors' => $authors,
      'journal' => $journal,
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
