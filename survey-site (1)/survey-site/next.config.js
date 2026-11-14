/** الصفحة الرئيسية ورابط الاستبيان العام يخدمان نفس الملف الثابت public/index.html */
module.exports = {
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      { source: '/f/:id', destination: '/index.html' },
    ];
  },
  async headers() {
    return [
      { source: '/index.html', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ];
  },
};
