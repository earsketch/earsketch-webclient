# Client Test: Script Collaboration

Directions:
- Fill in "Results" section
- Mark pass/fail, like so: [X]
- Save file, like so: `client-test-script-collaboration-2020-05-29-george.md`

------------------------------------------------------------------------------
# Results

Test info:
- Name: Sean Tillman
- Date: 7/6/2022
- OS/Version: MacOS 10.15.7
- Browser/Version: Chrome (103.0.5060.53) as 1st account AND Firefox (102.0.1) as 2nd account

Test results:

1. Pass [ X ] Fail [ ], Comments: Requires 2nd account refresh for both getting notification and seeing a renaming change.
2. Pass [ X ] Fail [ ], Comments: 
3. Pass [ X ] Fail [ ], Comments: Cursor misalignment: cursor does not move until text is typed (and then is 1 letter behind). Refresh did not solve the issue.
4. Pass [ X ] Fail [ ], Comments: Updates in different ways. Closing account 2's tab will make it show grey for account 1 only after account 1 clicks in the edit area to trigger a sync. Reopening account 2's will show both grey. When 2 clicks the edit area, account 1 will show up colored, but the same is not true on account 1's side. When opening or refreshing the page, this trend continues with both being grey until an activity occurs in the edit area. Banner notifications of entering/leaving seem to work mostly correctly.
5. Pass [ X ] Fail [ ], Comments: 
6. Pass [ X ] Fail [ ], Comments: 
7. Pass [ ] Fail [ ], Comments: 
8. Pass [ ] Fail [ ], Comments: 
9. Pass [ ] Fail [ ], Comments: 
10. Pass [ ] Fail [ ], Comments: 

------------------------------------------------------------------------------
# Tests

Open 2 different browsers, login as different users

1. Add/Remove Collaborators
As the script owner (1st account), add or remove the other account as a 
collaborator from the share menu. Also try renaming the script. Check it in the 
other account's browser.

2. Collaborator's View
As a collaborator (2nd account), check if the script is added to / removed 
from the shared-script browser. Try leaving the collaboration by hitting the 
"Delete" button in the browser.

3. Simultaneous Editing
Check the script editing, cursor moving and selecting are reflected to the 
other account's view. Try to create real-time edit conflicts if doable, and 
see if it is automatically resolved. If not (with unresolved sync errors), 
try to reproduce.

4. Collaborator Live Status
Open, switch tabs, or close the collaborative script. Check if the person 
"enters" or "exits" the collaborative session in the other account's view.

5. Log out
Log out while the collaborative script is open. Check if the person properly 
exists and has no access to the collaborative session.

6. Save
Save script versions by CMD+S (CTRL+S) or compiling as the owner. See if you 
can revert the script to a previous version.

7. (future test)


8. (future test)


9. (future test)


10. (future test)

