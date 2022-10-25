# Parses curriculum html files to create table-of-contents JSON data structure

import codecs, os, os.path
from os.path import exists
import json
from bs4 import BeautifulSoup
import sys

englishDict = {
    "es": "Inglés",
    "fr": "Anglaise",
    "ar": "إنجليزي",
    "he": "אנגלית",
    "iu": "ᖃᓪᓗᓈᑎᑐᑦ",
    "oj": "Zhaaganaashiimong"
}

if len(sys.argv) < 2:
    print("Error, no arguments given")
    print("Usage: curr_toc.py <CURRICULUM_STAGE_DIR>")
    exit(1)
curr_dir = sys.argv[1]

current_locale = os.path.basename(os.path.normpath(curr_dir))
toc = codecs.open(curr_dir + '/toc.html', 'r').read()
parser = BeautifulSoup(toc, 'html.parser')
toc_data = []
chapter_count = 0
display_chapter_number = -1


def get_curriculum_locale(href):
    locale_path = href.replace('{{EARSKETCH_LOCALE_CODE}}', current_locale)
    file_exists = exists(curr_dir + '../' + locale_path)
    if file_exists:
        return current_locale
    else:
        return 'en'  # default to english if the localized file does not exist

current_unit = parser.h2 # grab the first h2 to populate
num_chapters = 0
num_chapters_localized = 0
first_iteration = True
for h in parser.find_all(['h2', 'h3']):
    curriculum_locale = get_curriculum_locale(h.a['href'])
    h.a['href'] = h.a['href'].replace('{{EARSKETCH_LOCALE_CODE}}', curriculum_locale)
    link_html = codecs.open(curr_dir+'../'+h.a['href'], 'r').read()
    link_content = BeautifulSoup(link_html, 'html.parser')
    h.a.string = link_content.h2.string
    if h.name == 'h2' and not first_iteration:
        # h2 starts a new unit section in TOC
        # append English designation to previous unit if all of its chapters were in english
        if num_chapters_localized == 0 and num_chapters > 0:
            current_unit.a.string = current_unit.a.string + " (" + englishDict[current_locale] + ")"
        current_unit = h
        num_chapters, num_chapters_localized = 0, 0
    elif h.name == 'h3':
        # h3 are child chapters of an h2 unit in TOC, but not actual DOM children
        num_chapters += 1
        if current_locale == curriculum_locale:
            num_chapters_localized += 1
    first_iteration = False

with open(curr_dir + '/toc.html', 'wb') as wf:
    wf.write(parser.encode_contents())

# units
print("Processing html files to create Table-Of-Contents data structure...")
n_processed_units = 0
n_processed_ch = 0
for unit in parser.find_all('div', attrs={'class': 'sect1'}):
    n_processed_units += 1

    unit_data = {
        'title': unit.find('a').text,
        'URL': unit.find('a').attrs['href'],
        'chapters': [],
        'sections': []
    }

    # chapters
    for chapter in unit.find_all('div', attrs={'class': 'sect2'}):
        n_processed_ch += 1

        url = chapter.find('a').attrs['href']

        chapter_count = chapter_count + 1
        display_chapter_number = chapter_count

        # read the html of current chapter
        chapter_html = codecs.open(curr_dir+'../'+url, 'r').read()
        sections = BeautifulSoup(chapter_html, 'html.parser')

        ch_data = {
            'title': chapter.find('a').text,
            'URL': url,
            'displayChNum': display_chapter_number,
            'sections': []
        }

        # subsections of chapter
        for section in sections.find_all('div', attrs={'class':'sect2'}):
            sec_data = {
                'title': section.find('h3').text,
                'URL': url+'#'+section.find('h3').attrs['id'],
            }

            ch_data['sections'].append(sec_data)

        unit_data['chapters'].append(ch_data)

    toc_data.append(unit_data)

with open(curr_dir + '/curr_toc.json', 'w') as wf:
    wf.write(json.dumps(toc_data, indent=4))

print(str(n_processed_units) + " units with " + str(n_processed_ch) + " chapters processed")
