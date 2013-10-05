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