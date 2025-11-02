const { query, queryOne, transaction } = require('../config/db');
const { encrypt, decrypt, pack, unpack } = require('../utils/encryption');
const SlickPayService = require('../services/slickPayService');
const { v4: uuidv4 } = require('uuid');

const buildServiceForUser = async (userId) => {
  const cfg = await queryOne('SELECT * FROM slickpay_configs WHERE user_id = ? AND is_active = true', [userId]);
  if (!cfg) return null;
  const apiKey = decrypt(unpack(cfg.api_key_encrypted));
  const secret = decrypt(unpack(cfg.secret_key_encrypted));
  return new SlickPayService({
    apiKey,
    secretKey: secret,
    baseUrl: process.env.SLICKPAY_BASE_URL,
    testMode: cfg.is_test_mode === 1 || cfg.is_test_mode === true,
  });
};

const getConfig = async (req, res) => {
  const cfg = await queryOne('SELECT id, is_active, is_test_mode, last_tested_at, test_status, merchant_id, webhook_url FROM slickpay_configs WHERE user_id = ?', [req.user.id]);
  res.json({ success: true, data: cfg || null });
};

const upsertConfig = async (req, res) => {
  const { apiKey, secretKey, merchantId, webhookUrl, isTestMode = true } = req.body;
  if (!apiKey || !secretKey) return res.status(400).json({ success: false, message: 'apiKey and secretKey are required' });
  const apiEnc = pack(encrypt(apiKey));
  const secEnc = pack(encrypt(secretKey));
  const existing = await queryOne('SELECT id FROM slickpay_configs WHERE user_id = ?', [req.user.id]);
  if (existing) {
    await query('UPDATE slickpay_configs SET api_key_encrypted=?, secret_key_encrypted=?, merchant_id=?, webhook_url=?, is_test_mode=?, updated_at=NOW() WHERE id=?', [apiEnc, secEnc, merchantId || null, webhookUrl || null, isTestMode ? 1 : 0, existing.id]);
  } else {
    await query('INSERT INTO slickpay_configs (user_id, api_key_encrypted, secret_key_encrypted, merchant_id, webhook_url, is_test_mode) VALUES (?,?,?,?,?,?)', [req.user.id, apiEnc, secEnc, merchantId || null, webhookUrl || null, isTestMode ? 1 : 0]);
  }
  res.json({ success: true, message: 'SlickPay configuration saved' });
};

const testConfig = async (req, res) => {
  const service = await buildServiceForUser(req.user.id);
  if (!service) return res.status(400).json({ success: false, message: 'No SlickPay config found' });
  const result = await service.testConnection();
  await query('UPDATE slickpay_configs SET last_tested_at=NOW(), test_status=? WHERE user_id=?', [result.ok ? 'success' : 'failed', req.user.id]);
  res.json({ success: result.ok, data: result.ok ? result.data : result.error });
};

const checkout = async (req, res) => {
  const { bookId } = req.body;
  if (!bookId) return res.status(400).json({ success: false, message: 'bookId is required' });
  const book = await queryOne('SELECT * FROM books WHERE id = ? AND status = "approved"', [bookId]);
  if (!book) return res.status(404).json({ success: false, message: 'Book not found or not approved' });
  const service = await buildServiceForUser(book.vendor_id);
  if (!service) return res.status(400).json({ success: false, message: 'Vendor payment config missing' });

  const setting = await queryOne(`SELECT setting_value FROM system_settings WHERE setting_key='platform_commission_rate'`);
  const rate = parseFloat(setting?.setting_value || '0.05');
  const commission = +(book.price * rate).toFixed(2);
  const vendorPayout = +(book.price - commission).toFixed(2);
  const transactionUUID = uuidv4();

  const trxResult = await query('INSERT INTO transactions (transaction_uuid, buyer_id, vendor_id, book_id, amount, platform_commission, vendor_payout, currency, status, created_at) VALUES (?,?,?,?,?,?,?,?, "pending", NOW())', [transactionUUID, req.user.id, book.vendor_id, book.id, book.price, commission, vendorPayout, 'DZD']);

  const callbackUrl = `${process.env.CLIENT_URL}/payment/callback?ref=${transactionUUID}`;
  const webhookUrl = process.env.SLICKPAY_WEBHOOK_URL || `${process.env.API_BASE_URL || ''}/api/payments/webhook`;

  try {
    const sp = await service.createPayment({ amount: book.price, currency: 'DZD', description: `EBOOKDZ - ${book.title}`, transactionUUID, callbackUrl, webhookUrl });
    await query('UPDATE transactions SET slickpay_transaction_id=?, slickpay_payment_url=? WHERE id=?', [sp.transaction_id || null, sp.payment_url || null, trxResult.insertId]);
    res.json({ success: true, data: { paymentUrl: sp.payment_url, reference: transactionUUID } });
  } catch (err) {
    await query('UPDATE transactions SET status="failed", failure_reason=? WHERE id=?', [err.message, trxResult.insertId]);
    res.status(400).json({ success: false, message: 'Failed to create payment', error: err.response?.data || err.message });
  }
};

const webhook = async (req, res) => {
  try {
    const signature = req.headers['x-slickpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const secret = process.env.SLICKPAY_WEBHOOK_SECRET || '';
    if (!SlickPayService.verifyWebhookSignature(rawBody, signature || '', secret)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }
    const event = req.body;
    const { reference, status, transaction_id } = event;
    const trx = await queryOne('SELECT * FROM transactions WHERE transaction_uuid=?', [reference]);
    if (!trx) return res.status(404).json({ success: false, message: 'Transaction not found' });

    if (status === 'completed' || status === 'success') {
      await transaction(async (conn) => {
        await conn.execute('UPDATE transactions SET status="completed", slickpay_transaction_id=?, processed_at=NOW() WHERE id=?', [transaction_id || trx.slickpay_transaction_id, trx.id]);
        await conn.execute('INSERT INTO user_purchases (user_id, book_id, transaction_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE transaction_id=VALUES(transaction_id)', [trx.buyer_id, trx.book_id, trx.id]);
      });
    } else if (status === 'failed') {
      await query('UPDATE transactions SET status="failed", processed_at=NOW() WHERE id=?', [trx.id]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { getConfig, upsertConfig, testConfig, checkout, webhook };