require("dotenv").config();

const fs = require("fs");
const path = require("path");

const twit = require("twit");
const config = {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
};

if (!process.env.HASHTAG_RETWEET) {
  throw new Error("HASHTAG_RETWEET at .env hasn't been set!")
}

const hashtag = process.env.HASHTAG_RETWEET.split(",").map((o) => "#" + o.trim()).join(" OR ");

if (!process.env.CHECK_TIME) {
  throw new Error("CHECK_TIME at .env hasn't been set!")
}
const timer = Number(process.env.CHECK_TIME);

if (!process.env.RETWEET_COUNT) {
  throw new Error("CHECK_TIME at .env hasn't been set!")
}

const retweet_count = Number(process.env.RETWEET_COUNT);


console.log(hashtag + " is being used for retweets");

const latest_id_path = path.resolve(__dirname, "latest_id.txt");
console.log(latest_id_path);

const Twitter = new twit(config);

let retweetTags = async function () {
  let latest_id = 0;

  if (fs.existsSync(latest_id_path)) {
    latest_id = fs.readFileSync(latest_id_path, "utf8");
    if (!latest_id) {
      latest_id = 0;
    }
  }

  console.log("Latest ID", latest_id);

  try {
    const { data } = await Twitter.get("search/tweets", {
      q: hashtag,
      result_type: "recent",
      lang: "en",
      count: 100,
      since_id: latest_id
    });

    let statuses = data.statuses.filter((o) => !o.retweeted && !o.retweeted_status);
    statuses = statuses.reverse();
    statuses = statuses.splice(0, retweet_count)

    console.log("Tweet Count Check:", statuses.length)

    if (statuses && statuses.length > 0) {
      fs.writeFileSync(latest_id_path, statuses[statuses.length - 1].id_str)

      for (const status of statuses) {
        // the post action
        try {
          await Twitter.post("statuses/retweet/:id", {
            id: status.id_str
          });
          console.log("@" + status.user.screen_name + " with post id " + status.id_str + " were retweeted");
        } catch (e) {
          console.error("@" + status.user.screen_name + " with post id " + status.id_str + " couldn't be  retweeted -> " + e.message);
        }
      }
    }
  } catch (err) {
    // catch all log if the search/retweet could not be executed
    console.error("Err:", err);
  }
};

retweetTags();
setInterval(() => {
  retweetTags();
}, 1000 * timer)
