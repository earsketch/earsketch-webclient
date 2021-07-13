# Client Test: Script Sharing 2

Directions:
- Fill in "Results" section
- Mark pass/fail, like so: [X]
- Save file, like so: `client-test-script-sharing-2-2020-05-29-george.md`

------------------------------------------------------------------------------
# Results

Test info:
- Name: 
- Date: 
- OS/Version: 
- Browser/Version: 

Test results:
1. Pass [ ] Fail [ ], Comments: 
2. Pass [ ] Fail [ ], Comments: 
3. Pass [ ] Fail [ ], Comments: 
4. Pass [ ] Fail [ ], Comments: 
5. Pass [ ] Fail [ ], Comments: 
6. Pass [ ] Fail [ ], Comments: 
7. Pass [ ] Fail [ ], Comments: 
8. Pass [ ] Fail [ ], Comments: 
9. Pass [ ] Fail [ ], Comments: 
10. Pass [ ] Fail [ ], Comments: 

------------------------------------------------------------------------------
# Tests

Prep:

- 2 existing users
- User 1 creates script "script_for_anon_to_import.py", get share url
- User 1 creates script "script_for_user_to_import.py", get share url

1. Share link opened and imported by anonymous

- Logout

- Open share url for script_for_anon_to_import.py
    - Expected: script appears in "shared scripts" section

- Click button "import to edit"

- Expected: script appears in "scripts" section, removed from "shared scripts"
- Login as User 2
    - Expected: script appears in "scripts" section, not shown in "shared scripts"

2. Share link opened by anonymous, and imported by User 2

- Logout

- Open share url for script_for_user_to_import.py
    - Expected: script appears in "shared scripts" section

- Login as User 2
    - Expected: script appears in "shared scripts" section

- Click button "import to edit"
    - Expected: script appears in "scripts" section, not shown in "shared scripts"

3.

4.

5.

6.

7.

8.

9.

10.

