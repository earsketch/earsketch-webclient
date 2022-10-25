# Parse curriculum html files and perform changes to the text

import os, os.path
import codecs
from bs4 import BeautifulSoup
import sys

if len(sys.argv) < 4:
	print("Error, no arguments given")
	print("Usage: curr_add_html_features.py <CURRICULUM_SOURCE_DIR> <CURRICULUM_STAGE_DIR> <BASE_HOST_URL>")
	exit(1)
source_dir = sys.argv[1]
curr_dir = sys.argv[2]
base_host_url = sys.argv[3]

video_caption_dir = source_dir+'/videoMedia/NewCaptions/'

caption_files = [cap_name[:-4] for cap_name in os.listdir(video_caption_dir)]

# chapters = [ch for ch in os.listdir(curr_dir) if 'ch_' in ch]
chapters = [ch for ch in os.listdir(curr_dir) if '.html' in ch and ch != 'toc.html' and ch != 'toc_template.html']

print("Processing html files...")
n_processed = 0
for ch in chapters:
	# print('processing chapter: ' + ch)
	n_processed += 1

	data = codecs.open(curr_dir + ch, 'r').read()
	soup = BeautifulSoup(data, 'html.parser')

	# fix the image file paths
	for el in soup.find_all('img', src=lambda x: x.startswith('../media')):
		el['src'] = el['src'].replace('../media', base_host_url+'/curriculum/curriculum/media')

	# fix special video paths
	for el in soup.find_all('video', src=lambda x: x.startswith('../media')):
		el['src'] = el['src'].replace('../media', base_host_url+'/curriculum/curriculum/media')

	# fix legacy video paths
	for el in soup.find_all('video', src=lambda x: x.startswith('./videoMedia')):
		el['src'] = el['src'].replace('./videoMedia', base_host_url+'/videoMedia')

	# fix curriculum script paths
	for el in soup.find_all('script', src=lambda x: x is not None and x.startswith('curriculum/scripts/')):
		el['src'] = el['src'].replace('curriculum/scripts/', base_host_url+'/curriculum/curriculum/scripts/')

	# remove the unwanted inline style chunk
	[el.extract() for el in soup('style')]

	# replace the divs with "mp3" contents with an audio tag
	for el in soup.find_all('div', {'class':'curriculum-mp3'}):
		el.contents[0] = soup.new_tag('audio', src=base_host_url+'/curriculum/'+el.string, controls='')

	# fix legacy audio paths
	for el in soup.find_all('audio', src=lambda x: x.startswith('./audioMedia/')):
		el['src'] = el['src'].replace('./audioMedia/', base_host_url+'/curriculum/audioMedia/')

	# for highlight.js to work
	for el in soup.find_all('code', {'class': lambda x: x and x.startswith('language-')}):
		el['class'] = el['class'][0].replace('language-', '')
		# Force LTR direction for code examples in all locales
		el['dir'] = 'ltr'

	# add the code-paste button
	for el in soup.find_all('pre', {'class':'highlight'}):
		# Force LTR direction for code examples in all locales
		el['dir'] = 'ltr'

		lang = el('code')[0]['class']
		skip = False
		if lang == 'python':
			lang_str = 'python'
		elif lang == 'javascript':
			lang_str = 'javascript'
		else:
			skip = True #don't add copy icon

		# if the code example is inside a question, don't add the copy/paste icon
		if el.find_parent("div", class_="question"):
			skip = True

		container = soup.new_tag('div')
		container['class'] = 'currcode-container'
		el.wrap(container)

		if not skip:
			button = soup.new_tag('button')
			button['class'] = 'btn-copy copy-btn-' + lang_str
			button['style'] = 'display:block'

			i = soup.new_tag('i')
			i['class'] = 'icon icon-paste2'
			i['title'] = 'Open the example code in the editor'

			el.insert_before(i)
			i.wrap(button)

	# # add target="_blank" to outbound links
	# for el in soup.find_all('a', href=lambda x: x.startswith('http')):
	# 	el['target'] = '_blank'

	for el in soup.find_all('a', href=lambda x: not x.startswith('http') and not x.startswith('#')):
		#print("non-http link in "+ ch + ": " + str(el))
		# fix legacy internal links from v1 curriculum
		if not el['href'].startswith('/') and el['href'] != "<api>":
			el['href'] = "/en/v1/" + el['href']
		el['data-es-internallink'] = "true";


	for el in soup('video'):
		# If a caption file with matching name is found, add it to HTML.
		# Note: The names of video file and caption file have to be identical!
		video_name = el['src'][len(base_host_url)+12:-4]
		if video_name in caption_files:
			track_tag = soup.new_tag('track', src=base_host_url+'/videoMedia/NewCaptions/'+video_name+'.vtt', srclang='en', kind='captions')
			# track_tag.attrs['default'] = None # Comment in if we want to show the captions by default.
			el.append(track_tag)
		el['preload'] = 'none'
		el['poster'] = el.get('poster', '/earsketch2/img/video-thumbnail.png')

	#special case for teacher materials link
	for el in soup.find_all('a', href=lambda x: x.startswith('teachermaterials')):
		el['onclick'] = 'downloadProtectedData()'
		el['href'] = '#'

	wf = open(curr_dir + ch, 'wb')
	wf.write(soup.encode_contents())
	wf.close()
print(str(n_processed) + " html files processed")
