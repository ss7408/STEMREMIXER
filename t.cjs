const { chromium } = require("playwright-core");
(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
  const page = await browser.newPage({ viewport: { width: 1160, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  const step = async (n, fn) => { try { await fn(); console.log("OK  " + n); } catch (e) { console.log("FAIL " + n + " :: " + e.message); errors.push(n + ": " + e.message); } };

  await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
  await page.getByText("TRY DEMO").click();
  await page.waitForSelector(".cell:not(.ghost)", { timeout: 25000 });

  await step("playhead sweeps for a playing loop", async () => {
    await page.locator(".cell").nth(0).click(); // play drum loop + select
    // wait past the bar quantize so it's actually playing
    await page.waitForTimeout(2900);
    const read = () => page.locator(".wave-head").evaluate((el) => ({ op: getComputedStyle(el).opacity, left: el.style.left }));
    const a = await read();
    await page.waitForTimeout(500);
    const b = await read();
    if (a.op !== "1") throw new Error("playhead not visible: " + JSON.stringify(a));
    if (a.left === b.left) throw new Error("playhead not moving: " + a.left + " == " + b.left);
    console.log("    head", a.left, "->", b.left);
  });

  await step("two loops phase-lock (both start on a bar)", async () => {
    await page.locator(".cell").nth(1).click(); // second loop
    await page.waitForTimeout(2900);
    const playing = await page.locator(".cell.on").count();
    if (playing < 2) throw new Error("expected >=2 playing, got " + playing);
  });

  await step("add a sample via the library input", async () => {
    const before = await page.locator(".lib-row").count();
    await page.setInputFiles(".lib-list input[type=file]", "/tmp/test-add.wav");
    await page.waitForTimeout(800);
    const after = await page.locator(".lib-row").count();
    if (after !== before + 1) throw new Error(`rows ${before} -> ${after}`);
    console.log("    library rows", before, "->", after);
  });

  await page.screenshot({ path: "/tmp/w-green.png" });
  await browser.close();
  console.log("errors:", errors.length);
  errors.forEach((e) => console.log(" • " + e));
  process.exit(errors.length ? 1 : 0);
})();
