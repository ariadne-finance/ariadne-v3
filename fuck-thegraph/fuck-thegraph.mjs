import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';

async function getApy() {
  const browser = await chromium.launchPersistentContext(
    path.join(import.meta.dirname, 'datadir'),
    {
      screen: {
        width: 2000,
        height: 2000
      },
      viewport: {
        width: 1500,
        height: 1080
      }
    }
  );

  const [ page ] = await browser.pages();

  await page.goto('https://app.aave.com/reserve-overview/?underlyingAsset=0xe91d153e0b41518a2ce8dd3d7944fa863463a97d&marketName=proto_gnosis_v3');

  const apyRootSelector = page.getByText('APY, variable');

  try {
    await apyRootSelector.waitFor();
  } catch (e) {
    return null;
  }

  const apyRootElement = await apyRootSelector.elementHandle();
  const apyElement = await apyRootElement.$('xpath=../../../div/p');
  const apyString = await apyElement.innerText();
  const apyFloat = parseFloat(apyString);

  await browser.close();

  if (Number.isNaN(apyFloat)) {
    console.error("Failed to update APY");
    return null;
  }

  return apyFloat;
}

async function cycleGetApy() {
  const apy = await getApy();
  if (apy) {
    fs.writeFileSync(path.join(import.meta.dirname, 'apy.json'), JSON.stringify({
      apy,
      updatedAt: Math.floor(Date.now() / 1000)
    }));
  }

  setTimeout(cycleGetApy, 60 * 60 * 1000);
}

cycleGetApy();
