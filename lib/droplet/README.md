# Files
python.coffee: Our modification of the droplet language specs including ES and additional reserved keywords by Python
treewalk.coffee: Modified version (for dropdown support) of the Python / droplet parser
controller.coffee: Copied from their "text-paste" branch
droplet-full.min.js: Compiled droplet package
droplet-full.min.js.map: This is used for debugging minified files

# Modificaiton / build procedure
- Clone the droplet repository <https://github.com/droplet-editor/droplet>
- Check out the master branch
- Replace the python.coffee in src/languages with our version
- Replace controller.coffee and treewalk.coffee in the src folder
- In the repository root directory, run the follwoing in Terminal:
```npm install```
```bower install```
```grunt all```