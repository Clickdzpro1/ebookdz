const axios = require('axios');
const crypto = require('crypto');

class SlickPayService {
  constructor({ apiKey, secretKey, baseUrl, testMode = true }) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.baseUrl = baseUrl || process.env.SLICKPAY_BASE_URL || 'https://api.slickpay.dz';
    this.testMode = testMode;
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
    });
  }

  async testConnection() {
    try {
      const res = await this.http.get('/v1/ping');
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.response?.data || err.message };
    }
  }

  async createPayment({ amount, currency = 'DZD', description, transactionUUID, callbackUrl, webhookUrl }) {
    const payload = {
      amount,
      currency,
      description,
      reference: transactionUUID,
      callback_url: callbackUrl,
      webhook_url: webhookUrl,
      mode: this.testMode ? 'test' : 'live',
    };
    const res = await this.http.post('/v1/payments', payload);
    return res.data;
  }

  static verifyWebhookSignature(rawBody, signature, secret) {
    if (!signature || !secret) return false;
    const hmac = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async getPaymentStatus(transactionId) {
    const res = await this.http.get(`/v1/payments/${transactionId}`);
    return res.data;
  }
}

module.exports = SlickPayService;