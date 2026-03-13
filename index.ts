// "X-Request-ID": "9822b60ce5bf38749db6",    
function randomRequestId(): string {
    const keymap = "abcdefghijklmnopqrstuvwxyz1234567890";

    let id = "";
    for (let i = 0; i < 20; i++) {
        id += keymap.charAt(Math.floor(Math.random() * keymap.length))
    }

    return id;
}

export type Config = {
    activityId: string | null,
    auth: string,
    awardId: string,
    userAgent: string,
    cookie: string,
};

const config: Config = JSON.parse(await Bun.file("ayp.json").text());

let headers = new Headers([
    ["User-Agent", config.userAgent],
    ["Accept", "application/json"],
    ["Accept-Language", "en-US,en;q=0.9"],
    ["Content-Type", "application/json"],
    ["Sec-Fetch-Dest", "empty"],
    ["Sec-Fetch-Mode", "cors"],
    ["Sec-Fetch-Site", "same-origin"],
    ["Priority", "u=0"],
    ["Authorization", config.auth],
    ["Cookie", config.cookie]
]);

let activityId = "";
if (config.activityId) {
    activityId = prompt("activity id?", config.activityId ?? "")!;
} else {
    activityId = prompt("activityId?")!;
}

if (!parseInt(activityId)) {
    console.error("not a number!")
    process.exit(1)
}

config.activityId = activityId;
await Bun.write("ayp.json", JSON.stringify(config, null, 4))

const rawStartDate = prompt("start date: (d/m/y)")!.split("/").map((e) => parseInt(e));
let startDate = new Date(rawStartDate[2]!, rawStartDate[1]! - 1, rawStartDate[0]! + 1).getTime();

const randomizeInterval = (prompt("randomize days? (y/N) ") ?? "").toLowerCase() == "y";
const randomizeDuration = (prompt("randomize duration? (y/N)") ?? "").toLowerCase() == "y";

console.log()

while (true) {
    // the minimum amount of days to get to next week
    const minDays = 7 - new Date(startDate).getDay() + 1;
    const randomDay = Math.round(Math.random() * 7) * Number(randomizeInterval);
    console.log(`+${randomDay} (min ${minDays})`);
    startDate += 60 * 60 * 24 * Math.min(randomDay, minDays) * 1000; // week in milliseconds

    const dateString = new Date(startDate).toISOString().replace(".000Z", "");

    console.log(dateString);

    const body = {
        "description": prompt("description: ") ?? "",
        "date": dateString,
        "duration": (Number(randomizeDuration) * Math.round(Math.random()) + 1) * 3600, // either 1 or 2 hours if randomized
        "activity": {
            "id": activityId
        }
    };

    headers.set("X-Request-ID", randomRequestId());

    const request = await fetch("https://www.onlinerecordbook.org/api/v1/activity-logs?userType=participant&locale=en-gb&timeZone=Asia/Hong_Kong&c=f", {
        credentials: "include",
        referrer: `https://www.onlinerecordbook.org/fo/dashboard/awards/${config.awardId}/activity/${activityId}/logs`,
        body: JSON.stringify(body),
        method: "POST",
        headers
    });

    if (!request.ok) {
        console.log(`${request.statusText}: ${await request.text()}\n`)
    } else {
        console.log();
    }
}
