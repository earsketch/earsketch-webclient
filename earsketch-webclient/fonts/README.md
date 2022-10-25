# Icons and Fonts

This readme document describes how to include font-based icons in earsketch using IcoMoon.

##Icons

We've merged all icons to use the IcoMoon ultimate pack. The original pack can be found on the earsketch google drive under the Technology/Icon Library directory. We don't include the entire pack when earsketch loads to save time and server load. To add additional icons, download the upack in this directoy. 

Find the file selection.json
Go to https://icomoon.io/app/#/select
drag selection.json into the web application. This will give you access to the entire IcoMoon Ultimate pack. 
Drag the selection.json file located in the earsketch/webclient/fonts/icomoon_ultimate directory. This will display the current selection of fonts used in earsketch. Make sure the current selection and IcoMoon Ultimate group is expanded in the app. 

To add an icon, simply select it. See that your selection counter at the bottom will increase. Currently as of Feb 25, 2016, we have 156 icons selected. 

To use these in earsketch click Generate Font and download the zip. Replace the current contents (font directory, selection.json, and style.css) in earsketch/webclient/fonts/icomoon_ultimate with the version from the downloaded zip. 

Note: if searching, after selecting, make sure to clear your query to ensure that you download the entire selection.