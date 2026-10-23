async (page) => {
// Run with playwright-cli run-code after opening the real /simulator and video-start.
const observed = [];
page.on('request', request => observed.push({ method: request.method(), url: request.url() }));
const started = Date.now();
const until = async seconds => {
  const delay = seconds * 1000 - (Date.now() - started);
  if (delay > 0) await page.waitForTimeout(delay);
};
await until(2);
await page.getByRole('button', { name: 'Open fixed demo →' }).click();
const app = page.frameLocator('#app-frame').frameLocator('iframe');
await app.getByRole('heading', { name: 'Everything on your mind.' }).waitFor();
await until(7);
// Display-only resize harness; original resource, bridge, data and controls are unchanged.
await page.evaluate(() => {
  const frame = document.querySelector('#app-frame');
  frame.style.cssText = 'position:fixed;inset:0;width:1280px;height:800px;z-index:999;border-radius:0';
});
await until(12);
await app.getByRole('button', { name: 'Stage 1: Topic clusters', exact: true }).click();
await until(17);
await app.getByRole('button', { name: 'Stage 2: Shared roots', exact: true }).click();
await until(23);
await app.getByRole('button', { name: /I have not chosen how to describe my work/ }).click();
await app.getByText('Writing one sentence is a step I can take myself.', { exact: true }).waitFor();
await until(33);
await app.locator('#details').evaluate(element => element.scrollTo({ top: 250, behavior: 'smooth' }));
await until(43);
await app.getByRole('button', { name: 'Close details', exact: true }).click();
await until(45);
await app.getByRole('button', { name: 'Stage 3: Focus', exact: true }).click();
await until(60);
await app.getByRole('button', { name: 'Read thoughts', exact: true }).click();
await until(64);
await app.getByRole('button', { name: 'Close details', exact: true }).click();
await until(68);
if (observed.some(item => !/^http:\/\/127\.0\.0\.1:318[01]\//.test(item.url))) throw Error('Unexpected external request');
return { elapsed: (Date.now() - started) / 1000, requests: observed, finalTitle: await app.locator('#title').textContent(), bubbles: await app.locator('.bubble').count() };
}
