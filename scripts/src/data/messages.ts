const ESMessages = {
    
    "dawservice": {
        "effecttrackwarning": "Adding an effect track before the audio track is created"
    },
    "idecontroller": {
        "soundcloud": {
            "description": "EarSketch helps you learn core topics in computer science, music, and music technology in a fun, engaging environment. You learn to code in Python or JavaScript, two of the most popular programming languages in the world, while manipulating loops, composing beats, and applying effects to a multi-track digital audio workstation. To learn more about EarSketch, visit http://earsketch.gatech.edu.",
            "share": "To load this track in EarSketch, visit",
            "code": "This music was generated by the following code:"
        },
        "closealltabs":"This will close all open tabs. Are you sure you want to proceed?",
        "overwrite": "That name already exists. Please provide a unique name or first rename the existing script.",
        "illegalname": "Please use only regular characters, numbers, or _ in file names.",
        "savefailed": "Script could not be saved to the cloud. Please save your script offline to avoid losing changes.",
        "saveallfailed": "Some scripts could not be saved to the cloud. Please save your changes offline to avoid losing them.",
        "blocksyntaxerror": "Failed to switch to the block mode. Please make sure that there is no syntax error in the code."
    },
    "esaudio": {
        "stringindex": "Beat string index is out of bounds",
        "nonlistRangeError": "beat strings can only contain 0, +, or -",
        "tempoRange": " Tempo must be between 45 bpm and 220 bpm",
        "pitchshiftTooLong": "The clip is too long for the PITCHSHIFT effect. The max length is 5 minutes. Please use a shorter clip.",
        "analysisTimeTooShort": "The analysis time window (endTime - startTime) is too small"
    },
    "general": {
        "unauthenticated": "Please login before using this feature...",
        "shortname": "Please provide a name that is at least 3 characters long.",
        "loginsuccess": "Login successful",
        "loginfailure": "Your username or password is incorrect. Please try logging in again or register a new account.",
        "soundrenamed": "Successfully renamed sound",
        "renameSoundEmpty": "Sound name cannot be empty (or only contain \"_\")!",
        "renameSoundSpecialChar": "Removing special characters in the renaming process...",
        'illegalCharacterInUserID': 'Please use only regular characters, numbers, or _ in the user ID.',
        'complexitySyntaxError': 'Failed to run the code indicator. There might be a syntax error in your code.'
    },
    "user": {
        "scriptsuccess": "List of scripts in Load script list successfully updated.",
        "scriptcloud": "Script successfully saved to the cloud.",
        "allscriptscloud": "All unsaved scripts successfully saved to the cloud.",
        "badsharelink": "Error opening a script. The share link in the URL may be wrong.",
        "scriptcopied": "Script successfully copied.",
        "teachersLink": "Teacher account requires your full name and a unique email address for logging in to the TEACHERS website. Please provide them in the Edit Profile menu in the account options.",
        "infoRequired": "First Name, Last Name, and E-mail Address are required for a teacher account.",
        "emailConflict": "Failed to update the user profile. Please check that this E-mail address is not used in other EarSketch accounts. (Hint: If you cannot remember such user account, try logging out and choose Reset Account -> Forgot Your Password? option. This lets you retrieve the account tied to the E-mail address.",
        "teacherSiteLoginError": "Error logging in to the TEACHERS website! ",
        "promptFixAtTeacherSite": ". Please try changing the user information in Edit Profile.",
        "teachersPageNoAccess": "You must have a teacher account to access this page. You can request one at the CONTACT page."
    },
    "uploadcontroller" : {
        "freesoundSelection": "Please select a sound from the Freesound search results...",
        "userAuth" : "Not authenticated User ...",
        "wavsel": "Please select a valid audio file ...",
        "invalidfile": " is not a valid audio file ...",
        "undefinedconstant": "Undefined is not a valid constant...",
        "alreadyused": " is already used as a constant",
        "invalidconstant": " is not valid constant...",
        "tempointeger": "Tempo must be a positive number...",
        "bigsize": " Sorry, the audio file cannot be longer than 30 seconds.",
        "timeout": "Timeout Communication Error Uploading Sound ...",
        "uploadsuccess": "Success uploading custom sound",
        "commerror": "Communication Error uploading sound ...",
        "commerror2": "Communication Error uploading sound ...",
        "nosupport": "Sorry, Quick Record is currently only supported in Chrome, and partially supported in FireFox.",
        "chrome_mic_noaccess": "You have blocked access to your microphone. To enable recording, click the camera icon in your browser's address bar and select 'ask if earsketch.gatech.edu wants to access your microphone'. Then try the Quick Record feature again and be sure to allow microphone access.",
        "ff_mic_noaccess": "You have blocked access to your microphone. To enable recording, click the microphone icon in your browser's address bar to share your microphone with EarSketch. If no microphone icon appears, click the earth icon to unblock microphone access. Then try the Quick Record feature again and be sure to share microphone access.",
    },
    "createaccount" : {
        "usernameinvalid": "The username you entered is not valid. Usernames must not start with a number and cannot include spaces or special characters.",
        "pwdfail": "Your password confirmation is not the same as your password.",
        "pwdlength": "Your password is too short. Passwords must be at least 5 characters long.",
        "timeout": "Timeout communication error.",
        "nopwd": "Please enter password before creating user",
        "usernamelength": "Username length is too long, try with a shorter username ",
        "accountsuccess": "User account created succesfully ...",
        "useralreadyexists": "Provided username or email already exists. Please try 'Forgot Password' feature if you cannot access your account.",
        "commerror": "Communication error ...",
        "commerror2": "Communication error ..."
    },
    "forgotpassword" : {
        "fail": "Forgot Password failed...",
        "success": "Password Reset instructions was successfully sent to your email ..."
    },
    "changepassword" : {
        "pwdauth": "Old password wrong. Password could not be changed.",
        "pwdfail": "Your password confirmation was not the same as your password. Password could not be changed.",
        "pwdlength": "Your password is too short. Passwords must be at least 5 characters long.",
        "timeout": "Timeout communication error ...",
        "commerror": "Communication error ...",
        "commerror2": "Communication error ..."
    },
    "downloadprotecteddata": {
        "nopassword": "Please enter the password.",
        "servertimeout": "The was some problem at our end. Please try again.",
        "unexpectederror": "Unexpected error. Please try again or report error from the options menu."
    },
    "download":{
        "safari_zip": 'In Safari, the downloaded file will be named "Unknown", "Unknown-2", etc. and you will need to rename it to "your_script_name.zip" (Don\'t forget the .zip at the end!) It may also take some time before the download begins depending on the file size. We generally recommend using Chrome or Firefox for downloading multi-track project.',
        "compileerror": "Script could not compile successfully.",
        "emptyerror": "Song is empty!",
        "rendererror": "There was a problem rendering the script.",
    },
    "shareScript": {
        "menuDescriptions": {
            "viewOnly": "I want someone to see my script. (They cannot edit.)",
            "collaboration": "I want someone to be able to edit my script.",
            "embedded": "I want to be able to embed my song on a website.",
            "soundCloud": "I want to publish my song on SoundCloud."
        },
        "preemptiveSave": 'After putting a user name, you need to press Enter, Tab, Space, or click outside before hitting SAVE. This step checks if the user name exists.'
    }
};

export default ESMessages