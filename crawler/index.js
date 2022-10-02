const {writeFile} = require("fs/promises"),
cwd = process.cwd(),
{join, resolve} = require('path'),
dataLocation = join(cwd, "output.json"),
/** @type {import("puppeteer")} */
puppeteer = process.pkg ? require("./puppeteer") : require("puppeteer"),
/** @type {Record<string, [string[], string[]]>} */
data = require(dataLocation),
timeStarted = Date.now();
log("Process started");

async function main(){

    const browser = await puppeteer.launch(process.argv[2] === '--show' ? // Show window if --show flag is provided on execution
        { headless: false,defaultViewport: null, args:[
            "--start-maximized",
            "--user-data-dir=%localappdata%/OutlookCrawler/ChromiumUserData"
        ] } :
        {}
    );
    const page = (await browser.pages())[0];
    
    // Browser page setup
    log("Page created");
    // This is the User Agent of the author's browser at the time of writing.
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36")
    // Do not load fonts and images
    await page.setRequestInterception(true);
    page.on('request', req => {
        const type = req.resourceType();
        // if(req.url().match(/https:\/\/res-geo.cdn.office.net\/owamail\/\d{11}\.\d\d\/scripts\/owa\.\w+\.css/)) return req.respond({status: 200, contentType:"text/css", body:"jimmy{joe:is-good}"})
        if(['image', 'media'].some(value=>value === type)) req.abort();
        else req.continue();
    });

    // login
    await login(page, require(join(cwd, "cred.json")));
    log("Logged in to Outlook");

    // crawl data
    let crawled = 0;
    for(const student in data){
        if(data[student] !== null && data[student]?.length) continue;
        data[student] = await getDataFor(page, student);
        crawled++;
        if(crawled % 10 === 0){
            crawled = 0;
            saveData(data).then(()=>log("Data cached & saved to disk"));
        }
        if(data[student]?.length) log(`Crawled ${student} successfully`)
    }

    await saveData(data);
    await browser.close();
    log("All done!");
    process.exit(0)

}

// Actually run code
main()

// Error handling
    .catch(error=>{
        console.error(error);
        saveData(data).then(()=>process.exit(1));
    });

// Exit when key "x" is pressed.
process.stdin.setRawMode(true);
process.stdin.resume()
process.stdin.on('data', d=>{
    if(d.toString().toLowerCase()==='x'){
        console.log("Saving data and exiting");
        saveData(data).then(()=>process.exit(1));
    }
})

// Function Declarations

/**
 * Get the top 12 emailed people for given student EQ ID
 * @param {import('puppeteer').Page} page Instance of the browser page with Outlook opened
 * @param {string} eqid Email(without the @eq.edu.au suffix) of the person
 */
function getDataFor(page, eqid){

    return page.keyboard
        // Search for given EQ ID
        .press('Escape') // close previous modals
        .then(()=>page.click("div#searchBoxId-Mail input", {clickCount: 3})) // click on the search bar 3 times to ensure the next step overwrites the query
        .then(()=>page.type("div#searchBoxId-Mail input", `${eqid}@eq.edu.au`)) // type the new EQ ID into the search box
        .then(()=>page.waitForSelector(`div[aria-label*=${eqid}][aria-label^="People Suggestion"]`)) // wait for correct option to appear
        .then(()=>page.waitForFunction(()=>{
            const button = document.querySelector("div[role=option] > div > div > span > button > span > i > span > i");
            if(button?.isConnected) return button.click() || true;
        }))
        // Grab data from the contact info popup
        .then(()=>page.waitForFunction(()=>{ // switch to the section showing the most emailed people when the popup finishes loading
            const button = document.querySelector("button[name=Organisation]:not([disabled], [aria-disabled=true], [data-is-focusable=false])");
            if(button?.isConnected) return button.click() || true;
        }))
        .then(() => page.waitForSelector("ol.ms-FocusZone")) // wait for data
        .then(()=>page.waitForFunction(()=>{
            const nodes = document.querySelectorAll(".ms-Persona-primaryText .ms-TooltipHost div");
            if(nodes.length !== 13) return false;
            return Array.from(nodes).slice(1).map(node=>node.textContent.replace(/^.*?\((.*)\)/, "$1"))
        }))
        .then((value)=>value.jsonValue())
        .catch(e=>{
            if(e.name === "TimeoutError") { log(`Timed out while crawling ${eqid}`); return []; }
            else throw e;
        });
}

/**
 * Log into Outlook given creds
 * @param {import('puppeteer').Page} page 
 * @param {{username:string, password: string}}
 */
function login(page, {username, password}){
    return page.goto('https://outlook.office365.com')
    // Navigate through default Microsoft sign-in prompt
    .then(()=>page.waitForNavigation()) // wait for redirect to sign-in page
    .then(()=>page.type('input[name=loginfmt]', username))
    .then(()=>page.keyboard.press('Enter'))
    // Deal with custom EQ sign-in page
    .then(()=>page.waitForSelector('input[name="pf.pass"]'))
    .then(()=>page.type('input[name="pf.pass"]',password))
    .then(()=>page.keyboard.press('Tab'))
    .then(()=>page.keyboard.press('Space'))
    .then(()=>page.keyboard.press('Enter'))

    .then(()=>page.waitForSelector('input#idSIButton9')) // Stay signed in? prompt
    .then(()=>page.click('input#idSIButton9'))
    .then(()=>page.keyboard.press('Enter'))
    // function should finish when Outlook finishes loading
    .then(()=>
        // Load has 'finished' when the search box appears
        page.waitForSelector("div#searchBoxId-Mail input", {timeout: 60_000})
        .catch(e=>log("Failed to sign in to Outlook."))
    );
}

function log(...args){
    const t = Date.now();
    console.log(`${t-timeStarted<100?"\x1bc":"\x1b[2A\x1b[0J"}log[t=${Date.now() - timeStarted}]:`, ...args);
    process.stdout.write(centerText("Outlook Crawler")+centerText("        Press `x` to exit        ")+"\x1b[1E");
}

function centerText(text){
    const length = text.length,
    terminalWidth = process.stdout.columns;
    if(length > terminalWidth - 4) throw new Error("Text is too long for the terminal!")
    return `+${"-".repeat(Math.floor((terminalWidth - length-4)/2))} ${text} ${"-".repeat(Math.ceil((terminalWidth - length-4)/2))}+`
}

function saveData(data){ return writeFile(dataLocation, JSON.stringify(data)) }