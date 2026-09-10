Feature: Notes — Markdown Import, Export, Metadata Panel, and Highlight Colors

  As a user I want to move markdown files in and out of my notes workspace,
  view and edit note metadata in a dedicated panel, and highlight text with
  multiple colors so I can organise my knowledge effectively.

  # ─── Import ───────────────────────────────────────────────────────────────

  Scenario: Import a markdown file with frontmatter as a new note
    Given I am on the notes section
    And I choose to import a markdown file for a swimlane
    When I pick a markdown file that contains a YAML frontmatter block
    Then a new note is created in that swimlane
    And the note title is taken from the frontmatter "title" field
    And the note tags are taken from the frontmatter "tags" field
    And the note body contains only the content below the frontmatter block
    And the new note is automatically selected and opened

  Scenario: Import a markdown file with custom frontmatter keys
    Given I am on the notes section
    When I import a markdown file whose frontmatter contains a key other than title, tags, createdAt or updatedAt
    Then the note's metadata list contains an entry for that key
    And the entry carries the value written in the frontmatter

  Scenario: Import a markdown file without frontmatter
    Given I am on the notes section
    When I import a plain markdown file that has no frontmatter block
    Then a new note is created
    And the note title is derived from the filename with the ".md" extension removed and dashes and underscores replaced by spaces
    And the note body contains the full file content
    And the note has no tags and no metadata entries

  Scenario: Reject an oversized import file
    Given I am on the notes section
    When I pick a markdown file larger than 5 MB
    Then no note is created
    And I am shown an error stating the 5 MB size limit

  # ─── Export ───────────────────────────────────────────────────────────────

  Scenario: Export the open note as a markdown file with frontmatter
    Given I have a note open with a title, tags, and content
    When I choose to export the note
    Then a markdown file is downloaded to my device
    And the file begins with a YAML frontmatter block containing the title, tags, createdAt, and updatedAt
    And the file body contains the full note content in markdown format
    And the filename is derived from the note title in a filesystem-safe format with a ".md" extension

  Scenario: Export includes custom metadata fields
    Given I have a note open with a metadata entry
    When I choose to export the note
    Then the frontmatter block contains that entry under its key

  Scenario: Re-import a previously exported note preserves metadata
    Given I have exported a note to a markdown file
    When I import that file back into the notes section
    Then a new note is created
    And its title, tags and metadata entries match the original note

  # ─── Metadata Panel ───────────────────────────────────────────────────────

  Scenario: Open the metadata panel for the current note
    Given I have a note open
    When I toggle the metadata panel open
    Then a side panel is displayed alongside the editor
    And the panel shows the note's creation date, last-updated date, swimlane and pinned status
    And the panel shows the note's metadata fields and references list

  Scenario: Add a custom metadata field from the metadata panel
    Given I have a note open with the metadata panel visible
    When I add a metadata field with a key, a type and a value
    Then the note's metadata list contains an entry with that key, type and value

  Scenario: Remove a custom metadata field from the metadata panel
    Given I have a note open with at least one metadata field in the metadata panel
    When I remove that metadata field
    Then the note's metadata list no longer contains it

  Scenario: Edit the references list from the metadata panel
    Given I have a note open with the metadata panel visible
    When I add a reference string to the references list
    And I save or commit the change
    Then the note's references field contains the new entry

  Scenario: Remove a reference from the metadata panel
    Given I have a note open with at least one reference in the metadata panel
    When I remove a reference entry
    Then the note's references field no longer contains that entry

  Scenario: Toggle pinned status from the metadata panel
    Given I have an unpinned note open with the metadata panel visible
    When I toggle the pinned control in the metadata panel
    Then the note becomes pinned
    And the pinned indicator in the editor header reflects the updated state

  Scenario: Close the metadata panel
    Given the metadata panel is open
    When I close the metadata panel
    Then the panel is hidden and the editor expands to fill the available space

  # ─── Highlight Colors ─────────────────────────────────────────────────────

  Scenario: Apply a highlight color to selected text
    Given I have a note open and I have selected some text
    When I choose a highlight color from the color picker
    Then the selected text is highlighted with the chosen color
    And the color is preserved when the note is saved and reopened

  Scenario: Apply the last-used highlight using the quick-highlight action
    Given I have a note open and I have selected some text
    When I activate the quick-highlight action without choosing a color
    Then the selected text is highlighted with the last-used color

  Scenario: Remove a highlight
    Given I have highlighted text in a note
    When I activate the highlight action on the already-highlighted text
    Then the highlight mark is removed from the text
