const crypto = require('crypto');

const getKey = () => {
  const key = process.env.ENCRYPTION_KEY || '';
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
    }
  return Buffer.from(key, 'utf8');
};

const encrypt = (plainText) => {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { iv: iv.toString('base64'), authTag: authTag.toString('base64'), cipherText: cipherText.toString('base64') };
};

const decrypt = ({ iv, authTag, cipherText }) => {
  const key = getKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const plain = Buffer.concat([ decipher.update(Buffer.from(cipherText, 'base64')), decipher.final() ]);
  return plain.toString('utf8');
};

const pack = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');
const unpack = (b64) => JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));

module.exports = { encrypt, decrypt, pack, unpack };