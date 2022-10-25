# Parses curriculum html files to create JSON text search dataset (.js file)

import codecs, os
import json
from bs4 import BeautifulSoup
import sys


if len(sys.argv) < 2:
	print("Error, no arguments given")
	print("Usage: curr_searchdoc.py <CURRICULUM_STAGE_DIR>")
	exit(1)
curr_dir = sys.argv[1]

toc = codecs.open(curr_dir+'/toc.html', 'r').read()
parser = BeautifulSoup(toc, 'html.parser')

documents = []

# units
print("Processing html files to create text search dataset...")
n_processed_units = 0
n_processed_ch = 0
for unit in parser.find_all('div', attrs={'class':'sect1'}):
	n_processed_units += 1
	unit_data = {
		'title': unit.find('a').text,
		'id': unit.find('a').attrs['href'],
	}

	# chapters
	for chapter in unit.find_all('div', attrs={'class':'sect2'}):
		n_processed_ch += 1
		url = chapter.find('a').attrs['href']

		# read the html of current chapter
		chapter_html = codecs.open(curr_dir+'../'+url, 'r').read()
		sections = BeautifulSoup(chapter_html, 'html.parser')

		ch_data = {
			'title': chapter.find('a').text,
			'id': url
		}

		paragraphs = sections.find('p')
		if paragraphs != None:
			ch_data['text'] = paragraphs.text
			documents.append(ch_data)

		# subsections of chapter
		for section in sections.find_all('div', attrs={'class':'sect2'}):
			sec_data = {
				'title': section.find('h3').text,
				'id': url+'#'+section.find('h3').attrs['id']
			}
			paragraphs = section.find('p')
			if paragraphs != None:
				sec_data['text'] = paragraphs.text
				documents.append(sec_data)


# print documents
wf = open(curr_dir+'/curr_searchdoc.json', 'w')
wf.write(json.dumps(documents, indent=4))
wf.close()

print(str(n_processed_units) + " units with " + str(n_processed_ch) + " chapters processed")
