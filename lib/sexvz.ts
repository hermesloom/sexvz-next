import { JSDOM } from "jsdom";
import {
  OnlineUser,
  Profile,
  ProfileType,
  ThreadMessage,
  MessageBoxItem,
} from "./types";

export class SexVZ {
  static BASE_URL = "https://sexvz.net";

  sessionId: string | null = null;

  async setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  async login(username: string, password: string) {
    const response = await fetch(`${SexVZ.BASE_URL}/action_login.php`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      referrer: `${SexVZ.BASE_URL}/login.php`,
      body: new URLSearchParams({
        fp: "unset",
        name: username,
        pass: password,
        login: "Einloggen",
      }).toString(),
      method: "POST",
      mode: "cors",
    });

    // dump cookies
    this.sessionId = response.headers
      .getSetCookie()
      ?.find((cookie) => cookie.startsWith("PHPSESSID"))!
      .split(";")[0]
      .split("=")[1];

    if (!this.sessionId) {
      throw new Error("Failed to login");
    }

    console.info("Logged in with session id", this.sessionId);
  }

  async getOnlineUsers(): Promise<OnlineUser[]> {
    const response = await fetch(`${SexVZ.BASE_URL}/online.php`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `PHPSESSID=${this.sessionId}`,
      },
    });

    const dom = new JSDOM(await response.text());
    const document = dom.window.document;

    const onlineUsers = document.querySelector("#content > div:nth-child(6)");
    if (!onlineUsers) return [];
    return [...onlineUsers.querySelectorAll(".useroverview")].map((u) => {
      const idInput = u.querySelector(
        'input[name="id"]'
      ) as HTMLInputElement | null;
      const id = idInput?.value || "";
      const usernameAnchor = u.querySelector('a[style*="color:black"]');
      const username = usernameAnchor?.textContent?.trim() || "";
      const innerUseroverview = u.querySelector(".inner_useroverview");
      let location = "";
      if (innerUseroverview) {
        const node = [...innerUseroverview.childNodes].find(
          (n) =>
            n.nodeType === 3 &&
            n.textContent &&
            n.textContent.trim() &&
            !n.textContent.includes("Anschreiben") &&
            !n.textContent.includes("🟢")
        );
        if (node && node.textContent) location = node.textContent.trim();
      }
      const img = u.querySelector("img");
      const imageUrl = img?.src ? `${SexVZ.BASE_URL}/${img.src}` : "";
      return {
        id,
        username,
        location,
        profileUrl: `${SexVZ.BASE_URL}/view_profile.php?c=${id}`,
        imageUrl,
      };
    });
  }

  async getProfile(id: string): Promise<Profile> {
    const response = await fetch(`${SexVZ.BASE_URL}/view_profile.php?c=${id}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `PHPSESSID=${this.sessionId}`,
      },
    });

    const dom = new JSDOM(await response.text());
    const document = dom.window.document;

    const profile = document.querySelector("#content");
    if (!profile) throw new Error("Profile content not found");

    // Username, type, location from the <b> tag
    const mainInfo = profile.querySelector(".view_profile_text b");
    let username = "",
      type: ProfileType = ProfileType.Male,
      location = "";
    if (mainInfo) {
      // Example: Pagan666, weiblich aus  Nordrhein-Westfalen
      const match = mainInfo.textContent?.match(
        /^(.*?), (weiblich|männlich|pärchen) aus\s*(.*)$/i
      );
      if (match) {
        username = match[1].trim();
        const typeStr = match[2].toLowerCase();
        if (typeStr.includes("weiblich")) type = ProfileType.Female;
        else if (typeStr.includes("männlich")) type = ProfileType.Male;
        else if (typeStr.includes("pärchen")) type = ProfileType.Couple;
        location = match[3].trim();
      }
    }

    // Image URL
    const imageUrl =
      profile.querySelector(".view_profile_pic img")?.getAttribute("src") || "";

    // Orientation, age, alignment from the <u><b>Über mich:</b></u> section
    const aboutHtml =
      profile.querySelector(".view_profile_text")?.innerHTML || "";
    let orientation = "",
      age: number | undefined = undefined,
      alignment = "";
    const orientationMatch = aboutHtml.match(/Orientierung: ([^<]*)/);
    if (orientationMatch) orientation = orientationMatch[1].trim();
    const ageMatch = aboutHtml.match(/Alter: (\d+)/);
    if (ageMatch) age = parseInt(ageMatch[1], 10);
    const alignmentMatch = aboutHtml.match(/Ausrichtung: ([^<]*)/);
    if (alignmentMatch) alignment = alignmentMatch[1].trim();

    // Group memberships: all <a href="view_groups.php?id=...">[GroupName]</a>
    const groupMemberships: { id: string; name: string }[] = [];
    const groupLinks = profile.querySelectorAll(
      '.view_profile_text a[href^="view_groups.php?id="]'
    );
    groupLinks.forEach((a) => {
      const href = a.getAttribute("href") || "";
      const idMatch = href.match(/id=(\d+)/);
      const id = idMatch ? idMatch[1] : "";
      const name = a.textContent
        ? a.textContent.replace(/\[|\]/g, "").trim()
        : "";
      groupMemberships.push({ id, name });
    });

    // Writes to types: parse all present lines, assign to correct field, default to 0 if missing
    let male = 0,
      female = 0,
      couple = 0;
    const writesRegex =
      /Schreibt: ([\d,.]+) % an (männlich|weiblich|pärchen)/gi;
    let writesMatchArr: RegExpExecArray | null;
    while ((writesMatchArr = writesRegex.exec(aboutHtml)) !== null) {
      const value = parseFloat(writesMatchArr[1].replace(",", "."));
      const typeStr = writesMatchArr[2].toLowerCase();
      if (typeStr.includes("männlich")) male = value;
      else if (typeStr.includes("weiblich")) female = value;
      else if (typeStr.includes("pärchen")) couple = value;
    }

    // ID from the hidden input in the Anschreiben form
    const idInput = profile.querySelector(
      'form[action="msg_write.php"] input[name="id"]'
    ) as HTMLInputElement;
    const profileId = idInput?.value || id;

    // Build the profile object, omitting empty/undefined optional fields
    const result: Profile = {
      id: profileId,
      username,
      type,
      location,
      groupMemberships,
      imageUrl: imageUrl
        ? imageUrl.startsWith("http")
          ? imageUrl
          : `${SexVZ.BASE_URL}/${imageUrl}`
        : "",
      writesToTypes: { male, female, couple },
      profileUrl: `${SexVZ.BASE_URL}/view_profile.php?c=${profileId}`,
    };
    if (typeof age === "number") result.age = age;
    if (orientation) result.orientation = orientation;
    if (alignment) result.alignment = alignment;
    return result;
  }

  private async getMessagesPage(
    boxType: "in" | "out",
    page: number
  ): Promise<{
    items: MessageBoxItem[];
    hasUnread: boolean;
    totalPages?: number;
  }> {
    const url =
      boxType === "in"
        ? `${SexVZ.BASE_URL}/msg_in.php?p=${page}&full=1`
        : `${SexVZ.BASE_URL}/msg_out.php?p=${page}&full=1`;
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `PHPSESSID=${this.sessionId}`,
      },
    });
    const dom = new JSDOM(await response.text());
    const document = dom.window.document;
    const content = document.querySelector("#content");
    if (!content) return { items: [], hasUnread: false };
    const items: MessageBoxItem[] = [];
    let hasUnread = false;
    content.querySelectorAll(".item").forEach((el) => {
      // Get dialogId from div id
      const dialogId = el.getAttribute("id") || "";
      // Sender profile
      const senderProfileLink = el.querySelector(
        'a[href*="view_profile.php?c="][style*="color:grey"]'
      );
      let senderId = "",
        senderProfileUrl = "",
        senderName = "",
        senderLocation = "";
      if (senderProfileLink) {
        senderProfileUrl =
          `${SexVZ.BASE_URL}/` + senderProfileLink.getAttribute("href");
        const senderIdMatch = senderProfileLink
          .getAttribute("href")
          ?.match(/c=([a-zA-Z0-9]+)/);
        if (senderIdMatch) senderId = senderIdMatch[1];
        senderName = senderProfileLink.textContent?.trim() || "";
        // The location is usually the next text node after the sender link
        let next = senderProfileLink.nextSibling;
        while (next && next.nodeType !== 3) next = next.nextSibling;
        if (next && next.nodeType === 3 && next.textContent)
          senderLocation = next.textContent.trim();
      }
      // Sender image
      const senderImage = el.querySelector(
        'a[href*="view_profile.php?c="] img'
      );
      let senderImageUrl = "";
      if (senderImage) {
        const src = senderImage.getAttribute("src") || "";
        senderImageUrl = src.startsWith("http")
          ? src
          : `${SexVZ.BASE_URL}/${src}`;
      }
      // Subject
      let subject = "";
      // Find the <span class='csstabmsg'> containing 'Betreff:'
      const betreffSpan = Array.from(
        el.querySelectorAll("span.csstabmsg")
      ).find((span) =>
        (span as HTMLElement).textContent?.includes("Betreff:")
      ) as HTMLElement | undefined;
      let subjectLink: HTMLAnchorElement | null = null;
      if (
        betreffSpan &&
        betreffSpan.nextElementSibling &&
        betreffSpan.nextElementSibling.tagName === "FONT"
      ) {
        subjectLink = betreffSpan.nextElementSibling.querySelector("a");
        if (subjectLink) {
          subject = subjectLink.textContent?.replace(/\s+/g, " ").trim() || "";
        }
      }
      // Message URL: take from the <a> whose textContent is the subject
      let subjectMessageUrl = "";
      let subjectMsgId = "";
      if (subjectLink && subject) {
        subjectMessageUrl =
          `${SexVZ.BASE_URL}/` + subjectLink.getAttribute("href");
        const msgMatch = subjectLink.getAttribute("href")?.match(/msg=(\d+)/);
        if (msgMatch) subjectMsgId = msgMatch[1];
      }
      // Date
      let date = "";
      const vomLabel = Array.from(el.querySelectorAll("span.csstabmsg b")).find(
        (b) => (b as HTMLElement).textContent?.trim() === "Vom:"
      ) as HTMLElement | undefined;
      if (vomLabel && vomLabel.parentElement) {
        let node = vomLabel.parentElement.nextSibling;
        while (
          node &&
          (node.nodeType !== 3 ||
            !(node.textContent && node.textContent.trim()))
        )
          node = node.nextSibling;
        if (node && node.nodeType === 3 && node.textContent) {
          date = node.textContent.trim();
        }
      }
      // Parse date string as German time zone
      let dateObj: Date = new Date(NaN);
      if (date) {
        // date is in format D{1,2}.M{1,2}.YYYY H{1,2}:m{1,2}:s{1,2}
        const deTz = Intl.DateTimeFormat("de-DE", {
          timeZone: "Europe/Berlin",
        }).resolvedOptions().timeZone;
        const match = date.match(
          /(\d{1,2})\.(\d{1,2})\.(\d{4}) (\d{1,2}):(\d{1,2}):(\d{1,2})/
        );
        if (match) {
          const [_, day, month, year, hour, min, sec] = match;
          // Construct a date string in ISO 8601 format
          // Pad to two digits for month, day, hour, min, sec
          const pad = (n: string) => (n.length === 1 ? "0" + n : n);
          const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(
            min
          )}:${pad(sec)}`;
          // See previous logic for time zone handling
          const localDate = new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(min),
            Number(sec)
          );
          dateObj = new Date(localDate.getTime());
        }
      }
      // Unread
      const unread = el.innerHTML.includes("[ungelesen]");
      const deleted = el.innerHTML.includes("[gelöscht]");
      if (unread) hasUnread = true;
      if (subjectMessageUrl) {
        items.push({
          id: subjectMsgId,
          dialogId,
          subject,
          unread,
          deleted,
          date: dateObj,
          user: {
            id: senderId,
            name: senderName,
            location: senderLocation,
            profileUrl: senderProfileUrl,
            imageUrl: senderImageUrl,
          },
          messageUrl: subjectMessageUrl,
        });
      }
    });
    // Parse total pages if on first page
    let totalPages: number | undefined = undefined;
    if (page === 0) {
      const pager = Array.from(content.querySelectorAll('a[href^="?p="]'));
      if (pager.length > 0) {
        // Find the highest page number
        totalPages = Math.max(
          ...pager
            .map((a) => parseInt((a as HTMLAnchorElement).textContent || "0"))
            .filter((n) => !isNaN(n))
        );
      } else {
        // Only one page
        totalPages = 0;
      }
    }
    return { items, hasUnread, totalPages };
  }

  private async getMessages(
    boxType: "in" | "out",
    onlyUnread?: boolean
  ): Promise<MessageBoxItem[]> {
    let allItems: MessageBoxItem[] = [];
    let page = 0;
    let totalPages: number | undefined = undefined;
    const keepGoing = true;
    while (keepGoing) {
      const {
        items,
        hasUnread,
        totalPages: foundPages,
      } = await this.getMessagesPage(boxType, page);
      allItems = allItems.concat(items);
      if (page === 0 && typeof foundPages === "number") totalPages = foundPages;
      if (onlyUnread) {
        // Stop if no unread on this page
        if (!hasUnread) break;
      }
      page++;
      if (typeof totalPages === "number" && page > totalPages) break;
    }
    if (onlyUnread) {
      return allItems.filter((item) => item.unread);
    }
    return allItems;
  }

  public async getInbox(onlyUnread?: boolean): Promise<MessageBoxItem[]> {
    return this.getMessages("in", onlyUnread);
  }

  public async getOutbox(): Promise<MessageBoxItem[]> {
    return this.getMessages("out");
  }

  public async getThread(
    msgId: string,
    dialogId: string
  ): Promise<ThreadMessage[]> {
    const response = await fetch(
      `${SexVZ.BASE_URL}/msg_read.php?msg=${msgId}&d=${dialogId}#go`,
      {
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: `PHPSESSID=${this.sessionId}`,
        },
      }
    );
    const dom = new JSDOM(await response.text());
    const document = dom.window.document;
    const content = document.querySelector("#content");
    if (!content) return [];
    // Each message is a div with border: 3px solid white
    const threadDivs = Array.from(
      content.querySelectorAll('div[style*="border: 3px solid white"]')
    ) as HTMLElement[];
    const messages = threadDivs.map((div) => {
      // Sender info
      const headerDiv = div.querySelector(
        'div[style*="border:0px solid black"]'
      );
      let senderId = "",
        senderName = "",
        senderProfileUrl = "",
        senderImageUrl = "",
        date: Date = new Date(NaN);
      if (headerDiv) {
        const profileLink = headerDiv.querySelector(
          'a[href*="view_profile.php?c="]'
        );
        if (profileLink) {
          senderProfileUrl =
            `${SexVZ.BASE_URL}/` + profileLink.getAttribute("href");
          const senderIdMatch = profileLink
            .getAttribute("href")
            ?.match(/c=([a-zA-Z0-9]+)/);
          if (senderIdMatch) senderId = senderIdMatch[1];
          const img = profileLink.querySelector("img");
          if (img) {
            const src = img.getAttribute("src") || "";
            senderImageUrl = src.startsWith("http")
              ? src
              : `${SexVZ.BASE_URL}/${src}`;
          }
        }
        const nameMatch = headerDiv.innerHTML.match(/<b>([^<]+)<\/b>/);
        if (nameMatch) senderName = nameMatch[1].trim();
        // Date: ', am DD.MM.YYYY HH:mm:ss'
        const dateMatch = headerDiv.textContent?.match(
          /, am (\d{1,2})\.(\d{1,2})\.(\d{4}) (\d{1,2}):(\d{1,2}):(\d{1,2})/
        );
        if (dateMatch) {
          const [_, day, month, year, hour, min, sec] = dateMatch;
          const localDate = new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(min),
            Number(sec)
          );
          date = new Date(localDate.getTime());
        }
      }
      // Message text and images are in the next sibling div with word-wrap
      let message = "";
      let images: string[] = [];
      const msgDiv = (div as HTMLElement).querySelector(
        'div[style*="word-wrap: break-word"]'
      );
      if (msgDiv) {
        // Extract text content (excluding images)
        message = Array.from(msgDiv.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent?.trim() || "")
          .join(" ")
          .trim();
        // Extract all <img> tags (excluding profile image)
        images = Array.from(msgDiv.querySelectorAll("img")).map((img) => {
          const src = img.getAttribute("src") || "";
          return src.startsWith("http") ? src : `${SexVZ.BASE_URL}/${src}`;
        });
      }
      const result: ThreadMessage = {
        senderId,
        senderName,
        senderProfileUrl,
        senderImageUrl,
        date,
        message,
      };
      if (images.length > 0) result.images = images;
      return result;
    });
    return messages;
  }

  public async sendMessage({
    dialogId,
    text,
    photo,
    name,
    title,
  }: {
    dialogId: string;
    text: string;
    photo: string;
    name: string;
    title: string;
  }) {
    const boundary =
      "----geckoformboundary" +
      Math.random().toString(16).slice(2) +
      Math.random().toString(16).slice(2);
    const parts = [
      { name: "photo", value: photo },
      { name: "name", value: name },
      { name: "title", value: title },
      { name: "text", value: text },
      { name: "id", value: dialogId },
    ];
    let body = "";
    for (const part of parts) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${part.name}"`;
      body += "\r\n\r\n";
      body += (part.value || "") + "\r\n";
    }
    body += `--${boundary}--\r\n`;
    const headers: Record<string, string> = {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      Cookie: `PHPSESSID=${this.sessionId}`,
    };
    const response = await fetch(`${SexVZ.BASE_URL}/ajax2.php`, {
      headers,
      body,
      method: "POST",
    });
    return response;
  }

  public async getAllThreads(): Promise<MessageBoxItem[]> {
    const [inbox, outbox] = await Promise.all([
      this.getInbox(),
      this.getOutbox(),
    ]);

    const threadMap = new Map<string, MessageBoxItem>();

    for (const msg of [...inbox, ...outbox]) {
      if (!msg.dialogId) continue;
      // msg.user.name is always the partner
      if (!threadMap.has(msg.dialogId)) {
        threadMap.set(msg.dialogId, msg);
      } else {
        const thread = threadMap.get(msg.dialogId)!;
        if (msg.date > thread.date) thread.date = msg.date;
      }
    }

    const threads = Array.from(threadMap.values());
    threads.sort((a, b) => b.date.getTime() - a.date.getTime());
    return threads;
  }
}
