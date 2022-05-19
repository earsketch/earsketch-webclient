export const callbacks = {
    openShare: async (_: string) => {},
}

export async function getAdmins() {
    return [
        { username: "georgepburdell" },
        { username: "shimon" },
    ]
}

export async function getBroadcasts() {
    return [
        {
            created: new Date(),
            id: 440,
            message: { text: "Hello, World!", hyperlink: "", expiration: "3" },
            notification_type: "broadcast",
            sender: "bach",
            unread: false,
        },
    ]
}

export async function getAuth(endpoint: string) {
    if (endpoint === "/scripts/owned") {
        return [
            {
                created: "2022-01-01 12:00:00.0",
                file_location: "",
                modified: "2022-03-10 07:20:00.0",
                name: "mocked_song.py",
                run_status: 1,
                shareid: "abc",
                soft_delete: false,
                source_code: "from earsketch import *\nsetTempo(114)\n#music goes here\n",
                username: "mocked_user",
                saved: true,
                tooltipText: "",
            },
            {
                created: "2022-02-02 14:22:22.0",
                file_location: "",
                modified: "2022-03-10 16:20:00.0",
                name: "mocked_song_2.py",
                run_status: 1,
                shareid: "xyz",
                soft_delete: false,
                source_code: "from earsketch import *\nsetTempo(118)\n#todo: music\n",
                username: "mocked_user",
                saved: true,
                tooltipText: "",
            },
        ]
    }
    return null
}

export function isLoggedIn() { return true }
