import { addDays, formatDate } from "date-fns";

export type Config = {
    activities: Activity[] | null,
    auth: string,
    awardId: string,
    userAgent: string,
    cookie: string,
};

export type Activity = {
    id: number,
    name: string
};

// "X-Request-ID": "9822b60ce5bf38749db6",    
function randomRequestId(): string {
    const keymap = "abcdefghijklmnopqrstuvwxyz1234567890";

    let id = "";
    for (let i = 0; i < 20; i++) {
        id += keymap.charAt(Math.floor(Math.random() * keymap.length))
    }

    return id;
}

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

if (!config.activities || config.activities.length < 3) {
    console.log("no activities saved, input them now (click on each activity and get the id from the url (eg, https://www.onlinerecordbook.org/fo/dashboard/awards/.../activity/<ACTIVITY_ID>/logs)\n");

    config.activities = [];
    while (config.activities.length < 3) {
        const activityId = parseInt(prompt("activity id?") ?? "");
        if (isNaN(activityId)) {
            console.log("invalid activity id");
            continue;
        }

        const activityName = prompt("activity name?") ?? "";

        console.log();

        config.activities.push({ id: activityId, name: activityName });
    }

    console.clear();
    await Bun.write("ayp.json", JSON.stringify(config, null, 4));
}

console.log("activities:");

let n = 0;
for (const { name, id } of config.activities) {
    console.log(`[${n + 1}]: ${name}: ${id}`);
    n++;
}

const activityIdx = parseInt(prompt("activity? (number)") ?? "");

// 1 indexed
if (activityIdx < 1 || activityIdx > config.activities.length) {
    throw new RangeError("invalid activity id");
}

const activityId = config.activities[activityIdx - 1]!.id;

const rawStartDate = prompt("\nstart date: (d/m/y)")!.split("/").map((e) => parseInt(e));
let startDate = new Date(rawStartDate[2]!, rawStartDate[1]! - 1, rawStartDate[0]!);
console.log(startDate.toDateString());

const randomizeInterval = (prompt("randomize days? (Y/n) ") ?? "y").toLowerCase() == "y";
const randomizeDuration = (prompt("randomize duration? (Y/n)") ?? "y").toLowerCase() == "y";

console.log()

let fail = false;
while (true) {
    let days = 7;

    if (!fail) {
        if (randomizeInterval) {
            // how many more days till the next week
            const minDays = 7 - new Date(startDate).getDay() + 1;
            // how many more days before it's the week after
            let maxDays = minDays + 6;

            {
                const now = new Date();
                const added = addDays(startDate, maxDays);
                if (added > now) {
                    const millis = added.getTime() - now.getTime();
                    maxDays = Math.round(millis / 60 / 60 / 24 / 1000);
                }
            }

            let randomDay = Math.round(Math.random() * maxDays);
            randomDay = Math.max(randomDay, minDays);
            days = randomDay;

            console.log(`+${days} (min ${minDays} max ${maxDays})`);
        }

        startDate = addDays(startDate, days);
    }

    const dateString = formatDate(startDate, "yyyy-MM-dd") + "T12:00:00"; // they don't use the correct format

    console.log(`${dateString} (${formatDate(startDate, "EEEE")})`);

    const body = {
        "description": prompt("description:") ?? "",
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
        fail = true;
        console.error(`${request.statusText}: ${await request.text()}\n`)
    } else {
        fail = false;
        console.log();
    }
}
