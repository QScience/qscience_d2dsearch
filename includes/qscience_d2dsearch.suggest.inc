<?php

/**
 * @file
 *
 * Performs a query search for papers in the local database
 */

/**
 * Menu callback; suggests authors names.
 */
function _qscience_d2dsearch_suggest_author(){

  $author = FALSE;
  if (isset($_GET['term'])) {
    $author = check_plain($_GET['term']);
  }
  if (!$author) {
    drupal_json_output(array());
    return;
  }

  $query = db_select('node', 'n');
  $query->addField('n', 'nid', 'id');
  $query->addField('n', 'title', 'name');
  $query->condition('n.type', 'author');
  $query->condition('n.title', '%' . db_like($author) . '%', 'LIKE');

  $authors = $query->execute()->FetchAll();
  drupal_json_output($authors);
}

/**
 * Menu callback; resolve authors names to entries in the db.
 *
 * Matching is always exact.
 */
function _qscience_d2dsearch_resolve_authors(){

  $authors = FALSE;
  if (isset($_POST['authors'])) {
    $authors = drupal_json_decode($_POST['authors']);
  }
  if (empty($authors)) {
    drupal_json_output(array());
    return;
  }

  $query = db_select('node', 'n');
  $query->addField('n', 'title', 'name');
  $query->addField('n', 'nid', 'id');
  $query->condition('n.type', 'author');

  $at_least_one = FALSE;;
  $db_or = db_or();
  foreach ($authors as $author) {
    $author = check_plain($author);
    if ($author === FALSE) continue;
    $at_least_one = TRUE;
    $db_or->condition('n.title', $author, '=');
  }
  if (!$at_least_one) {
    drupal_json_output(array());
    return;
  }
  $query->condition($db_or);
  $authors = $query->execute()->FetchAllKeyed();

  drupal_json_output($authors);
}
