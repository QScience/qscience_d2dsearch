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
  $authors = _qscience_d2dsearch_resolve_authors_helper($authors);
  drupal_json_output($authors);
}

/**
 * Menu callback; suggests journal names.
 */
function _qscience_d2dsearch_suggest_journal(){

  $journal = FALSE;
  if (isset($_GET['term'])) {
    $journal = check_plain($_GET['term']);
  }
  if (!$journal) {
    drupal_json_output(array());
    return;
  }

  $query = db_select('node', 'n');
  $query->addField('n', 'nid', 'id');
  $query->addField('n', 'title', 'name');
  $query->condition('n.type', 'journal');
  $query->condition('n.title', '%' . db_like($journal) . '%', 'LIKE');

  $journals = $query->execute()->FetchAll();
  drupal_json_output($journals);
}

/**
 * Menu callback; resolve journal names to entries in the db.
 *
 * Matching is always exact.
 */
function _qscience_d2dsearch_resolve_journals(){

  $journals = FALSE;
  if (isset($_POST['journals'])) {
    $journals = drupal_json_decode($_POST['journals']);
  }
  if (empty($journals)) {
    drupal_json_output(array());
    return;
  }
  $journals = _qscience_d2dsearch_resolve_journals_helper($journals);

  drupal_json_output($journals);
}


/**
 * Menu callback; resolve all the entities of a paper.
 *
 * Matching is always exact.
 */
function _qscience_d2dsearch_resolve_paper(){

  $resolvedJournal = array();
  $resolvedAuthors = array();

  $journal = FALSE;
  if (isset($_POST['journal'])) {
    $journal = drupal_json_decode($_POST['journal']);
  }
  if (!empty($journal)) {
    $resolvedJournal = _qscience_d2dsearch_resolve_journals_helper(array($journal));
  }

  $authors = FALSE;
  if (isset($_POST['authors'])) {
    $authors = drupal_json_decode($_POST['authors']);
  }
  if (!empty($authors)) {
    $resolvedAuthors = _qscience_d2dsearch_resolve_authors_helper($authors);
  }

  drupal_json_output(array(
    'journal' => $resolvedJournal,
    'authors' => $resolvedAuthors,
  ));
}

function _qscience_d2dsearch_resolve_journals_helper($journals) {
  $query = db_select('node', 'n');
  $query->addField('n', 'title', 'name');
  $query->addField('n', 'nid', 'id');
  $query->condition('n.type', 'journal');

  $at_least_one = FALSE;;
  $db_or = db_or();
  foreach ($journals as $journal) {
    $journal = check_plain($journal);
    if ($journal === FALSE) continue;
    $at_least_one = TRUE;
    $db_or->condition('n.title', $journal, '=');
  }
  if (!$at_least_one) {
    return array();
  }
  $query->condition($db_or);
  return $query->execute()->FetchAllKeyed();
}


function _qscience_d2dsearch_resolve_authors_helper($authors){

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
    return array();
  }
  $query->condition($db_or);
  return $query->execute()->FetchAllKeyed();
}