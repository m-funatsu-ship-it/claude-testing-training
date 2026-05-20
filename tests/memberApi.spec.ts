import { test, expect } from '@playwright/test';

// ════════════════════════════════════════════════════════════════
// 会員番号確認API テスト
//
// テスト対象: GET http://localhost:8082/atrs/api/member/available
// baseURL (http://localhost:8082/atrs/) は playwright.config.ts で設定済みのため、
// リクエスト URL は相対パス 'api/member/available' で指定する。
// ════════════════════════════════════════════════════════════════
test.describe('会員番号確認API', () => {

  // ────────────────────────────────────────────────────────────────
  // TC-A-001: 登録済み会員番号
  //
  // 確認すること：
  //   - 会員番号 0000000001（DB に登録済み）でリクエストしたとき
  //     ステータスコード 200 が返ること
  // ────────────────────────────────────────────────────────────────
  test('TC-A-001: 登録済み会員番号 → 200', async ({ request }) => {
    const response = await request.get('api/member/available', {
      params: { membershipNumber: '0000000001' },
    });

    expect(response.status()).toBe(200);
  });

  // ────────────────────────────────────────────────────────────────
  // TC-A-002: 未登録会員番号
  //
  // 確認すること：
  //   - 会員番号 9999999999（DB に未登録）でリクエストしたとき
  //     ステータスコード 404 が返ること
  // ────────────────────────────────────────────────────────────────
  test('TC-A-002: 未登録会員番号 → 404', async ({ request }) => {
    const response = await request.get('api/member/available', {
      params: { membershipNumber: '9999999999' },
    });

    expect(response.status()).toBe(404);
  });
});
