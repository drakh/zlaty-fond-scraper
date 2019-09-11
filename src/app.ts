import * as h2t from "html-to-text";
import * as  cheerio from "cheerio";
import * as  request from "request";
import * as fs from "fs-extra";

const dir = "corpus";

const prefix = "https://zlatyfond.sme.sk";

const mainPage = `${prefix}/diela`;

const client = request.defaults({jar: true, followAllRedirects: true});

async function getAllWorkUrls(): Promise<string[]> {
    const body = await getPage(mainPage);
    const out: string[] = [];
    const c = cheerio.load(body);
    const links = c("#tu-budu-spisovatelia div span").toArray();
    for (const link of links) {
        const l = cheerio(link);
        const url = (l.find("a")).attr("href");
        if (url && !out.includes(url)) {
            out.push(url);
        }
    }
    return out;
}

async function getPage(uri: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        client.get({
            uri,
        }, ((err, _response, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(body);
            }
        }));
    });
}

async function getWork(url: string): Promise<void> {
    const t: string[] = [];
    const e = url.split("/");
    const fn = e.pop();
    let page = 1;
    while (true) {
        console.info("Downloading:", fn, page);
        const body = await getPage(`${prefix}${url}/${page}`);
        const c = cheerio.load(body);
        const o = h2t.fromString((c("#strednystlp-rubrika .odsadenie .chapter")).html() || (c("#strednystlp-rubrika .odsadenie div div")).html()).trim();
        if (o === "") {
            break;
        }
        t.push(o);
        page++;

    }
    await fs.writeFile(`${dir}/${fn}.txt`, h2t.fromString(t.join("\n")).trim());
}

(async () => {
    await fs.ensureDir(dir);
    const workUrls = await getAllWorkUrls();
    for (const url of workUrls) {
        await getWork(url);
    }
    process.exit(0);
})();
