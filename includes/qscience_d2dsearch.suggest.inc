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
  if (isset($_POST['author'])) {
    $author = check_plain($_POST['author']);
  }
  if (!$author) {
    drupal_json_output(array());
    return;
  }

  $query = db_select('node', 'n')
    ->fields('n', array('nid', 'title'))
    ->condition('n.title', '%' . db_like($author) . '%', 'LIKE');

  $authors = $query->execute()->FetchAll();

  drupal_json_output($authors);
}