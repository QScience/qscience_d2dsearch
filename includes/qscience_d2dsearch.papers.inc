<?php

/**
 * @file
 *
 * Performs a query search for papers in the local database.
 */

/**
 * Menu callback; imports a paper into local database.
 */
function _qscience_d2dsearch_import_paper(){
  global $user;

  if (!isset($_POST['paper'])) {
    drupal_json_output(array(
      'success' => false,
      'message' => 'Missing data.',
    ));
    return;
  }
  $paper = drupal_json_decode($_POST['paper']);

  // Title.
  $title = NULL;
  if (isset($paper['title'])) {
    $title = check_plain($paper['title']);
  }
  if (empty($title)) {
    drupal_json_output(array(
      'success' => false,
      'message' => 'Missing title',
    ));
    return;
  }
  // Authors.
  $authors = array();
  $invalidAuthors = 0;
  if (isset($paper['authors'])) {
    foreach($paper['authors'] as $a) {
      $authorName = TRUE;
      $authorId = TRUE;
      // New entry.
      if ($a['name'] === $a['id']) {
        $authorName = check_plain($a['name']);
        if ($authorName !== FALSE) {
          $tokens = explode(' ', $authorName, 2);
          $author = array(
            'new' => TRUE,
            'name' => $authorName,
            'first' => sizeof($tokens) === 2 ? $tokens[0] : '',
            'last' => sizeof($tokens) === 2 ? $tokens[1] : $tokens[0],
          );
        }
      }
      else {
        // Supposedly an existing entry. Check id anyway.
        $authorId = check_plain($a['id']);
        if ($authorId!== FALSE) {
          $author = array(
            'new' => FALSE,
            'id' => $authorId,
          );
        }
      }
      if ($authorId !== FALSE && $authorName !== FALSE) {
        array_push($authors, $author);
      }
      else {
        $invalidAuthors++;
      }
    }
  }
  if (empty($authors) || $invalidAuthors > 0) {
    drupal_json_output(array(
      'success' => false,
      'message' => 'Missing or invalid authors.',
    ));
    return;
  }
  // Journal.
  $journal = NULL;
  if (isset($paper['journal'])) {
    // New entry.
    if ($paper['journal']['name'] === $paper['journal']['id']) {
      $journalName = check_plain($paper['journal']['name']);
      if ($journalName !== FALSE) {
        $journal = array(
          'new' => TRUE,
          'name' => $journalName,
        );
      }
    }
    else {
      // Supposedly an existing entry. Check id anyway.
      $journalId = check_plain($paper['journal']['id']);
      if ($journalId !== FALSE) {
        $journal = array(
          'new' => FALSE,
          'id' => $journalId,
        );
      }
    }
  }
  if (empty($journal)) {
    drupal_json_output(array(
      'success' => false,
      'message' => 'Missing or invalid journal.',
    ));
    return;
  }
  // Year.
  $year = NULL;
  if (isset($paper['year']) && strlen($paper['year']) === 4) {
    $year = check_plain($paper['year']);
  }
  if (empty($year)) {
    drupal_json_output(array(
      'success' => false,
      'message' => 'Missing or invalid year.',
    ));
    return;
  }
  // Abstract (can be missing, must be sanitized).
  $abstract = '';
  if (isset($paper['abstractField'])) {
    $abstract = check_plain($paper['abstractField']);
  }
  if ($abstract === FALSE) {
    drupal_json_output(array(
      'success' => false,
      'message' => 'Invalid abstract.',
    ));
    return;
  }

  $node = new stdClass();
  $node->type = 'paper';
  node_object_prepare($node);
  $node->title = $title;
  $node->language = LANGUAGE_NONE;
  $node->abstract[$node->language][0]['value'] = $abstract;

  // Creating the new Journal entity, in case.
  if ($journal['new']) {
    $entity = entity_create('node', array('type' => 'journal'));
    $wrapper = entity_metadata_wrapper('node', $entity);
    $wrapper->title = $journal['name'];
    $newJournal = $wrapper->save();
    $journal['id'] = $newJournal->getIdentifier();
  }
  $node->journal_reference[$node->language][]['target_id'] = $journal['id'];

  // Creating the new Author entities, in case
  foreach($authors as $a) {
    if ($a['new']) {
      $entity = entity_create('node', array('type' => 'author'));
      $wrapper = entity_metadata_wrapper('node', $entity);
      $wrapper->title = $a['name'];
      $wrapper->first_name = $a['first'];
      $wrapper->last_name = $a['last'];
      $newAuthor = $wrapper->save();
      $a['id'] = $newAuthor->getIdentifier();
    }
    $node->author_reference[$node->language][]['target_id'] = $a['id'];
  }

  try {
    node_save($node);
    drupal_json_output(array(
      'success' => true,
      'message' => 'Paper added to database.',
    ));
  }
  catch(Exception $e) {
    drupal_json_output(array(
      'success' => false,
      'message' => 'An error occurred while saving node.',
    ));
  }
}

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