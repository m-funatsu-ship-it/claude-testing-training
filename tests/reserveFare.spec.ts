import { test, expect } from '@playwright/test';

// ¥1,234 形式の金額テキストを整数に変換するヘルパー
function parseFare(text: string | null): number {
  return parseInt((text ?? '').replace(/[¥,\s]/g, ''), 10);
}

// ════════════════════════════════════════════════════════════════
// チケット予約フロー（子供料金の適用確認）
//
// テストケース: TC-R-001
// 大人1名（20歳）＋子供1名（5歳）で予約し、
// 合計金額が「大人運賃 × 2」より少ないことを検証する。
// 子供料金 = 基本運賃 × 60% − 割引額 であり大人より安いため、
// 正しく計算されていれば合計 < 大人運賃 × 2 が成立する。
// ════════════════════════════════════════════════════════════════
test.describe('チケット予約フロー', () => {

  test('TC-R-001: 子供料金の適用確認', async ({ page }) => {

    // 搭乗日を今日から7日後に設定（yyyy/MM/dd 形式）
    const boarding = new Date();
    boarding.setDate(boarding.getDate() + 7);
    const dateStr = [
      boarding.getFullYear(),
      String(boarding.getMonth() + 1).padStart(2, '0'),
      String(boarding.getDate()).padStart(2, '0'),
    ].join('/');

    // ────────────────────────────────────────────────────────────
    // 1. ログインして空席照会画面へ遷移
    // ────────────────────────────────────────────────────────────
    await page.goto('auth/login?form');
    await page.fill('#membershipNumber', '0000000001');
    await page.fill('#password', 'aaaaa11111');
    await page.click('#login-btn');
    await expect(page).toHaveURL(/\/ticket\/search/);

    // ────────────────────────────────────────────────────────────
    // 2. 検索条件を入力して照会
    //    片道 / 東京（羽田）→ 大阪（伊丹）/ 搭乗日7日後 / エコノミー
    // ────────────────────────────────────────────────────────────
    await page.locator('.radio-inline').filter({ hasText: '片道' }).locator('input').check();
    await page.selectOption('#depAirportCd', { label: '東京(羽田)' });
    await page.selectOption('#arrAirportCd', { label: '大阪(伊丹)' });
    await page.locator('#outwardDate').fill(dateStr);
    await page.locator('#outwardDate').press('Tab');
    await page.locator('.radio-inline').filter({ hasText: '一般席' }).locator('input').check();
    await page.click('#flights-search-button');

    // ────────────────────────────────────────────────────────────
    // 3. 検索結果から最初のフライトを選択して予約ボタンを押す
    // ────────────────────────────────────────────────────────────
    await page.locator('#outward-flights').waitFor({ state: 'visible' });
    await page.locator('input[name="outward-flight-select"]').first().check();
    await page.click('#reserve-flights-button');

    // ────────────────────────────────────────────────────────────
    // 4. B202：搭乗者を追加ボタンを押す
    //    （#passenger2 は初期表示済みだが、課題の手順に従い追加ボタンを押す）
    // ────────────────────────────────────────────────────────────
    await page.waitForURL(/\/ticket\/reserve/);
    await page.click('#add-passenger-button');

    // ────────────────────────────────────────────────────────────
    // 5. 搭乗者2に子供情報を入力（カタカナ名 / 年齢5歳 / 男性）
    // ────────────────────────────────────────────────────────────
    await page.locator('input[name="passengerFormList[1].familyName"]').fill('テスト');
    await page.locator('input[name="passengerFormList[1].givenName"]').fill('タロウ');
    await page.locator('input[name="passengerFormList[1].age"]').fill('5');
    await page.locator('#passenger2 label').filter({ hasText: '男性' }).click();

    // ────────────────────────────────────────────────────────────
    // 6. 予約確認ボタンを押してB203へ遷移
    // ────────────────────────────────────────────────────────────
    await page.click('input[name="confirm"]');
    await expect(page.locator('h2')).toHaveText('予約内容確認');

    // ────────────────────────────────────────────────────────────
    // 7. B203：合計金額の確認
    //    合計金額 < 大人運賃 × 2 であることを検証する
    //    （子供料金 < 大人料金 であるため成立するはず）
    // ────────────────────────────────────────────────────────────

    // 選択フライトテーブルの最終列から大人1名分の運賃を取得
    // B203 の最初のテーブルが選択フライト表（最終 td が運賃列）
    const fareText = await page
      .locator('table.table-bordered')
      .first()
      .locator('tbody tr')
      .first()
      .locator('td')
      .last()
      .textContent();
    const fare = parseFare(fareText);

    // 合計金額セクションから合計金額を取得
    // h3 から親要素へ上がり、直下の p を取得することで入れ子 section の誤マッチを回避
    const totalText = await page
      .locator('h3', { hasText: '合計金額' })
      .locator('..')
      .locator('p')
      .first()
      .textContent();
    const total = parseFare(totalText);

    // 子供料金は大人より安いため、合計は大人2名分より少なくなるはず
    expect(total).toBeLessThan(fare * 2);
  });
});
