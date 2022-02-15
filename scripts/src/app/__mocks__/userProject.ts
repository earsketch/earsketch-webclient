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
