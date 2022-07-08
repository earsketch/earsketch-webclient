export const makeTOC = (locale) => [
    {
        title: "Welcome Students and Teachers!",
        URL: `/${locale}/v2/welcome.html`,
        chapters: [],
        sections: [],
    },
    {
        title: "Unit 1: Compose and Add Beats",
        URL: `/${locale}/v2/unit-1.html`,
        chapters: [
            {
                title: "Get Started with EarSketch",
                URL: `/${locale}/v2/getting-started.html`,
                displayChNum: 1,
                sections: [
                    {
                        title: "Discover EarSketch",
                        URL: `/${locale}/v2/getting-started.html#discoverearsketch`,
                    },
                    {
                        title: "Create your first script!",
                        URL: `/${locale}/v2/getting-started.html#createanewscript`,
                    },
                    {
                        title: "The fitMedia() function",
                        URL: `/${locale}/v2/getting-started.html#fitmedia`,
                    },
                ],
            },
            {
                title: "Customize your first song",
                URL: `/${locale}/v2/your-first-song.html`,
                displayChNum: 2,
                sections: [
                    {
                        title: "The setTempo() function",
                        URL: `/${locale}/v2/your-first-song.html#settempo`,
                    },
                ],
            },
            {
                title: "Add some Beats!",
                URL: `/${locale}/v2/add-beats.html`,
                displayChNum: 3,
                sections: [
                    {
                        title: "Variables",
                        URL: `/${locale}/v2/add-beats.html#variables`,
                    },
                    {
                        title: "Beat Strings",
                        URL: `/${locale}/v2/add-beats.html#drumbeatstrings`,
                    },
                ],
            },
        ],
        sections: [],
    },
    {
        title: "Unit 2: Loops, Effects, Mixing",
        URL: `/${locale}/v2/unit-2.html`,
        chapters: [
            {
                title: "Loops and Layers",
                URL: `/${locale}/v2/loops-and-layers.html`,
                displayChNum: 4,
                sections: [
                    {
                        title: "for loops",
                        URL: `/${locale}/v2/loops-and-layers.html#forloops`,
                    },
                ],
            },
            {
                title: "Effects and Envelopes",
                URL: `/${locale}/v2/effects-and-envelopes.html`,
                displayChNum: 5,
                sections: [],
            },
        ],
        sections: [],
    },
]

export const makeSearchDoc = (locale) => [
    {
        title: "Get Started with EarSketch",
        id: `/${locale}/v2/getting-started.html`,
        text: "In this chapter you will learn how EarSketch works, you will place sounds (clips) into your music and see how to debug your code.",
    },
    {
        title: "Discover EarSketch",
        id: `/${locale}/v2/getting-started.html#discoverearsketch`,
        text: "In EarSketch, you will give the computer instructions by writing code. One line of code is one instruction. All the instructions together are called the program (these instructions can also be called an algorithm). Just like following a recipe in a cookbook can lead to cooked meal, executing a program in EarSketch can lead to a song. Where in the program does the code go? Find out in the video below!",
    },
    {
        title: "Create your first script!",
        id: `/${locale}/v2/getting-started.html#createanewscript`,
        text: "In EarSketch, each script that you write will correspond to one song. Let\u2019s see how to create a script:",
    },
    {
        title: "The fitMedia() function",
        id: `/${locale}/v2/getting-started.html#fitmedia`,
        text: "Now that you have created your first script, let\u2019s start working on your music!",
    },
    {
        title: "Debug your code",
        id: `/${locale}/v2/getting-started.html#debugging`,
        text: "Sometimes programmers make mistakes that cause code to work incorrectly, or not run at all. In programming, coding faults are called errors, or bugs. The process of finding and fixing bugs is called debugging. You can use debugging strategies, using the console.",
    },
    {
        title: "Chapter 1 Summary",
        id: `/${locale}/v2/getting-started.html#chapter1summary`,
        text: "A line of code is an instruction to be carried out by the computer. All the instructions together make up the program.",
    },
    {
        title: "Questions",
        id: `/${locale}/v2/getting-started.html#chapter-questions`,
        text: "Which of the following is NOT a panel in the EarSketch workspace?",
    },
    {
        title: "Customize your first song",
        id: `/${locale}/v2/your-first-song.html`,
        text: "In this chapter you will learn how to change the tempo of your song, add comments to your code, and upload your own sounds to enhance the message of your song.",
    },
    {
        title: "The setTempo() function",
        id: `/${locale}/v2/your-first-song.html#settempo`,
        text: "By now you\u2019ve noticed that when you create a new script, there are preexisting elements that you must absolutely keep for your code to work:",
    },
    {
        title: "Use Copyright Wisely",
        id: `/${locale}/v2/your-first-song.html#copyright`,
        text: "Copyright is the part of law that covers intellectual property, or ownership of creative work, like music. When using samples (small pieces of music) or remixing existing music, you need to give credit to the authors, and you can do so in the comments of your code. Before using sounds from other musicians and sharing your own music, learn more about copyright!",
    },
    {
        title: "Chapter 2 Summary",
        id: `/${locale}/v2/your-first-song.html#chapter2summary`,
        text: "Tempo is the speed at which a piece of music is played, specified in beats per minute (bpm). Tempo is tied to genre.",
    },
    {
        title: "Questions",
        id: `/${locale}/v2/your-first-song.html#chapter-questions`,
        text: "What does setTempo() allow you to do in EarSketch?",
    },
    {
        title: "Add some Beats!",
        id: `/${locale}/v2/add-beats.html`,
        text: "In this chapter you will learn how to make your own beats! We\u2019ll look at variables, a new function called makeBeat(), and different beat examples by genre.",
    },
    {
        title: "Variables",
        id: `/${locale}/v2/add-beats.html#variables`,
        text: "What is a variable? It\u2019s a name that will help the computer find a piece of information, or data. This works for all kinds of data. For example, a variable can point to:",
    },
    {
        title: "Loops and Layers",
        id: `/${locale}/v2/loops-and-layers.html`,
        text: "In this chapter you will learn about for loops and how you can create repetition in your code and music. We will also cover musical layers and textures as well as some debugging tips.",
    },
]
