# Earsketch Curriculum
Curriculum source files for the EarSketch project (https://earsketch.gatech.edu)

Table of Contents
=============================

- [Build Instructions](#build-instructions)
- [About ASCIIDOC](#about-curriculum-asciidocs)
- [ASCIIDOC Quick Reference](#ascii-doc-quick-reference)
  - [Further References](#further-formatting-references)
- [Filename Conventions](#filename-conventions-for-earsketch)
- [Content Formatting Requirements](#content-formatting-requirements)
    - [Table of Contents](#table-of-contents-formatting)
    - [Multiple-choice Questions](#question-formatting-in-asciidoc)
- [Example Chapter](#example-chapter)

----------------------------------

## Build Instructions
To build locally for development:

```shell
cd /path/to/earsketch-curriculum
./scripts/local_dev_curriculum_asciidoc_builder.sh /path/to/earsketch-curriculum
```


## About Curriculum ASCIIDOCs

The curriculum lessons for EarSketch are created from special text files called _ascii-docs_.  These files end with `.adoc` and contain the text for the curriculum lessons.

The advantage of using ascii-doc format is that a non-techincal person can add text to a web site using a human-friendly format.  For example, bold text is set with asterisk, like: `this is *bold* text`.

## Ascii-doc Quick Reference

```asciidoc
Heading
= H1
== H2
=== H3
==== H4

Anchor
[[anchorname]]

Image
image::../media/NewModule/sunset.jpg[]

Image-inline
image:../media/NewModule/sunset.jpg[]

Video-YouTube
video::iUPYYqkrMX0[youtube]

Video-Vimeo
video::363707397[vimeo]

Video-file
video::videomedia/001-03-EarSketchWorkplace-PY-JS.mp4[]

Bold, Italics
This is *bold*
This is _italic_
This is *_both_*

List
* An element
* And another
* Last bulleted point

List-numbered
1. First thing
2. And a second
3. Third thing here

Code
[source,python]
----
a = 1
b = 1
c = a + b  # expecting 2
----
```

### Further Formatting References

* [AsciiDoc Quick Reference](https://asciidoctor.org/docs/asciidoc-syntax-quick-reference/)

* [AsciiDoc LIVE Online Editor](https://asciidoclive.com)

## Filename Conventions for EarSketch

1. Table of contents
    * `toc_template.adoc` name should not be changed. This file lives in the `/src/locales/` directory
    * The table of contents is generated for each locale at build time based on this template. If a translated version does not exist for a locale, the English version is referenced so that all locales have access to all chapters. If all chapters of a unit are un-translated, then a localized `(English)` is appended to the unit heading in the table of contents to signal that the entire unit is in English.

2. English Source Content
    * All other files that have English content should be placed in `/src/locales/en/` and should have the `.adoc` extension

    * For example `ch_8.adoc` OR `getting-started.adoc` OR `loops-and-layers.adoc`

3. Other Languages / Locales
    * All other locales (ex. Spanish, French, Hebrew, Arabic, etc.) should originate from Build/Downloads from our [CrowdIn project](https://crowdin.com/project/earsketch). CrowdIn is a translation web app which helps manage and track translated content. 
    * Other language `.adoc` files should only be updated by building and downloading from CrowdIn, and copying/overwriting those files into their appropriate locale directories in this repository.


## Content Formatting Requirements

1. Include `:nofooter:` in every file to remove the last update tag to appear at the bottom of the page

2. To include code snippets, use following code before the snippet


Show in python mode:
```asciidoc
[role="curriculum-python"]
[source,python]
```
Show in javascript mode:
```asciidoc
[role="curriculum-javascript"]
[source,javascript]
```
Don’t show paste icon (used to sub snippets of code):
```asciidoc
[role="curriculum-python"]
[source,noicon]
```

3. To point to external URLs that open in a new tab use `^` at the end
   `link:http://example.com[linktext^]`

4. To point to video/audio/images consider curriculum-asciidoc folder as root and build URL respective to that.

5. To cross-reference: `<<filename#section_name,text>>`


### Table of Contents Formatting

1. `toc_template.adoc` is used to maintain the hierarchy in the curriculum

2. `==` means Unit level

3. `===` means Chapter level

4. `<<chapter_filename#,title>>` : you can change the title that appear on the “table of contents” by changing the title text

### Question formatting in `asciidoc`

Multiple choice questions can be embedded in curriculum pages. The correct answer should be listed first. The web client will randomize the order of the answers at runtime.

Here is the most basic question format:
```asciidoc
[question]
--
Which of these options is a string?
[answers]
* "Five"
* 5
* FIVE
* Five
--
```

If a question needs to be language-specific (python or javascript), prepend the question block with the same `[role="curriculum-javascript"]` block used in the rest of the curriculum for language-specific content.

```asciidoc
[role="curriculum-python"]
[question]
--
Which of these options correctly defines the function `myFunction()` with the parameters `startMeasure` and `endMeasure` ?
[answers]
* `def myFunction(startMeasure, endMeasure):`
* `def myFunction():`
* `myFunction(startMeasure, endMeasure):`
* `myFunction(2, 5)`
--

[role="curriculum-javascript"]
[question]
--
Which of these options correctly defines the function `myFunction()` with the parameters `startMeasure` and `endMeasure` ?
[answers]
* `function myFunction(startMeasure, endMeasure) {}`
* `function myFunction() {}`
* `myFunction(startMeasure, endMeasure){}`
* `myFunction(2, 5)`
--
```

These examples show how do include a code sample at the top of the question.
```asciidoc
[role="curriculum-python"]
[question]
--
What does 0 represent in a beat pattern string?
[source,python]
----
# here is some python code
makeBeat(2, "000-00000-000--0")
----
[answers]
* Start playing the clip
* Rest
* Extend the clip
* End the clip
--

[role="curriculum-javascript"]
[question]
--
What does 0 represent in a beat pattern string?
[source,javascript]
----
// here is javascript some code
makeBeat(2, "000-00000-000--0");
----
[answers]
* Start playing the clip
* Rest
* Extend the clip
* End the clip
--
```

## Example Chapter

`ch_RemixComp.asc`

```asciidoc
[[RemixCompetition]]
== Remix Competition
:nofooter:

Welcome to the EarSketch Remix Competition curriculum.



[[Intro]]
=== Introduction

Here is your chance—enter an EarSketch Competition!


video::363707397[vimeo]



[[SimpleScript]]
=== A Simple Script

image:../media/RemixComp/example_logo.png[]


[role="curriculum-python"]
[source,python]
----
from earsketch import *
init()
setTempo(127)
finish()
----


[role="curriculum-javascript"]
[source,javascript]
----
"use strict";
init();
setTempo(127);
finish();
----

```

Happy writing!
