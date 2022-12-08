# earsketch-webclient

The React web browser client for EarSketch


## Local client build

1. Clone earsketch-webclient and earsketch-curriculum into the same directory

```bash
git clone https://github.com/GTCMT/earsketch-webclient.git
git clone https://github.com/GTCMT/earsketch-curriculum.git
```

2. Run curriculum `local_dev_curriculum_asciidoc_builder.sh` _(python3 and BeautifulSoup4 package required)_

```bash
cd earsketch-curriculum/scripts

./local_dev_curriculum_asciidoc_builder.sh /path/to/earsketch-curriculum
# creates earsketch-curriculum/curriculum-local/*.html
# creates earsketch-curriculum/curriculum-local/curr_toc.js
# creates earsketch-curriculum/curriculum-local/curr_pages.js
# creates earsketch-curriculum/curriculum-local/curr_pages.js
```

3. Confirm the earsketch-webclient/curriculum link is working _(windows only)_

```bash
ls -l earsketch-webclient/curriculum
# points to ../earsketch-curriculum/curriculum-local/

# if you do not see directory contents, including curr_toc.js, then re-create it
cd earsketch-webclient
rm curriculum
ln -s ../earsketch-currciulum/curriculum-local curriculum
```

4. Serve the client with npm

```bash
npm install
grunt less     # prepares css files
npm run serve  # serves client
```
