function doPost(e) {
  let body = JSON.parse(e.postData.contents);
  Logger.log("Received: %s", body);

  // Slack Event APIのURL verification
  if (body.type === "url_verification") {
    return ContentService.createTextOutput(body.challenge).setMimeType(
      ContentService.MimeType.TEXT
    );
  }

  // app_mention以外のイベントは無視
  if (body.event.type !== "app_mention") {
    return ContentService.createTextOutput(
      "Cannot process this event type"
    ).setMimeType(ContentService.MimeType.TEXT);
  }
  let message = body.event.text;
  let channel = body.event.channel;
  let thread_ts = body.event.ts;
  try {
    // authorizationsに含まれるbotのIDを取得
    let botIds = body.authorizations
      .filter((u) => u.is_bot)
      .map((u) => u.user_id);

    // botIdsに含まれるIDをメッセージから削除
    let query = message
      .replace(new RegExp(`<@(${botIds.join("|")})>`, "g"), "")
      .trim();
    // 検索ワードがない場合はエラーを返す
    if (!query) {
      sendSlackMessage({
        channel: channel,
        thread_ts: thread_ts,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: ":warning: 検索ワードを認識できません",
              emoji: true,
            },
          },
        ],
      });
      return ContentService.createTextOutput("Error").setMimeType(
        ContentService.MimeType.TEXT
      );
    }

    // CacheServiceを使って多重起動防止
    const cacheKey = channel + ":" + thread_ts;
    if (CacheService.getScriptCache().get(cacheKey)) {
      return ContentService.createTextOutput("OK").setMimeType(
        ContentService.MimeType.TEXT
      );
    }
    CacheService.getScriptCache().put(cacheKey, query);

    // 検索処理
    return wpSearch(query, { channel, thread_ts });
  } catch (e) {
    sendSlackMessage({
      channel: channel,
      thread_ts: thread_ts,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: ":warning: エラーが発生しました",
            emoji: true,
          },
        },
      ],
    });
    return ContentService.createTextOutput("Error: " + e).setMimeType(
      ContentService.MimeType.TEXT
    );
  }
}

function wpSearch(query, eventData) {
  let baseUrl =
    PropertiesService.getScriptProperties().getProperty("WP_BASE_URL");
  let wpUser =
    PropertiesService.getScriptProperties().getProperty("WP_USERNAME");
  let wpPass =
    PropertiesService.getScriptProperties().getProperty("WP_PASSWORD");
  let url = baseUrl + "/wp-json/wp/v2/search?search=";
  let auth = Utilities.base64Encode(`${wpUser}:${wpPass}`);

  let response = UrlFetchApp.fetch(url + query, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  let contents = JSON.parse(response.getContentText()).map((content) => {
    return {
      title: content.title,
      url: content.url,
    };
  });
  let blockKit = createBlockKit(query, contents);
  let slackMessage = {
    channel: eventData.channel,
    thread_ts: eventData.thread_ts,
    blocks: blockKit,
  };
  return sendSlackMessage(slackMessage);
}

// Slackにメッセージを送信する
function sendSlackMessage(response) {
  let slacktoken =
    PropertiesService.getScriptProperties().getProperty("SLACK_BOT_TOKEN");
  let url = "https://slack.com/api/chat.postMessage";
  let options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + slacktoken,
    },
    payload: JSON.stringify(response),
  };
  UrlFetchApp.fetch(url, options);
  return ContentService.createTextOutput("OK").setMimeType(
    ContentService.MimeType.TEXT
  );
}

// 検索結果を元にBlock Kitを生成する
function createBlockKit(query, contents) {
  let blockKit = [];
  let template = JSON.parse(JSON.stringify(blockKitTemplate)); // ミューテーションを避けるためにディープコピーする
  // ヘッダーテキストにクエリを追加
  template.header.text.text = query + " " + template.header.text.text;
  // ヘッダーをblockKitに追加
  blockKit.push(template.header);
  // 結果数をblockKitに追加
  let resultCount = JSON.parse(JSON.stringify(template.resultCount));
  resultCount.elements[1].text = contents.length + resultCount.elements[1].text;
  blockKit.push(resultCount);
  // ディバイダーをblockKitに追加
  blockKit.push(template.divider);
  // 検索結果をblockKitに追加
  let results = JSON.parse(JSON.stringify(template.results));
  results.elements[0].elements = contents.map((content) => {
    let item = JSON.parse(JSON.stringify(template.item));
    item.elements[0].url = content.url;
    item.elements[0].text = content.title;
    return item;
  });
  blockKit.push(results);
  return blockKit;
}

// Block Kitのテンプレート
let blockKitTemplate = {
  header: {
    type: "header",
    text: {
      type: "plain_text",
      text: "を含む記事の検索結果",
      emoji: true,
    },
  },
  resultCount: {
    type: "context",
    elements: [
      {
        type: "image",
        image_url: "https://github.com/identicons/neko-room.png",
        alt_text: "your-logo",
      },
      {
        type: "mrkdwn",
        text: "件の記事が見つかりました！",
      },
    ],
  },
  divider: {
    type: "divider",
  },
  results: {
    type: "rich_text",
    elements: [
      {
        type: "rich_text_list",
        style: "bullet",
        elements: [],
      },
    ],
  },
  item: {
    type: "rich_text_section",
    elements: [
      {
        type: "link",
        url: "https://example.com",
        text: "page-title",
        style: {
          bold: true,
        },
      },
    ],
  },
};
