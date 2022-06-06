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
