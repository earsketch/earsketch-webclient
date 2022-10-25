#!/bin/bash
# FOR LOCAL DEVELOPMENT USE ONLY
# Prepare curriculum html files, and toc json data files for the client

if [ ! -d "$1" ]; then
    echo "Usage: curriculum_asciidoc_builder.sh <GIT_REPO_DIR>" >&2
    exit 1
else
    GIT_REPO="$1"
fi
if ! command -v asciidoctor &> /dev/null
then
    echo "asciidoctor could not be found"
    exit 1
fi
if sudo python3 -c "from bs4 import BeautifulSoup" &> /dev/null; then
    echo 'BeautifulSoup is installed'
else
    echo 'BeautifulSoup is not installed. Please run "pip install beautifulsoup4"'
    exit 1
fi
if [ ! -d "$2" ]; then
    ES_SCRIPT_HOME=$GIT_REPO/scripts
else
    ES_SCRIPT_HOME="$2"
fi

SRC_DIR=$GIT_REPO/src
ASCIIDOC_DIR=$GIT_REPO/src/locales
LOCAL_STAGING_DIR=$GIT_REPO/curriculum-local/
ES_HOST="http://localhost:8888"

cd "$GIT_REPO" || exit 1

## array of paths to be processed
declare -a locale_array=(en
                      es
                      ar
                      he
                      fr
                      iu
                      oj)

declare -a locale_subdir_array=(v1
                              v2)

# render the table of contents template first
TOC_TEMPLATE=$ASCIIDOC_DIR/toc_template.adoc
TOC_TEMPLATE_HTML=$LOCAL_STAGING_DIR/toc_template.html
asciidoctor \
    -a stylesheet="$ES_SCRIPT_HOME/curr_blank.css" \
    -D "$LOCAL_STAGING_DIR" "$TOC_TEMPLATE" || exit 1

for locale_path in "${locale_array[@]}"
do
  LOCALE_STAGE_DIR=$LOCAL_STAGING_DIR/$locale_path/
  mkdir $LOCALE_STAGE_DIR
  for locale_subdir in "${locale_subdir_array[@]}"
  do
    echo "Converting curriculum to html with asciidoctor in directory " $locale_path/$locale_subdir
    locale_full_path=$ASCIIDOC_DIR/$locale_path/$locale_subdir
    echo "Curriculum full path " $locale_full_path
    LOCALE_STAGE_SUB_DIR=$LOCAL_STAGING_DIR/$locale_path/$locale_subdir/
    [ ! -d "$locale_full_path" ] && continue
    asciidoctor \
      -a stylesheet="$ES_SCRIPT_HOME/curr_blank.css" \
      -D "$LOCALE_STAGE_SUB_DIR" "$locale_full_path/*.adoc" || exit 1
    python3 "$ES_SCRIPT_HOME/curr_add_html_features.py" "$SRC_DIR" "$LOCALE_STAGE_SUB_DIR" "$ES_HOST" || exit 1
  done
  echo "about to copy toc template"
  # outer loop, this is a root locale directory. process the table of contents
  cp $TOC_TEMPLATE_HTML $LOCALE_STAGE_DIR/toc.html
  python3 "$ES_SCRIPT_HOME/curr_toc.py" "$LOCALE_STAGE_DIR" || exit 1
  python3 "$ES_SCRIPT_HOME/curr_searchdoc.py" "$LOCALE_STAGE_DIR" || exit 1
done

echo "Moving media files and resources to curriculum-local directory"
cd "$SRC_DIR" || exit 1
cp -r audioMedia curriculum videoMedia theme "$LOCAL_STAGING_DIR"
cd "$GIT_REPO" || exit 1

echo "Completed curriculum build"
