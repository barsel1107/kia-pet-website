require('dotenv').config();

module.exports = {
  SITE_NAME: process.env.SITE_NAME || 'Kia Pet Kuaför & Spa',

  EMAIL_USER: process.env.EMAIL_USER || 'barsel1107@gmail.com',

  EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD || '',

  PORT: process.env.PORT || 3001,

  BASE_URL: process.env.BASE_URL || 'http://localhost:3001'
};
